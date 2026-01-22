/**
 * Comment Monitor
 * Polls active campaigns for new comments and queues DMs for trigger word matches
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  getAllPostComments,
  UnipileComment,
  extractCommentAuthor,
  sendDirectMessage,
  replyToComment,
  sendConnectionRequest,
  checkConnectionStatus
} from '../unipile-client';
import { extractEmail } from '../email-extraction';
import * as Sentry from '@sentry/nextjs';
import {
  getRandomNotConnectedReply,
  getRandomConnectedReply,
  getRandomEmailCapturedReply,
  buildDMConnectedAskEmail,
  buildConnectionRequestMessage,
} from '../message-templates';
// TEMPORARILY DISABLED: Redis is down, sending DMs directly instead of queueing
// import { queueDM, DMJobData } from '../queues/dm-queue';

// RATE LIMITING: Prevent LinkedIn from flagging account as spam/automation
const MAX_CONNECTION_REQUESTS_PER_RUN = 10;
const MAX_DMS_PER_RUN = 20;
const MAX_COMMENT_REPLIES_PER_RUN = 15;

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
  user_id: string; // CRITICAL: Required for multi-tenant isolation
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
 * Uses message templates for human-like, varied messaging
 */
function buildDMMessage(recipientName: string, _triggerWord: string, leadMagnetName?: string): string {
  const firstName = recipientName.split(' ')[0];
  return buildDMConnectedAskEmail({ firstName, leadMagnetName });
}

/**
 * Get active scrape jobs that need comment polling
 * Queries scrape_jobs table (created by PublishingChip after successful posts)
 */
async function getActiveScrapeJobs(): Promise<ActiveScrapeJob[]> {
  const supabase = getSupabase();

  // Step 1: Clean up stale 'running' jobs (crashed workers)
  // Jobs running for > 10 minutes are assumed crashed and reset to 'scheduled'
  const STALE_THRESHOLD_MINUTES = 10;
  const staleTime = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  const { data: staleJobs } = await supabase
    .from('scrape_jobs')
    .update({ status: 'scheduled' })
    .eq('status', 'running')
    .lt('last_checked', staleTime)
    .select('id');

  if (staleJobs && staleJobs.length > 0) {
    console.log(`[COMMENT_MONITOR] ⚠️ Recovered ${staleJobs.length} stale jobs:`, staleJobs.map(j => j.id));
  }

  // Step 2: Query scrape_jobs for scheduled jobs that are due for checking
  // Only query 'scheduled' - 'running' jobs are locked by another worker
  // CRITICAL: Join campaigns to get user_id for multi-tenant isolation
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select(`
      id,
      campaign_id,
      post_id,
      unipile_post_id,
      unipile_account_id,
      trigger_word,
      campaigns!inner(user_id)
    `)
    .eq('status', 'scheduled')
    .or(`next_check.is.null,next_check.lte.${new Date().toISOString()}`);

  if (error) {
    console.error('[COMMENT_MONITOR] Failed to fetch scrape jobs:', error);
    return [];
  }

  // Filter jobs that have valid unipile_account_id, unipile_post_id, trigger_word AND user_id
  // NO DEFAULT FALLBACK - each campaign must define its own trigger word
  // CRITICAL: user_id required for multi-tenant isolation
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
      // CRITICAL: Require user_id for tenant isolation
      const userId = job.campaigns?.user_id;
      if (!userId) {
        console.warn(`[COMMENT_MONITOR] Skipping job ${job.id} - no user_id (tenant isolation required)`);
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
      user_id: job.campaigns.user_id, // CRITICAL: For multi-tenant isolation
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
 * Create a pending connection record for tracking follow-up DMs
 */
async function createPendingConnection(
  supabase: SupabaseClient,
  params: {
    campaignId: string;
    leadId?: string;
    commenterLinkedinId: string;
    commenterName: string;
    commenterProfileUrl?: string;
    commentId: string;
    commentText: string;
    postId: string;
    invitationId?: string;
    userId?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('pending_connections')
    .insert({
      campaign_id: params.campaignId,
      lead_id: params.leadId,
      commenter_linkedin_id: params.commenterLinkedinId,
      commenter_name: params.commenterName,
      commenter_profile_url: params.commenterProfileUrl,
      comment_id: params.commentId,
      comment_text: params.commentText,
      post_id: params.postId,
      invitation_id: params.invitationId,
      connection_request_sent_at: new Date().toISOString(),
      status: 'pending',
      user_id: params.userId
    });

  if (error) {
    console.error('[COMMENT_MONITOR] Failed to create pending_connection:', error);
  }
}

/**
 * Build comment reply message for non-connections
 * Uses VARIED templates to look human (public comments visible to all)
 */
function buildCommentReplyMessage(recipientName: string): string {
  const firstName = recipientName.split(' ')[0];
  return getRandomNotConnectedReply(firstName);
}

/**
 * Build connection request message
 * Uses message template with lead magnet name
 */
function buildConnectionMessage(recipientName: string, leadMagnetName?: string): string {
  const firstName = recipientName.split(' ')[0];
  return buildConnectionRequestMessage({ firstName, leadMagnetName });
}

/**
 * Process a single scrape job - fetch comments and handle lead capture flow
 *
 * COMPLETE FLOW:
 * 1. Check if comment contains email → Capture immediately + Reply "check inbox"
 * 2. If no email, check connection status
 *    - Connected: Send DM asking for email
 *    - Not connected: Reply to comment + Send connection request + Track for follow-up
 */
async function processScrapeJob(job: ActiveScrapeJob): Promise<number> {
  const supabase = getSupabase();
  console.log(`[COMMENT_MONITOR] Processing scrape job ${job.id} for post ${job.post_id}`);

  // Optimistic lock - only process if still scheduled (prevents duplicate processing)
  // If another worker already claimed this job, the .eq('status', 'scheduled') fails
  const { data: locked, error: lockError } = await supabase
    .from('scrape_jobs')
    .update({
      status: 'running',
      last_checked: new Date().toISOString()
    })
    .eq('id', job.id)
    .eq('status', 'scheduled')  // Critical: Only update if still scheduled
    .select('id')
    .single();

  if (lockError || !locked) {
    console.log(`[COMMENT_MONITOR] Job ${job.id} already locked by another worker, skipping`);
    return 0;
  }

  // Get all comments for this post using the Unipile post ID
  console.log(`[COMMENT_MONITOR_DEBUG] Fetching comments for:`, {
    account_id: job.unipile_account_id,
    post_id: job.unipile_post_id,
    trigger_word: job.trigger_word
  });

  const comments = await getAllPostComments(
    job.unipile_account_id,
    job.unipile_post_id
  );

  console.log(`[COMMENT_MONITOR_DEBUG] Comments fetched:`, {
    count: comments.length,
    comments: comments.map((c: any) => ({ id: c.id, text: c.text?.substring(0, 50), author: c.author }))
  });

  if (comments.length === 0) {
    console.log(`[COMMENT_MONITOR] No comments for job ${job.id}`);
    // Update next_check for polling - reset error_count on successful poll
    await supabase.from('scrape_jobs').update({
      status: 'scheduled',
      error_count: 0, // Reset on success to prevent accumulated errors from causing auto-fail
      next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Check again in 5 minutes
    }).eq('id', job.id);
    return 0;
  }

  // Get already processed comments
  const processed = await getProcessedComments(job.campaign_id);
  console.log(`[COMMENT_MONITOR_DEBUG] Already processed:`, Array.from(processed));

  let processedCount = 0;
  let emailsCaptured = 0;
  let dmsSent = 0;
  let connectionRequestsSent = 0;
  let commentRepliesSent = 0;

  for (const comment of comments) {
    // RATE LIMIT CHECK: Stop if we've hit any limit
    if (connectionRequestsSent >= MAX_CONNECTION_REQUESTS_PER_RUN) {
      console.log(`[COMMENT_MONITOR] Rate limit reached: ${MAX_CONNECTION_REQUESTS_PER_RUN} connection requests. Stopping.`);
      break;
    }
    if (dmsSent >= MAX_DMS_PER_RUN) {
      console.log(`[COMMENT_MONITOR] Rate limit reached: ${MAX_DMS_PER_RUN} DMs. Stopping.`);
      break;
    }
    if (commentRepliesSent >= MAX_COMMENT_REPLIES_PER_RUN) {
      console.log(`[COMMENT_MONITOR] Rate limit reached: ${MAX_COMMENT_REPLIES_PER_RUN} comment replies. Stopping.`);
      break;
    }
    // Skip if already processed
    if (processed.has(comment.id)) {
      console.log(`[COMMENT_MONITOR_DEBUG] Skipping ${comment.id} - already processed`);
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
    const authorProfileUrl = authorInfo.profile_url;

    // Check ONLY for the campaign's specific trigger word (multi-tenant)
    console.log(`[COMMENT_MONITOR_DEBUG] Checking comment ${comment.id}:`, {
      text: comment.text,
      trigger_word: job.trigger_word,
      author: authorName
    });
    const triggerWord = containsTriggerWord(comment.text, job.trigger_word);
    console.log(`[COMMENT_MONITOR_DEBUG] Trigger match result:`, triggerWord);

    if (triggerWord) {
      console.log(`[COMMENT_MONITOR] Trigger found: "${triggerWord}" in comment ${comment.id} from ${authorName}`);
      processedCount++;

      // Create lead record first (will update with email if found)
      const nameParts = authorName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: leadData } = await supabase.from('lead').upsert({
        campaign_id: job.campaign_id,
        linkedin_id: authorId,
        linkedin_url: authorProfileUrl,
        first_name: firstName,
        last_name: lastName,
        source: 'comment_trigger',
        status: 'new',
      }, { onConflict: 'linkedin_id' }).select('id').single();

      const leadId = leadData?.id;

      // ============================================
      // PATH A: Check if comment contains an email
      // ============================================
      const emailResult = await extractEmail(comment.text);

      if (emailResult.email && emailResult.confidence !== 'low') {
        console.log(`[COMMENT_MONITOR] 📧 Email found in comment: ${emailResult.email} (confidence: ${emailResult.confidence})`);
        emailsCaptured++;

        // Update lead with captured email
        if (leadId) {
          await supabase.from('lead').update({
            email: emailResult.email,
            status: 'email_captured',
          }).eq('id', leadId);
        }

        // Reply to comment with varied message (public, must look human)
        try {
          const replyMessage = getRandomEmailCapturedReply(firstName);
          await replyToComment(
            job.unipile_account_id,
            job.unipile_post_id,
            replyMessage,
            comment.id  // Thread under original comment
          );
          commentRepliesSent++;
          console.log(`[COMMENT_MONITOR] ✅ Comment reply sent for email capture: "${replyMessage}"`);
        } catch (replyError: any) {
          console.error(`[COMMENT_MONITOR] ❌ Comment reply failed:`, replyError.message);
        }

        // TODO: Trigger email sending to the captured email address
        // This would integrate with ESP (ConvertKit, etc.)

        // Mark as processed
        await markCommentProcessed(
          job.campaign_id,
          comment.id,
          job.post_id,
          authorId,
          true,
          triggerWord
        );
        continue;
      }

      // ============================================
      // PATH B: No email in comment - check connection
      // ============================================
      console.log(`[COMMENT_MONITOR] No email in comment, checking connection status...`);

      let connectionStatus;
      try {
        connectionStatus = await checkConnectionStatus(job.unipile_account_id, authorId);
        console.log(`[COMMENT_MONITOR] Connection status:`, connectionStatus);
      } catch (connError: any) {
        console.error(`[COMMENT_MONITOR] Failed to check connection:`, connError.message);
        // Assume not connected if check fails
        connectionStatus = { isConnected: false };
      }

      if (connectionStatus.isConnected) {
        // ============================================
        // PATH B1: Connected - Send DM + Reply "check DMs"
        // ============================================
        console.log(`[COMMENT_MONITOR] ✅ ${authorName} is connected, sending DM...`);

        const dmMessage = buildDMMessage(authorName, triggerWord);

        try {
          const dmResult = await sendDirectMessage(
            job.unipile_account_id,
            authorId,
            dmMessage
          );
          console.log(`[COMMENT_MONITOR] ✅ DM sent successfully:`, dmResult);
          dmsSent++;

          // Also reply to comment with varied "check your DMs" message
          try {
            const commentReply = getRandomConnectedReply(firstName);
            await replyToComment(
              job.unipile_account_id,
              job.unipile_post_id,
              commentReply,
              comment.id  // Thread under original comment
            );
            commentRepliesSent++;
            console.log(`[COMMENT_MONITOR] ✅ Comment reply sent: "${commentReply}"`);
          } catch (replyError: any) {
            console.error(`[COMMENT_MONITOR] ❌ Comment reply failed (DM was sent):`, replyError.message);
          }

          // Update lead status
          if (leadId) {
            await supabase.from('lead').update({
              status: 'dm_sent',
            }).eq('id', leadId);
          }

          await markCommentProcessed(
            job.campaign_id,
            comment.id,
            job.post_id,
            authorId,
            true,
            triggerWord
          );
        } catch (dmError: any) {
          console.error(`[COMMENT_MONITOR] ❌ DM failed for ${authorName}:`, dmError.message);
          await markCommentProcessed(
            job.campaign_id,
            comment.id,
            job.post_id,
            authorId,
            false,
            triggerWord
          );
        }
      } else {
        // ============================================
        // PATH B2: Not connected - Reply + Connection Request
        // ============================================
        console.log(`[COMMENT_MONITOR] ❌ ${authorName} is NOT connected, sending reply + connection request...`);

        // Step 1: Reply to their comment publicly (VARIED to look human)
        // This ALWAYS happens regardless of connection/invitation status
        try {
          const replyMessage = buildCommentReplyMessage(authorName);
          await replyToComment(
            job.unipile_account_id,
            job.unipile_post_id,
            replyMessage,
            comment.id  // Thread under original comment
          );
          commentRepliesSent++;
          console.log(`[COMMENT_MONITOR] ✅ Comment reply sent to ${authorName}: "${replyMessage}"`);
        } catch (replyError: any) {
          console.error(`[COMMENT_MONITOR] ❌ Comment reply failed:`, replyError.message);
        }

        // Step 2: Send connection request (skip if already have pending invitation)
        let invitationId: string | undefined;
        if (connectionStatus.hasPendingInvitation) {
          console.log(`[COMMENT_MONITOR] ⏭️ Already have pending invitation to ${authorName}, skipping connection request (reply was still sent)`);
        } else {
          try {
            const connectionMessage = buildConnectionMessage(authorName);
            const inviteResult = await sendConnectionRequest(
              job.unipile_account_id,
              authorId,
              connectionMessage
            );
            console.log(`[COMMENT_MONITOR] ✅ Connection request sent:`, inviteResult);
            invitationId = inviteResult.invitation_id;
            connectionRequestsSent++;
          } catch (inviteError: any) {
            console.error(`[COMMENT_MONITOR] ❌ Connection request failed:`, inviteError.message);
          }
        }

        // Step 3: Track in pending_connections for follow-up
        // CRITICAL: Include user_id for multi-tenant isolation
        await createPendingConnection(supabase, {
          campaignId: job.campaign_id,
          leadId,
          commenterLinkedinId: authorId,
          commenterName: authorName,
          commenterProfileUrl: authorProfileUrl,
          commentId: comment.id,
          commentText: comment.text,
          postId: job.post_id,
          invitationId,
          userId: job.user_id, // CRITICAL: Multi-tenant isolation
        });

        // Update lead status
        if (leadId) {
          await supabase.from('lead').update({
            status: 'connection_pending',
          }).eq('id', leadId);
        }

        await markCommentProcessed(
          job.campaign_id,
          comment.id,
          job.post_id,
          authorId,
          false, // DM not sent (connection pending)
          triggerWord
        );
      }
    } else {
      // No trigger word - mark as processed without action
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

  // Update job metrics and schedule next check - reset error_count on success
  await supabase.from('scrape_jobs').update({
    status: 'scheduled',
    error_count: 0, // Reset on success to prevent accumulated errors from causing auto-fail
    comments_scanned: comments.length,
    trigger_words_found: processedCount,
    dms_sent: dmsSent,
    next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  }).eq('id', job.id);

  console.log(`[COMMENT_MONITOR] Job ${job.id} complete: ${processedCount} triggers, ${emailsCaptured} emails, ${dmsSent} DMs, ${connectionRequestsSent} connection requests`);
  return processedCount;
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

      // Robust 404 detection - check status codes AND message patterns
      const is404Error =
        error.status === 404 ||
        error.statusCode === 404 ||
        error.message?.includes('404') ||
        error.message?.toLowerCase().includes('not found') ||
        error.message?.toLowerCase().includes('resource_not_found');

      // Use atomic RPC to increment error count (prevents race conditions)
      const supabase = getSupabase();
      type ErrorRpcResult = { new_error_count: number; new_status: string; should_send_sentry: boolean };
      const { data: result, error: rpcError } = await supabase
        .rpc('increment_scrape_job_error', {
          p_job_id: job.id,
          p_error_message: error.message,
          p_is_404_error: is404Error
        })
        .single<ErrorRpcResult>();

      if (rpcError || !result) {
        // RPC failed - fallback to non-atomic update (better than nothing)
        console.error('[COMMENT_MONITOR] RPC failed, using fallback:', rpcError);
        await supabase.from('scrape_jobs').update({
          status: 'scheduled',
          error_count: (error.error_count || 0) + 1,
          last_error: error.message,
          last_error_at: new Date().toISOString()
        }).eq('id', job.id);
        continue;
      }

      const { new_error_count, new_status, should_send_sentry } = result;

      // Sentry alerting based on RPC response
      if (new_status === 'failed') {
        console.log(`[COMMENT_MONITOR] Auto-failing job ${job.id} after ${new_error_count} consecutive 404 errors`);
        Sentry.captureMessage(`Comment Reply Job Auto-Failed: ${job.id}`, {
          level: 'warning',
          tags: {
            feature: 'comment-reply',
            job_id: job.id,
            campaign_id: job.campaign_id,
          },
          extra: {
            error_count: new_error_count,
            last_error: error.message,
            post_id: job.unipile_post_id,
            account_id: job.unipile_account_id,
          },
        });
      } else if (should_send_sentry) {
        // Alert for jobs with 2+ errors (but not yet auto-failed)
        Sentry.captureException(error, {
          tags: {
            feature: 'comment-reply',
            job_id: job.id,
          },
          extra: {
            error_count: new_error_count,
            post_id: job.unipile_post_id,
            account_id: job.unipile_account_id,
          },
        });
      }
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
