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

// Force Node.js runtime (dependencies may use Node APIs)
export const runtime = 'nodejs';
import { createClient } from '@/lib/supabase/server';
// Dynamic imports to prevent build-time tiktoken/encoder.json loading:
// - OpenAI SDK (dynamically imported in POST handler)
// - MarketingConsole (imports @openai/agents which uses tiktoken)
// - VoiceCartridge (imports types which imports @openai/agents)
// - LinkedInCartridge (contains chips that import @openai/agents)
// All custom lib imports that chain to @openai/agents are dynamic

// Type-only import - should be stripped at compile time
import type { Message } from '@/lib/cartridges/types';
import { safeParseLegacyV1Request } from '@/lib/validation/chat-validation';
import { loadConsolePrompt, assembleSystemPrompt } from '@/lib/console/console-loader';
import { getOrCreateSession, getConversationHistory, saveMessages } from '@/lib/session-manager';
import { OrchestrationResponseBuilder } from '@/lib/orchestration/response-builder';
import { retrieveAllCartridges } from '@/lib/cartridges/retrieval';
import { loadAllUserCartridges } from '@/lib/cartridges/loaders';
import { createCartridgeSnapshot } from '@/lib/cartridges/snapshot';
import { detectPlatformFromCommand } from '@/lib/console/platform-detector';
import { ZodError } from 'zod';
// Dynamic imports for workflow functions to prevent build-time tiktoken loading
// - findWorkflowByTrigger (imported when needed)
// - executeContentGenerationWorkflow, executeNavigationWorkflow (imported when needed)

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
    // 1. Parse and validate request - support both formats
    const body = await request.json();

    // Transform messages array format to message + conversationHistory format
    let normalizedBody = body;
    if (body.messages && Array.isArray(body.messages) && !body.message) {
      // Frontend sends { messages: [...] }, convert to { message, conversationHistory }
      const messages = body.messages;
      const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');

      if (!lastUserMessage) {
        return NextResponse.json(
          { success: false, error: 'No user message found in messages array' },
          { status: 400 }
        );
      }

      // Get all messages except the last user message as history
      const lastUserIndex = messages.lastIndexOf(lastUserMessage);
      const conversationHistory = messages.slice(0, lastUserIndex);

      normalizedBody = {
        ...body,
        message: lastUserMessage.content,
        conversationHistory,
      };
      delete normalizedBody.messages;

      console.log('[HGC_V2] Transformed messages array to message format:', {
        message_preview: lastUserMessage.content.slice(0, 50),
        history_length: conversationHistory.length,
      });
    }

    const validation = safeParseLegacyV1Request(normalizedBody);

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

    const { message, conversationHistory = [], voiceId, metadata, sessionId, workflow_id, decision } = validation.data;

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

    // 2b. Initialize OpenAI client (lazy initialization prevents build-time execution)
    // Dynamic import to prevent tiktoken from trying to read encoder.json at build time
    const { default: OpenAI } = await import('openai');
    
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('[HGC_V2] OPENAI_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'AI service not configured', details: 'OPENAI_API_KEY environment variable is missing' },
        { status: 500 }
      );
    }
    const openai = new OpenAI({ apiKey: openaiApiKey });

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

    // 3a. Retrieve user's Style and Instructions cartridges from Mem0
    console.log('[HGC_V2] Retrieving cartridge memories from Mem0...');
    let cartridgeMemories;
    let cartridgesRetrieved = false;
    try {
      cartridgeMemories = await retrieveAllCartridges(user.id);
      cartridgesRetrieved = !!(cartridgeMemories.style || cartridgeMemories.instructions);

      if (cartridgesRetrieved) {
        console.log('[HGC_V2] Cartridge memories retrieved:', {
          hasStyle: !!cartridgeMemories.style,
          hasInstructions: !!cartridgeMemories.instructions,
        });
      } else {
        console.log('[HGC_V2] No cartridge memories found for user');
      }
    } catch (error: any) {
      console.error('[HGC_V2] Failed to retrieve cartridge memories:', error.message);
      cartridgeMemories = {}; // Graceful degradation - continue without cartridges
    }

    // 3b. Detect platform from user message
    const platform = detectPlatformFromCommand(message);
    console.log('[HGC_V2] Detected platform:', platform);

    // 3c. Load brand, swipe, and platform template cartridges
    console.log('[HGC_V2] Loading user cartridges (brand, swipe, platform)...');
    let userCartridges;
    try {
      userCartridges = await loadAllUserCartridges(user.id, platform, supabase);
      console.log('[HGC_V2] User cartridges loaded:', {
        hasBrand: !!userCartridges.brand,
        swipeCount: userCartridges.swipes.length,
        hasPlatformTemplate: !!userCartridges.platformTemplate,
      });
    } catch (error: any) {
      console.error('[HGC_V2] Failed to load user cartridges:', error.message);
      userCartridges = { swipes: [] }; // Graceful degradation - continue without cartridges
    }

    // 4. Initialize MarketingConsole with database-driven config + all cartridges
    // Dynamic import to prevent build-time tiktoken/encoder.json loading
    const { MarketingConsole } = await import('@/lib/console/marketing-console');
    const console_instance = new MarketingConsole({
      model: 'gpt-5.1',
      temperature: 0.7,
      baseInstructions: assembleSystemPrompt(
        consoleConfig,
        cartridgeMemories,
        userCartridges.brand,
        userCartridges.swipes,
        userCartridges.platformTemplate
      ),
      openai,
      supabase,
    });

    // 5. Load LinkedIn Cartridge (always loaded)
    // Dynamic import to prevent build-time @openai/agents loading
    const { LinkedInCartridge } = await import('@/lib/cartridges/linkedin-cartridge');
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
      // Ensure conversationHistory is an array (it's optional in schema)
      const historyArray = Array.isArray(conversationHistory) ? conversationHistory : [];
      messages = [
        ...historyArray.map((msg: any) => ({
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

    // 7.3 Handle workflow decision (workflow-based)
    let currentMessage = message;
    if (workflow_id && decision) {
      console.log('[HGC_V2_WORKFLOW] Decision received:', {
        decision,
        workflow_id,
      });

      // For workflow-based decisions, the decision value IS the message
      // (e.g., "topic:0:headline_slug" for content generation)
      // Pass it directly as user message for workflow executor to handle
      messages.push({
        role: 'user' as const,
        content: decision,
      });

      console.log('[HGC_V2_WORKFLOW] Decision added to messages:', decision);

      // Use decision as the message for workflow triggers
      currentMessage = decision;
    }

    // 7.5 Check for workflow triggers (database-driven)
    console.log('[HGC_V2_WORKFLOW] Checking for workflow triggers:', currentMessage);

    // Dynamic import to prevent build-time tiktoken loading
    const { findWorkflowByTrigger } = await import('@/lib/console/workflow-loader');
    const matchedWorkflow = await findWorkflowByTrigger(currentMessage, supabase, user.id);

    if (matchedWorkflow) {
      console.log('[HGC_V2_WORKFLOW] Workflow matched:', {
        name: matchedWorkflow.name,
        type: matchedWorkflow.workflow_type,
      });

      // Create immutable cartridge snapshot for workflow execution
      const cartridgeSnapshot = createCartridgeSnapshot(
        userCartridges.brand || null,
        userCartridges.swipes || [],
        userCartridges.platformTemplate || null
      );

      const workflowContext = {
        supabase,
        openai,
        user,
        session,
        message: currentMessage,
        cartridges: cartridgeSnapshot, // Pass immutable snapshot
        // TODO: Add agencyId and clientId from users table for Mem0 scoping
      };

      try {
        let workflowResult;

        // Dynamic import to prevent build-time tiktoken loading
        const { executeContentGenerationWorkflow, executeNavigationWorkflow } =
          await import('@/lib/console/workflow-executor');

        // Execute workflow based on type
        if (matchedWorkflow.workflow_type === 'content_generation') {
          workflowResult = await executeContentGenerationWorkflow(
            matchedWorkflow,
            workflowContext
          );
        } else if (matchedWorkflow.workflow_type === 'navigation') {
          workflowResult = await executeNavigationWorkflow(
            matchedWorkflow,
            workflowContext
          );
        } else {
          throw new Error(`Unsupported workflow type: ${matchedWorkflow.workflow_type}`);
        }

        console.log('[HGC_V2_WORKFLOW] Workflow executed successfully:', {
          workflowName: matchedWorkflow.name,
          hasInteractive: !!workflowResult.interactive,
          hasDocument: !!workflowResult.document,
        });

        // Return workflow result
        return NextResponse.json({
          success: workflowResult.success,
          response: workflowResult.response,
          sessionId: workflowResult.sessionId,
          interactive: workflowResult.interactive,
          document: workflowResult.document,
          meta: {
            ...workflowResult.meta,
            consoleSource,
            cartridgesRetrieved,
            workflowTriggered: true,
          },
        });
      } catch (error: any) {
        console.error('[HGC_V2_WORKFLOW] Workflow execution failed:', error);

        // Return error response
        return NextResponse.json(
          {
            success: false,
            error: `Workflow execution failed: ${error.message}`,
          },
          { status: 500 }
        );
      }
    }

    // 8. Execute via MarketingConsole
    console.log('[HGC_V2] Executing agent...');
    const result = await console_instance.execute(user.id, session.id, messages);

    console.log('[HGC_V2] Execution complete:', {
      response_length: result.response.length,
      has_interactive: !!result.interactive,
    });

    // 8a. Check for campaign creation intent and return orchestration if detected
    const userMessageLower = message.toLowerCase();
    const isCampaignCreationIntent =
      (userMessageLower.includes('create') && userMessageLower.includes('campaign')) ||
      (userMessageLower.includes('new') && userMessageLower.includes('campaign')) ||
      userMessageLower.includes('start campaign');

    if (isCampaignCreationIntent) {
      console.log('[HGC_V2] Campaign creation intent detected - returning orchestration response');

      // Build orchestration response for campaign creation
      const orchestrationResponse = new OrchestrationResponseBuilder()
        .withMessage(result.response)
        .withNavigation('/dashboard/campaigns/new', 'Opening campaign builder...')
        .withButton('START CREATING', {
          navigateTo: '/dashboard/campaigns/new',
          variant: 'primary'
        })
        .withSessionId(session.id)
        .withMemoryContext(true)
        .build();

      // Save messages to database first
      console.log('[HGC_V2] Saving messages to session (with orchestration)...');
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
        // Still return orchestration response even if save fails
      }

      return NextResponse.json({
        success: true,
        ...orchestrationResponse,
        meta: {
          consoleSource,
          orchestrationDetected: true,
          cartridgesRetrieved,
        },
      });
    }

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
        cartridgesRetrieved, // Whether Style/Instructions cartridges were found
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

/**
 * GET /api/hgc-v2
 * Health check endpoint showing V2 status and compliance
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'Holy Grail Chat V2',
    version: '2.0.0-agentkit-mem0',
    mode: 'agentkit',
    backend: 'AgentKit SDK (@openai/agents)',
    features: [
      'AgentKit orchestration',
      'Mem0 persistent memory',
      'Console prompts from DB',
      'Session persistence',
      'Multi-tenant isolation',
      'Cartridge architecture',
      'Write workflow with topics'
    ],
    compliance: {
      agentkit: true,
      mem0: true,
      console_db: true,
      session_persistence: true,
    },
    cartridges: ['LinkedIn Marketing', 'Voice (optional)'],
  });
}

