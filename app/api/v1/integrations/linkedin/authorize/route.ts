import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'

/**
 * GET /api/v1/integrations/linkedin/authorize
 * Initiates LinkedIn OAuth flow via UniPile by generating state parameter and redirecting to UniPile consent screen.
 *
 * UniPile handles LinkedIn OAuth complexity - we just need to:
 * 1. Verify user is authenticated
 * 2. Generate CSRF state
 * 3. Redirect to UniPile OAuth endpoint
 *
 * SECURITY:
 * - State parameter prevents CSRF attacks
 * - State expires after 5 minutes
 * - Requires user to be authenticated (checks Supabase session)
 *
 * FLOW:
 * 1. Verify user is authenticated
 * 2. Generate CSRF state with userId + timestamp
 * 3. Build UniPile OAuth URL with state
 * 4. Redirect to UniPile consent screen
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Step 1: Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.warn('[LinkedIn Authorize] Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to authorize LinkedIn' },
        { status: 401 }
      )
    }

    // Step 2: Verify environment variables are configured
    const unipileClientId = process.env.UNIPILE_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!unipileClientId || !appUrl) {
      console.error('[LinkedIn Authorize] Missing UniPile configuration', {
        hasClientId: !!unipileClientId,
        hasAppUrl: !!appUrl,
      })
      return NextResponse.json(
        {
          error: 'OAuth configuration missing',
          message: 'Server is not configured for LinkedIn authorization',
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

    // Step 4: Build UniPile OAuth URL
    const redirectUri = `${appUrl}/api/v1/integrations/linkedin/callback`
    const unipileOAuthEndpoint = process.env.UNIPILE_OAUTH_ENDPOINT || 'https://unipile.com/oauth/authorize'

    const authUrl = new URL(unipileOAuthEndpoint)
    authUrl.searchParams.append('client_id', unipileClientId)
    authUrl.searchParams.append('redirect_uri', redirectUri)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('state', state)
    authUrl.searchParams.append('provider', 'LINKEDIN')

    console.log('[LinkedIn Authorize] Redirecting to UniPile OAuth', {
      userId: user.id,
      redirectUri,
    })

    // Step 5: Redirect to UniPile consent screen
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('[LinkedIn Authorize] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Authorization initiation failed',
        message: 'An unexpected error occurred while initiating LinkedIn authorization',
      },
      { status: 500 }
    )
  }
}
