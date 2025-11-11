import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getAllPostComments, sendDirectMessage } from '@/lib/unipile-client'

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
    const supabase = await createClient()

    // Query scrape jobs ready for processing
    const now = new Date().toISOString()

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
        error_count
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

    for (const job of jobs) {
      try {
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
        console.log(`[DM_SCRAPER] Polling Unipile for post ${job.unipile_post_id}`)

        let comments
        try {
          comments = await getAllPostComments(
            job.unipile_account_id,
            job.unipile_post_id
          )
        } catch (error: any) {
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
          throw error
        }

        console.log(`[DM_SCRAPER] Found ${comments.length} comments on post`)

        // Filter comments containing trigger word
        const triggerWord = job.trigger_word.toLowerCase()
        const triggeredComments = comments.filter((comment) =>
          comment.text?.toLowerCase().includes(triggerWord)
        )

        console.log(`[DM_SCRAPER] Found ${triggeredComments.length} comments with trigger word "${job.trigger_word}"`)

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
            // Check if we already DM'd this commenter
            const { data: existingLead } = await supabase
              .from('leads')
              .select('id')
              .eq('campaign_id', job.campaign_id)
              .eq('linkedin_profile_url', comment.author.profile_url)
              .maybeSingle()

            if (existingLead) {
              console.log(`[DM_SCRAPER] Already sent DM to ${comment.author.name}, skipping`)
              continue
            }

            // Create lead record first
            const { data: newLead, error: leadError } = await supabase
              .from('leads')
              .insert({
                campaign_id: job.campaign_id,
                linkedin_profile_url: comment.author.profile_url,
                name: comment.author.name,
                status: 'dm_pending',
                source: 'comment_trigger',
                metadata: {
                  comment_id: comment.id,
                  comment_text: comment.text,
                  trigger_word: job.trigger_word,
                  post_id: job.unipile_post_id,
                  author_id: comment.author.id
                }
              })
              .select()
              .single()

            if (leadError || !newLead) {
              console.error(`[DM_SCRAPER] Failed to create lead:`, leadError)
              continue
            }

            if (dmSequence) {
              // Use DM sequence - create delivery record
              console.log(`[DM_SCRAPER] Creating DM delivery for ${comment.author.name} using sequence`)

              const delay = Math.floor(
                Math.random() * (dmSequence.step1_delay_max - dmSequence.step1_delay_min) +
                dmSequence.step1_delay_min
              )

              await supabase.from('dm_deliveries').insert({
                sequence_id: dmSequence.id,
                lead_id: newLead.id,
                step_number: 1,
                status: 'pending',
                message_content: dmSequence.step1_template
                  .replace(/\{\{first_name\}\}/g, comment.author.name.split(' ')[0] || comment.author.name)
                  .replace(/\{\{last_name\}\}/g, comment.author.name.split(' ').slice(1).join(' ') || '')
                  .replace(/\{\{company\}\}/g, ''),
                sent_at: new Date(Date.now() + delay * 60 * 1000).toISOString()
              })

              dmsSent++
            } else {
              // Fallback: Direct DM (legacy behavior)
              console.log(`[DM_SCRAPER] Sending direct DM to ${comment.author.name} (no sequence)`)

              const dmMessage = `Hey ${comment.author.name}! Thanks for your interest. To get the ${job.trigger_word}, could you reply with your best email address? I'll send it right over.`

              await sendDirectMessage(
                job.unipile_account_id,
                comment.author.id,
                dmMessage
              )

              await supabase
                .from('leads')
                .update({ status: 'dm_sent' })
                .eq('id', newLead.id)

              console.log(`[DM_SCRAPER] Sent direct DM to ${comment.author.name}`)

              dmsSent++
              rateLimit.dmsSent++
            }

            // Rate limit: 100ms delay between operations
            await new Promise((resolve) => setTimeout(resolve, 100))
          } catch (error) {
            console.error(`[DM_SCRAPER] Failed to process ${comment.author.name}:`, error)
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
