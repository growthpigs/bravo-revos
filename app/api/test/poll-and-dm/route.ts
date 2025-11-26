/**
 * POST /api/test/poll-and-dm
 * TESTING ONLY: Polls comments and sends DMs SYNCHRONOUSLY (no Redis worker needed)
 *
 * This bypasses the BullMQ queue and sends DMs immediately.
 * Use for testing the full flow without needing a background worker.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getAllPostComments, sendDirectMessage } from '@/lib/unipile-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Trigger words that indicate interest
const TRIGGER_WORDS = [
  'interested', 'send it', 'dm me', 'yes please', 'i want this',
  'send me', 'im in', "i'm in", 'count me in', 'info please',
  'more info', 'tell me more', 'how do i', 'sign me up',
  'link please', 'yes!', 'absolutely', 'definitely',
  'guide', 'checklist', 'download', 'free', 'want it',
  'need this', 'share it',
];

function containsTriggerWord(text: string, customTrigger?: string): string | null {
  const lowerText = text.toLowerCase();

  // Check custom trigger first
  if (customTrigger && lowerText.includes(customTrigger.toLowerCase())) {
    return customTrigger;
  }

  // Check default triggers
  for (const trigger of TRIGGER_WORDS) {
    if (lowerText.includes(trigger)) {
      return trigger;
    }
  }
  return null;
}

function buildDMMessage(recipientName: string, triggerWord: string): string {
  const firstName = recipientName.split(' ')[0];
  return `Hey ${firstName}! 👋

Thanks for your interest! I saw you commented "${triggerWord}" on my post.

I'd love to share more details with you. What's the best email to send it to?`;
}

export async function POST(request: NextRequest) {
  console.log('[TEST_POLL_DM] ========================================');
  console.log('[TEST_POLL_DM] Starting synchronous poll + DM test');
  console.log('[TEST_POLL_DM] ========================================');

  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TEST_POLL_DM] User:', user.email);

    // Use service role for database operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get active scrape jobs
    const { data: scrapeJobs, error: jobsError } = await serviceSupabase
      .from('scrape_jobs')
      .select('*')
      .in('status', ['scheduled', 'running'])
      .or(`next_check.is.null,next_check.lte.${new Date().toISOString()}`);

    if (jobsError) {
      console.error('[TEST_POLL_DM] Failed to fetch scrape jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch scrape jobs' }, { status: 500 });
    }

    console.log('[TEST_POLL_DM] Found scrape jobs:', scrapeJobs?.length || 0);

    if (!scrapeJobs || scrapeJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active scrape jobs found',
        jobs_processed: 0,
        comments_found: 0,
        dms_sent: 0,
      });
    }

    const results = {
      jobs_processed: 0,
      comments_found: 0,
      triggers_matched: 0,
      dms_sent: 0,
      dms_failed: 0,
      errors: [] as string[],
      details: [] as any[],
    };

    for (const job of scrapeJobs) {
      console.log(`[TEST_POLL_DM] Processing job ${job.id} for post ${job.unipile_post_id}`);
      results.jobs_processed++;

      // Update job status
      await serviceSupabase
        .from('scrape_jobs')
        .update({ status: 'running', last_checked: new Date().toISOString() })
        .eq('id', job.id);

      try {
        // Fetch comments from Unipile
        console.log('[TEST_POLL_DM] Fetching comments from Unipile...');
        const comments = await getAllPostComments(job.unipile_account_id, job.unipile_post_id);
        console.log(`[TEST_POLL_DM] Found ${comments.length} comments`);
        results.comments_found += comments.length;

        // Get already processed comment IDs
        const { data: processedData } = await serviceSupabase
          .from('processed_comments')
          .select('comment_id')
          .eq('campaign_id', job.campaign_id);

        const processedIds = new Set((processedData || []).map(d => d.comment_id));

        for (const comment of comments) {
          // Skip already processed
          if (processedIds.has(comment.id)) {
            console.log(`[TEST_POLL_DM] Skipping already processed comment ${comment.id}`);
            continue;
          }

          console.log(`[TEST_POLL_DM] Checking comment: "${comment.text}" by ${comment.author.name}`);

          // Check for trigger words
          const triggerWord = containsTriggerWord(comment.text, job.trigger_word);

          if (triggerWord) {
            console.log(`[TEST_POLL_DM] TRIGGER FOUND: "${triggerWord}" in comment by ${comment.author.name}`);
            results.triggers_matched++;

            // Build DM message
            const dmMessage = buildDMMessage(comment.author.name, triggerWord);

            // Send DM immediately (synchronous, no queue)
            try {
              console.log(`[TEST_POLL_DM] Sending DM to ${comment.author.name} (${comment.author.id})...`);
              const dmResult = await sendDirectMessage(
                job.unipile_account_id,
                comment.author.id,
                dmMessage
              );

              console.log('[TEST_POLL_DM] DM SENT:', dmResult);
              results.dms_sent++;

              results.details.push({
                comment_id: comment.id,
                commenter: comment.author.name,
                trigger_word: triggerWord,
                dm_sent: true,
                dm_result: dmResult,
              });

              // Mark comment as processed with DM sent
              await serviceSupabase.from('processed_comments').insert({
                campaign_id: job.campaign_id,
                comment_id: comment.id,
                post_id: job.post_id,
                commenter_linkedin_id: comment.author.id,
                dm_queued: true,
                trigger_word: triggerWord,
                processed_at: new Date().toISOString(),
              });

              // Create lead record
              await serviceSupabase.from('leads').insert({
                campaign_id: job.campaign_id,
                linkedin_id: comment.author.id,
                name: comment.author.name,
                headline: comment.author.headline || null,
                profile_url: comment.author.profile_url || null,
                trigger_word: triggerWord,
                comment_text: comment.text,
                status: 'dm_sent',
                dm_sent_at: new Date().toISOString(),
              }).onConflict('campaign_id,linkedin_id');

            } catch (dmError: any) {
              console.error('[TEST_POLL_DM] DM FAILED:', dmError);
              results.dms_failed++;
              results.errors.push(`DM to ${comment.author.name}: ${dmError.message}`);

              results.details.push({
                comment_id: comment.id,
                commenter: comment.author.name,
                trigger_word: triggerWord,
                dm_sent: false,
                error: dmError.message,
              });

              // Still mark as processed to avoid retrying
              await serviceSupabase.from('processed_comments').insert({
                campaign_id: job.campaign_id,
                comment_id: comment.id,
                post_id: job.post_id,
                commenter_linkedin_id: comment.author.id,
                dm_queued: false,
                trigger_word: triggerWord,
                processed_at: new Date().toISOString(),
              });
            }
          } else {
            // No trigger - mark as processed without DM
            await serviceSupabase.from('processed_comments').insert({
              campaign_id: job.campaign_id,
              comment_id: comment.id,
              post_id: job.post_id,
              commenter_linkedin_id: comment.author.id,
              dm_queued: false,
              trigger_word: null,
              processed_at: new Date().toISOString(),
            });
          }
        }

        // Update job for next check
        await serviceSupabase.from('scrape_jobs').update({
          status: 'scheduled',
          comments_scanned: (job.comments_scanned || 0) + comments.length,
          trigger_words_found: (job.trigger_words_found || 0) + results.triggers_matched,
          next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }).eq('id', job.id);

      } catch (jobError: any) {
        console.error(`[TEST_POLL_DM] Job ${job.id} failed:`, jobError);
        results.errors.push(`Job ${job.id}: ${jobError.message}`);

        await serviceSupabase.from('scrape_jobs').update({
          last_error: jobError.message,
          last_error_at: new Date().toISOString(),
        }).eq('id', job.id);
      }
    }

    console.log('[TEST_POLL_DM] ========================================');
    console.log('[TEST_POLL_DM] Complete:', results);
    console.log('[TEST_POLL_DM] ========================================');

    return NextResponse.json({
      success: true,
      message: `Processed ${results.jobs_processed} jobs, found ${results.triggers_matched} triggers, sent ${results.dms_sent} DMs`,
      ...results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[TEST_POLL_DM] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET for easy browser testing
export async function GET(request: NextRequest) {
  return POST(request);
}
