import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * POST /api/hgc
 * Chat endpoint using direct OpenAI SDK with streaming
 *
 * For MVP: Bypasses Python orchestrator, calls OpenAI directly
 * Phase 2: Will integrate full AgentKit + Mem0 + RevOS tools via Python
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[HGC_API] Request received')
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[HGC_API] No authenticated user')
      return new Response('Unauthorized', { status: 401 })
    }

    console.log('[HGC_API] User authenticated:', user.id)

    // Get user context
    const { data: userData } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!userData) {
      console.log('[HGC_API] User data not found')
      return new Response('User data not found', { status: 400 })
    }

    // Get user's pod membership
    const { data: podMembership } = await supabase
      .from('pod_members')
      .select('pod_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    const podId = podMembership?.pod_id || 'default'

    // Parse request body
    const { messages } = await request.json()
    console.log('[HGC_API] Messages received:', messages.length, 'messages')

    // MVP: Direct OpenAI call with streaming
    console.log('[HGC_API] Calling OpenAI streaming API...')

    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are RevOS Intelligence, an AI co-founder helping with LinkedIn growth strategy.

Context:
- User ID: ${user.id}
- Client ID: ${userData.client_id}
- Pod ID: ${podId}

For this MVP, provide general LinkedIn strategy advice.

Phase 2 capabilities (coming soon):
- Access real campaign metrics
- Analyze pod engagement
- Get LinkedIn performance data
- Remember past conversations via Mem0

Be helpful, specific, and actionable.`,
        },
        ...messages,
      ],
      stream: true,
    })

    console.log('[HGC_API] OpenAI stream created, starting to read chunks...')

    // Create ReadableStream from OpenAI stream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let chunkCount = 0
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              chunkCount++
              console.log('[HGC_API] Chunk', chunkCount, ':', content.substring(0, 50))
              controller.enqueue(encoder.encode(content))
            }
          }
          console.log('[HGC_API] Stream complete. Total chunks:', chunkCount)
          controller.close()
        } catch (error) {
          console.error('[HGC_API] Stream error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[HGC_API] Error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

/**
 * GET /api/hgc
 * Health check endpoint
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'Holy Grail Chat',
    version: '1.0.0-mvp',
    mode: 'direct-openai-sdk',
  })
}
