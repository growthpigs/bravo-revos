import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { Browser, ElementHandle } from 'puppeteer-core';
import { PodAmplificationJob, podAmplificationQueue } from '@/lib/queues/pod-amplification-queue';
import { createClient } from '@/lib/supabase/client';
import { launchProfile, stopProfile } from '@/lib/gologin/client';
import { GologinApi } from 'gologin';

/**
 * REPOST EXECUTOR - GoLogin + Puppeteer Implementation
 *
 * Architecture:
 * - Unipile handles likes/comments (API-based)
 * - GoLogin handles reposts (browser automation with session management)
 *
 * Each pod member must have a GoLogin profile with an authenticated LinkedIn session.
 * The profile is created when user enables repost feature in pod settings.
 */

// Type for GoLogin API instance
type GologinApiInstance = ReturnType<typeof GologinApi>;

// Helper function to replace deprecated waitForTimeout
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Use a shared Redis connection for the worker
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const supabase = createClient();

// CSS selector for primary share button
const REPOST_SELECTOR_PRIMARY = 'button[aria-label*="Share"], button[aria-label*="share"]';

export const repostExecutorWorker = new Worker<PodAmplificationJob>(
  podAmplificationQueue.name,
  async (job) => {
    const { podActivityId, postUrl, gologinProfileId } = job.data;

    // Validate required data
    if (!gologinProfileId) {
      console.error('[REPOST_EXECUTOR] No GoLogin profile ID provided');
      await supabase.from('pod_activity').update({
        status: 'skipped',
      }).eq('id', podActivityId);
      return { status: 'skipped', reason: 'No GoLogin profile ID - user needs to enable repost feature' };
    }

    // Safety Rail: Mock Mode
    if (process.env.UNIPILE_MOCK_MODE === 'true') {
      console.log('[MOCK MODE] Skipping physical repost. Updating DB to success for activity:', podActivityId);

      await supabase.from('pod_activity').update({
        status: 'success',
        proof_screenshot_url: 'https://placehold.co/600x400?text=MOCK+REPOST+SUCCESS',
      }).eq('id', podActivityId);

      return { status: 'success', mock: true };
    }

    let browser: Browser | null = null;
    let gl: GologinApiInstance | null = null;
    let screenshotUrl: string | null = null;

    try {
      await supabase.from('pod_activity').update({ status: 'in_progress' }).eq('id', podActivityId);

      console.log(`[REPOST_EXECUTOR] Starting repost for activity ${podActivityId}`);
      console.log(`[REPOST_EXECUTOR] Post URL: ${postUrl}`);
      console.log(`[REPOST_EXECUTOR] GoLogin Profile: ${gologinProfileId}`);

      // Step A: Launch GoLogin profile with Puppeteer
      try {
        const result = await launchProfile(gologinProfileId);
        browser = result.browser;
        gl = result.gl;
      } catch (glError: unknown) {
        const errorMsg = glError instanceof Error ? glError.message : String(glError);

        // Handle GoLogin-specific errors
        if (errorMsg.includes('profile not found') || errorMsg.includes('Profile not found')) {
          throw new Error(`GoLogin profile ${gologinProfileId} not found. User may need to re-authenticate.`);
        }
        if (errorMsg.includes('quota') || errorMsg.includes('limit exceeded')) {
          throw new Error(`GoLogin quota exceeded. Check billing: https://gologin.com/billing`);
        }
        if (errorMsg.includes('token') || errorMsg.includes('unauthorized')) {
          throw new Error(`GoLogin API token invalid. Check GOLOGIN_API_TOKEN env var.`);
        }
        throw new Error(`GoLogin launch failed: ${errorMsg}`);
      }

      if (!browser) {
        throw new Error('GoLogin returned null browser - profile may be corrupted');
      }

      const page = await browser.newPage();

      // Step B: Navigate to the post URL
      console.log(`[REPOST_EXECUTOR] Navigating to ${postUrl}`);
      await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(5000); // Wait for page to load completely

      // Step C: Find and click the Repost button
      let repostClicked = false;

      // Try primary share button first
      try {
        await page.waitForSelector(REPOST_SELECTOR_PRIMARY, { visible: true, timeout: 5000 });
        const shareButton = await page.$(REPOST_SELECTOR_PRIMARY);
        if (shareButton) {
          await shareButton.click();
          await delay(1000); // Wait for dropdown animation

          // Use page.evaluate for XPath (Puppeteer deprecated $x)
          // Find "Repost" button in the dropdown menu
          const dropdownRepostClicked = await page.evaluate(() => {
            const xpath = '//div[@role="menu"]//button[contains(., "Repost")]';
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const button = result.singleNodeValue as HTMLElement | null;
            if (button) {
              button.click();
              return true;
            }
            return false;
          });

          if (dropdownRepostClicked) {
            repostClicked = true;
            console.log('[REPOST_EXECUTOR] Clicked repost from dropdown');
          }
        }
      } catch (e) {
        console.log('[REPOST_EXECUTOR] Primary share button not found, trying fallback');
      }

      // Fallback: try direct repost button using XPath
      if (!repostClicked) {
        try {
          const directRepostClicked = await page.evaluate(() => {
            const xpath = '//button[contains(@aria-label, "Repost") or contains(@aria-label, "repost")]';
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const button = result.singleNodeValue as HTMLElement | null;
            if (button) {
              button.click();
              return true;
            }
            return false;
          });

          if (directRepostClicked) {
            repostClicked = true;
            console.log('[REPOST_EXECUTOR] Clicked direct repost button');
          }
        } catch (e) {
          console.log('[REPOST_EXECUTOR] Direct repost button not found');
        }
      }

      // Third fallback: look for "Repost" text anywhere
      if (!repostClicked) {
        try {
          const anyRepostClicked = await page.evaluate(() => {
            const xpath = '//button[contains(., "Repost")]';
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const button = result.singleNodeValue as HTMLElement | null;
            if (button) {
              button.click();
              return true;
            }
            return false;
          });

          if (anyRepostClicked) {
            repostClicked = true;
            console.log('[REPOST_EXECUTOR] Clicked repost via text match');
          }
        } catch (e) {
          console.log('[REPOST_EXECUTOR] Text-based repost button not found');
        }
      }

      if (!repostClicked) {
        throw new Error('Could not find and click the Repost button. LinkedIn UI may have changed.');
      }

      await delay(3000); // Wait for repost action to process

      // Step D: Capture screenshot as proof
      const screenshotBuffer = await page.screenshot({ fullPage: false });

      // Upload screenshot to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pod-amplification-proofs')
        .upload(`${podActivityId}.png`, screenshotBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error('[REPOST_EXECUTOR] Screenshot upload failed:', uploadError);
        // Don't fail the job just because screenshot upload failed
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('pod-amplification-proofs')
          .getPublicUrl(uploadData.path);

        screenshotUrl = publicUrlData.publicUrl;
      }

      // Step E: Update pod_activities with success
      await supabase.from('pod_activity').update({
        status: 'success',
        proof_screenshot_url: screenshotUrl,
      }).eq('id', podActivityId);

      console.log(`[REPOST_EXECUTOR] Successfully completed repost for activity ${podActivityId}`);

      return { status: 'success', screenshotUrl };

    } catch (error: unknown) {
      console.error(`[REPOST_EXECUTOR] Error processing job ${job.id}:`, error);

      // Update pod_activities with failed status
      await supabase.from('pod_activity').update({
        status: 'failed',
      }).eq('id', podActivityId);

      throw error; // Re-throw to allow BullMQ to handle retries

    } finally {
      // CRITICAL: Always close browser and stop GoLogin profile
      // Failure to call stopProfile leaves profile running = billing + quota issues
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('[REPOST_EXECUTOR] Browser close failed:', e);
        }
      }
      if (gl) {
        try {
          await stopProfile(gl);
        } catch (e) {
          console.error('[REPOST_EXECUTOR] GL.stop() failed:', e);
        }
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Reduced from 5 to avoid GoLogin rate limits
  }
);
