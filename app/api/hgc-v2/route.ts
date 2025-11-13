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
import { safeParseLegacyV1Request } from '@/lib/validation/chat-validation';
import { loadConsolePrompt, assembleSystemPrompt } from '@/lib/console/console-loader';
import { getOrCreateSession, getConversationHistory, saveMessages } from '@/lib/session-manager';
import { ZodError } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Fallback console configuration
 * Used when database-driven config is unavailable
 */
const DEFAULT_CONSOLE = {
  id: 'fallback',
  name: 'fallback-console',
  displayName: 'Fallback Console',
  systemInstructions: `You are RevOS Intelligence, a helpful AI assistant specializing in marketing and lead generation.
Your role is to help users identify, qualify, and nurture leads through LinkedIn and other professional networks.
You provide strategic guidance on lead generation campaigns, LinkedIn outreach, and sales enablement.
Always be professional, data-driven, and focused on measurable business outcomes.`,
  behaviorRules: [],
  version: 0,
};

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request
    const body = await request.json();
    const validation = safeParseLegacyV1Request(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      console.error('[HGC_V2] Validation failed:', errors);

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: errors,
        },
        { status: 400 }
      );
    }

    const { message, conversationHistory = [], voiceId, metadata, sessionId } = validation.data;

    console.log('[HGC_V2] Received validated request:', {
      message_length: message.length,
      history_length: conversationHistory?.length || 0,
      has_voice_id: !!voiceId,
      session_id: sessionId || 'new',
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

    // 2a. Get or create chat session
    console.log('[HGC_V2] Creating or retrieving session...');
    const session = await getOrCreateSession(supabase, user.id, sessionId, voiceId);
    console.log('[HGC_V2] Session:', { id: session.id, is_new: !sessionId });

    // 3. Load console configuration from database (with fallback)
    let consoleConfig;
    let consoleSource: 'database' | 'fallback' = 'database';
    try {
      consoleConfig = await loadConsolePrompt('marketing-console-v1', supabase);
      console.log('[HGC_V2] Console config loaded from database:', {
        name: consoleConfig.name,
        version: consoleConfig.version,
      });
    } catch (error: any) {
      console.error('[HGC_V2] Failed to load console config from database, using fallback:', {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      });
      consoleConfig = DEFAULT_CONSOLE;
      consoleSource = 'fallback';
    }

    // 4. Initialize MarketingConsole with database-driven config
    const console_instance = new MarketingConsole({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      baseInstructions: assembleSystemPrompt(consoleConfig),
      openai,
      supabase,
    });

    // 5. Load LinkedIn Cartridge (always loaded)
    const linkedinCartridge = new LinkedInCartridge();
    console_instance.loadCartridge(linkedinCartridge);

    console.log('[HGC_V2] LinkedIn cartridge loaded');

    // 6. Voice cartridge support (TODO: Implement when voice system is ready)
    // Voice cartridge loading will be added in future iteration

    // 7. Build messages for agent
    // IMPORTANT: When sessionId is provided, conversationHistory from request is IGNORED
    // The database is the source of truth for existing sessions
    // Client should only send conversationHistory for NEW sessions (no sessionId)
    let messages: Message[];

    if (sessionId) {
      // Continuing existing conversation - load history from DB
      // NOTE: conversationHistory parameter is IGNORED when sessionId is provided
      console.log('[HGC_V2] Loading conversation history from database...');
      const dbHistory = await getConversationHistory(supabase, session.id);
      messages = [
        ...dbHistory,
        {
          role: 'user' as const,
          content: message,
        },
      ];
      console.log('[HGC_V2] Loaded', dbHistory.length, 'messages from history');
    } else {
      // New conversation - use provided history or start fresh
      console.log('[HGC_V2] New session - using provided conversationHistory');
      messages = [
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
    }

    // 8. Execute via MarketingConsole
    console.log('[HGC_V2] Executing agent...');
    const result = await console_instance.execute(user.id, session.id, messages);

    console.log('[HGC_V2] Execution complete:', {
      response_length: result.response.length,
      has_interactive: !!result.interactive,
    });

    // 9. Save messages to database
    console.log('[HGC_V2] Saving messages to session...');
    let messagePersisted = true;
    try {
      await saveMessages(supabase, session.id, [
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: result.response },
      ]);
      console.log('[HGC_V2] Messages saved successfully');
    } catch (saveError: any) {
      console.error('[HGC_V2] CRITICAL: Message save failed:', saveError.message);
      console.error('[HGC_V2] Error details:', {
        sessionId: session.id,
        userId: user.id,
        errorCode: saveError.code,
        errorMessage: saveError.message,
      });
      messagePersisted = false;
      // Don't fail the request - client gets response but with warning
      // Client MUST check messagePersisted flag and warn user
    }

    // 10. Return FloatingChatBar-compatible response with sessionId
    return NextResponse.json({
      success: true,
      response: result.response,
      sessionId: session.id, // Client should save and send back for continuation
      interactive: result.interactive, // Campaign selector, decision buttons, etc.
      meta: {
        consoleSource, // 'database' or 'fallback' - helps identify configuration issues
        messagePersisted, // CRITICAL - client MUST check this
        ...(messagePersisted === false && {
          warning: 'Conversation was not saved - do not continue this session',
          persistenceError: 'Database save failed',
        }),
      },
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

