import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import playwright, { BrowserContext } from 'playwright';
import { env } from '~/env';
import { PodAmplificationJob, podAmplificationQueue } from '~/lib/queues/pod-amplification-queue';
import { createClient } from '~/lib/supabase/client';

// Use a shared Redis connection for the worker
const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const supabase = createClient();

const REPOST_SELECTOR_PRIMARY = 'button[aria-label="Share post"] > span';
const REPOST_SELECTOR_DROPDOWN = 'div[role="menu"] button:has-text("Repost")';
const REPOST_SELECTOR_DIRECT = 'button:has-text("Repost")';

export const repostExecutorWorker = new Worker<PodAmplificationJob>(
  podAmplificationQueue.name,
  async (job) => {
    const { podActivityId, postUrl, memberUnipileAccountId } = job.data;

    // Safety Rail: Mock Mode
    if (process.env.UNIPILE_MOCK_MODE === 'true') {
      console.log('[MOCK MODE] Skipping physical repost. Updating DB to success for activity:', podActivityId);
      
      // Update DB to success immediately
      await supabase.from('pod_activities').update({
        status: 'success',
        proof_screenshot_url: 'https://placehold.co/600x400?text=MOCK+REPOST+SUCCESS',
      }).eq('id', podActivityId);
      
      return;
    }

    let browser: playwright.Browser | null = null;
    let context: BrowserContext | null = null;
    let screenshotUrl: string | null = null;

    try {
      await supabase.from('pod_activities').update({ status: 'in_progress' }).eq('id', podActivityId);

      // Step A: Fetch the pod member's session cookies from Unipile API
      // Assuming Unipile API endpoint for session is /v1/accounts/{id}/session
      const unipileSessionRes = await fetch(`${env.UNIPILE_API_BASE_URL}/v1/accounts/${memberUnipileAccountId}/session`, {
        headers: {
          'Authorization': `Bearer ${env.UNIPILE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!unipileSessionRes.ok) {
        const errorData = await unipileSessionRes.json();
        throw new Error(`Failed to fetch Unipile session: ${errorData.message || unipileSessionRes.statusText}`);
      }
      const unipileSession = await unipileSessionRes.json();

      if (!unipileSession.cookies || unipileSession.cookies.length === 0) {
        throw new Error('No session cookies found from Unipile API.');
      }

      // Step B: Inject these cookies into a fresh Playwright context
      browser = await playwright.chromium.launch({ headless: true });
      context = await browser.newContext();
      await context.addCookies(unipileSession.cookies.map((cookie: any) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || '.linkedin.com', // Default domain if not provided
        path: cookie.path || '/',
        expires: cookie.expires || -1,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        sameSite: cookie.sameSite || 'Lax',
      })));

      const page = await context.newPage();

      // Step C: Navigate to the post_url
      await page.goto(postUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000); // Wait for page to load completely

      // Step D: Robustly find and click "Repost"
      let repostClicked = false;

      // Try to find the primary share button first
      const shareButton = await page.locator(REPOST_SELECTOR_PRIMARY);
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(1000); // Wait for dropdown to appear

        // Try to click 'Repost' from dropdown
        const dropdownRepostButton = await page.locator(REPOST_SELECTOR_DROPDOWN);
        if (await dropdownRepostButton.isVisible()) {
          await dropdownRepostButton.click();
          repostClicked = true;
        }
      }

      if (!repostClicked) {
        // If primary share button or dropdown failed, try direct repost button
        const directRepostButton = await page.locator(REPOST_SELECTOR_DIRECT);
        if (await directRepostButton.isVisible()) {
          await directRepostButton.click();
          repostClicked = true;
        }
      }

      if (!repostClicked) {
        throw new Error('Could not find and click the Repost button.');
      }

      await page.waitForTimeout(3000); // Wait for repost action to process

      // Step E: Capture a screenshot of the success state for the UI.
      const screenshotBuffer = await page.screenshot({ fullPage: true });

      // Upload screenshot to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pod-amplification-proofs')
        .upload(`${podActivityId}.png`, screenshotBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload screenshot: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('pod-amplification-proofs')
        .getPublicUrl(uploadData.path);

      screenshotUrl = publicUrlData.publicUrl;

      // Update pod_activities table with success status and screenshot URL
      await supabase.from('pod_activities').update({
        status: 'success',
        proof_screenshot_url: screenshotUrl,
      }).eq('id', podActivityId);

    } catch (error: any) {
      console.error(`Error processing job ${job.id}:`, error);
      // Update pod_activities table with failed status and error message
      await supabase.from('pod_activities').update({
        status: 'failed',
        // Assuming there's an error_message column in pod_activities
        // error_message: error.message,
      }).eq('id', podActivityId);

      throw error; // Re-throw to allow BullMQ to handle retries
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);