/**
 * Single Integration API
 * GET /api/v1/integrations/[id] - Get integration details
 * PATCH /api/v1/integrations/[id] - Update integration config
 * DELETE /api/v1/integrations/[id] - Disconnect and delete integration
 *
 * RBAC: Requires integrations:read (GET) or integrations:manage (PATCH/DELETE)
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, createErrorResponse, withTimeout } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { decryptToken, deserializeEncryptedToken } from '@/lib/crypto'
import type { IntegrationProvider } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Token revocation endpoints for each provider (SEC-005)
const REVOCATION_ENDPOINTS: Record<IntegrationProvider, string | null> = {
  slack: 'https://slack.com/api/auth.revoke',
  gmail: 'https://oauth2.googleapis.com/revoke',
  google_ads: 'https://oauth2.googleapis.com/revoke',
  meta_ads: null, // Meta doesn't have a standard revocation endpoint
}

/**
 * Revoke OAuth tokens with the provider (SEC-005)
 * This ensures tokens are invalidated when user disconnects
 */
async function revokeProviderTokens(
  provider: IntegrationProvider,
  accessToken: string | null,
  _refreshToken: string | null
): Promise<{ success: boolean; error?: string }> {
  const revokeUrl = REVOCATION_ENDPOINTS[provider]

  if (!revokeUrl) {
    // Provider doesn't support revocation (e.g., Meta)
    return { success: true }
  }

  // Try to decrypt tokens if they're encrypted
  let tokenToRevoke = accessToken
  if (accessToken?.startsWith('{')) {
    const encrypted = deserializeEncryptedToken(accessToken)
    if (encrypted) {
      tokenToRevoke = decryptToken(encrypted)
    }
  }

  if (!tokenToRevoke) {
    // No token to revoke
    return { success: true }
  }

  try {
    if (provider === 'slack') {
      // Slack uses a different revocation API
      await withTimeout(
        fetch(revokeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenToRevoke}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
        5000,
        'Token revocation timed out'
      )
    } else {
      // Google uses standard OAuth2 revocation
      await withTimeout(
        fetch(`${revokeUrl}?token=${encodeURIComponent(tokenToRevoke)}`, {
          method: 'POST',
        }),
        5000,
        'Token revocation timed out'
      )
    }

    return { success: true }
  } catch (error) {
    // Log but don't fail - we still want to delete the integration
    console.error(`[SEC-005] Token revocation failed for ${provider}:`, error)
    return { success: false, error: 'Token revocation failed' }
  }
}

// GET /api/v1/integrations/[id] - Get single integration details
export const GET = withPermission({ resource: 'integrations', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id } = await params

      // Validate UUID format
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid integration ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      const { data: integration, error } = await supabase
        .from('integration')
        .select('*')
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
        .single()

      if (error || !integration) {
        return createErrorResponse(404, 'Integration not found')
      }

      // Return without exposing tokens (destructure to omit)
      const { access_token: _at, refresh_token: _rt, ...safeIntegration } = integration

      return NextResponse.json({ data: safeIntegration })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// PATCH /api/v1/integrations/[id] - Update integration config
export const PATCH = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // Rate limit: 50 updates per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 50, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params

      // Validate UUID format
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid integration ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      // Only allow updating specific fields
      const allowedFields = ['config', 'is_connected']
      const updates: Record<string, unknown> = {}

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          // Validate specific fields
          if (field === 'is_connected' && typeof body[field] !== 'boolean') {
            return createErrorResponse(400, 'is_connected must be a boolean')
          }
          if (field === 'config' && typeof body[field] !== 'object') {
            return createErrorResponse(400, 'config must be an object')
          }
          updates[field] = body[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        return createErrorResponse(400, 'No valid fields to update')
      }

      const { data: integration, error } = await supabase
        .from('integration')
        .update(updates)
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
        .select()
        .single()

      if (error) {
        return createErrorResponse(500, 'Failed to update integration')
      }

      if (!integration) {
        return createErrorResponse(404, 'Integration not found')
      }

      // Return without exposing tokens
      const { access_token: _at, refresh_token: _rt, ...safeIntegration } = integration

      return NextResponse.json({ data: safeIntegration })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/integrations/[id] - Disconnect and delete integration
export const DELETE = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // Rate limit: 20 deletes per minute (stricter for destructive ops)
    const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params

      // Validate UUID format
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid integration ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      // Get integration with tokens for revocation
      const { data: existing } = await supabase
        .from('integration')
        .select('id, provider, access_token, refresh_token')
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
        .single()

      if (!existing) {
        return createErrorResponse(404, 'Integration not found')
      }

      // Revoke OAuth tokens with provider before deletion (SEC-005)
      const revocationResult = await revokeProviderTokens(
        existing.provider as IntegrationProvider,
        existing.access_token,
        existing.refresh_token
      )

      // Log if revocation failed but continue with deletion
      if (!revocationResult.success) {
        console.warn(`[SEC-005] Token revocation warning for ${existing.provider}: ${revocationResult.error}`)
      }

      // Delete the integration
      const { error } = await supabase
        .from('integration')
        .delete()
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)

      if (error) {
        return createErrorResponse(500, 'Failed to delete integration')
      }

      return NextResponse.json({
        message: `${existing.provider} integration disconnected and deleted`,
        tokenRevoked: revocationResult.success,
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
