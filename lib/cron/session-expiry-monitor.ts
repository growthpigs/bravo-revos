/**
 * Session Expiry Monitor
 * Checks for expiring LinkedIn sessions and sends alerts
 * Run via cron: every 6 hours
 */

import { createClient } from '@/lib/supabase/server';
import { sendSessionExpiryEmail } from '@/lib/notifications/email';

export interface SessionAlert {
  id: string;
  linkedin_account_id: string;
  pod_member_id: string | null;
  alert_type: '7_days' | '1_day' | 'expired';
  session_expires_at: string;
  sent_via: string[];
  sent_at: string;
  linkedin_account: {
    account_name: string;
    profile_data: {
      name?: string;
      email?: string;
    };
    session_expires_at: string;
    user: {
      email: string;
      first_name: string;
      last_name: string;
    };
  };
  pod_member?: {
    pod: {
      name: string;
      client: {
        name: string;
      };
    };
  };
}

export async function monitorSessionExpiry() {
  console.log('[SESSION_MONITOR] Starting session expiry check...');

  try {
    const supabase = await createClient();

    // Run the database function to check and create alerts
    const { error: checkError } = await supabase.rpc('check_expiring_sessions');

    if (checkError) {
      console.error('[SESSION_MONITOR] Error running check_expiring_sessions:', checkError);
      throw checkError;
    }

    console.log('[SESSION_MONITOR] Check complete, fetching new alerts...');

    // Get unsent alerts (sent within last 5 minutes, indicating they're new)
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const { data: alerts, error: alertsError } = await supabase
      .from('session_expiry_alerts')
      .select(`
        id,
        linkedin_account_id,
        pod_member_id,
        alert_type,
        session_expires_at,
        sent_via,
        sent_at,
        linkedin_accounts (
          account_name,
          profile_data,
          session_expires_at,
          users (
            email,
            first_name,
            last_name
          )
        ),
        pod_members (
          pods (
            name,
            clients (name)
          )
        )
      `)
      .gte('sent_at', fiveMinutesAgo.toISOString())
      .eq('sent_via', '{}'); // Only unsent alerts

    if (alertsError) {
      console.error('[SESSION_MONITOR] Error fetching alerts:', alertsError);
      throw alertsError;
    }

    if (!alerts || alerts.length === 0) {
      console.log('[SESSION_MONITOR] No new alerts to send');
      return {
        success: true,
        alerts_processed: 0,
      };
    }

    console.log(`[SESSION_MONITOR] Processing ${alerts.length} new alerts...`);

    // Send notifications for each alert
    const results = await Promise.allSettled(
      alerts.map(async (alert: any) => {
        const sessionAlert: SessionAlert = {
          id: alert.id,
          linkedin_account_id: alert.linkedin_account_id,
          pod_member_id: alert.pod_member_id,
          alert_type: alert.alert_type,
          session_expires_at: alert.session_expires_at,
          sent_via: alert.sent_via,
          sent_at: alert.sent_at,
          linkedin_account: {
            account_name: alert.linkedin_accounts.account_name,
            profile_data: alert.linkedin_accounts.profile_data,
            session_expires_at: alert.linkedin_accounts.session_expires_at,
            user: alert.linkedin_accounts.users,
          },
        };

        if (alert.pod_members) {
          sessionAlert.pod_member = {
            pod: alert.pod_members.pods,
          };
        }

        return await sendNotification(sessionAlert, supabase);
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `[SESSION_MONITOR] Complete. Sent: ${successful}, Failed: ${failed}`
    );

    return {
      success: true,
      alerts_processed: alerts.length,
      sent: successful,
      failed,
    };
  } catch (error) {
    console.error('[SESSION_MONITOR] Fatal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendNotification(alert: SessionAlert, supabase: any) {
  const { alert_type, linkedin_account } = alert;
  const user = linkedin_account.user;
  const accountName = linkedin_account.account_name;
  const expiresAt = new Date(linkedin_account.session_expires_at);

  let subject = '';
  let message = '';

  switch (alert_type) {
    case '7_days':
      subject = `LinkedIn Session Expiring in 7 Days - ${accountName}`;
      message = `Your LinkedIn account "${accountName}" session will expire in 7 days (${expiresAt.toLocaleDateString()}). Please reconnect soon to avoid interruption.`;
      break;
    case '1_day':
      subject = `⚠️ LinkedIn Session Expiring Tomorrow - ${accountName}`;
      message = `URGENT: Your LinkedIn account "${accountName}" session will expire tomorrow (${expiresAt.toLocaleDateString()}). Reconnect now to avoid disruption.`;
      break;
    case 'expired':
      subject = `🚨 LinkedIn Session Expired - ${accountName}`;
      message = `Your LinkedIn account "${accountName}" session has expired. Reconnect immediately to resume automation.`;
      break;
  }

  // Add pod context if this is a pod member
  if (alert.pod_member) {
    const podName = alert.pod_member.pod.name;
    const clientName = alert.pod_member.pod.client.name;
    message += `\n\nPod: ${podName}\nClient: ${clientName}`;
  }

  try {
    // Send email notification
    const emailResult = await sendSessionExpiryEmail({
      to: user.email,
      subject,
      message,
      alert_type,
      account_name: accountName,
      expires_at: expiresAt,
      user_name: `${user.first_name} ${user.last_name}`,
    });

    // FUTURE: Add Slack notification if configured
    // FUTURE: Add SMS notification if configured

    // Update alert with sent status
    const { error: updateError } = await supabase
      .from('session_expiry_alerts')
      .update({
        sent_via: ['email'], // Add 'slack', 'sms' when implemented
      })
      .eq('id', alert.id);

    if (updateError) {
      console.error('[SESSION_MONITOR] Failed to update alert:', updateError);
    }

    console.log(`[SESSION_MONITOR] Sent ${alert_type} alert to ${user.email}`);

    return { success: true, alert_id: alert.id };
  } catch (error) {
    console.error('[SESSION_MONITOR] Failed to send notification:', error);
    throw error;
  }
}
