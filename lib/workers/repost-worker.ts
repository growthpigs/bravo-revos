/**
 * Repost Worker (Playwright Automation)
 *
 * Automates LinkedIn reposting using Playwright browser automation:
 * 1. Receives repost job for a pod member
 * 2. Launches headless browser with member's LinkedIn session
 * 3. Navigates to post URL
 * 4. Finds and clicks "Repost" button
 * 5. Confirms repost
 * 6. Updates pod_activity status
 *
 * CRITICAL: This uses Unipile's session cookies to authenticate,
 * avoiding the need for manual LinkedIn login.
 */

import { config } from 'dotenv';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { chromium, Browser, Page } from 'playwright';

// Load environment variables
config({ path: '.env.local' });
import { PodRepostJob, podRepostQueue } from '../queues/pod-queue';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * Get LinkedIn session cookies from Unipile
 */
async function getLinkedInSession(unipileAccountId: string): Promise<any[]> {
  try {
    const response = await fetch(
      `${process.env.UNIPILE_DSN}/api/v1/accounts/${unipileAccountId}`,
      {
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unipile API error: ${response.status}`);
    }

    const data = await response.json();

    // Unipile stores cookies in account.session or account.cookies
    // Format varies by Unipile version - adapt as needed
    return data.cookies || data.session?.cookies || [];
  } catch (error: any) {
    console.error('[REPOST_WORKER] Failed to get LinkedIn session:', error);
    throw new Error(`Failed to get LinkedIn session: ${error.message}`);
  }
}

/**
 * Perform LinkedIn repost using Playwright
 */
async function performLinkedInRepost(
  postUrl: string,
  unipileAccountId: string
): Promise<{ success: boolean; error?: string }> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('[REPOST_WORKER] Launching browser...');

    // 1. Launch browser
    browser = await chromium.launch({
      headless: true, // Set to false for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });

    page = await context.newPage();

    // 2. Get and set LinkedIn session cookies
    console.log('[REPOST_WORKER] Setting LinkedIn session...');
    const cookies = await getLinkedInSession(unipileAccountId);

    if (cookies && cookies.length > 0) {
      await context.addCookies(
        cookies.map((cookie: any) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || '.linkedin.com',
          path: cookie.path || '/',
          expires: cookie.expires || -1,
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure || true,
          sameSite: cookie.sameSite || 'None',
        }))
      );
    }

    // 3. Navigate to post
    console.log('[REPOST_WORKER] Navigating to post:', postUrl);
    await page.goto(postUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a moment for page to stabilize
    await page.waitForTimeout(2000);

    // 4. Find and click Repost button
    // LinkedIn repost button has various selectors - try multiple approaches
    console.log('[REPOST_WORKER] Looking for Repost button...');

    let repostClicked = false;

    // Approach 1: Look for button with "Repost" text
    try {
      const repostButton = page.locator('button:has-text("Repost"), button[aria-label*="Repost"]').first();
      if (await repostButton.isVisible({ timeout: 5000 })) {
        await repostButton.click();
        repostClicked = true;
        console.log('[REPOST_WORKER] Clicked Repost button (text match)');
      }
    } catch (e) {
      console.log('[REPOST_WORKER] Approach 1 failed, trying approach 2');
    }

    // Approach 2: Look for SVG icon with repost symbol
    if (!repostClicked) {
      try {
        const repostByIcon = page.locator('button svg[data-test-icon="repost-medium"], button svg[data-test-icon="repost-small"]').first();
        const parentButton = repostByIcon.locator('xpath=ancestor::button[1]');
        if (await parentButton.isVisible({ timeout: 5000 })) {
          await parentButton.click();
          repostClicked = true;
          console.log('[REPOST_WORKER] Clicked Repost button (icon match)');
        }
      } catch (e) {
        console.log('[REPOST_WORKER] Approach 2 failed, trying approach 3');
      }
    }

    // Approach 3: Generic social actions container
    if (!repostClicked) {
      try {
        const socialActions = page.locator('[data-test-id="social-actions"]').first();
        const repostInActions = socialActions.locator('button').filter({ hasText: /repost/i }).first();
        if (await repostInActions.isVisible({ timeout: 5000 })) {
          await repostInActions.click();
          repostClicked = true;
          console.log('[REPOST_WORKER] Clicked Repost button (social actions)');
        }
      } catch (e) {
        console.log('[REPOST_WORKER] Approach 3 failed');
      }
    }

    if (!repostClicked) {
      throw new Error('Could not find Repost button on page');
    }

    // 5. Wait for repost modal/menu to appear
    await page.waitForTimeout(1000);

    // 6. Click "Repost" in the dropdown (not "Repost with thoughts")
    console.log('[REPOST_WORKER] Looking for Repost confirmation...');

    let confirmClicked = false;

    // Try to find the simple "Repost" option (instant repost, no modal)
    try {
      const simpleRepost = page.locator('button:has-text("Repost"), div[role="menuitem"]:has-text("Repost")').first();
      if (await simpleRepost.isVisible({ timeout: 3000 })) {
        await simpleRepost.click();
        confirmClicked = true;
        console.log('[REPOST_WORKER] Confirmed instant repost');
      }
    } catch (e) {
      console.log('[REPOST_WORKER] No instant repost option found');
    }

    // Alternative: Look for menu items
    if (!confirmClicked) {
      try {
        const menu = page.locator('[role="menu"], [data-test-id="repost-menu"]').first();
        const repostOption = menu.locator('text=/^Repost$/i').first(); // Exact "Repost", not "Repost with thoughts"
        if (await repostOption.isVisible({ timeout: 3000 })) {
          await repostOption.click();
          confirmClicked = true;
          console.log('[REPOST_WORKER] Confirmed repost from menu');
        }
      } catch (e) {
        console.log('[REPOST_WORKER] No menu-based confirmation found');
      }
    }

    if (!confirmClicked) {
      throw new Error('Could not confirm repost');
    }

    // 7. Wait for repost to complete
    await page.waitForTimeout(2000);

    console.log('[REPOST_WORKER] Repost completed successfully');

    return { success: true };
  } catch (error: any) {
    console.error('[REPOST_WORKER] Error during repost:', error);

    // Take screenshot for debugging (optional)
    if (page) {
      try {
        await page.screenshot({ path: `/tmp/repost-error-${Date.now()}.png` });
      } catch (e) {
        // Ignore screenshot errors
      }
    }

    return { success: false, error: error.message };
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Repost Worker
 */
const worker = new Worker<PodRepostJob>(
  'pod-repost',
  async (job: Job<PodRepostJob>) => {
    console.log('[REPOST_WORKER] Processing job:', job.id);

    const { podActivityId, podMemberId, postUrl, memberLinkedInUrl, unipileAccountId } = job.data;

    try {
      // 1. Update status to 'processing'
      await supabase
        .from('pod_activities')
        .update({ status: 'processing', processed_at: new Date().toISOString() })
        .eq('id', podActivityId);

      // 2. Perform repost
      const result = await performLinkedInRepost(postUrl, unipileAccountId);

      // 3. Update final status
      if (result.success) {
        await supabase
          .from('pod_activities')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', podActivityId);

        console.log(`[REPOST_WORKER] Successfully reposted for member ${podMemberId}`);

        return { success: true };
      } else {
        await supabase
          .from('pod_activities')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: result.error || 'Unknown error',
          })
          .eq('id', podActivityId);

        throw new Error(result.error || 'Repost failed');
      }
    } catch (error: any) {
      console.error('[REPOST_WORKER] Error:', error);

      // Update status to failed
      await supabase
        .from('pod_activities')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq('id', podActivityId);

      throw error; // Will trigger retry
    }
  },
  {
    connection,
    concurrency: 2, // Only 2 concurrent browser sessions to avoid rate limiting
  }
);

worker.on('completed', (job) => {
  console.log(`[REPOST_WORKER] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[REPOST_WORKER] Job ${job?.id} failed:`, err.message);
});

export default worker;
