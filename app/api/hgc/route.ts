import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

/**
 * POST /api/hgc
 * Handle chat messages through HGC orchestrator
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user context (client_id and pod membership)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 400 }
      )
    }

    // Get user's pod membership (use first active pod for MVP)
    const { data: podMembership } = await supabase
      .from('pod_members')
      .select('pod_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    const podId = podMembership?.pod_id || 'default'

    // Parse request body
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Prepare context for orchestrator
    const context = {
      user_id: user.id,
      client_id: userData.client_id,
      pod_id: podId,
      message,
      api_base_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      mem0_key: process.env.MEM0_API_KEY,
      openai_key: process.env.OPENAI_API_KEY,
      // Get auth token from session
      auth_token: request.headers.get('authorization')?.replace('Bearer ', '') || '',
    }

    // Call Python orchestrator
    const response = await callPythonOrchestrator(context)

    return NextResponse.json({
      success: true,
      response: response.content,
      memory_stored: response.memory_stored || false,
    })
  } catch (error) {
    console.error('[HGC_API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/hgc
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Holy Grail Chat',
    version: '1.0.0-mvp',
  })
}

/**
 * OPTIONS /api/hgc
 * CORS preflight handler
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

/**
 * Call Python HGC orchestrator via subprocess
 */
async function callPythonOrchestrator(context: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'packages/holy-grail-chat/core/runner.py')

    // Spawn Python process
    const pythonProcess = spawn('python3', [scriptPath], {
      env: {
        ...process.env,
        HGC_CONTEXT: JSON.stringify(context),
      },
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('[HGC_API] Python process error:', stderr)
        reject(new Error(`Python process exited with code ${code}: ${stderr}`))
      } else {
        try {
          const result = JSON.parse(stdout)
          resolve(result)
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout}`))
        }
      }
    })

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`))
    })
  })
}
