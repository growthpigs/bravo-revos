/**
 * OAuth Callback Handler
 * GET /api/v1/oauth/callback
 *
 * Handles the OAuth redirect from providers (Google, Slack, etc.)
 * - Verifies state parameter (CSRF protection)
 * - Exchanges authorization code for tokens
 * - Encrypts and stores tokens in database
 * - Redirects to integrations page
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { verifyOAuthState, encryptToken, serializeEncryptedToken } from '@/lib/crypto'
import type { IntegrationProvider } from '@/types/database'

// Token exchange endpoints for each provider
const TOKEN_ENDPOINTS: Record<string, string> = {
  gmail: 'https://oauth2.googleapis.com/token',
  google_ads: 'https://oauth2.googleapis.com/token',
  slack: 'https://slack.com/api/oauth.v2.access',
  meta_ads: 'https://graph.facebook.com/v18.0/oauth/access_token',
}

// Client credentials for each provider
function getClientCredentials(provider: IntegrationProvider): { clientId: string; clientSecret: string } {
  switch (provider) {
    case 'gmail':
      return {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      }
    case 'google_ads':
      return {
        clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      }
    case 'slack':
      return {
        clientId: process.env.SLACK_CLIENT_ID || '',
        clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      }
    case 'meta_ads':
      return {
        clientId: process.env.META_APP_ID || '',
        clientSecret: process.env.META_APP_SECRET || '',
      }
    default:
      return { clientId: '', clientSecret: '' }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/v1/oauth/callback`

  // Handle OAuth errors from provider
  if (error) {
    console.error('[OAuth Callback] Provider error:', error, errorDescription)
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  // Validate required parameters
  if (!code || !state) {
    console.error('[OAuth Callback] Missing code or state parameter')
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent('Missing authorization parameters')}`
    )
  }

  // Verify state parameter (CSRF protection)
  const statePayload = verifyOAuthState(state)
  if (!statePayload) {
    console.error('[OAuth Callback] Invalid state parameter - possible CSRF attack')
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent('Invalid state - please try again')}`
    )
  }

  // Check state freshness (10 minute window)
  const stateAge = Date.now() - statePayload.timestamp
  const maxAge = 10 * 60 * 1000 // 10 minutes
  if (stateAge > maxAge) {
    console.error('[OAuth Callback] State expired:', stateAge, 'ms old')
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent('Authorization expired - please try again')}`
    )
  }

  const { integrationId, provider } = statePayload

  try {
    // Get client credentials for this provider
    const { clientId, clientSecret } = getClientCredentials(provider as IntegrationProvider)

    if (!clientId || !clientSecret) {
      console.error('[OAuth Callback] Missing client credentials for provider:', provider)
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('OAuth not configured for this provider')}`
      )
    }

    // Exchange authorization code for tokens
    const tokenEndpoint = TOKEN_ENDPOINTS[provider]
    if (!tokenEndpoint) {
      console.error('[OAuth Callback] Unknown provider:', provider)
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Unknown provider')}`
      )
    }

    // Build token exchange request
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('[OAuth Callback] Token exchange failed:', tokenResponse.status, errorData)
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Failed to complete authorization')}`
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in, scope } = tokenData

    if (!access_token) {
      console.error('[OAuth Callback] No access token in response - check provider configuration')
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('No access token received')}`
      )
    }

    // Encrypt tokens for storage
    const encryptedAccessToken = encryptToken(access_token)
    const encryptedRefreshToken = refresh_token ? encryptToken(refresh_token) : null

    // Calculate token expiration
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    // Update integration in database
    const supabase = await createRouteHandlerClient(cookies)

    const updateData: Record<string, unknown> = {
      is_connected: true,
      config: {
        connected_at: new Date().toISOString(),
        scope: scope || null,
        expires_at: expiresAt,
      },
    }

    // Store encrypted tokens or raw if encryption not configured
    if (encryptedAccessToken) {
      updateData.access_token = serializeEncryptedToken(encryptedAccessToken)
    } else {
      updateData.access_token = access_token
    }

    if (encryptedRefreshToken) {
      updateData.refresh_token = serializeEncryptedToken(encryptedRefreshToken)
    } else if (refresh_token) {
      updateData.refresh_token = refresh_token
    }

    const { error: updateError } = await supabase
      .from('integration')
      .update(updateData)
      .eq('id', integrationId)

    if (updateError) {
      console.error('[OAuth Callback] Database update failed:', updateError)
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Failed to save credentials')}`
      )
    }

    console.log('[OAuth Callback] Successfully connected:', provider, integrationId)

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      `${baseUrl}/integrations?success=${encodeURIComponent(`${getProviderDisplayName(provider)} connected successfully`)}`
    )
  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error)
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent('An unexpected error occurred')}`
    )
  }
}

function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    gmail: 'Google Workspace',
    google_ads: 'Google Ads',
    slack: 'Slack',
    meta_ads: 'Meta Ads',
  }
  return names[provider] || provider
}
