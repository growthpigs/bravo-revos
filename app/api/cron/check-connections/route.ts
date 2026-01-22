/**
 * Check Connections Cron Job
 * Polls pending_connections table to check if connection requests have been accepted
 * When accepted, sends follow-up DM with guide link
 *
 * Runs every 5 minutes (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkConnectionStatus, sendDirectMessage } from '@/lib/unipile-client';
import {
  buildDMConnectionWithEmail,
  buildDMConnectionNoEmail,
} from '@/lib/message-templates';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Skip verification in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Vercel cron jobs use Authorization: Bearer <secret>
  if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

// Initialize Supabase client with service role
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface PendingConnection {
  id: string;
  campaign_id: string;
  lead_id: string | null;
  commenter_linkedin_id: string;
  commenter_name: string;
  comment_text: string;
  post_id: string;
  invitation_id: string | null;
  invitation_email: string | null; // Email captured from connection note
  created_at: string;
  retry_count: number;
  user_id: string; // CRITICAL: Required for multi-tenant isolation
}

/**
 * Build follow-up DM message for newly connected users
 * Uses message templates - different message based on whether we have their email
 */
function buildFollowUpDMMessage(
  recipientName: string,
  email?: string | null,
  leadMagnetName?: string,
  leadMagnetLink?: string
): string {
  const firstName = recipientName.split(' ')[0];

  if (email && leadMagnetLink) {
    // We have their email from the connection note - send guide immediately
    return buildDMConnectionWithEmail({
      firstName,
      leadMagnetName,
      email,
      link: leadMagnetLink,
    });
  }

  // No email - ask for it
  return buildDMConnectionNoEmail({
    firstName,
    leadMagnetName,
  });
}

export async function GET(request: NextRequest) {
  console.log('[CHECK_CONNECTIONS] Cron job started');

  // Verify authorization
  if (!verifyCronSecret(request)) {
    console.error('[CHECK_CONNECTIONS] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const startTime = Date.now();

  try {
    // Get all pending connections (limit to prevent timeout)
    // CRITICAL: Only process records with user_id for multi-tenant isolation
    const { data: pendingConnections, error: fetchError } = await supabase
      .from('pending_connections')
      .select('*')
      .eq('status', 'pending')
      .not('user_id', 'is', null) // CRITICAL: Only process tenant-scoped records
      .order('created_at', { ascending: true })
      .limit(50); // Process max 50 at a time

    if (fetchError) {
      console.error('[CHECK_CONNECTIONS] Failed to fetch pending connections:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!pendingConnections || pendingConnections.length === 0) {
      console.log('[CHECK_CONNECTIONS] No pending connections to check');
      return NextResponse.json({
        success: true,
        checked: 0,
        accepted: 0,
        dms_sent: 0,
        duration_ms: Date.now() - startTime
      });
    }

    console.log(`[CHECK_CONNECTIONS] Found ${pendingConnections.length} pending connections to check`);

    // Get unique account IDs we need (we need to know which Unipile account to use)
    // For now, we'll get the account from the campaign's scrape_job
    const campaignIds = [...new Set(pendingConnections.map(pc => pc.campaign_id))];

    // CRITICAL: Also get user_ids to validate tenant ownership
    const userIds = [...new Set(pendingConnections.map(pc => pc.user_id))];

    // Get scrape jobs to find Unipile account IDs
    // SECURITY FIX: Join with campaigns to verify tenant ownership
    const { data: scrapeJobs } = await supabase
      .from('scrape_jobs')
      .select(`
        campaign_id,
        unipile_account_id,
        campaigns!inner(user_id)
      `)
      .in('campaign_id', campaignIds);

    // Build map with tenant validation
    const campaignToAccountMap = new Map<string, { accountId: string; userId: string }>();
    if (scrapeJobs) {
      for (const job of scrapeJobs as any[]) {
        if (job.unipile_account_id && job.campaigns?.user_id) {
          campaignToAccountMap.set(job.campaign_id, {
            accountId: job.unipile_account_id,
            userId: job.campaigns.user_id
          });
        }
      }
    }

    let checkedCount = 0;
    let acceptedCount = 0;
    let dmsSentCount = 0;
    const errors: string[] = [];

    for (const pending of pendingConnections as PendingConnection[]) {
      const campaignData = campaignToAccountMap.get(pending.campaign_id);

      if (!campaignData) {
        console.warn(`[CHECK_CONNECTIONS] No account ID for campaign ${pending.campaign_id}`);
        continue;
      }

      // SECURITY: Verify tenant ownership - pending_connection.user_id must match campaign owner
      if (campaignData.userId !== pending.user_id) {
        console.error(`[CHECK_CONNECTIONS] ❌ TENANT MISMATCH: pending_connection user_id ${pending.user_id} != campaign owner ${campaignData.userId}`);
        continue; // Skip to prevent cross-tenant processing
      }

      const accountId = campaignData.accountId;
      checkedCount++;

      try {
        // Check if connection was accepted
        const connectionStatus = await checkConnectionStatus(accountId, pending.commenter_linkedin_id);

        console.log(`[CHECK_CONNECTIONS] Status for ${pending.commenter_name}:`, connectionStatus);

        if (connectionStatus.isConnected) {
          // Connection was accepted!
          console.log(`[CHECK_CONNECTIONS] ✅ ${pending.commenter_name} accepted connection!`);
          acceptedCount++;

          // Update pending_connections record
          await supabase.from('pending_connections').update({
            status: 'accepted',
            connection_accepted_at: new Date().toISOString()
          }).eq('id', pending.id);

          // Send follow-up DM
          // Use email from connection note if available
          try {
            // TODO: Get lead magnet link from campaign config
            const leadMagnetLink = pending.invitation_email ? 'https://example.com/guide' : undefined;

            const dmMessage = buildFollowUpDMMessage(
              pending.commenter_name,
              pending.invitation_email,
              undefined, // leadMagnetName - TODO: get from campaign
              leadMagnetLink
            );

            const dmResult = await sendDirectMessage(
              accountId,
              pending.commenter_linkedin_id,
              dmMessage
            );

            console.log(`[CHECK_CONNECTIONS] ✅ Follow-up DM sent to ${pending.commenter_name}:`, dmResult);
            if (pending.invitation_email) {
              console.log(`[CHECK_CONNECTIONS] 📧 Using email from connection note: ${pending.invitation_email}`);
            }
            dmsSentCount++;

            // Update status - use email_captured if we have email, otherwise dm_sent
            const newStatus = pending.invitation_email ? 'email_captured' : 'dm_sent';
            await supabase.from('pending_connections').update({
              status: newStatus,
              followup_dm_sent_at: new Date().toISOString(),
              followup_dm_message: dmMessage
            }).eq('id', pending.id);

            // Update lead status
            if (pending.lead_id) {
              await supabase.from('lead').update({
                status: newStatus
              }).eq('id', pending.lead_id);
            }

          } catch (dmError: any) {
            console.error(`[CHECK_CONNECTIONS] ❌ DM failed for ${pending.commenter_name}:`, dmError.message);
            errors.push(`DM failed for ${pending.commenter_name}: ${dmError.message}`);

            // Update error info but keep status as accepted
            await supabase.from('pending_connections').update({
              last_error: dmError.message,
              retry_count: pending.retry_count + 1
            }).eq('id', pending.id);
          }

        } else {
          // Still pending - check if expired (over 7 days old)
          const createdAt = new Date(pending.created_at);
          const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceCreated > 7) {
            console.log(`[CHECK_CONNECTIONS] ⏰ Connection request to ${pending.commenter_name} expired (${Math.floor(daysSinceCreated)} days old)`);

            await supabase.from('pending_connections').update({
              status: 'expired'
            }).eq('id', pending.id);

            // Update lead status
            if (pending.lead_id) {
              await supabase.from('lead').update({
                status: 'connection_expired'
              }).eq('id', pending.lead_id);
            }
          }
        }

      } catch (checkError: any) {
        console.error(`[CHECK_CONNECTIONS] Error checking ${pending.commenter_name}:`, checkError.message);
        errors.push(`Check failed for ${pending.commenter_name}: ${checkError.message}`);

        // Increment retry count
        await supabase.from('pending_connections').update({
          last_error: checkError.message,
          retry_count: pending.retry_count + 1
        }).eq('id', pending.id);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[CHECK_CONNECTIONS] Complete: ${checkedCount} checked, ${acceptedCount} accepted, ${dmsSentCount} DMs sent (${duration}ms)`);

    return NextResponse.json({
      success: true,
      checked: checkedCount,
      accepted: acceptedCount,
      dms_sent: dmsSentCount,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration
    });

  } catch (error: any) {
    console.error('[CHECK_CONNECTIONS] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime
    }, { status: 500 });
  }
}
