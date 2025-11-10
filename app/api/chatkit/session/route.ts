import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/chatkit/session
 *
 * Returns Supabase session token for ChatKit authentication.
 * ChatKit will use this token to call /api/hgc directly.
 *
 * Option A: Direct Backend Call (simpler, uses existing Python orchestrator)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      )
    }

    // Return session token as client_secret
    // ChatKit will pass this in Authorization header to /api/hgc
    return NextResponse.json({
      success: true,
      client_secret: session.access_token,
      user_id: user.id,
      expires_at: session.expires_at
    })

  } catch (error) {
    console.error('[CHATKIT_SESSION] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
