/**
 * HGC v2 API Route - AgentKit + Cartridge Architecture
 *
 * This is the NEW implementation using:
 * - MarketingConsole (base system)
 * - LinkedIn Cartridge (with 4 chips)
 * - Voice Cartridge (optional voice parameters)
 * - AgentKit orchestration
 *
 * Response format MUST match v1 for FloatingChatBar compatibility.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { MarketingConsole } from '@/lib/console/marketing-console';
import { LinkedInCartridge } from '@/lib/cartridges/linkedin-cartridge';
import { VoiceCartridge } from '@/lib/cartridges/voice-cartridge';
import type { Message } from '@/lib/cartridges/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request
    const { message, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('[HGC_V2] Received request:', {
      message_length: message.length,
      history_length: conversationHistory.length,
    });

    // 2. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[HGC_V2] Authentication failed:', authError);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Initialize MarketingConsole
    const console_instance = new MarketingConsole({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      baseInstructions: `
You are the Marketing Console AI, a specialized assistant for LinkedIn lead generation campaigns.

You help users:
- Create and manage campaigns
- Write compelling LinkedIn content
- Post to LinkedIn
- Monitor DM responses for lead generation
- Track campaign performance

Always be helpful, professional, and focused on driving results.
`,
      openai,
      supabase,
    });

    // 4. Load LinkedIn Cartridge (always loaded)
    const linkedinCartridge = new LinkedInCartridge();
    console_instance.loadCartridge(linkedinCartridge);

    console.log('[HGC_V2] LinkedIn cartridge loaded');

    // 5. Load Voice Cartridge (if specified in message context)
    // TODO: Extract voice_id from campaign context or user preferences
    // For now, voice cartridge is optional

    // Example of loading voice cartridge:
    /*
    const voice_id = extractVoiceIdFromContext(message, conversationHistory);
    if (voice_id) {
      const voiceCartridge = await VoiceCartridge.fromDatabase(voice_id, supabase);
      if (voiceCartridge) {
        console_instance.loadCartridge(voiceCartridge);
        console.log('[HGC_V2] Voice cartridge loaded:', voice_id);
      }
    }
    */

    // 6. Build messages for agent
    const messages: Message[] = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id,
        name: msg.name,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // 7. Execute via MarketingConsole
    console.log('[HGC_V2] Executing agent...');
    const result = await console_instance.execute(user.id, generateSessionId(), messages);

    console.log('[HGC_V2] Execution complete:', {
      response_length: result.response.length,
      has_interactive: !!result.interactive,
    });

    // 8. Return FloatingChatBar-compatible response
    return NextResponse.json({
      success: true,
      response: result.response,
      interactive: result.interactive, // Campaign selector, decision buttons, etc.
    });
  } catch (error: any) {
    console.error('[HGC_V2] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate session ID
 *
 * In production, this should be persistent per conversation.
 * For now, generate a new one each time.
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Extract voice cartridge ID from context
 *
 * TODO: Implement logic to determine which voice cartridge to use:
 * 1. Check if message mentions a campaign
 * 2. If campaign has voice_id, use that
 * 3. Otherwise, check user's default voice cartridge
 * 4. Otherwise, use no voice cartridge
 */
function extractVoiceIdFromContext(message: string, history: any[]): string | null {
  // Placeholder implementation
  // Real implementation would:
  // - Parse message for campaign references
  // - Query database for campaign voice_id
  // - Fall back to user's default voice cartridge

  return null;
}
