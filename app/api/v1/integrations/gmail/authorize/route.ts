import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'

/**
 * GET /api/v1/integrations/gmail/authorize
 * Initiates Gmail OAuth flow by generating state parameter and redirecting to Google consent screen.
 *
 * SECURITY:
 * - State parameter prevents CSRF attacks
 * - State expires after 5 minutes
 * - Requires user to be authenticated (checks Supabase session)
 *
 * FLOW:
 * 1. Verify user is authenticated
 * 2. Generate CSRF state with userId + timestamp
 * 3. Build OAuth URL with state
 * 4. Redirect to Google OAuth consent screen
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Step 1: Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.warn('[Gmail Authorize] Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to authorize Gmail' },
        { status: 401 }
      )
    }

    // Step 2: Verify environment variables are configured
    const clientId = process.env.GOOGLE_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!clientId || !appUrl) {
      console.error('[Gmail Authorize] Missing OAuth configuration', {
        hasClientId: !!clientId,
        hasAppUrl: !!appUrl,
      })
      return NextResponse.json(
        {
          error: 'OAuth configuration missing',
          message: 'Server is not configured for Gmail authorization',
        },
        { status: 500 }
      )
    }

    // Step 3: Generate state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64')

    // Step 4: Build OAuth URL with all required parameters
    const redirectUri = `${appUrl}/api/v1/integrations/gmail/callback`
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ]

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.append('client_id', clientId)
    authUrl.searchParams.append('redirect_uri', redirectUri)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('scope', scopes.join(' '))
    authUrl.searchParams.append('state', state)
    authUrl.searchParams.append('access_type', 'offline')
    authUrl.searchParams.append('prompt', 'consent')

    console.log('[Gmail Authorize] Redirecting to Google OAuth', {
      userId: user.id,
      redirectUri,
    })

    // Step 5: Redirect to Google consent screen
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('[Gmail Authorize] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Authorization initiation failed',
        message: 'An unexpected error occurred while initiating Gmail authorization',
      },
      { status: 500 }
    )
  }
}
