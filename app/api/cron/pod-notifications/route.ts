import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { Resend } from 'resend'
import { generatePodRepostEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST /api/cron/pod-notifications
 * Background worker that sends pod repost notifications via email
 *
 * Schedule: Every 15 minutes via Vercel Cron
 * Function: Query pending notifications → Send emails → Update status
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[POD_NOTIFICATIONS] Cron job started')

  // Verify authentication
  const authResult = verifyCronAuth(request)
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const supabase = await createClient()

    // Query pending pod notifications
    const { data: notifications, error: queryError } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        post_id,
        linkedin_url,
        message,
        metadata
      `)
      .eq('status', 'pending')
      .eq('type', 'pod_repost')
      .order('created_at', { ascending: true })
      .limit(50) // Process max 50 per run

    if (queryError) {
      console.error('[POD_NOTIFICATIONS] Failed to query notifications:', queryError)
      return NextResponse.json(
        { error: 'Failed to query notifications', details: queryError.message },
        { status: 500 }
      )
    }

    if (!notifications || notifications.length === 0) {
      console.log('[POD_NOTIFICATIONS] No pending notifications')
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        duration,
        sent: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`[POD_NOTIFICATIONS] Found ${notifications.length} pending notifications`)

    let sentCount = 0
    let failCount = 0
    const results = []

    for (const notification of notifications) {
      try {
        // Get user email
        const { data: user } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', notification.user_id)
          .single()

        if (!user || !user.email) {
          console.warn(`[POD_NOTIFICATIONS] User ${notification.user_id} has no email, skipping`)
          await supabase
            .from('notifications')
            .update({
              status: 'failed',
              error_message: 'User has no email address',
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id)
          failCount++
          continue
        }

        // Generate email
        const emailData = generatePodRepostEmail({
          recipientName: user.full_name || user.email.split('@')[0],
          posterName: notification.metadata?.poster_name || 'A pod member',
          linkedinUrl: notification.linkedin_url,
          postPreview: notification.metadata?.post_preview
        })

        // Send via Resend
        console.log(`[POD_NOTIFICATIONS] Sending notification ${notification.id} to ${user.email}`)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'Bravo revOS <notifications@bravorevos.com>',
          to: user.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        })

        if (emailError) {
          throw emailError
        }

        // Mark as sent
        await supabase
          .from('notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: {
              ...notification.metadata,
              email_id: emailResult?.id
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        console.log(`[POD_NOTIFICATIONS] Sent notification ${notification.id} successfully`)
        sentCount++
        results.push({ notification_id: notification.id, status: 'sent', email: user.email })

        // Rate limit: 100ms delay between emails
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[POD_NOTIFICATIONS] Error sending notification ${notification.id}:`, error)

        await supabase
          .from('notifications')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        failCount++
        results.push({
          notification_id: notification.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const duration = Date.now() - startTime
    console.log(`[POD_NOTIFICATIONS] Completed in ${duration}ms - ${sentCount} sent, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      duration,
      sent: sentCount,
      failed: failCount,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[POD_NOTIFICATIONS] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
