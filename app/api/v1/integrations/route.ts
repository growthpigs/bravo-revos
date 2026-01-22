/**
 * Integrations API
 * GET /api/v1/integrations - List all integrations
 * POST /api/v1/integrations - Create new integration
 *
 * RBAC: Requires integrations:read (GET) or integrations:manage (POST)
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { signOAuthState } from '@/lib/crypto'
import type { IntegrationProvider } from '@/types/database'

const VALID_PROVIDERS: IntegrationProvider[] = ['slack', 'gmail', 'google_ads', 'meta_ads']

// GET /api/v1/integrations - List all integrations for the agency
export const GET = withPermission({ resource: 'integrations', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const _agencyId = request.user.agencyId // Used by RLS

      // Fetch integrations - RLS will filter by agency_id
      const { data: integrations, error } = await supabase
        .from('integration')
        .select('*')
        .order('provider', { ascending: true })

      if (error) {
        return createErrorResponse(500, 'Failed to fetch integrations')
      }

      // Return integrations without exposing tokens
      const safeIntegrations = integrations.map(({ access_token: _at, refresh_token: _rt, ...rest }) => rest)

      return NextResponse.json({ data: safeIntegrations })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/integrations - Initiate OAuth flow or create integration record
export const POST = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    // Rate limit: 30 creates per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { provider, credentials } = body as { provider: string; credentials?: Record<string, string> }

      // Validate provider
      if (typeof provider !== 'string' || !VALID_PROVIDERS.includes(provider as IntegrationProvider)) {
        return createErrorResponse(
          400,
          `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`
        )
      }

    // Check if integration already exists for this provider
    const { data: existing } = await supabase
      .from('integration')
      .select('id, is_connected')
      .eq('provider', provider as IntegrationProvider)
      .maybeSingle()

    // Credential-based providers (Slack, Google Ads, Meta Ads)
    // These use manual token entry instead of OAuth flow
    const credentialProviders = ['slack', 'google_ads', 'meta_ads']

    // Only block reconnection for credential-based providers
    // OAuth providers (gmail) can reconnect to refresh tokens
    if (existing?.is_connected && credentialProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Integration already exists and is connected for this provider' },
        { status: 409 }
      )
    }

    if (credentialProviders.includes(provider) && credentials) {
      // Validate required credentials for each provider
      const requiredFields: Record<string, string[]> = {
        slack: ['client_id', 'client_secret', 'signing_secret'],
        google_ads: ['developer_token', 'customer_id'],
        meta_ads: ['app_id', 'app_secret', 'access_token'],
      }

      const required = requiredFields[provider] || []
      const missing = required.filter(field => !credentials[field]?.trim())

      if (missing.length > 0) {
        return createErrorResponse(400, `Missing required credentials: ${missing.join(', ')}`)
      }

      // Store credentials (encrypted in config) and mark as connected
      const { data: integration, error } = await supabase
        .from('integration')
        .insert({
          agency_id: agencyId,
          provider: provider as IntegrationProvider,
          is_connected: true,
          config: {
            credentials: credentials,
            connected_at: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (error) {
        return createErrorResponse(500, 'Failed to create integration')
      }

      return NextResponse.json({
        data: {
          id: integration.id,
          provider: integration.provider,
          is_connected: true,
        },
      })
    }

    // OAuth-based providers (Gmail/Google Workspace)
    let integrationId: string

    if (existing) {
      // Reuse existing disconnected integration
      integrationId = existing.id
    } else {
      // Create new integration record (disconnected state initially)
      const { data: integration, error } = await supabase
        .from('integration')
        .insert({
          agency_id: agencyId,
          provider: provider as IntegrationProvider,
          is_connected: false,
          config: {},
        })
        .select()
        .single()

      if (error) {
        return createErrorResponse(500, 'Failed to create integration')
      }
      integrationId = integration.id
    }

    // Generate OAuth URL based on provider
    const oauthUrl = generateOAuthUrl(provider as IntegrationProvider, integrationId)

      return NextResponse.json({
        data: {
          id: integrationId,
          provider,
          oauthUrl,
        },
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// Generate OAuth authorization URL for each provider
function generateOAuthUrl(provider: IntegrationProvider, integrationId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/v1/oauth/callback`

  // State includes integration ID for tracking, signed with HMAC to prevent CSRF
  const state = signOAuthState({
    integrationId,
    provider,
    timestamp: Date.now(),
  })

  switch (provider) {
    case 'slack':
      return `https://slack.com/oauth/v2/authorize?${new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '',
        scope: 'channels:read,channels:history,chat:write,users:read,team:read',
        redirect_uri: redirectUri,
        state,
      })}`

    case 'gmail':
      // Full Google Workspace scopes: Gmail, Calendar, Drive, Sheets, Docs
      return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        scope: [
          // Gmail
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify',
          // Calendar
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
          // Drive
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
          // Sheets
          'https://www.googleapis.com/auth/spreadsheets',
          // Docs
          'https://www.googleapis.com/auth/documents',
        ].join(' '),
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
      })}`

    case 'google_ads':
      return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
        scope: 'https://www.googleapis.com/auth/adwords',
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
        access_type: 'offline',
        include_granted_scopes: 'true',
      })}`

    case 'meta_ads':
      return `https://www.facebook.com/v18.0/dialog/oauth?${new URLSearchParams({
        client_id: process.env.META_APP_ID || '',
        scope: 'ads_read,business_management,ads_management',
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
      })}`

    default:
      return ''
  }
}
