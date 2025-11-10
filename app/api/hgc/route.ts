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

    // Prepare context for Python orchestrator with FULL conversation history
    const context = {
      user_id: user.id,
      pod_id: podId,
      client_id: userData.client_id,
      messages: messages, // Pass ALL messages for conversation history
      api_base_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      mem0_key: process.env.MEM0_API_KEY || '',
      openai_key: process.env.OPENAI_API_KEY || '',
      auth_token: session.access_token
    }

    console.log('[HGC_API] Proxying to HGCR backend...')
    const hgcrStartTime = Date.now()

    // Proxy to fast HGCR server
    const hgcrResponse = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        messages,
        context: {
          user_id: user.id,
          client_id: userData.client_id,
          pod_id: podId,
          api_base_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          mem0_key: process.env.MEM0_API_KEY || '',
          openai_key: process.env.OPENAI_API_KEY || '',
          auth_token: session.access_token
        }
      })
    })

    if (!hgcrResponse.ok) {
      const error = await hgcrResponse.text()
      console.error('[HGC_API] HGCR error:', error)
      return new Response(`HGCR error: ${error}`, { status: hgcrResponse.status })
    }

    const hgcrDuration = Date.now() - hgcrStartTime
    const totalDuration = Date.now() - requestStartTime
    console.log(`[HGC_TIMING] HGCR response: ${hgcrDuration}ms`)
    console.log(`[HGC_TIMING] Total request: ${totalDuration}ms`)

    // Stream response from HGCR
    return new Response(hgcrResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
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
