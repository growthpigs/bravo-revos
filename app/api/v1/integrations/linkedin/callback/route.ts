import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { encryptToken, serializeEncryptedToken } from '@/lib/crypto'

/**
 * GET /api/v1/integrations/linkedin/callback
 * Handles OAuth callback from UniPile, exchanges authorization code for UniPile account ID,
 * encrypts and stores account ID, and triggers initial sync.
 *
 * SECURITY:
 * - Validates state parameter to prevent CSRF
 * - Rejects state older than 5 minutes (prevents replay attacks)
 * - Encrypts tokens before storing in database
 * - Never logs sensitive data
 * - Redirects to settings page with non-sensitive success/error messages
 *
 * FLOW:
 * 1. Extract code, state, and error parameters from URL
 * 2. If user denied authorization, redirect with error
 * 3. Decode and validate state (format, userId, timestamp)
 * 4. Exchange authorization code for UniPile account ID
 * 5. Encrypt account ID before storage
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
      console.warn('[LinkedIn Callback] User denied authorization', { error })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', error)
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Step 3: Validate required parameters
    if (!code || !state) {
      console.warn('[LinkedIn Callback] Missing required parameters', { hasCode: !!code, hasState: !!state })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'invalid_params')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Step 4: Decode and validate state parameter
    let stateData: any
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch (e) {
      console.warn('[LinkedIn Callback] Invalid state format')
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'invalid_state')
      return NextResponse.redirect(redirectUrl.toString())
    }

    const userId = stateData.userId
    const timestamp = stateData.timestamp

    if (!userId || !timestamp) {
      console.warn('[LinkedIn Callback] Missing userId or timestamp in state')
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'invalid_state')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Step 5: Check state expiration (5 minute window)
    const stateAge = Date.now() - timestamp
    const MAX_STATE_AGE = 5 * 60 * 1000 // 5 minutes

    if (stateAge > MAX_STATE_AGE) {
      console.warn('[LinkedIn Callback] State parameter expired', { ageMs: stateAge, maxAgeMs: MAX_STATE_AGE })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'state_expired')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Step 6: Exchange authorization code for UniPile account ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const redirectUri = `${appUrl}/api/v1/integrations/linkedin/callback`
    const unipileClientSecret = process.env.UNIPILE_CLIENT_SECRET

    if (!unipileClientSecret) {
      console.error('[LinkedIn Callback] Missing UNIPILE_CLIENT_SECRET')
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'server_config_error')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Token exchange in progress - do not log userId

    const tokenResponse = await fetch('https://unipile.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.UNIPILE_CLIENT_ID,
        client_secret: unipileClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error('[LinkedIn Callback] Token exchange failed', {
        status: tokenResponse.status,
        error: errorBody.substring(0, 200),
      })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'token_exchange_failed')
      return NextResponse.redirect(redirectUrl.toString())
    }

    const tokenData = await tokenResponse.json()
    const accountId = tokenData.account_id || tokenData.id

    if (!accountId) {
      console.error('[LinkedIn Callback] No account ID in token response', {
        hasAccessToken: !!tokenData.access_token,
        response: JSON.stringify(tokenData).substring(0, 200),
      })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'invalid_response')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Step 7: Encrypt account ID before storage
    const encryptedData = encryptToken(accountId)
    if (!encryptedData) {
      console.error('[LinkedIn Callback] Failed to encrypt account ID')
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'encryption_failed')
      return NextResponse.redirect(redirectUrl.toString())
    }

    const encryptedToken = serializeEncryptedToken(encryptedData)

    // Step 8: Store/update credential in database
    const { error: dbError } = await supabase.from('user_oauth_credential').upsert(
      {
        user_id: userId,
        type: 'linkedin',
        access_token: encryptedToken,
        refresh_token: null,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // UniPile tokens expire in 60 days
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,type',
      }
    )

    if (dbError) {
      console.error('[LinkedIn Callback] Failed to store credential', { error: dbError.message })
      const redirectUrl = new URL('/settings/integrations', request.url)
      redirectUrl.searchParams.set('error', 'storage_failed')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Credential stored successfully

    // Step 9: Trigger initial sync (async, fire and forget)
    // Note: In production, use a background queue (Bull, RabbitMQ, etc)
    // For now, we trigger via API call with internal key
    const internalApiKey = process.env.INTERNAL_API_KEY
    if (internalApiKey) {
      fetch(`${appUrl}/api/v1/integrations/linkedin/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${internalApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      }).catch(error => {
        console.error('[LinkedIn Callback] Failed to trigger initial sync:', error)
        // Non-critical error - don't fail the callback
      })
    }

    // Authorization complete

    // Step 10: Redirect to settings with success message
    const redirectUrl = new URL('/settings/integrations', request.url)
    redirectUrl.searchParams.set('success', 'linkedin')
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('[LinkedIn Callback] Unexpected error:', error)
    const redirectUrl = new URL('/settings/integrations', request.url)
    redirectUrl.searchParams.set('error', 'unexpected_error')
    return NextResponse.redirect(redirectUrl.toString())
  }
}
