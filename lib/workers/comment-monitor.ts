/**
 * Comment Monitor
 * Polls active campaigns for new comments and queues DMs for trigger word matches
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAllPostComments, UnipileComment, extractCommentAuthor } from '../unipile-client';
import { queueDM, DMJobData } from '../queues/dm-queue';

// NO HARD-CODED TRIGGER WORDS
// Multi-tenant requirement: Each campaign defines its own trigger word(s)
// stored in scrape_jobs.trigger_word from the campaign configuration

// Lazy init
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

interface ActiveScrapeJob {
  id: string;
  campaign_id: string;
  post_id: string;
  unipile_post_id: string;
  unipile_account_id: string;
  trigger_word: string;
}

interface ProcessedComment {
  campaign_id: string;
  comment_id: string;
}

/**
 * Check if comment contains the campaign's trigger word
 * - Uses ONLY the campaign-specific trigger word from database
 * - Case-insensitive matching
 * - Supports fuzzy matching for common misspellings (1 char tolerance)
 * - NO hard-coded generic triggers (multi-tenant requirement)
 */
function containsTriggerWord(text: string, triggerWord: string): string | null {
  if (!triggerWord || !text) return null;

  const lowerText = text.toLowerCase().trim();
  const lowerTrigger = triggerWord.toLowerCase().trim();

  // Exact match (case-insensitive)
  if (lowerText.includes(lowerTrigger)) {
    return triggerWord;
  }

  // Fuzzy match for common misspellings (edit distance = 1)
  // Only for triggers 4+ chars to avoid false positives
  if (lowerTrigger.length >= 4) {
    const words = lowerText.split(/\s+/);
    for (const word of words) {
      if (isCloseMatch(word, lowerTrigger)) {
        return triggerWord;
      }
    }
  }

  return null;
}

/**
 * Check if two strings are within edit distance of 1 (one typo)
 */
function isCloseMatch(word: string, target: string): boolean {
  if (Math.abs(word.length - target.length) > 1) return false;

  if (word.length === target.length) {
    let diffs = 0;
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== target[i]) diffs++;
      if (diffs > 1) return false;
    }
    return diffs === 1;
  }

  const longer = word.length > target.length ? word : target;
  const shorter = word.length > target.length ? target : word;

  let i = 0, j = 0, diffs = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] !== shorter[j]) {
      diffs++;
      if (diffs > 1) return false;
      i++;
    } else {
      i++;
      j++;
    }
  }
  return true;
}

/**
 * Build DM message based on trigger word and recipient name
 * TODO: In production, this should pull from campaign/client templates
 */
function buildDMMessage(recipientName: string, triggerWord: string): string {
  const firstName = recipientName.split(' ')[0];

  // Default message template - should be loaded from campaign/brand cartridge
  return `Hey ${firstName}! 👋

Thanks for your interest! I saw you commented "${triggerWord}" on my post.

I'd love to share more details with you. What's the best email to send it to?`;
}

/**
 * Get active scrape jobs that need comment polling
 * Queries scrape_jobs table (created by PublishingChip after successful posts)
 */
async function getActiveScrapeJobs(): Promise<ActiveScrapeJob[]> {
  const supabase = getSupabase();

  // Query scrape_jobs for scheduled/running jobs that are due for checking
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select(`
      id,
      campaign_id,
      post_id,
      unipile_post_id,
      unipile_account_id,
      trigger_word
    `)
    .in('status', ['scheduled', 'running'])
    .or(`next_check.is.null,next_check.lte.${new Date().toISOString()}`);

  if (error) {
    console.error('[COMMENT_MONITOR] Failed to fetch scrape jobs:', error);
    return [];
  }

  // Filter jobs that have valid unipile_account_id, unipile_post_id, AND trigger_word
  // NO DEFAULT FALLBACK - each campaign must define its own trigger word
  return (data || [])
    .filter((job: any) => {
      if (!job.unipile_account_id || !job.unipile_post_id) {
        console.warn(`[COMMENT_MONITOR] Skipping job ${job.id} - missing Unipile IDs`);
        return false;
      }
      if (!job.trigger_word) {
        console.warn(`[COMMENT_MONITOR] Skipping job ${job.id} - no trigger_word configured`);
        return false;
      }
      return true;
    })
    .map((job: any) => ({
      id: job.id,
      campaign_id: job.campaign_id,
      post_id: job.post_id,
      unipile_post_id: job.unipile_post_id,
      unipile_account_id: job.unipile_account_id,
      trigger_word: job.trigger_word, // NO DEFAULT - must be set per campaign
    }));
}

/**
 * Get already processed comment IDs for a campaign
 */
async function getProcessedComments(campaignId: string): Promise<Set<string>> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from('processed_comments')
    .select('comment_id')
    .eq('campaign_id', campaignId);

  return new Set((data || []).map(d => d.comment_id));
}

/**
 * Mark a comment as processed
 */
async function markCommentProcessed(
  campaignId: string,
  commentId: string,
  postId: string,
  authorId: string,
  dmQueued: boolean,
  triggerWord: string | null
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('processed_comments')
    .insert({
      campaign_id: campaignId,
      comment_id: commentId,
      post_id: postId,
      commenter_linkedin_id: authorId,
      dm_queued: dmQueued,
      trigger_word: triggerWord,
      processed_at: new Date().toISOString()
    });

  if (error) {
    console.error('[COMMENT_MONITOR] Failed to mark comment processed:', error);
  }
}

/**
 * Process a single scrape job - fetch comments and queue DMs for triggers
 */
async function processScrapeJob(job: ActiveScrapeJob): Promise<number> {
  const supabase = getSupabase();
  console.log(`[COMMENT_MONITOR] Processing scrape job ${job.id} for post ${job.post_id}`);

  // Update job status to 'running'
  await supabase.from('scrape_jobs').update({
    status: 'running',
    last_checked: new Date().toISOString()
  }).eq('id', job.id);

  // Get all comments for this post using the Unipile post ID
  const comments = await getAllPostComments(
    job.unipile_account_id,
    job.unipile_post_id
  );

  if (comments.length === 0) {
    console.log(`[COMMENT_MONITOR] No comments for job ${job.id}`);
    // Update next_check for polling
    await supabase.from('scrape_jobs').update({
      status: 'scheduled',
      next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Check again in 5 minutes
    }).eq('id', job.id);
    return 0;
  }

  // Get already processed comments
  const processed = await getProcessedComments(job.campaign_id);

  let queuedCount = 0;

  for (const comment of comments) {
    // Skip if already processed
    if (processed.has(comment.id)) {
      continue;
    }

    // Extract author info safely using helper (handles both real API and mock formats)
    const authorInfo = extractCommentAuthor(comment);
    if (!authorInfo.id) {
      console.warn(`[COMMENT_MONITOR] Skipping comment ${comment.id} - no author ID found`);
      continue;
    }
    const authorId = authorInfo.id;
    const authorName = authorInfo.name;

    // Check ONLY for the campaign's specific trigger word (multi-tenant)
    // NO generic triggers - each campaign defines its own
    const triggerWord = containsTriggerWord(comment.text, job.trigger_word);

    if (triggerWord) {
      console.log(`[COMMENT_MONITOR] Trigger found: "${triggerWord}" in comment ${comment.id}`);

      // Build DM message for the lead (customize based on trigger)
      const dmMessage = buildDMMessage(authorName, triggerWord);

      // Queue DM job (matching DMJobData interface from dm-queue.ts)
      const jobData: DMJobData = {
        accountId: job.unipile_account_id,
        recipientId: authorId,
        recipientName: authorName,
        message: dmMessage,
        campaignId: job.campaign_id,
        userId: job.unipile_account_id, // Use account as user context
        commentId: comment.id,
        postId: job.post_id,
      };

      await queueDM(jobData);
      queuedCount++;

      // Mark as processed with trigger
      await markCommentProcessed(
        job.campaign_id,
        comment.id,
        job.post_id,
        authorId,
        true,
        triggerWord
      );
    } else {
      // Mark as processed without trigger
      await markCommentProcessed(
        job.campaign_id,
        comment.id,
        job.post_id,
        authorId,
        false,
        null
      );
    }
  }

  // Update job metrics and schedule next check
  await supabase.from('scrape_jobs').update({
    status: 'scheduled',
    comments_scanned: comments.length,
    trigger_words_found: queuedCount,
    dms_sent: queuedCount, // Will be updated by DM worker on actual send
    next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  }).eq('id', job.id);

  console.log(`[COMMENT_MONITOR] Job ${job.id}: ${queuedCount} DMs queued from ${comments.length} comments`);
  return queuedCount;
}

/**
 * Main polling function - called by cron endpoint
 * Now queries scrape_jobs table instead of campaigns
 */
export async function pollAllCampaigns(): Promise<{
  campaigns_processed: number;
  jobs_processed: number;
  dms_queued: number;
  errors: string[];
}> {
  console.log('[COMMENT_MONITOR] Starting poll cycle');

  const jobs = await getActiveScrapeJobs();
  console.log(`[COMMENT_MONITOR] Found ${jobs.length} active scrape jobs`);

  let totalDmsQueued = 0;
  const errors: string[] = [];

  for (const job of jobs) {
    try {
      const queued = await processScrapeJob(job);
      totalDmsQueued += queued;
    } catch (error: any) {
      const errorMsg = `Scrape job ${job.id}: ${error.message}`;
      console.error(`[COMMENT_MONITOR] Error:`, errorMsg);
      errors.push(errorMsg);

      // Update job with error - increment error_count properly
      const supabase = getSupabase();

      // First get current error_count to increment it
      const { data: currentJob } = await supabase
        .from('scrape_jobs')
        .select('error_count')
        .eq('id', job.id)
        .single();

      await supabase.from('scrape_jobs').update({
        error_count: (currentJob?.error_count || 0) + 1,
        last_error: error.message,
        last_error_at: new Date().toISOString()
      }).eq('id', job.id);
    }
  }

  console.log(`[COMMENT_MONITOR] Poll complete: ${totalDmsQueued} DMs queued from ${jobs.length} scrape jobs`);

  return {
    campaigns_processed: jobs.length, // Backward compatibility
    jobs_processed: jobs.length,
    dms_queued: totalDmsQueued,
    errors
  };
}
