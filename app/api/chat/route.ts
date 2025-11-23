import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { OPENAI_MODELS } from '@/lib/config/openai-models';

// Allow streaming responses properly
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    const result = await streamText({
      model: openai(OPENAI_MODELS.LEGACY_TURBO),
      messages,
      system: `You are a helpful AI assistant for Bravo revOS, a LinkedIn automation platform.
You help users with:
- Setting up and managing LinkedIn campaigns
- Creating voice cartridges for personalized messaging
- Understanding lead generation strategies
- Troubleshooting automation issues
- Best practices for LinkedIn outreach

Be concise, helpful, and professional. If users ask about specific features,
refer to the platform's capabilities around campaigns, leads, pods, and voice cartridges.`,
      temperature: 0.7,
      maxRetries: 2,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('[Chat API] Error:', error);

    // Handle specific errors
    if (error?.message?.includes('API key')) {
      return new Response('OpenAI API key error', { status: 401 });
    }

    if (error?.message?.includes('rate limit')) {
      return new Response('Rate limit exceeded. Please try again later.', { status: 429 });
    }

    return new Response('An error occurred processing your request', { status: 500 });
  }
}