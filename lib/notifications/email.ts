/**
 * Email Notification System
 * Sends session expiry and other notifications
 * Uses Resend for email delivery
 */

export interface SessionExpiryEmailParams {
  to: string;
  subject: string;
  message: string;
  alert_type: '7_days' | '1_day' | 'expired';
  account_name: string;
  expires_at: Date;
  user_name: string;
}

export async function sendSessionExpiryEmail(params: SessionExpiryEmailParams) {
  const { to, subject, message, alert_type, account_name, expires_at, user_name } = params;

  console.log('[EMAIL] Sending session expiry email:', { to, subject, alert_type });

  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EMAIL] Resend not configured, skipping email send');
    return { success: true, skipped: true, reason: 'no_api_key' };
  }

  try {
    // TODO: Implement Resend email sending
    // For now, just log the email
    const emailHtml = generateSessionExpiryHTML(params);

    console.log('[EMAIL] Would send email:');
    console.log('  To:', to);
    console.log('  Subject:', subject);
    console.log('  Alert Type:', alert_type);

    // MOCK: Simulate successful send
    return {
      success: true,
      message_id: `mock_${Date.now()}`,
      to,
    };
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);
    throw error;
  }
}

function generateSessionExpiryHTML(params: SessionExpiryEmailParams): string {
  const { user_name, account_name, alert_type, expires_at, message } = params;

  const urgencyColor =
    alert_type === 'expired' ? '#dc2626' : alert_type === '1_day' ? '#f59e0b' : '#3b82f6';

  const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/linkedin`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkedIn Session ${alert_type === 'expired' ? 'Expired' : 'Expiring Soon'}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">
      ${alert_type === 'expired' ? '🚨 Session Expired' : '⚠️ Session Expiring Soon'}
    </h1>
  </div>

  <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${user_name},</p>

    <p>${message}</p>

    <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid ${urgencyColor}; margin: 20px 0;">
      <p style="margin: 0; font-weight: 600;">Account Details:</p>
      <p style="margin: 5px 0 0 0;">
        <strong>Account:</strong> ${account_name}<br>
        <strong>Expires:</strong> ${expires_at.toLocaleString()}<br>
        <strong>Status:</strong> ${alert_type === 'expired' ? 'Expired' : 'Expiring Soon'}
      </p>
    </div>

    <p style="margin-bottom: 30px;">
      ${
        alert_type === 'expired'
          ? 'Your LinkedIn automation has been paused. Reconnect now to resume.'
          : 'Reconnect your account before it expires to avoid any interruption in service.'
      }
    </p>

    <a href="${actionUrl}" style="display: inline-block; background-color: ${urgencyColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
      Reconnect LinkedIn Account
    </a>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
      <strong>Bravo revOS</strong> - LinkedIn Lead Generation Platform<br>
      This is an automated notification. If you need assistance, please contact support.
    </p>
  </div>
</body>
</html>
  `.trim();
}

export async function sendPodInvitationEmail(params: {
  to: string;
  pod_name: string;
  client_name: string;
  invitation_url: string;
  expires_at: Date;
  invited_by: string;
}) {
  const { to, pod_name, client_name, invitation_url, expires_at, invited_by } = params;

  console.log('[EMAIL] Sending pod invitation email:', { to, pod_name });

  if (!process.env.RESEND_API_KEY) {
    console.warn('[EMAIL] Resend not configured, skipping email send');
    return { success: true, skipped: true, reason: 'no_api_key' };
  }

  try {
    // TODO: Implement Resend email sending with pod invitation template
    console.log('[EMAIL] Would send pod invitation to:', to);

    return {
      success: true,
      message_id: `mock_${Date.now()}`,
      to,
    };
  } catch (error) {
    console.error('[EMAIL] Failed to send pod invitation:', error);
    throw error;
  }
}
