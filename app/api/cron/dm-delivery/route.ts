import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { sendDirectMessage } from '@/lib/unipile-client'

/**
 * POST /api/cron/dm-delivery
 * Background worker that sends scheduled DM deliveries from dm_sequences
 *
 * Schedule: Every 2 minutes via Vercel Cron
 * Function: Query dm_deliveries → Send via Unipile → Update status → Advance to next step
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[DM_DELIVERY] Cron job started')

  // Verify authentication
  const authResult = verifyCronAuth(request)
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const supabase = await createClient()

    // Query pending deliveries ready to send
    const now = new Date().toISOString()

    const { data: deliveries, error: queryError } = await supabase
      .from('dm_delivery')
      .select(`
        id,
        sequence_id,
        lead_id,
        step_number,
        message_content,
        sent_at,
        retry_count,
        dm_sequences (
          id,
          campaign_id,
          step1_delay_min,
          step1_delay_max,
          step2_confirmation_template,
          step3_enabled,
          step3_delay,
          step3_template,
          sent_count
        ),
        leads (
          id,
          name,
          metadata
        )
      `)
      .eq('status', 'pending')
      .lte('sent_at', now)
      .order('sent_at', { ascending: true })
      .limit(20) // Process max 20 deliveries per run

    if (queryError) {
      console.error('[DM_DELIVERY] Failed to query deliveries:', queryError)
      return NextResponse.json(
        { error: 'Failed to query deliveries', details: queryError.message },
        { status: 500 }
      )
    }

    if (!deliveries || deliveries.length === 0) {
      console.log('[DM_DELIVERY] No deliveries ready to send')
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        duration,
        deliveries_processed: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`[DM_DELIVERY] Found ${deliveries.length} deliveries to send`)

    // Track rate limits per account (assuming single Roderic account for now)
    let dmsSent = 0
    const BATCH_DM_LIMIT = 20
    const results = []

    for (const delivery of deliveries) {
      try {
        // Check batch rate limit
        if (dmsSent >= BATCH_DM_LIMIT) {
          console.warn('[DM_DELIVERY] Batch rate limit reached, stopping')
          break
        }

        const lead = Array.isArray(delivery.leads) ? delivery.leads[0] : delivery.leads
        const sequence = Array.isArray(delivery.dm_sequences) ? delivery.dm_sequences[0] : delivery.dm_sequences

        if (!lead || !sequence) {
          console.error('[DM_DELIVERY] Missing lead or sequence data for delivery', delivery.id)
          results.push({
            delivery_id: delivery.id,
            status: 'error',
            error: 'Missing lead or sequence data'
          })
          continue
        }

        console.log(`[DM_DELIVERY] Sending step ${delivery.step_number} to ${lead.name}`)

        // Get author_id from lead metadata (stored during dm-scraper)
        const authorId = lead.metadata?.author_id
        if (!authorId) {
          console.error('[DM_DELIVERY] No author_id in lead metadata for', lead.id)
          await supabase
            .from('dm_delivery')
            .update({
              status: 'failed',
              error_message: 'Missing author_id in lead metadata',
              updated_at: new Date().toISOString()
            })
            .eq('id', delivery.id)
          continue
        }

        // Get Unipile account ID from campaign (assuming first scrape_job for this campaign)
        const { data: scrapeJob } = await supabase
          .from('scrape_jobs')
          .select('unipile_account_id')
          .eq('campaign_id', sequence.campaign_id)
          .limit(1)
          .maybeSingle()

        if (!scrapeJob) {
          console.error('[DM_DELIVERY] No scrape job found for campaign', sequence.campaign_id)
          await supabase
            .from('dm_delivery')
            .update({
              status: 'failed',
              error_message: 'No Unipile account found for campaign',
              updated_at: new Date().toISOString()
            })
            .eq('id', delivery.id)
          continue
        }

        // Send DM via Unipile
        try {
          await sendDirectMessage(
            scrapeJob.unipile_account_id,
            authorId,
            delivery.message_content
          )

          console.log(`[DM_DELIVERY] Successfully sent step ${delivery.step_number} to ${lead.name}`)

          // Update delivery status to sent
          await supabase
            .from('dm_delivery')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              delivered_at: new Date().toISOString(), // Assume immediate delivery for now
              updated_at: new Date().toISOString()
            })
            .eq('id', delivery.id)

          // Update lead status
          await supabase
            .from('lead')
            .update({
              status: `dm_step${delivery.step_number}_sent`,
              updated_at: new Date().toISOString()
            })
            .eq('id', delivery.lead_id)

          // Update sequence analytics
          await supabase
            .from('dm_sequence')
            .update({
              sent_count: sequence.sent_count + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', delivery.sequence_id)

          dmsSent++

          results.push({
            delivery_id: delivery.id,
            status: 'sent',
            step: delivery.step_number,
            lead_name: lead.name
          })

          // Rate limit: 100ms delay between DMs
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error: any) {
          // Handle Unipile errors
          console.error(`[DM_DELIVERY] Failed to send DM:`, error)

          const retry_count = delivery.retry_count || 0

          if (retry_count < 3) {
            // Retry later
            await supabase
              .from('dm_delivery')
              .update({
                status: 'pending',
                error_message: error.message || 'Send failed',
                retry_count: retry_count + 1,
                last_retry_at: new Date().toISOString(),
                sent_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Retry in 5 min
                updated_at: new Date().toISOString()
              })
              .eq('id', delivery.id)

            console.log(`[DM_DELIVERY] Scheduled retry ${retry_count + 1}/3 for delivery ${delivery.id}`)
          } else {
            // Failed permanently
            await supabase
              .from('dm_delivery')
              .update({
                status: 'failed',
                error_message: error.message || 'Max retries exceeded',
                updated_at: new Date().toISOString()
              })
              .eq('id', delivery.id)

            console.error(`[DM_DELIVERY] Delivery ${delivery.id} failed permanently after 3 retries`)
          }

          results.push({
            delivery_id: delivery.id,
            status: 'error',
            error: error.message || 'Send failed',
            retry_count: retry_count + 1
          })
        }
      } catch (error) {
        console.error(`[DM_DELIVERY] Error processing delivery ${delivery.id}:`, error)
        results.push({
          delivery_id: delivery.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const duration = Date.now() - startTime
    console.log(`[DM_DELIVERY] Completed in ${duration}ms - sent ${dmsSent} DMs`)

    return NextResponse.json({
      success: true,
      duration,
      deliveries_processed: dmsSent,
      total_deliveries: deliveries.length,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[DM_DELIVERY] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
