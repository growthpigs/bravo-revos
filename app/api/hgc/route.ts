import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

/**
 * POST /api/hgc
 * Holy Grail Chat - Phase 2 with Python orchestrator
 *
 * Uses Python orchestrator with AgentKit + Mem0 + RevOS tools
 */
export async function POST(request: NextRequest) {
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
      api_base_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000',
      mem0_key: process.env.MEM0_API_KEY || '',
      openai_key: process.env.OPENAI_API_KEY || '',
      auth_token: session.access_token
    }

    console.log('[HGC_API] Calling Python orchestrator...')

    // Call Python runner with Python 3.11 explicitly (requires 3.10+)
    const pythonPath = path.join(process.cwd(), 'packages', 'holy-grail-chat', 'core', 'runner.py')
    const python = spawn('python3.11', [pythonPath], {
      env: {
        ...process.env,
        HGC_CONTEXT: JSON.stringify(context)
      }
    })

    // Collect response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let buffer = ''
        let errorBuffer = ''
        let cleanedUp = false

        const cleanup = () => {
          if (cleanedUp) return
          cleanedUp = true

          try {
            python.stdout.removeAllListeners()
            python.stderr.removeAllListeners()
            python.removeAllListeners()

            // Kill process if still running
            if (!python.killed) {
              python.kill('SIGTERM')
            }
          } catch (e) {
            console.error('[HGC_API] Cleanup error:', e)
          }
        }

        try {
          const handleStdout = (data: Buffer) => {
            buffer += data.toString()
          }

          const handleStderr = (data: Buffer) => {
            errorBuffer += data.toString()
          }

          const handleClose = (code: number | null) => {
            console.log('[HGC_API] Python process closed with code:', code)

            // ALWAYS log stderr (debug logs go here)
            if (errorBuffer) {
              console.log('[HGC_API] Python stderr:', errorBuffer)
            }

            if (code !== 0) {
              console.error('[HGC_API] Python error:', errorBuffer)
              controller.error(new Error(`Python error: ${errorBuffer}`))
              cleanup()
              return
            }

            try {
              console.log('[HGC_API] Attempting to parse buffer, length:', buffer.length)
              const result = JSON.parse(buffer)
              console.log('[HGC_API] Parse successful, result:', result)

              if (result.error) {
                console.error('[HGC_API] Python returned error:', result.error)
                controller.enqueue(encoder.encode(`Error: ${result.error}`))
              } else if (result.content) {
                console.log('[HGC_API] Streaming content, length:', result.content.length)
                // Stream the content word by word for better UX
                const words = result.content.split(' ')
                for (let i = 0; i < words.length; i++) {
                  controller.enqueue(encoder.encode(words[i] + ' '))
                }
              }
              controller.close()
              console.log('[HGC_API] Controller closed successfully')
            } catch (e) {
              console.error('[HGC_API] Error in streaming:', e)
              console.error('[HGC_API] Buffer contents:', buffer)
              controller.error(new Error('Failed to process Python response'))
            } finally {
              cleanup()
            }
          }

          const handleError = (error: Error) => {
            console.error('[HGC_API] Python spawn error:', error)
            controller.error(error)
            cleanup()
          }

          python.stdout.on('data', handleStdout)
          python.stderr.on('data', handleStderr)
          python.on('close', handleClose)
          python.on('error', handleError)
        } catch (error) {
          console.error('[HGC_API] Stream error:', error)
          controller.error(error instanceof Error ? error : new Error(String(error)))
          cleanup()
        }
      },
      cancel() {
        // Called when stream is cancelled (user navigates away)
        console.log('[HGC_API] Stream cancelled by client')
        if (!python.killed) {
          python.kill('SIGTERM')
        }
      }
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
    version: '2.0.0-phase2',
    mode: 'python-orchestrator',
    features: ['AgentKit', 'Mem0', 'RevOS Tools'],
  })
}
