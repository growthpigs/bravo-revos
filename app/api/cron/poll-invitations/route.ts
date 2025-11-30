/**
 * Poll Invitations Cron Job
 * Polls received connection invitations to extract email from notes
 *
 * When a user sends a connection request with email in the note,
 * we capture that email BEFORE auto-accept (handled by LinkedIn user settings)
 *
 * Flow:
 * 1. Poll received invitations for each active account
 * 2. Match invitations to pending_connections (from our comment flow)
 * 3. Extract email from invitation note if present
 * 4. Update lead with email
 * 5. When connection is established, DM will be sent with the guide
 *
 * Runs every 5 minutes (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getReceivedInvitations,
  sendDirectMessage,
} from '@/lib/unipile-client';
import { extractEmail } from '@/lib/email-extraction';
import {
  buildDMConnectionWithEmail,
  buildDMConnectionNoEmail,
} from '@/lib/message-templates';

// Rate limiting: max invitations to process per run
const MAX_INVITATIONS_PER_RUN = 20;

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

interface LinkedInAccount {
  id: string;
  unipile_account_id: string;
  user_id: string;
}

interface PendingConnection {
  id: string;
  campaign_id: string;
  lead_id: string | null;
  commenter_linkedin_id: string;
  commenter_name: string;
  status: string;
}

export async function GET(request: NextRequest) {
  console.log('[POLL_INVITATIONS] Cron job started');

  // Verify authorization
  if (!verifyCronSecret(request)) {
    console.error('[POLL_INVITATIONS] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const startTime = Date.now();

  try {
    // Get all active LinkedIn accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('linkedin_accounts')
      .select('id, unipile_account_id, user_id')
      .eq('status', 'connected');

    if (accountsError) {
      console.error('[POLL_INVITATIONS] Failed to fetch accounts:', accountsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      console.log('[POLL_INVITATIONS] No active LinkedIn accounts');
      return NextResponse.json({
        success: true,
        invitations_checked: 0,
        emails_captured: 0,
        dms_sent: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    console.log(`[POLL_INVITATIONS] Found ${accounts.length} active accounts`);

    let totalInvitationsChecked = 0;
    let emailsCaptured = 0;
    let dmsSent = 0;
    const errors: string[] = [];

    for (const account of accounts as LinkedInAccount[]) {
      if (!account.unipile_account_id) {
        console.warn(`[POLL_INVITATIONS] Account ${account.id} has no Unipile ID`);
        continue;
      }

      try {
        // Get received invitations
        const invitations = await getReceivedInvitations(account.unipile_account_id);
        console.log(`[POLL_INVITATIONS] Account ${account.id}: ${invitations.length} received invitations`);

        // Rate limit processing
        const invitationsToProcess = invitations.slice(0, MAX_INVITATIONS_PER_RUN);
        totalInvitationsChecked += invitationsToProcess.length;

        for (const invitation of invitationsToProcess) {
          // Check if this sender has a pending connection from our flow
          const { data: pendingConnections } = await supabase
            .from('pending_connections')
            .select('id, campaign_id, lead_id, commenter_linkedin_id, commenter_name, status')
            .eq('commenter_linkedin_id', invitation.sender_id)
            .eq('status', 'pending')
            .limit(1);

          if (!pendingConnections || pendingConnections.length === 0) {
            // This invitation isn't from our lead capture flow
            console.log(`[POLL_INVITATIONS] No pending connection for sender ${invitation.sender_name}`);
            continue;
          }

          const pending = pendingConnections[0] as PendingConnection;
          console.log(`[POLL_INVITATIONS] Found pending connection for ${invitation.sender_name}`);

          // Check if invitation note contains an email
          let capturedEmail: string | null = null;

          if (invitation.message) {
            const emailResult = await extractEmail(invitation.message);
            if (emailResult.email && emailResult.confidence !== 'low') {
              capturedEmail = emailResult.email;
              console.log(`[POLL_INVITATIONS] 📧 Email captured from invitation note: ${capturedEmail}`);
              emailsCaptured++;
            }
          }

          // Store invitation info and email
          await supabase.from('pending_connections').update({
            invitation_note: invitation.message,
            invitation_email: capturedEmail,
            invitation_received_at: invitation.received_at,
          }).eq('id', pending.id);

          // Update lead with email if captured
          if (capturedEmail && pending.lead_id) {
            await supabase.from('leads').update({
              email: capturedEmail,
              status: 'email_captured',
            }).eq('id', pending.lead_id);
            console.log(`[POLL_INVITATIONS] Updated lead ${pending.lead_id} with email`);
          }

          // NOTE: We don't accept invitations here.
          // Auto-accept is handled by LinkedIn user settings.
          // The check-connections cron will detect when connection is established
          // and send the follow-up DM.

          // However, if the user has auto-accept ON and they're now connected,
          // we should check and send DM immediately
          // (This is handled by check-connections cron, not here)
        }

      } catch (accountError: any) {
        console.error(`[POLL_INVITATIONS] Error processing account ${account.id}:`, accountError.message);
        errors.push(`Account ${account.id}: ${accountError.message}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[POLL_INVITATIONS] Complete: ${totalInvitationsChecked} checked, ${emailsCaptured} emails, ${dmsSent} DMs (${duration}ms)`);

    return NextResponse.json({
      success: true,
      invitations_checked: totalInvitationsChecked,
      emails_captured: emailsCaptured,
      dms_sent: dmsSent,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    });

  } catch (error: any) {
    console.error('[POLL_INVITATIONS] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime,
    }, { status: 500 });
  }
}
