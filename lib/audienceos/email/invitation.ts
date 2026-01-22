import type { UserRole } from '@/types/database'

interface InvitationEmailParams {
  to: string
  inviterName: string
  agencyName: string
  acceptUrl: string
  role: UserRole
}

/**
 * Send user invitation email
 *
 * This integrates with the email service (Resend, SendGrid, etc.)
 * Template: User invitation with role assignment and 7-day expiry notice
 */
export async function sendInvitationEmail({
  to,
  inviterName,
  agencyName,
  acceptUrl,
  role,
}: InvitationEmailParams): Promise<void> {
  // Template content
  const roleDescription = role === 'admin'
    ? 'admin with full access to settings and team management'
    : 'team member with access to clients and reports'

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .button:hover { background: #764ba2; }
        .footer { font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px; }
        .expiry-warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #78350f; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">You're invited to ${agencyName}</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Join the team and start collaborating</p>
        </div>

        <div class="content">
          <p>Hi there,</p>

          <p><strong>${inviterName}</strong> has invited you to join <strong>${agencyName}</strong> as a ${roleDescription}<span class="badge">${role === 'admin' ? 'ADMIN' : 'USER'}</span></p>

          <p>Click the button below to accept your invitation and create your account:</p>

          <div style="text-align: center;">
            <a href="${acceptUrl}" class="button">Accept Invitation</a>
          </div>

          <p style="font-size: 12px; color: #6b7280;">Or copy and paste this link in your browser:</p>
          <p style="font-size: 11px; word-break: break-all; color: #6b7280; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">${acceptUrl}</p>

          <div class="expiry-warning">
            <strong>⏰ Expires in 7 days</strong><br>
            This invitation will expire in 7 days. If you don't accept by then, you'll need to ask your admin to send you a new one.
          </div>

          <h3 style="margin: 24px 0 12px 0; font-size: 16px;">What you'll get access to:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li style="margin-bottom: 8px;">Client pipeline management and tracking</li>
            <li style="margin-bottom: 8px;">Unified communications hub with Gmail and Slack integration</li>
            <li style="margin-bottom: 8px;">AI-powered intelligence and insights</li>
            <li style="margin-bottom: 8px;">Performance analytics and reporting</li>
            ${role === 'admin' ? '<li style="margin-bottom: 8px;">Full agency settings and team management</li>' : ''}
          </ul>

          <p style="margin-top: 24px; font-size: 14px;">Questions? Contact <strong>${inviterName}</strong> for more information.</p>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} AudienceOS. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const textContent = `
You're invited to ${agencyName}

Hi there,

${inviterName} has invited you to join ${agencyName} as a ${roleDescription}.

Accept your invitation here:
${acceptUrl}

⏰ This invitation expires in 7 days.

What you'll get access to:
- Client pipeline management and tracking
- Unified communications hub with Gmail and Slack integration
- AI-powered intelligence and insights
- Performance analytics and reporting
${role === 'admin' ? '- Full agency settings and team management' : ''}

Questions? Contact ${inviterName} for more information.

© ${new Date().getFullYear()} AudienceOS. All rights reserved.
  `

  // Send email using the configured email service
  // This is a placeholder - integrate with your actual email service (Resend, SendGrid, etc.)

  try {
    // Using Resend as example - adjust based on your email service
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured - invitation email not sent')
      return
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@audienceos.com',
        to,
        subject: `${inviterName} invited you to join ${agencyName}`,
        html: htmlContent,
        text: textContent,
        reply_to: 'support@audienceos.com',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to send email: ${error.message}`)
    }

    const result = await response.json()
    console.log(`Invitation email sent to ${to}:`, result.id)
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    // Don't throw - allow invitation creation even if email fails
    // This should be logged for monitoring
  }
}
