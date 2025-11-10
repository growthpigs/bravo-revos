import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * POST /api/hgc
 * Holy Grail Chat - Proxying to HGCR backend
 *
 * Proxies requests to fast HGCR server (http://localhost:8000)
 * HGCR handles AgentKit + Mem0 + RevOS tools
 */
export async function POST(request: NextRequest) {
  const requestStartTime = Date.now()

  try {
    console.log('[HGC_API] Phase 2 request received')
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[HGC_API] No authenticated user')
      return new Response('Unauthorized', { status: 401 })
    }

    console.log('[HGC_API] User authenticated:', user.id)

    // Get session token for API calls
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return new Response('No session', { status: 401 })
    }

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

    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 })
    }

    console.log('[HGC_API] Proxying to HGCR backend...')
    const hgcrStartTime = Date.now()

    // Extract last user message (HGCR expects single message, not array)
    const lastMessage = messages[messages.length - 1]?.content || ''
    console.log('[HGC_API] Last message:', lastMessage.substring(0, 100))

    // Proxy to fast HGCR server
    const hgcrResponse = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        message: lastMessage,  // HGCR expects "message" (singular)
        user_id: user.id,
        client_id: userData.client_id,
        pod_id: podId
      })
    })

    if (!hgcrResponse.ok) {
      const errorText = await hgcrResponse.text()
      console.error('[HGC_API] HGCR error:', errorText)
      return new Response(`HGCR error: ${errorText}`, { status: hgcrResponse.status })
    }

    // Parse HGCR JSON response
    const result = await hgcrResponse.json()

    const hgcrDuration = Date.now() - hgcrStartTime
    const totalDuration = Date.now() - requestStartTime
    console.log(`[HGC_TIMING] HGCR response: ${hgcrDuration}ms`)
    console.log(`[HGC_TIMING] Total request: ${totalDuration}ms`)

    if (!result.success) {
      return new Response(`HGCR error: ${result.error || 'Unknown error'}`, { status: 500 })
    }

    // Stream response word-by-word for better UX
    const encoder = new TextEncoder()
    const words = result.response.split(' ')

    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          controller.enqueue(encoder.encode(words[i] + ' '))
          await new Promise(resolve => setTimeout(resolve, 10))
        }
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
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
    version: '3.0.0-hgcr',
    mode: 'hgcr-proxy',
    backend: 'http://localhost:8000',
    features: ['AgentKit', 'Mem0', 'RevOS Tools', 'Fast Response'],
  })
}
