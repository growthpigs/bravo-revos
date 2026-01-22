/**
 * Agency Settings API
 * GET /api/v1/settings/agency - Get agency configuration
 * PATCH /api/v1/settings/agency - Update agency settings
 *
 * RBAC Protection: settings:read for GET, settings:write for PATCH
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, createServiceRoleClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

// ============================================================================
// GET /api/v1/settings/agency
// ============================================================================

export const GET = withPermission({ resource: 'settings', action: 'read' })(
  async (request: AuthenticatedRequest) => {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { agencyId } = request.user

    // Fetch agency settings using service role client to bypass RLS
    // This is safe because we've already verified the user belongs to this agency
    const serviceClient = createServiceRoleClient()
    if (!serviceClient) {
      return createErrorResponse(500, 'Service configuration error')
    }

    const { data: agency, error } = await serviceClient
      .from('agency')
      .select('*')
      .eq('id', agencyId)
      .single()

    if (error || !agency) {
      console.error('[Settings/Agency] Failed to fetch:', error)
      return createErrorResponse(500, 'Failed to fetch agency settings')
    }

    return NextResponse.json({ data: agency })
  } catch (err) {
    console.error('[Settings/Agency] Error:', err)
    return createErrorResponse(500, 'Internal server error')
  }
})

// ============================================================================
// PATCH /api/v1/settings/agency
// ============================================================================

export const PATCH = withPermission({ resource: 'settings', action: 'write' })(
  async (request: AuthenticatedRequest) => {
  // Rate limit: 30 updates per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  // CSRF protection (TD-005)
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const { agencyId } = request.user

    // Parse request body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const {
      name,
      logo_url,
      timezone,
      business_hours,
      pipeline_stages,
      health_thresholds,
      ai_config,
    } = body

    // Validate and sanitize fields
    const updates: Record<string, unknown> = {}

    if (name !== undefined) {
      if (typeof name !== 'string') {
        return createErrorResponse(400, 'Agency name must be a string')
      }
      const sanitizedName = sanitizeString(name).slice(0, 100)
      if (!sanitizedName) {
        return createErrorResponse(400, 'Agency name cannot be empty')
      }
      updates.name = sanitizedName
    }

    if (logo_url !== undefined) {
      if (typeof logo_url !== 'string' && logo_url !== null) {
        return createErrorResponse(400, 'Logo URL must be a string or null')
      }
      if (typeof logo_url === 'string' && logo_url.length > 500) {
        return createErrorResponse(400, 'Logo URL is too long')
      }
      updates.logo_url = logo_url
    }

    if (timezone !== undefined) {
      if (typeof timezone !== 'string') {
        return createErrorResponse(400, 'Timezone must be a string')
      }
      // Basic validation: timezone should be a valid IANA timezone
      const validTimezones = [
        'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
        'Asia/Shanghai', 'Australia/Sydney', // Add more as needed
      ]
      if (!validTimezones.includes(timezone)) {
        return createErrorResponse(400, 'Invalid timezone')
      }
      updates.timezone = timezone
    }

    if (business_hours !== undefined) {
      if (business_hours !== null && typeof business_hours !== 'object') {
        return createErrorResponse(400, 'Business hours must be an object or null')
      }
      if (business_hours && typeof business_hours === 'object') {
        const { start, end } = business_hours as Record<string, unknown>
        if (typeof start !== 'string' || typeof end !== 'string') {
          return createErrorResponse(400, 'Business hours must have start and end times')
        }
        // Validate time format (HH:MM)
        const timeRegex = /^\d{2}:\d{2}$/
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
          return createErrorResponse(400, 'Time format must be HH:MM')
        }
      }
      updates.business_hours = business_hours
    }

    if (pipeline_stages !== undefined) {
      if (!Array.isArray(pipeline_stages)) {
        return createErrorResponse(400, 'Pipeline stages must be an array')
      }
      if (pipeline_stages.length < 3) {
        return createErrorResponse(400, 'Minimum 3 pipeline stages required')
      }
      if (pipeline_stages.length > 20) {
        return createErrorResponse(400, 'Maximum 20 pipeline stages allowed')
      }
      const sanitizedStages = pipeline_stages
        .filter((s): s is string => typeof s === 'string')
        .map(s => sanitizeString(s).slice(0, 50))
        .filter(s => s.length > 0)

      if (sanitizedStages.length < 3) {
        return createErrorResponse(400, 'At least 3 valid pipeline stages required')
      }
      updates.pipeline_stages = sanitizedStages
    }

    if (health_thresholds !== undefined) {
      if (health_thresholds !== null && typeof health_thresholds !== 'object') {
        return createErrorResponse(400, 'Health thresholds must be an object or null')
      }
      if (health_thresholds && typeof health_thresholds === 'object') {
        const { yellow, red } = health_thresholds as Record<string, unknown>
        if (typeof yellow !== 'number' || typeof red !== 'number') {
          return createErrorResponse(400, 'Health thresholds must have yellow and red numbers')
        }
        if (yellow < 1 || red < 1 || yellow >= red) {
          return createErrorResponse(400, 'Yellow threshold must be less than red threshold')
        }
      }
      updates.health_thresholds = health_thresholds
    }

    if (ai_config !== undefined) {
      if (ai_config !== null && typeof ai_config !== 'object') {
        return createErrorResponse(400, 'AI config must be an object or null')
      }

      if (ai_config && typeof ai_config === 'object') {
        const {
          assistant_name,
          response_tone,
          response_length,
          enabled_features,
          token_limit,
        } = ai_config as Record<string, unknown>

        // Validate assistant_name
        if (assistant_name !== undefined && typeof assistant_name !== 'string') {
          return createErrorResponse(400, 'Assistant name must be a string')
        }
        if (
          assistant_name !== undefined &&
          (assistant_name.length < 1 || assistant_name.length > 50)
        ) {
          return createErrorResponse(400, 'Assistant name must be 1-50 characters')
        }

        // Validate response_tone
        const validTones = ['professional', 'casual', 'technical']
        if (
          response_tone !== undefined &&
          !validTones.includes(response_tone as string)
        ) {
          return createErrorResponse(
            400,
            'Response tone must be professional, casual, or technical'
          )
        }

        // Validate response_length
        const validLengths = ['brief', 'detailed', 'comprehensive']
        if (
          response_length !== undefined &&
          !validLengths.includes(response_length as string)
        ) {
          return createErrorResponse(
            400,
            'Response length must be brief, detailed, or comprehensive'
          )
        }

        // Validate enabled_features
        if (enabled_features !== undefined && !Array.isArray(enabled_features)) {
          return createErrorResponse(400, 'Enabled features must be an array')
        }
        if (enabled_features && Array.isArray(enabled_features)) {
          const validFeatures = [
            'chat_assistant',
            'draft_replies',
            'alert_analysis',
            'document_rag',
          ]
          const invalidFeatures = (enabled_features as string[]).filter(
            f => !validFeatures.includes(f)
          )
          if (invalidFeatures.length > 0) {
            return createErrorResponse(
              400,
              `Invalid features: ${invalidFeatures.join(', ')}`
            )
          }
        }

        // Validate token_limit
        if (
          token_limit !== undefined &&
          (typeof token_limit !== 'number' ||
            token_limit < 1000 ||
            token_limit > 1000000)
        ) {
          return createErrorResponse(
            400,
            'Token limit must be a number between 1000 and 1000000'
          )
        }
      }

      updates.ai_config = ai_config
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse(400, 'No valid fields to update')
    }

    // Update agency settings using service role client to bypass RLS
    const serviceClient = createServiceRoleClient()
    if (!serviceClient) {
      return createErrorResponse(500, 'Service configuration error')
    }

    const { data: updated, error } = await serviceClient
      .from('agency')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agencyId)
      .select()
      .single()

    if (error) {
      console.error('[Settings/Agency] Failed to update:', error)
      return createErrorResponse(500, 'Failed to update agency settings')
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[Settings/Agency] PATCH error:', err)
    return createErrorResponse(500, 'Internal server error')
  }
})
