import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';
import { getSmartRouter } from '@/lib/audienceos/chat/router';
import { executeFunction, hgcFunctions } from '@/lib/audienceos/chat/functions';
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission';
import { createRouteHandlerClient } from '@/lib/audienceos/supabase';
import { getGeminiRAG } from '@/lib/audienceos/rag';
import { getMemoryInjector } from '@/lib/audienceos/memory';
import { initializeMem0Service } from '@/lib/audienceos/memory/mem0-service';
import { checkRateLimitDistributed } from '@/lib/audienceos/security';
import {
  buildAppContext,
  generateAppContextPrompt,
  loadCartridgeContext,
  generateCartridgeContextPrompt,
  getOrCreateSession,
  addMessage,
  getSessionMessages,
  formatMessagesForContext,
} from '@/lib/audienceos/chat/context';
import type { Citation } from '@/lib/audienceos/chat/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Rate limit config for chat: 10 requests per minute per user
const CHAT_RATE_LIMIT = { maxRequests: 10, windowMs: 60000 };

// CRITICAL: Gemini 3 ONLY per project requirements
const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Build rich system prompt with all context layers
 * Combines: app structure, cartridges, chat history
 */
async function buildSystemPrompt(
  supabase: SupabaseClient,
  agencyId: string,
  userId: string,
  sessionId: string | undefined,
  route: string
): Promise<string> {
  const parts: string[] = [];

  // Base identity
  parts.push(`You are an AI assistant for AudienceOS Command Center.
You help agency teams manage their clients, view performance data, and navigate the app.
This query was classified as: ${route}`);

  // 1. App structure awareness (always include)
  // Note: currentPage could be passed from frontend in request body for better context
  const appContext = buildAppContext('dashboard'); // Default to dashboard view
  const appPrompt = generateAppContextPrompt(appContext);
  parts.push(appPrompt);

  // 2. Training cartridges (brand, style, instructions)
  try {
    const cartridgeContext = await loadCartridgeContext(supabase, agencyId);
    if (cartridgeContext.brand || cartridgeContext.style || (cartridgeContext.instructions?.length ?? 0) > 0) {
      const cartridgePrompt = generateCartridgeContextPrompt(cartridgeContext);
      parts.push(cartridgePrompt);
    }
  } catch (err) {
    console.warn('[Chat API] Failed to load cartridge context:', err);
  }

  // 3. Chat history (recent messages for continuity)
  if (sessionId) {
    try {
      const messages = await getSessionMessages(supabase, sessionId, 10);
      if (messages.length > 0) {
        const historyPrompt = formatMessagesForContext(messages);
        parts.push(`\n## Recent Conversation\n${historyPrompt}`);
      }
    } catch (err) {
      console.warn('[Chat API] Failed to load chat history:', err);
    }
  }

  // 4. Citation instruction for web queries
  if (route === 'web') {
    parts.push(`\nWhen using information from web search, include inline citation markers like [1], [2], [3] in the text.
Each citation number should reference a source you found.
Example: "Google Ads typically has higher CTR [1] than Meta Ads in search campaigns [2]."`);
  }

  return parts.join('\n\n');
}

/**
 * Chat API v1 - AudienceOS Chat
 *
 * Ported from Holy Grail Chat (HGC) with adaptations for AudienceOS.
 * Uses SmartRouter for intent classification and Gemini for responses.
 *
 * RBAC: Requires ai-features:write permission
 */
export const POST = withPermission({ resource: 'ai-features', action: 'write' })(
  async (request: AuthenticatedRequest) => {
  try {
    // SECURITY FIX: Use authenticated user context, NOT request body
    // This prevents cross-agency data access via spoofed agencyId/userId
    const agencyId = request.user.agencyId;
    const userId = request.user.id;

    // 0. Rate limiting check (10 req/min per user)
    // Uses user ID as identifier for per-user limits (not IP)
    const rateLimitResult = await checkRateLimitDistributed(
      `chat:${userId}`,
      CHAT_RATE_LIMIT
    );

    if (!rateLimitResult.allowed) {
      // Rate limit exceeded - do not log userId
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before sending another message.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(CHAT_RATE_LIMIT.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

    // 1. Parse request body
    const body = await request.json();
    const { message, sessionId, stream = false } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 2. Get API key
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('[Chat API] GOOGLE_AI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Chat service not configured' },
        { status: 500 }
      );
    }

    // 3. Create Supabase client early (needed for context loading and all routes)
    const supabase = await createRouteHandlerClient(cookies);

    // 4. Classify query with SmartRouter
    let route = 'casual';
    let routeConfidence = 1.0;
    try {
      const router = getSmartRouter();
      const classification = await router.classifyQuery(message);
      route = classification.route;
      routeConfidence = classification.confidence;
      console.log(`[Chat API] Route: ${route} (confidence: ${routeConfidence})`);
    } catch (routerError) {
      console.warn('[Chat API] Router failed, using casual route:', routerError);
    }

    // 5. Build rich system prompt with all context layers
    const systemPrompt = await buildSystemPrompt(supabase, agencyId, userId, sessionId, route);

    // 6. Handle based on route
    let responseContent: string;
    let functionCalls: Array<{ name: string; result: unknown }> = [];
    let citations: Citation[] = [];

    if (route === 'dashboard') {
      // Use function calling for dashboard queries
      responseContent = await handleDashboardRoute(apiKey, message, agencyId, userId, functionCalls, supabase, systemPrompt);
    } else if (route === 'rag') {
      // Use RAG for document search queries
      responseContent = await handleRAGRoute(apiKey, message, agencyId, citations);
    } else if (route === 'memory') {
      // Use Memory for recall queries
      responseContent = await handleMemoryRoute(apiKey, message, agencyId, userId);
    } else {
      // Use basic Gemini response for other routes (may include web grounding citations)
      responseContent = await handleCasualRoute(apiKey, message, systemPrompt, citations);
    }

    // 6b. Persist chat messages to database (fire-and-forget)
    persistChatMessages(supabase, agencyId, userId, sessionId, message, responseContent).catch(
      (err) => console.warn('[Chat API] Chat persistence failed (non-blocking):', err)
    );

    // 4b. Store conversation in memory (fire-and-forget, don't block response)
    // Memory is dual-scoped: per-user AND per-agency via scoped userId
    storeConversationMemory(agencyId, userId, sessionId, message, responseContent, route).catch(
      (err) => console.warn('[Chat API] Memory storage failed (non-blocking):', err)
    );

    // 5. Return response (streaming or JSON)
    if (stream === true) {
      // PHASE 1: SSE Streaming Support (backwards compatible)
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Send initial metadata
            const metadata = JSON.stringify({
              type: 'metadata',
              route,
              routeConfidence,
              sessionId: sessionId || `session-${Date.now()}`,
            });
            controller.enqueue(encoder.encode(`data: ${metadata}\n\n`));

            // Stream content in chunks (simulate streaming for now - Phase 2 will add real streaming)
            const chunkSize = 50;
            for (let i = 0; i < responseContent.length; i += chunkSize) {
              const chunk = responseContent.slice(i, i + chunkSize);
              const chunkData = JSON.stringify({
                type: 'content',
                content: chunk,
              });
              controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`));

              // Small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 20));
            }

            // Send completion
            const completeData = JSON.stringify({
              type: 'complete',
              message: {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: responseContent,
                timestamp: new Date().toISOString(),
                route,
                routeConfidence,
                functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
                citations: citations.length > 0 ? citations : [],
              },
            });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.close();
          } catch (error) {
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Streaming failed',
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Existing JSON response (unchanged - Phase 1 backwards compatibility)
      return NextResponse.json({
        message: {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
          route,
          routeConfidence,
          functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
          citations: citations.length > 0 ? citations : [],
        },
        sessionId: sessionId || `session-${Date.now()}`,
      });
    }

  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
  }
);

/**
 * Handle dashboard route with function calling
 * FIXED 2026-01-15: Now accepts supabase client to enable real database queries
 * UPDATED 2026-01-20: Now accepts systemPrompt for rich context
 */
async function handleDashboardRoute(
  apiKey: string,
  message: string,
  agencyId: string | undefined,
  userId: string | undefined,
  functionCallsLog: Array<{ name: string; result: unknown }>,
  supabase: SupabaseClient,
  systemPrompt: string
): Promise<string> {
  const genai = new GoogleGenAI({ apiKey });

  // Create function declarations for Gemini
  // Using type assertion because HGC function schemas are compatible but TypeScript is strict
  const functionDeclarations = hgcFunctions.map(fn => ({
    name: fn.name,
    description: fn.description,
    parameters: fn.parameters,
  })) as unknown as Array<{name: string; description: string; parameters?: object}>;

  // First call: Let Gemini decide which function to call (with full context)
  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `${systemPrompt}\n\nUser: ${message}`,
    config: {
      temperature: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ functionDeclarations }] as any,
    },
  });

  // Check if Gemini wants to call a function
  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  for (const part of parts) {
    if (part.functionCall) {
      const functionName = part.functionCall.name;
      const args = part.functionCall.args;

      if (!functionName) {
        console.warn('[Chat API] Function call without name, skipping');
        continue;
      }

      console.log(`[Chat API] Function call: ${functionName}`, args);

      // Execute the function with Supabase client for real DB queries
      try {
        const result = await executeFunction(functionName, {
          agencyId: agencyId || 'demo-agency',
          userId: userId || 'demo-user',
          supabase,  // CRITICAL FIX: Pass supabase client to enable real database queries
        }, args || {});

        functionCallsLog.push({ name: functionName, result });

        // Second call: Let Gemini interpret the result
        const interpretResponse = await genai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `User asked: "${message}"

Function ${functionName} was called and returned:
${JSON.stringify(result, null, 2)}

Please provide a helpful, natural language summary of this data for the user.`,
          config: { temperature: 0.7 },
        });

        return interpretResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
          `I found the data you requested. ${JSON.stringify(result).substring(0, 200)}...`;
      } catch (execError) {
        console.error(`[Chat API] Function execution failed:`, execError);
        return `I tried to get that information but encountered an error. Please try again.`;
      }
    }
  }

  // No function call, return text response
  return parts[0]?.text || "I can help you with client information, alerts, and navigation. What would you like to know?";
}

/**
 * Handle RAG route - document search using Gemini File Search
 * ADDED 2026-01-15: Ported from HGC for knowledge base queries
 */
async function handleRAGRoute(
  apiKey: string,
  message: string,
  agencyId: string | undefined,
  citations: Citation[]
): Promise<string> {
  try {
    const ragService = getGeminiRAG(apiKey);

    const result = await ragService.search({
      query: message,
      agencyId: agencyId || 'demo-agency',
      includeGlobal: true,
      maxDocuments: 5,
      minConfidence: 0.5,
    });

    // Add RAG citations
    for (const ragCitation of result.citations) {
      const citation: Citation = {
        index: citations.length + 1,
        title: ragCitation.documentName,
        url: ragCitation.documentId,
        source: 'rag',
        snippet: ragCitation.text,
      };
      if (!citations.find(c => c.url === citation.url)) {
        citations.push(citation);
      }
    }

    console.log(`[Chat API] RAG search returned ${result.citations.length} citations, grounded: ${result.isGrounded}`);
    return result.content;
  } catch (error) {
    console.error('[Chat API] RAG search failed:', error);
    return "I couldn't search the knowledge base right now. Please try again or ask a different question.";
  }
}

/**
 * Handle Memory route - recall from Mem0 cross-session memory
 * ADDED 2026-01-15: Ported from HGC for memory/recall queries
 */
async function handleMemoryRoute(
  apiKey: string,
  message: string,
  agencyId: string | undefined,
  userId: string | undefined
): Promise<string> {
  try {
    const memoryInjector = getMemoryInjector();
    const genai = new GoogleGenAI({ apiKey });

    // Detect recall intent and get suggested search query
    const recallDetection = memoryInjector.detectRecall(message);

    // Search for relevant memories
    const memoryInjection = await memoryInjector.injectMemories(
      recallDetection.suggestedSearchQuery,
      agencyId || 'demo-agency',
      userId || 'demo-user'
    );

    if (memoryInjection.memories.length > 0) {
      // Build response with memory context
      const memoryContext = memoryInjection.memories
        .map((m, i) => `[${i + 1}] ${m.content}`)
        .join('\n');

      // Ask Gemini to synthesize a response from memories
      const memoryPrompt = `The user is asking about a previous conversation. Based on these memories from our past conversations:

${memoryContext}

User question: "${message}"

Provide a helpful response that references our previous discussions. Be conversational and helpful.`;

      const memoryResult = await genai.models.generateContent({
        model: GEMINI_MODEL,
        contents: memoryPrompt,
        config: { temperature: 0.7 },
      });

      console.log(`[Chat API] Memory search returned ${memoryInjection.memories.length} memories`);
      return memoryResult.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I couldn't recall that specific conversation.";
    } else {
      return "I don't have any memories of us discussing that topic. Would you like to tell me about it so I can remember for next time?";
    }
  } catch (error) {
    console.error('[Chat API] Memory search failed:', error);
    return "I'm having trouble accessing my memories right now. Could you remind me what we discussed?";
  }
}

/**
 * Handle casual/web routes with basic Gemini response
 * Extracts citations from grounding metadata when available
 * UPDATED 2026-01-20: Now accepts rich systemPrompt with all context layers
 */
async function handleCasualRoute(
  apiKey: string,
  message: string,
  systemPrompt: string,
  citations: Citation[]
): Promise<string> {
  const genai = new GoogleGenAI({ apiKey });

  // Build request config with rich system prompt
  const requestConfig: any = {
    model: GEMINI_MODEL,
    contents: `${systemPrompt}\n\nBe concise and helpful.\n\nUser: ${message}`,
    config: { temperature: 0.7 },
  };

  // Enable Google Search grounding for web queries (provides citations)
  // Note: route detection is already handled in systemPrompt
  if (systemPrompt.includes('classified as: web')) {
    requestConfig.config.tools = [{
      googleSearch: {},
    }];
  }

  const response = await genai.models.generateContent(requestConfig);

  // Extract citations from grounding metadata if available
  const candidate = response.candidates?.[0];
  if (candidate?.groundingMetadata?.groundingChunks) {
    for (const groundingChunk of candidate.groundingMetadata.groundingChunks) {
      const web = groundingChunk.web;
      if (web?.uri && web?.title) {
        const citation: Citation = {
          index: citations.length + 1,
          title: web.title,
          url: web.uri,
          source: 'web',
        };
        // Avoid duplicates
        if (!citations.find(c => c.url === citation.url)) {
          citations.push(citation);
        }
      }
    }
  }

  // Get response text
  let responseText = candidate?.content?.parts?.[0]?.text ||
    "I'm here to help! You can ask me about clients, performance metrics, or app features.";

  // Strip Gemini's decimal notation markers if present
  // Gemini uses formats like [1.1], [1.7] or comma-separated [1.1, 1.7]
  // These interfere with our clean [1][2][3] format
  const hasDecimalMarkers = /\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/.test(responseText);

  if (hasDecimalMarkers) {
    // Strip both single [1.1] and comma-separated [1.1, 1.7] formats
    responseText = responseText.replace(/\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/g, '');
  }

  // Insert inline citation markers based on groundingSupports
  // This is what HGC does - Gemini doesn't add [1][2] markers automatically
  if (candidate?.groundingMetadata?.groundingSupports && citations.length > 0) {
    const supports = candidate.groundingMetadata.groundingSupports;
    responseText = insertInlineCitations(responseText, supports, citations);
  }

  return responseText;
}

/**
 * Insert [1][2][3] citation markers into text based on groundingSupports
 * FIXED: Insert after word boundaries to avoid breaking words mid-sentence
 * Ported from HGC citation-extractor.ts
 */
function insertInlineCitations(
  text: string,
  supports: Array<{
    segment?: { startIndex?: number; endIndex?: number; text?: string };
    groundingChunkIndices?: number[];
    confidenceScores?: number[];
  }>,
  citations: Citation[]
): string {
  // Sort supports by end index (descending) to insert from end to beginning
  // This prevents index shifts as we insert markers
  const sortedSupports = [...supports]
    .filter((s) => s.segment?.endIndex !== undefined)
    .sort((a, b) => (b.segment?.endIndex || 0) - (a.segment?.endIndex || 0));

  let result = text;

  for (const support of sortedSupports) {
    let endIndex = support.segment?.endIndex;
    const chunkIndices = support.groundingChunkIndices || [];

    if (endIndex !== undefined && chunkIndices.length > 0) {
      // Get citation markers for this segment (e.g., "[1][2]")
      const markers = chunkIndices
        .map((idx) => citations[idx] ? `[${citations[idx].index}]` : '')
        .filter(Boolean)
        .join('');

      if (markers && endIndex <= result.length) {
        // Adjust insertion point to after the next word boundary
        // This prevents breaking words mid-word (e.g., "Ads[1] not" instead of "Ads [1]not")
        let adjustedIndex = endIndex;

        // If we're in the middle of a word, move to the next space or punctuation
        while (adjustedIndex < result.length && /[a-zA-Z0-9]/.test(result[adjustedIndex])) {
          adjustedIndex++;
        }

        // If we couldn't find a word boundary (e.g., at end of text), add a space before marker
        if (adjustedIndex !== endIndex && adjustedIndex < result.length) {
          // Found next word boundary, insert after it
          result = result.substring(0, adjustedIndex) + markers + result.substring(adjustedIndex);
        } else if (adjustedIndex === result.length) {
          // At end of text, just append
          result = result + ' ' + markers;
        } else {
          // In middle of word, use original index
          result = result.substring(0, endIndex) + markers + result.substring(endIndex);
        }
      }
    }
  }

  return result;
}

/**
 * Persist chat messages to database for history
 * Fire-and-forget: should not block the chat response
 * ADDED 2026-01-20: Part of HGC context layer completion
 */
async function persistChatMessages(
  supabase: SupabaseClient,
  agencyId: string,
  userId: string,
  sessionId: string | undefined,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    // Get or create session (if sessionId provided, function will find/reuse it)
    const session = await getOrCreateSession(supabase, {
      userId,
      agencyId,
      title: userMessage.substring(0, 100), // Use first message as title
    });

    // Add user message
    await addMessage(supabase, {
      sessionId: session.id,
      agencyId,
      role: 'user',
      content: userMessage,
    });

    // Add assistant response
    await addMessage(supabase, {
      sessionId: session.id,
      agencyId,
      role: 'assistant',
      content: assistantResponse,
    });

    console.log(`[Chat API] Messages persisted to session ${session.id}`);
  } catch (error) {
    // Don't throw - persistence is non-critical
    console.warn('[Chat API] Chat persistence error:', error);
  }
}

/**
 * Store conversation in memory for cross-session recall
 * Fire-and-forget: should not block the chat response
 * Dual-scoped: stores with both agencyId and userId via scoped userId format
 */
async function storeConversationMemory(
  agencyId: string,
  userId: string,
  sessionId: string | undefined,
  userMessage: string,
  assistantResponse: string,
  route: string
): Promise<void> {
  try {
    const mem0Service = initializeMem0Service();

    // Create a conversation summary for memory storage
    const conversationContent = `User: "${userMessage}"\nAssistant: "${assistantResponse.substring(0, 500)}${assistantResponse.length > 500 ? '...' : ''}"`;

    await mem0Service.addMemory({
      content: conversationContent,
      agencyId,
      userId,
      sessionId: sessionId || `session-${Date.now()}`,
      type: 'conversation',
      topic: route,
      importance: route === 'memory' ? 'high' : 'medium', // Memory recalls are high importance
    });

    // Memory stored - do not log userId
  } catch (error) {
    // Don't throw - memory storage is non-critical
    console.warn('[Chat API] Memory storage error:', error);
  }
}

/**
 * Health check endpoint
 * RBAC: Requires analytics:read permission
 */
export const GET = withPermission({ resource: 'analytics', action: 'read' })(
  async () => {
  const hasApiKey = !!process.env.GOOGLE_AI_API_KEY;

  return NextResponse.json({
    status: hasApiKey ? 'ready' : 'misconfigured',
    hasApiKey,
    timestamp: new Date().toISOString(),
  });
  }
);
