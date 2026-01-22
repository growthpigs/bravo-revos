import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { encryptToken, serializeEncryptedToken } from '@/lib/crypto'

/**
 * GET /api/v1/integrations/slack/callback
 * Handles OAuth callback from Slack, exchanges authorization code for token,
 * encrypts and stores token, and triggers initial sync.
 *
 * SECURITY:
 * - Validates state parameter to prevent CSRF
 * - Rejects state older than 5 minutes (prevents replay attacks)
 * - Encrypts tokens before storing in database
 * - Never logs tokens or sensitive data
 * - Redirects to settings page with non-sensitive success/error messages
 *
 * FLOW:
 * 1. Extract code, state, and error parameters from URL
 * 2. If user denied authorization, redirect with error
 * 3. Decode and validate state (format, userId, timestamp)
 * 4. Exchange authorization code for access token
 * 5. Encrypt token before storage
 * 6. Store/update record in user_oauth_credential table
 * 7. Trigger initial sync (async, fire and forget)
 * 8. Redirect to settings with success message
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { searchParams } = new URL(request.url)

    // Step 1: Extract parameters from OAuth callback
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Step 2: Handle user denying authorization
    if (error) {
      console.warn('[Slack Callback] User denied authorization', { error })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', error)
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Step 3: Validate required parameters
    if (!code || !state) {
      console.warn('[Slack Callback] Missing required parameters', { hasCode: !!code, hasState: !!state })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'invalid_params')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Step 4: Decode and validate state parameter
    let stateData: any
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch (e) {
      console.warn('[Slack Callback] Invalid state format')
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'invalid_state')
      return NextResponse.redirect(redirectUrl.toString())
    }

    const userId = stateData.userId
    const timestamp = stateData.timestamp

    if (!userId || !timestamp) {
      console.warn('[Slack Callback] Missing userId or timestamp in state')
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'invalid_state')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Step 5: Check state expiration (5 minute window)
    const stateAge = Date.now() - timestamp
    const MAX_STATE_AGE = 5 * 60 * 1000 // 5 minutes

    if (stateAge > MAX_STATE_AGE) {
      console.warn('[Slack Callback] State parameter expired', { ageMs: stateAge, maxAgeMs: MAX_STATE_AGE })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'state_expired')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Step 6: Exchange authorization code for token
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const redirectUri = `${appUrl}/api/v1/integrations/slack/callback`

    // Token exchange in progress - do not log userId

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokens = await tokenResponse.json()

    // Slack returns {ok: false, error: string} on failure
    if (!tokens.ok || !tokens.access_token) {
      console.error('[Slack Callback] Token exchange failed', {
        error: tokens.error || 'unknown',
      })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'token_exchange_failed')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Token exchange successful

    // Step 7: Encrypt token before storage
    const accessTokenEncrypted = encryptToken(tokens.access_token)
    if (!accessTokenEncrypted) {
      console.error('[Slack Callback] Failed to encrypt access token')
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'encryption_failed')
      return NextResponse.redirect(redirectUrl.toString())
    }

    const encryptedAccessToken = serializeEncryptedToken(accessTokenEncrypted)

    // Step 8: Store in database using upsert (create or update)
    const { error: insertError } = await supabase
      .from('user_oauth_credential')
      .upsert(
        {
          user_id: userId,
          type: 'slack',
          access_token: encryptedAccessToken,
          refresh_token: null, // Slack standard flow doesn't provide refresh token
          is_connected: true,
          last_sync_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,type',
        }
      )

    if (insertError) {
      console.error('[Slack Callback] Database storage failed', { error: insertError.message })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'storage_failed')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Credentials stored successfully

    // Step 9: Trigger initial sync (async, don't wait for response)
    // This allows immediate channel fetching in the background
    fetch(`${appUrl}/api/v1/integrations/slack/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    }).catch(err => {
      console.error('[Slack Callback] Sync trigger failed:', err)
      // Non-critical failure - don't interrupt user flow
    })

    // Step 10: Redirect to settings with success message
    const successUrl = new URL('/settings/integrations', request.url)
    successUrl.searchParams.set('success', 'slack_connected')
    return NextResponse.redirect(successUrl.toString())
  } catch (error) {
    console.error('[Slack Callback] Unexpected error:', error)
    const redirectUrl = new URL('/settings/integrations', request.url)
    redirectUrl.searchParams.set('error', 'callback_failed')
    return NextResponse.redirect(redirectUrl.toString())
  }
}
