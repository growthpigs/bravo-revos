/**
 * Conversation Intelligence API Route
 * Server-side endpoint for GPT-4 tone analysis and response generation
 * Protects OpenAI API key from client-side exposure
 */

import { NextRequest, NextResponse } from 'next/server';
// REMOVED: import OpenAI from 'openai'; - moved to dynamic import to prevent build-time tiktoken execution
import { createClient } from '@/lib/supabase/server';
import type { Offering } from '@/lib/types/offerings';

// Types
interface ToneProfile {
  formality: 'casual' | 'neutral' | 'formal';
  sentiment: string;
  emotionalState: string;
  confidence: number;
}

interface ResponseStyle {
  tone: 'conversational' | 'balanced' | 'professional';
  structure: 'brief' | 'moderate' | 'detailed';
  vocabulary: 'simple' | 'standard' | 'technical';
  empathy: 'high' | 'medium' | 'low';
}

interface EmotionalContext {
  primary: string;
  secondary?: string;
  intensity: number;
  triggers: string[];
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * POST /api/conversation-intelligence
 * Body: { action: 'analyze-tone' | 'generate-response', message, context? }
 */
export async function POST(request: NextRequest) {
  try {
    // Dynamic import to prevent tiktoken from trying to read encoder.json at build time
    const { default: OpenAI } = await import('openai');

    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { action, message, context } = body;

    if (!action || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: action, message' },
        { status: 400 }
      );
    }

    if (typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json(
        { error: 'Message must be a string with max 2000 characters' },
        { status: 400 }
      );
    }

    // 3. Initialize OpenAI client (lazy initialization prevents build-time execution)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI service unavailable', fallback: true },
        { status: 503 }
      );
    }
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // 4. Handle different actions
    if (action === 'analyze-tone') {
      const toneProfile = await analyzeToneWithGPT4(openai, message);
      return NextResponse.json({ toneProfile });
    } else if (action === 'generate-response') {
      if (!context) {
        return NextResponse.json(
          { error: 'Context required for response generation' },
          { status: 400 }
        );
      }

      const response = await generateResponseWithGPT4(
        openai,
        message,
        context.toneProfile,
        context.style,
        context.emotion,
        context.conversationHistory,
        context.offering
      );

      return NextResponse.json({ response });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "analyze-tone" or "generate-response"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[ConversationIntelligence API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', fallback: true },
      { status: 500 }
    );
  }
}

/**
 * Analyze tone using GPT-4
 */
async function analyzeToneWithGPT4(openai: any, message: string): Promise<ToneProfile> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `Analyze the tone and emotional state of the user's message.

Return JSON:
{
  "formality": "casual" | "neutral" | "formal",
  "sentiment": "excited" | "neutral" | "skeptical" | "frustrated" | "professional",
  "emotionalState": "eager" | "doubtful" | "frustrated" | "analytical" | "urgent",
  "confidence": 0.0-1.0
}`,
      },
      {
        role: 'user',
        content: message,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });

  const analysis = JSON.parse(completion.choices[0].message.content || '{}');
  return analysis as ToneProfile;
}

/**
 * Generate response using GPT-4
 */
async function generateResponseWithGPT4(
  openai: any,
  userMessage: string,
  toneProfile: ToneProfile,
  style: ResponseStyle,
  emotion: EmotionalContext,
  conversationHistory: ConversationMessage[],
  offering?: Offering
): Promise<string> {
  // Build system prompt based on style
  let systemPrompt = 'You are a helpful assistant.';

  if (style.tone === 'conversational') {
    systemPrompt =
      'You are a friendly, down-to-earth assistant. Use casual language, avoid jargon, and be empathetic.';
  } else if (style.tone === 'professional') {
    systemPrompt =
      'You are a professional business consultant. Use formal language, provide detailed analysis, and focus on facts and metrics.';
  }

  if (style.empathy === 'high') {
    systemPrompt +=
      ' Show understanding and validate their concerns before offering solutions.';
  }

  if (emotion.primary === 'frustrated') {
    systemPrompt +=
      ' The user is frustrated. Acknowledge their frustration and provide clear, simple solutions.';
  } else if (emotion.primary === 'skeptical') {
    systemPrompt +=
      ' The user is skeptical. Be honest, acknowledge common concerns, and provide concrete evidence.';
  }

  // Add offering context if available
  if (offering) {
    systemPrompt += `\n\nYou are representing this offering: ${offering.name}
Elevator pitch: ${offering.elevator_pitch}
Key benefits: ${offering.key_benefits.join(', ')}`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...conversationHistory.slice(-5), // Only use last 5 messages for context
      {
        role: 'user',
        content: userMessage,
      },
    ],
    max_tokens: 500,
  });

  return completion.choices[0].message.content || '';
}
