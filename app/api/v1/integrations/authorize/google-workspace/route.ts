/**
 * Gmail OAuth 2.1 Authorization Flow
 *
 * Step 1: GET - Redirect to Google OAuth consent screen
 * Step 2: Google redirects to /callback with authorization_code
 * Step 3: Callback exchanges code for access_token + refresh_token
 * Step 4: Tokens stored in integration record, user redirected to settings
 *
 * RBAC: Requires integrations:manage
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { signOAuthState, verifyOAuthState as verifyOAuthStateSignature } from '@/lib/crypto'

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

// GET - Initiate OAuth flow: redirect to Google consent screen
export const GET = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    try {
      const agencyId = request.user.agencyId

      // Generate state parameter for CSRF protection
      // Note: integrationId will be generated after creation, so we use a placeholder
      const state = signOAuthState({
        integrationId: `gmail_${agencyId}_${Date.now()}`,
        provider: 'gmail',
        timestamp: Date.now(),
      })

      // Build Google OAuth authorization URL
      const googleAuthURL = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      googleAuthURL.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '')
      googleAuthURL.searchParams.set('redirect_uri', `${getBaseURL()}/api/v1/integrations/authorize/google-workspace/callback`)
      googleAuthURL.searchParams.set('response_type', 'code')
      googleAuthURL.searchParams.set('scope', [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.labels',
      ].join(' '))
      googleAuthURL.searchParams.set('access_type', 'offline') // Request refresh token
      googleAuthURL.searchParams.set('state', state)
      googleAuthURL.searchParams.set('prompt', 'consent') // Force consent screen

      // Redirect user to Google
      return NextResponse.redirect(googleAuthURL.toString())
    } catch (error) {
      console.error('[gmail-auth] OAuth initiation error:', error)
      return createErrorResponse(500, 'Failed to initiate Gmail authorization')
    }
  }
)

// GET /callback - Handle OAuth callback from Google
export const POST = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    try {
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { code, state } = body as { code?: string; state?: string }

      // Validate required parameters
      if (!code || !state) {
        return createErrorResponse(
          400,
          'Missing required parameters: code and state'
        )
      }

      // Verify state parameter (CSRF protection)
      const statePayload = verifyOAuthStateSignature(state)
      if (!statePayload || statePayload.provider !== 'gmail') {
        return createErrorResponse(401, 'Invalid state parameter - possible CSRF attack')
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: `${getBaseURL()}/api/v1/integrations/authorize/google-workspace/callback`,
          grant_type: 'authorization_code',
        }).toString(),
      })

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text()
        console.error('[gmail-auth] Token exchange failed:', error)
        return createErrorResponse(500, `Token exchange failed: ${error}`)
      }

      const tokens = (await tokenResponse.json()) as GoogleTokenResponse

      if (!tokens.access_token) {
        return createErrorResponse(500, 'No access token in response')
      }

      // Calculate token expiration time
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      // Create or update integration record in database
      const { data: integration, error: upsertError } = await supabase
        .from('integration')
        .upsert(
          {
            agency_id: agencyId,
            provider: 'gmail',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: expiresAt,
            is_connected: true,
            config: {
              gmail_scopes: ['gmail.readonly', 'gmail.labels'],
              authorized_at: new Date().toISOString(),
            },
          },
          {
            onConflict: 'agency_id,provider',
          }
        )
        .select()
        .single()

      if (upsertError) {
        console.error('[gmail-auth] Upsert integration error:', upsertError)
        return createErrorResponse(500, 'Failed to save integration')
      }

      console.log('[gmail-auth] Gmail integration successful:', {
        agencyId,
        integrationId: integration.id,
        expiresAt,
      })

      // Return success with integration details (exclude tokens)
      const { access_token: _at, refresh_token: _rt, ...safeIntegration } = integration
      return NextResponse.json({
        data: {
          status: 'success',
          integration: safeIntegration,
          message: 'Gmail authorization successful',
        },
      })
    } catch (error) {
      console.error('[gmail-auth] OAuth callback error:', error)
      return createErrorResponse(500, 'Failed to complete Gmail authorization')
    }
  }
)

/**
 * Get base URL for OAuth redirect_uri
 * In production: https://yourdomain.com
 * In development: http://localhost:3000
 */
function getBaseURL(): string {
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
