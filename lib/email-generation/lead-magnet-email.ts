/**
 * AI-Powered Email Generation for Lead Magnet Delivery
 * Generates personalized email copy using OpenAI GPT-4o-mini
 */

import OpenAI from 'openai';
import { OPENAI_MODELS } from '@/lib/config/openai-models';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface EmailGenerationParams {
  leadMagnetName: string;
  originalPost: string;
  brandVoice?: string;
  recipientName?: string;
  userFirstName?: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  preheader: string;
}

/**
 * Generate personalized email copy for lead magnet delivery
 * Uses AI to create professional, context-aware emails
 */
export async function generateLeadMagnetEmail({
  leadMagnetName,
  originalPost,
  brandVoice = 'professional but friendly',
  recipientName = 'there',
  userFirstName = 'there',
}: EmailGenerationParams): Promise<GeneratedEmail> {
  // Truncate post to prevent token overflow
  const postExcerpt = originalPost.substring(0, 300);

  const prompt = `Generate a professional email for delivering a lead magnet.

Context:
- Lead magnet: "${leadMagnetName}"
- From LinkedIn post: "${postExcerpt}${originalPost.length > 300 ? '...' : ''}"
- Brand voice: ${brandVoice}
- Recipient: ${recipientName}
- Sender: ${userFirstName}

Requirements:
1. Professional but warm tone matching brand voice
2. Reference the LinkedIn post naturally
3. Keep brief (200 words max)
4. Include placeholder [DOWNLOAD_LINK] where download link goes
5. Make subject line compelling (max 60 characters)
6. Add preheader text (max 100 characters)

Return ONLY valid JSON (no markdown, no code blocks):
{
  "subject": "...",
  "body": "...",
  "preheader": "..."
}`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODELS.FAST,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content);
}

/**
 * Generate fallback email when AI generation fails
 */
export function generateFallbackEmail(
  leadMagnetName: string,
  recipientName: string,
  userFirstName: string
): GeneratedEmail {
  return {
    subject: `Your ${leadMagnetName} is ready`,
    body: `Hi ${recipientName},

Thanks for your interest! I'm excited to share this with you.

Here's your ${leadMagnetName}:

[DOWNLOAD_LINK]

I think you'll find this incredibly valuable. Feel free to reach out if you have any questions.

Best,
${userFirstName}`,
    preheader: 'Your requested resource is ready',
  };
}
