/**
 * Comment Monitor
 * Polls active campaigns for new comments and queues DMs for trigger word matches
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAllPostComments, UnipileComment } from '../unipile-client';
import { queueDM, DMJobData } from '../queues/dm-queue';

// Trigger words that indicate interest
const TRIGGER_WORDS = [
  'interested',
  'send it',
  'dm me',
  'yes please',
  'i want this',
  'send me',
  'im in',
  "i'm in",
  'count me in',
  'info please',
  'more info',
  'tell me more',
  'how do i',
  'sign me up',
  'link please',
  'yes!',
  'absolutely',
  'definitely'
];

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

interface ActiveCampaign {
  id: string;
  post_id: string;
  post_url: string;
  client_id: string;
  unipile_account_id: string;
  trigger_word: string;
}

interface ProcessedComment {
  campaign_id: string;
  comment_id: string;
}

/**
 * Check if text contains any trigger words
 */
function containsTriggerWord(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const trigger of TRIGGER_WORDS) {
    if (lowerText.includes(trigger)) {
      return trigger;
    }
  }
  return null;
}

/**
 * Extract post ID from LinkedIn URL
 * Example: https://linkedin.com/feed/update/urn:li:activity:7123456789012345678
 */
function extractPostId(url: string): string | null {
  const match = url.match(/urn:li:activity:(\d+)/);
  return match ? match[1] : null;
}

/**
 * Get active campaigns that need comment polling
 */
async function getActiveCampaigns(): Promise<ActiveCampaign[]> {
  const supabase = getSupabase();

  // Get campaigns that are active and have a last_post_url
  // Join to users via created_by to get unipile_account_id
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id,
      last_post_url,
      client_id,
      trigger_word,
      users!created_by (
        unipile_account_id
      )
    `)
    .eq('status', 'active')
    .not('last_post_url', 'is', null);

  if (error) {
    console.error('[COMMENT_MONITOR] Failed to fetch campaigns:', error);
    return [];
  }

  // Filter and transform
  return (data || [])
    .filter((c: any) => {
      const user = Array.isArray(c.users) ? c.users[0] : c.users;
      return user?.unipile_account_id;
    })
    .map((c: any) => {
      const user = Array.isArray(c.users) ? c.users[0] : c.users;
      const postId = extractPostId(c.last_post_url) || c.last_post_url;
      return {
        id: c.id,
        post_id: postId,
        post_url: c.last_post_url,
        client_id: c.client_id,
        unipile_account_id: user.unipile_account_id,
        trigger_word: c.trigger_word || '',
      };
    });
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
 * Process a single campaign - fetch comments and queue DMs for triggers
 */
async function processCampaign(campaign: ActiveCampaign): Promise<number> {
  console.log(`[COMMENT_MONITOR] Processing campaign ${campaign.id}`);

  // Get all comments for this post
  const comments = await getAllPostComments(
    campaign.unipile_account_id,
    campaign.post_id
  );

  if (comments.length === 0) {
    console.log(`[COMMENT_MONITOR] No comments for campaign ${campaign.id}`);
    return 0;
  }

  // Get already processed comments
  const processed = await getProcessedComments(campaign.id);

  let queuedCount = 0;

  for (const comment of comments) {
    // Skip if already processed
    if (processed.has(comment.id)) {
      continue;
    }

    // Check for trigger words (both campaign-specific and generic)
    let triggerWord = containsTriggerWord(comment.text);

    // Also check campaign's specific trigger word
    if (!triggerWord && campaign.trigger_word) {
      const lowerText = comment.text.toLowerCase();
      if (lowerText.includes(campaign.trigger_word.toLowerCase())) {
        triggerWord = campaign.trigger_word;
      }
    }

    if (triggerWord) {
      console.log(`[COMMENT_MONITOR] Trigger found: "${triggerWord}" in comment ${comment.id}`);

      // Queue DM job
      const jobData: DMJobData = {
        campaign_id: campaign.id,
        post_id: campaign.post_id,
        comment_id: comment.id,
        recipient_linkedin_id: comment.author.id,
        recipient_name: comment.author.name,
        unipile_account_id: campaign.unipile_account_id,
        trigger_word: triggerWord,
        comment_text: comment.text
      };

      await queueDM(jobData);
      queuedCount++;

      // Mark as processed with trigger
      await markCommentProcessed(
        campaign.id,
        comment.id,
        campaign.post_id,
        comment.author.id,
        true,
        triggerWord
      );
    } else {
      // Mark as processed without trigger
      await markCommentProcessed(
        campaign.id,
        comment.id,
        campaign.post_id,
        comment.author.id,
        false,
        null
      );
    }
  }

  console.log(`[COMMENT_MONITOR] Campaign ${campaign.id}: ${queuedCount} DMs queued from ${comments.length} comments`);
  return queuedCount;
}

/**
 * Main polling function - called by cron endpoint
 */
export async function pollAllCampaigns(): Promise<{
  campaigns_processed: number;
  dms_queued: number;
  errors: string[];
}> {
  console.log('[COMMENT_MONITOR] Starting poll cycle');

  const campaigns = await getActiveCampaigns();
  console.log(`[COMMENT_MONITOR] Found ${campaigns.length} active campaigns`);

  let totalDmsQueued = 0;
  const errors: string[] = [];

  for (const campaign of campaigns) {
    try {
      const queued = await processCampaign(campaign);
      totalDmsQueued += queued;
    } catch (error: any) {
      const errorMsg = `Campaign ${campaign.id}: ${error.message}`;
      console.error(`[COMMENT_MONITOR] Error:`, errorMsg);
      errors.push(errorMsg);
    }
  }

  console.log(`[COMMENT_MONITOR] Poll complete: ${totalDmsQueued} DMs queued from ${campaigns.length} campaigns`);

  return {
    campaigns_processed: campaigns.length,
    dms_queued: totalDmsQueued,
    errors
  };
}
