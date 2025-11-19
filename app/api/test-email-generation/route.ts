/**
 * Test endpoint for AI email generation
 * GET /api/test-email-generation
 */

import { NextResponse } from 'next/server';
import {
  generateLeadMagnetEmail,
  generateFallbackEmail,
} from '@/lib/email-generation/lead-magnet-email';

export async function GET() {
  try {
    console.log('[EMAIL_GEN_TEST] Starting test...');

    const email = await generateLeadMagnetEmail({
      leadMagnetName: 'AI Swipe File',
      originalPost:
        "Here's how I use AI to 10x my content output. The secret? 50+ proven prompts that cut through the noise. I've tested every major LLM and found the patterns that actually work.",
      brandVoice: 'professional but friendly',
      recipientName: 'John',
      userFirstName: 'Sarah',
    });

    console.log('[EMAIL_GEN_TEST] Success:', { email });

    return NextResponse.json({ success: true, email });
  } catch (error: any) {
    console.error('[EMAIL_GEN_TEST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Email generation failed',
      },
      { status: 500 }
    );
  }
}
