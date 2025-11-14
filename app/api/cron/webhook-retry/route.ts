import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { generateWebhookSignature, calculateRetryDelay } from '@/lib/webhook-delivery'

/**
 * POST /api/cron/webhook-retry
 * Background worker that retries failed webhook deliveries
 *
 * Schedule: Every 10 minutes via Vercel Cron
 * Function: Query failed webhooks → Retry POST → Update status
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[WEBHOOK_RETRY] Cron job started')

  // Verify authentication
  const authResult = verifyCronAuth(request)
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const supabase = await createClient()

    // Query failed webhooks ready for retry
    const { data: failedWebhooks, error: queryError } = await supabase
      .from('webhook_logs')
      .select(`
        id,
        lead_id,
        campaign_id,
        webhook_url,
        payload,
        retry_count,
        last_attempt_at
      `)
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .order('last_attempt_at', { ascending: true })
      .limit(20) // Process max 20 per run

    if (queryError) {
      console.error('[WEBHOOK_RETRY] Failed to query webhooks:', queryError)
      return NextResponse.json(
        { error: 'Failed to query webhooks', details: queryError.message },
        { status: 500 }
      )
    }

    if (!failedWebhooks || failedWebhooks.length === 0) {
      console.log('[WEBHOOK_RETRY] No failed webhooks to retry')
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        duration,
        retried: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`[WEBHOOK_RETRY] Found ${failedWebhooks.length} failed webhooks to retry`)

    let successCount = 0
    let failCount = 0
    const results = []

    for (const webhook of failedWebhooks) {
      try {
        // Check if enough time has passed for retry
        const lastAttempt = webhook.last_attempt_at ? new Date(webhook.last_attempt_at) : null
        if (lastAttempt) {
          const requiredDelay = calculateRetryDelay(webhook.retry_count)
          const elapsed = Date.now() - lastAttempt.getTime()

          if (elapsed < requiredDelay) {
            console.log(
              `[WEBHOOK_RETRY] Webhook ${webhook.id} not ready for retry (${elapsed}ms < ${requiredDelay}ms)`
            )
            continue
          }
        }

        console.log(`[WEBHOOK_RETRY] Retrying webhook ${webhook.id} (attempt ${webhook.retry_count + 1}/3)`)

        // Get webhook secret (prefer WEBHOOK_SECRET, fallback to CRON_SECRET)
        const webhookSecret = process.env.WEBHOOK_SECRET || process.env.CRON_SECRET!

        // Generate signature
        const signature = generateWebhookSignature(webhook.payload, webhookSecret)

        // Send webhook
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': webhook.payload.timestamp,
            'User-Agent': 'BravoRevOS-Webhook/1.0'
          },
          body: JSON.stringify(webhook.payload),
          signal: controller.signal
        })

        clearTimeout(timeout)

        const responseBody = await response.text()

        if (response.ok) {
          // Success - mark as sent
          await supabase
            .from('webhook_logs')
            .update({
              status: 'sent',
              response_status: response.status,
              response_body: responseBody.substring(0, 1000),
              last_attempt_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', webhook.id)

          console.log(`[WEBHOOK_RETRY] Webhook ${webhook.id} delivered successfully`)
          successCount++
          results.push({ webhook_id: webhook.id, status: 'sent' })
        } else {
          // Failed - increment retry count
          const newRetryCount = webhook.retry_count + 1

          await supabase
            .from('webhook_logs')
            .update({
              status: newRetryCount >= 3 ? 'failed' : 'failed',
              retry_count: newRetryCount,
              response_status: response.status,
              error_message: `HTTP ${response.status}: ${responseBody.substring(0, 500)}`,
              last_attempt_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', webhook.id)

          console.warn(
            `[WEBHOOK_RETRY] Webhook ${webhook.id} failed (${newRetryCount}/3): HTTP ${response.status}`
          )
          failCount++
          results.push({
            webhook_id: webhook.id,
            status: 'failed',
            error: `HTTP ${response.status}`,
            attempts: newRetryCount
          })
        }

        // Rate limit: 100ms delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[WEBHOOK_RETRY] Error processing webhook ${webhook.id}:`, error)

        // Update retry count on error
        const newRetryCount = webhook.retry_count + 1

        await supabase
          .from('webhook_logs')
          .update({
            status: 'failed',
            retry_count: newRetryCount,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            last_attempt_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', webhook.id)

        results.push({
          webhook_id: webhook.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const duration = Date.now() - startTime
    console.log(`[WEBHOOK_RETRY] Completed in ${duration}ms - ${successCount} sent, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      duration,
      retried: successCount + failCount,
      sent: successCount,
      failed: failCount,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[WEBHOOK_RETRY] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
