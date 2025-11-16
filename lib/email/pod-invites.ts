/**
 * Pod Member Invite Emails
 *
 * Handles sending invite emails to pod members with onboarding links
 */

interface SendPodInviteEmailParams {
  to: string;
  name: string;
  inviteUrl: string;
  clientName: string;
}

/**
 * Send pod member invite email
 *
 * NOTE: Currently logs to console in development
 * TODO: Integrate with Resend API in production
 */
export async function sendPodInviteEmail({
  to,
  name,
  inviteUrl,
  clientName,
}: SendPodInviteEmailParams): Promise<void> {
  // TODO: Integrate with Resend API when ready
  // For now, just log the invite URL so admin can copy/paste

  console.log('[POD_INVITE] Email would be sent to:', to);
  console.log('[POD_INVITE] Invite URL:', inviteUrl);
  console.log('[POD_INVITE] Email content:');
  console.log(`
    Subject: You're invited to join the ${clientName} Pod!

    Hi ${name},

    You've been invited to join the ${clientName} LinkedIn Pod!

    As a pod member, you'll help amplify our LinkedIn content through strategic
    reposting. This increases visibility and engagement for all team posts.

    Click here to get started:
    ${inviteUrl}

    This link will allow you to set your password and connect your LinkedIn account.

    If you have questions, reply to this email.

    Thanks!
    The ${clientName} Team
  `);

  // In production, this would be:
  // await resend.emails.send({
  //   from: 'RevOS <noreply@revos.app>',
  //   to,
  //   subject: `You're invited to join the ${clientName} Pod!`,
  //   html: template,
  // });
}

/**
 * Send activation confirmation email
 */
export async function sendActivationConfirmationEmail({
  to,
  name,
  clientName,
}: {
  to: string;
  name: string;
  clientName: string;
}): Promise<void> {
  console.log('[POD_ACTIVATION] Email would be sent to:', to);
  console.log(`
    Subject: You're now active in the ${clientName} Pod!

    Hi ${name},

    Great news! You've been activated in the ${clientName} LinkedIn Pod.

    You'll now automatically repost content from the team to help amplify
    our LinkedIn presence. Your posts will be scheduled automatically.

    You can manage your pod settings anytime in the dashboard.

    Thanks for being part of the team!
    The ${clientName} Team
  `);
}

/**
 * Resend invite email (if member hasn't responded)
 */
export async function resendPodInviteEmail(params: SendPodInviteEmailParams): Promise<void> {
  // Same as sendPodInviteEmail but with different subject line
  console.log('[POD_INVITE_RESEND] Resending invite to:', params.to);
  await sendPodInviteEmail(params);
}
