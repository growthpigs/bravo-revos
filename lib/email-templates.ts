/**
 * Email templates for pod notifications and system emails
 */

export interface PodRepostEmailData {
  recipientName: string
  posterName: string
  linkedinUrl: string
  postPreview?: string
}

/**
 * Generate HTML email for pod repost notification
 */
export function generatePodRepostEmail(data: PodRepostEmailData): {
  subject: string
  html: string
  text: string
} {
  const subject = `🚀 New post to engage: ${data.posterName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0077B5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background: #0077B5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🚀 Pod Engagement Alert</h2>
    </div>
    <div class="content">
      <p>Hey ${data.recipientName}!</p>

      <p><strong>${data.posterName}</strong> just published a new LinkedIn post and needs your engagement support.</p>

      ${data.postPreview ? `<p><em>"${data.postPreview}"</em></p>` : ''}

      <p>Click below to view and engage (like, comment, or repost):</p>

      <a href="${data.linkedinUrl}" class="button">View Post on LinkedIn →</a>

      <p>Remember: Meaningful engagement helps everyone in the pod grow their reach! 🌟</p>

      <p>Thanks for being an active pod member!</p>
    </div>
    <div class="footer">
      <p>You're receiving this because you're a member of a LinkedIn engagement pod.</p>
      <p>Bravo revOS • Automated LinkedIn Lead Generation</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  const text = `
Hey ${data.recipientName}!

${data.posterName} just published a new LinkedIn post and needs your engagement support.

${data.postPreview ? `"${data.postPreview}"\n` : ''}

View and engage here: ${data.linkedinUrl}

Remember: Meaningful engagement helps everyone in the pod grow their reach!

Thanks for being an active pod member!

---
You're receiving this because you're a member of a LinkedIn engagement pod.
Bravo revOS • Automated LinkedIn Lead Generation
  `.trim()

  return { subject, html, text }
}
