import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { createClient } from '@/lib/supabase/server';
import { sendActivityAlert } from '@/lib/notifications/pod-alerts';

/**
 * Execute a LinkedIn repost using Playwright browser automation
 *
 * @param activityId - The ID of the pod_activities record to execute
 * @throws Error if execution fails (re-thrown for BullMQ retry logic)
 *
 * Flow:
 * 1. Load activity + member + post from database
 * 2. Get Unipile session token for the member
 * 3. Launch Playwright browser with injected session cookies
 * 4. Navigate to LinkedIn post
 * 5. Click repost button and confirm
 * 6. Optional: Add randomized comment (30% chance)
 * 7. Capture repost URL
 * 8. Update database (success/failure status)
 * 9. Send activity alerts
 * 10. Re-throw errors for BullMQ retry logic
 */
export async function executeRepost(activityId: string): Promise<void> {
  const supabase = await createClient({ isServiceRole: true });

  // 1. Load activity + member + post
  const { data: activity, error: activityError } = await supabase
    .from('pod_activities')
    .select(`
      *,
      pod_members!inner(*),
      posts!inner(*)
    `)
    .eq('id', activityId)
    .single();

  if (activityError || !activity) {
    throw new Error(`Activity not found: ${activityId} - ${activityError?.message}`);
  }

  console.log('[RepostExecutor] Starting repost for activity:', {
    activityId,
    memberId: activity.pod_member_id,
    postUrl: activity.posts.post_url
  });

  let browser: Browser | null = null;

  try {
    // 2. Get Unipile session token
    const sessionToken = await getUnipileSessionToken(
      activity.pod_members.unipile_account_id
    );

    console.log('[RepostExecutor] Retrieved Unipile session token');

    // 3. Launch Playwright with timeout
    browser = await chromium.launch({
      headless: true,
      timeout: 30000, // 30s timeout for browser launch
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const context: BrowserContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });

    // 4. Inject Unipile session cookies
    await context.addCookies([
      {
        name: 'li_at',
        value: sessionToken.li_at,
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None'
      }
    ]);

    console.log('[RepostExecutor] Injected session cookies');

    const page: Page = await context.newPage();

    // 5. Navigate to post
    await page.goto(activity.posts.post_url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('[RepostExecutor] Navigated to post');

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // 6. Click repost button
    // Try multiple selectors as LinkedIn frequently changes class names
    const repostButtonSelectors = [
      'button[aria-label*="Repost"]',
      'button[aria-label*="repost"]',
      'button:has-text("Repost")',
      '[data-test-id="repost-button"]'
    ];

    let repostButtonFound = false;
    for (const selector of repostButtonSelectors) {
      try {
        await page.click(selector, { timeout: 5000 });
        repostButtonFound = true;
        console.log('[RepostExecutor] Clicked repost button with selector:', selector);
        break;
      } catch (err) {
        continue;
      }
    }

    if (!repostButtonFound) {
      throw new Error('Could not find repost button on page');
    }

    // Wait for repost dialog to appear
    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });

    console.log('[RepostExecutor] Repost dialog appeared');

    // 7. Optional comment (30% chance)
    if (Math.random() > 0.7) {
      const comments = [
        'Great insights!',
        'Worth reading',
        'Valuable perspective',
        'Interesting take',
        'Well said',
        'Spot on!',
        'Thanks for sharing',
        'This resonates'
      ];

      const selectedComment = comments[Math.floor(Math.random() * comments.length)];

      try {
        // Try to find and fill the comment field
        const commentSelectors = [
          '[contenteditable="true"]',
          'textarea[aria-label*="comment"]',
          '[role="textbox"]'
        ];

        for (const selector of commentSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              await element.fill(selectedComment);
              console.log('[RepostExecutor] Added comment:', selectedComment);
              break;
            }
          } catch (err) {
            continue;
          }
        }
      } catch (err) {
        console.warn('[RepostExecutor] Could not add comment:', err);
        // Continue anyway - comment is optional
      }
    }

    // 8. Confirm repost
    const confirmButtonSelectors = [
      'button:has-text("Repost")',
      'button[aria-label*="Repost"]',
      'button[type="submit"]'
    ];

    let confirmButtonFound = false;
    for (const selector of confirmButtonSelectors) {
      try {
        await page.click(selector, { timeout: 5000 });
        confirmButtonFound = true;
        console.log('[RepostExecutor] Clicked confirm repost button with selector:', selector);
        break;
      } catch (err) {
        continue;
      }
    }

    if (!confirmButtonFound) {
      throw new Error('Could not find confirm repost button');
    }

    // Wait for repost to complete
    await page.waitForTimeout(3000);

    const repostUrl = page.url();

    console.log('[RepostExecutor] Repost completed successfully:', repostUrl);

    await browser.close();
    browser = null;

    // 9. Update activity success (with error handling to prevent stuck activities)
    try {
      await supabase
        .from('pod_activities')
        .update({
          status: 'success',
          executed_at: new Date().toISOString(),
          repost_url: repostUrl
        })
        .eq('id', activityId);

      // 10. Send success alert
      await sendActivityAlert({
        activityId,
        memberId: activity.pod_member_id,
        postUrl: activity.posts.post_url,
        status: 'success',
        repostUrl,
        executedAt: new Date()
      });

      console.log('[RepostExecutor] Activity updated and alert sent');
    } catch (dbError: any) {
      console.error('[RepostExecutor] Failed to update success status in DB:', dbError);
      // Don't re-throw - repost already succeeded on LinkedIn
      // Log error but continue (prevents stuck activity status)
    }

  } catch (error: any) {
    console.error('[RepostExecutor] Failed to execute repost:', error);

    // Ensure browser is closed
    if (browser) {
      await browser.close();
    }

    // Update failure
    await supabase
      .from('pod_activities')
      .update({
        status: 'failed',
        executed_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', activityId);

    // Send failure alert
    await sendActivityAlert({
      activityId,
      memberId: activity.pod_member_id,
      postUrl: activity.posts.post_url,
      status: 'failed',
      error: error.message,
      executedAt: new Date()
    });

    // Re-throw for BullMQ retry logic
    throw error;
  }
}

/**
 * Get Unipile session token for a LinkedIn account
 *
 * @param unipileAccountId - The Unipile account ID
 * @returns Session token object containing li_at cookie
 * @throws Error if Unipile API fails
 */
async function getUnipileSessionToken(unipileAccountId: string): Promise<{ li_at: string }> {
  const unipileApiKey = process.env.UNIPILE_API_KEY;

  if (!unipileApiKey) {
    throw new Error('UNIPILE_API_KEY not configured');
  }

  const response = await fetch(
    `${process.env.UNIPILE_DSN || 'https://api3.unipile.com:13344'}/api/v1/accounts/${unipileAccountId}/session`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${unipileApiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Unipile session: ${response.status} - ${errorText}`);
  }

  const sessionData = await response.json();

  // Validate response structure before accessing nested properties
  if (!sessionData || typeof sessionData !== 'object') {
    throw new Error('Invalid Unipile session response: not an object');
  }

  // Unipile returns session cookies including li_at
  // Check both direct property and nested cookies object
  let liAtCookie: string | undefined;

  if (typeof sessionData.li_at === 'string') {
    liAtCookie = sessionData.li_at;
  } else if (
    sessionData.cookies &&
    typeof sessionData.cookies === 'object' &&
    typeof sessionData.cookies.li_at === 'string'
  ) {
    liAtCookie = sessionData.cookies.li_at;
  }

  if (!liAtCookie) {
    throw new Error(
      `Unipile session response missing li_at cookie. Response structure: ${JSON.stringify(
        Object.keys(sessionData)
      )}`
    );
  }

  return {
    li_at: liAtCookie
  };
}
