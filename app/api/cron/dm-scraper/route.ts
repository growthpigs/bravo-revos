import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getAllPostComments, sendDirectMessage } from '@/lib/unipile-client'
import { upsertLead } from '@/lib/utils/db-helpers'

/**
 * POST /api/cron/dm-scraper
 * Background worker that polls scheduled scrape jobs and processes DMs
 *
 * Schedule: Every 5 minutes via Vercel Cron
 * Function: Query scrape_jobs → Poll Unipile → Process DMs → Update status
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[DM_SCRAPER] Cron job started')

  // Verify authentication
  const authResult = verifyCronAuth(request)
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    // Use service role for cron jobs (no user context, bypasses RLS)
    const supabase = await createClient({ isServiceRole: true })

    // Query scrape jobs ready for processing
    const now = new Date().toISOString()

    // SECURITY: Join with campaigns to get user_id for tenant validation
    // This ensures we can verify ownership before processing any job
    const { data: jobs, error: queryError } = await supabase
      .from('scrape_jobs')
      .select(`
        id,
        campaign_id,
        post_id,
        unipile_post_id,
        unipile_account_id,
        trigger_word,
        poll_interval_minutes,
        comments_scanned,
        trigger_words_found,
        dms_sent,
        emails_captured,
        error_count,
        campaigns!inner(user_id, client_id)
      `)
      .in('status', ['scheduled', 'running'])
      .lte('next_check', now)
      .order('next_check', { ascending: true })
      .limit(10) // Process max 10 jobs per run

    if (queryError) {
      console.error('[DM_SCRAPER] Failed to query jobs:', queryError)
      return NextResponse.json(
        { error: 'Failed to query jobs', details: queryError.message },
        { status: 500 }
      )
    }

    if (!jobs || jobs.length === 0) {
      console.log('[DM_SCRAPER] No jobs ready for processing')
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        duration,
        jobs_processed: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`[DM_SCRAPER] Found ${jobs.length} jobs to process`)

    // Track rate limits per account
    const accountRateLimits = new Map<string, { dmsSent: number; lastReset: Date }>()
    const HOURLY_DM_LIMIT = 20

    let processedCount = 0
    const results = []

    for (const job of jobs as any[]) {
      try {
        // SECURITY: Verify tenant context exists (from campaigns!inner JOIN)
        const jobUserId = job.campaigns?.user_id;
        const jobClientId = job.campaigns?.client_id;

        if (!jobUserId || !jobClientId) {
          console.error(`[DM_SCRAPER] ❌ SKIPPING job ${job.id} - missing tenant context (user_id: ${jobUserId}, client_id: ${jobClientId})`);
          results.push({
            job_id: job.id,
            status: 'skipped',
            message: 'Missing tenant context - possible orphaned job'
          });
          continue;
        }

        console.log(`[DM_SCRAPER] Processing job ${job.id} for tenant user_id=${jobUserId}, client_id=${jobClientId}`);

        // Check rate limits
        const accountKey = job.unipile_account_id
        const nowDate = new Date()

        if (!accountRateLimits.has(accountKey)) {
          accountRateLimits.set(accountKey, { dmsSent: 0, lastReset: nowDate })
        }

        const rateLimit = accountRateLimits.get(accountKey)!

        // Reset hourly counter
        if (nowDate.getTime() - rateLimit.lastReset.getTime() > 60 * 60 * 1000) {
          rateLimit.dmsSent = 0
          rateLimit.lastReset = nowDate
        }

        if (rateLimit.dmsSent >= HOURLY_DM_LIMIT) {
          console.warn(`[DM_SCRAPER] Rate limit reached for account ${accountKey}, skipping`)
          results.push({
            job_id: job.id,
            status: 'rate_limited',
            message: 'Hourly DM limit reached'
          })
          continue
        }

        console.log(`[DM_SCRAPER] Processing job ${job.id}`)

        // Update status to running
        await supabase
          .from('scrape_jobs')
          .update({
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        // Poll Unipile for comments
        console.log(`[DM_SCRAPER] ========================================`)
        console.log(`[DM_SCRAPER] Polling Unipile for post ${job.unipile_post_id}`)
        console.log(`[DM_SCRAPER] Account ID: ${job.unipile_account_id}`)
        console.log(`[DM_SCRAPER] Trigger word: "${job.trigger_word}"`)

        let comments: any[] = []
        try {
          comments = await getAllPostComments(
            job.unipile_account_id,
            job.unipile_post_id
          )
          console.log(`[DM_SCRAPER] getAllPostComments returned ${comments.length} comments`)
        } catch (error: any) {
          console.error(`[DM_SCRAPER] getAllPostComments FAILED:`, error.message || error)
          if (error.status === 429 || error.message?.includes('rate limit')) {
            console.warn('[DM_SCRAPER] Unipile rate limit hit, backing off')
            await supabase
              .from('scrape_jobs')
              .update({
                status: 'scheduled',
                next_check: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                last_error: 'Unipile rate limit reached',
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id)
            continue
          }
          // For other errors, log but continue to update job status
          await supabase
            .from('scrape_jobs')
            .update({
              status: 'scheduled',
              next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              last_error: `getAllPostComments failed: ${error.message || 'Unknown error'}`,
              error_count: (job.error_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)
          continue
        }

        console.log(`[DM_SCRAPER] Found ${comments.length} comments on post`)

        // Get post owner's profile URL for self-comment filtering
        const { data: postOwner } = await supabase
          .from('linkedin_accounts')
          .select('profile_url')
          .eq('unipile_account_id', job.unipile_account_id)
          .single()

        const ownerProfileUrl = postOwner?.profile_url?.toLowerCase() || ''
        console.log(`[DM_SCRAPER] Post owner profile URL: ${ownerProfileUrl || 'not found'}`)

        // Filter comments containing trigger word AND exclude self-comments
        const triggerWord = job.trigger_word.toLowerCase()
        console.log(`[DM_SCRAPER] Filtering ${comments.length} comments for trigger word: "${triggerWord}"`)

        // Log each comment for debugging
        comments.forEach((comment, i) => {
          console.log(`[DM_SCRAPER] Comment ${i + 1}:`, {
            id: comment.id,
            author: comment.author?.name,
            authorUrl: comment.author?.profile_url,
            text: comment.text?.substring(0, 50),
            hasTrigger: comment.text?.toLowerCase().includes(triggerWord)
          })
        })

        const triggeredComments = comments.filter((comment) => {
          // CRITICAL: Skip comments without valid author data (prevents TypeError crashes)
          if (!comment.author || !comment.author.id) {
            console.log(`[DM_SCRAPER] ⚠️ Skipping comment ${comment.id} - missing author data`)
            return false
          }

          const hasTriggerWord = comment.text?.toLowerCase().includes(triggerWord)
          if (!hasTriggerWord) {
            console.log(`[DM_SCRAPER] Comment from ${comment.author.name || 'Unknown'} does NOT contain trigger word`)
            return false
          }

          console.log(`[DM_SCRAPER] Comment from ${comment.author.name || 'Unknown'} CONTAINS trigger word "${triggerWord}"`)

          // Exclude self-comments (post author commenting on their own post)
          const commentAuthorUrl = comment.author.profile_url?.toLowerCase() || ''
          const ownerUsername = ownerProfileUrl.replace('https://www.linkedin.com/in/', '').replace('/', '')
          const authorUsername = commentAuthorUrl.replace('https://www.linkedin.com/in/', '').replace('/', '')

          console.log(`[DM_SCRAPER] Self-comment check: owner="${ownerUsername}" author="${authorUsername}"`)

          if (ownerProfileUrl && commentAuthorUrl && authorUsername === ownerUsername) {
            console.log(`[DM_SCRAPER] ⚠️ Skipping self-comment from ${comment.author.name || 'Unknown'} (owner commenting on own post)`)
            // TODO: For testing, allow self-comments. Remove this line in production.
            // return false
            console.log(`[DM_SCRAPER] 🧪 TEST MODE: Allowing self-comment for debugging`)
          }

          return true
        })

        console.log(`[DM_SCRAPER] Found ${triggeredComments.length} comments with trigger word "${job.trigger_word}" (excluding self-comments)`)

        // Get active DM sequence for this campaign (if exists)
        const { data: dmSequence } = await supabase
          .from('dm_sequences')
          .select('*')
          .eq('campaign_id', job.campaign_id)
          .eq('status', 'active')
          .maybeSingle()

        console.log(`[DM_SCRAPER] ${dmSequence ? 'Found' : 'No'} active DM sequence for campaign`)

        // Send auto-DM to commenters with trigger word
        let dmsSent = 0

        for (const comment of triggeredComments) {
          try {
            // Extract author info safely (should already be validated by filter, but defensive coding)
            const authorName = comment.author?.name || 'Unknown User'
            const authorId = comment.author?.id
            const authorProfileUrl = comment.author?.profile_url || ''

            if (!authorId) {
              console.warn(`[DM_SCRAPER] ⚠️ Skipping comment with no author ID: ${comment.id}`)
              continue
            }

            // Use atomic upsert to prevent race condition (duplicate leads)
            // This replaces the unsafe check-then-insert pattern
            const upsertResult = await upsertLead(supabase, {
              campaign_id: job.campaign_id,
              linkedin_id: authorId, // Required - unique LinkedIn identifier
              linkedin_url: authorProfileUrl, // Optional - full profile URL
              name: authorName,
              status: 'dm_pending',
              source: 'comment_trigger',
              metadata: {
                comment_id: comment.id,
                comment_text: comment.text,
                trigger_word: job.trigger_word,
                post_id: job.unipile_post_id
              }
            })

            if (!upsertResult.success) {
              console.error(`[DM_SCRAPER] Failed to upsert lead:`, upsertResult.error)
              continue
            }

            // If lead already existed (not a new insert), skip DM
            if (!upsertResult.wasInsert) {
              console.log(`[DM_SCRAPER] Already sent DM to ${authorName}, skipping`)
              continue
            }

            const newLead = upsertResult.data!

            if (dmSequence) {
              // Use DM sequence - create delivery record
              console.log(`[DM_SCRAPER] Creating DM delivery for ${authorName} using sequence`)

              const delay = Math.floor(
                Math.random() * (dmSequence.step1_delay_max - dmSequence.step1_delay_min) +
                dmSequence.step1_delay_min
              )

              const firstName = authorName.split(' ')[0] || authorName
              const lastName = authorName.split(' ').slice(1).join(' ') || ''

              await supabase.from('dm_deliveries').insert({
                sequence_id: dmSequence.id,
                lead_id: newLead.id,
                step_number: 1,
                status: 'pending',
                message_content: dmSequence.step1_template
                  .replace(/\{\{first_name\}\}/g, firstName)
                  .replace(/\{\{last_name\}\}/g, lastName)
                  .replace(/\{\{company\}\}/g, ''),
                sent_at: new Date(Date.now() + delay * 60 * 1000).toISOString()
              })

              dmsSent++
            } else {
              // Fallback: Direct DM (legacy behavior)
              console.log(`[DM_SCRAPER] Sending direct DM to ${authorName} (no sequence)`)

              const dmMessage = `Hey ${authorName}! Thanks for your interest. To get the ${job.trigger_word}, could you reply with your best email address? I'll send it right over.`

              await sendDirectMessage(
                job.unipile_account_id,
                authorId,
                dmMessage
              )

              await supabase
                .from('leads')
                .update({ status: 'dm_sent' })
                .eq('id', newLead.id)

              console.log(`[DM_SCRAPER] Sent direct DM to ${authorName}`)

              dmsSent++
              rateLimit.dmsSent++
            }

            // Rate limit: 100ms delay between operations
            await new Promise((resolve) => setTimeout(resolve, 100))
          } catch (error) {
            console.error(`[DM_SCRAPER] Failed to process ${comment.author?.name || comment.id}:`, error)
          }
        }

        console.log(`[DM_SCRAPER] Sent ${dmsSent} auto-DMs`)

        // Check for DM replies with email addresses
        // TODO: Implement getDirectMessages in unipile-client.ts to check for email replies
        // For now, skipping email extraction (will be added in future iteration)
        console.log(`[DM_SCRAPER] Email extraction not yet implemented - skipping for job ${job.id}`)
        const emailsCaptured = 0

        // Update job metrics and schedule next check
        const nextCheck = new Date(Date.now() + job.poll_interval_minutes * 60 * 1000).toISOString()

        await supabase
          .from('scrape_jobs')
          .update({
            status: 'scheduled',
            next_check: nextCheck,
            last_checked: new Date().toISOString(),
            comments_scanned: job.comments_scanned + comments.length,
            trigger_words_found: job.trigger_words_found + triggeredComments.length,
            dms_sent: job.dms_sent + dmsSent,
            emails_captured: job.emails_captured + emailsCaptured,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        processedCount++
        results.push({ job_id: job.id, status: 'processed' })
      } catch (error) {
        console.error(`[DM_SCRAPER] Error processing job ${job.id}:`, error)

        // Update job error tracking
        await supabase
          .from('scrape_jobs')
          .update({
            status: 'scheduled',
            error_count: (job.error_count || 0) + 1,
            last_error: error instanceof Error ? error.message : 'Unknown error',
            last_error_at: new Date().toISOString(),
            next_check: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        results.push({
          job_id: job.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const duration = Date.now() - startTime
    console.log(`[DM_SCRAPER] Completed in ${duration}ms - processed ${processedCount}/${jobs.length} jobs`)

    return NextResponse.json({
      success: true,
      duration,
      jobs_processed: processedCount,
      total_jobs: jobs.length,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[DM_SCRAPER] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
