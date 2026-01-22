import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'

/**
 * GET /api/v1/cartridges/preferences
 * Fetch preferences cartridge for the authenticated user's agency
 */
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const { data, error } = await (supabase
        .from('preferences_cartridge' as any)
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false }) as any)

      if (error) {
        console.error('[Preferences Cartridge GET] Query error:', error)
        return createErrorResponse(500, 'Failed to fetch preferences')
      }

      return NextResponse.json(data || [])
    } catch (error) {
      console.error('[Preferences Cartridge GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * POST /api/v1/cartridges/preferences
 * Create or update preferences cartridge with platform-specific settings
 */
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const csrfError = withCsrfProtection(request)
      if (csrfError) return csrfError

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const body = await request.json()

      // Validation
      if (!body.platform) {
        return createErrorResponse(400, 'Platform is required')
      }

      const validPlatforms = ['LinkedIn', 'Twitter', 'Facebook', 'Instagram']
      if (!validPlatforms.includes(body.platform)) {
        return createErrorResponse(400, `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`)
      }

      // Prepare cartridge data
      const cartridgeData = {
        agency_id: agencyId,
        language: body.language || 'English',
        platform: body.platform,
        tone: body.tone || 'Professional',
        content_length: body.contentLength || 'Medium',
        hashtag_count: body.hashtagCount || 3,
        emoji_usage: body.emojiUsage || 'Moderate',
        call_to_action: body.callToAction || 'Subtle',
        personalization_level: body.personalizationLevel || 'Medium',
      }

      // Try to update existing preferences for this platform
      const { data: existing, error: existingError } = await (supabase
        .from('preferences_cartridge' as any)
        .select('id')
        .eq('agency_id', agencyId)
        .eq('platform', body.platform)
        .single() as any)

      // Handle actual database errors (not just "no rows found")
      if (existingError && existingError.code !== 'PGRST116') {
        console.error('[Preferences Cartridge POST] Lookup error:', existingError)
        return createErrorResponse(500, 'Failed to check existing preferences')
      }

      let result
      let statusCode = 201

      if (existing) {
        // Update existing
        const { data, error } = await (supabase
          .from('preferences_cartridge' as any)
          .update({
            ...cartridgeData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single() as any)

        if (error) {
          console.error('[Preferences Cartridge POST Update] Error:', error)
          return createErrorResponse(500, 'Failed to update preferences')
        }

        result = data
        statusCode = 200
      } else {
        // Create new
        const { data, error } = await (supabase
          .from('preferences_cartridge' as any)
          .insert([cartridgeData])
          .select()
          .single() as any)

        if (error) {
          console.error('[Preferences Cartridge POST Insert] Error:', error)
          return createErrorResponse(500, 'Failed to create preferences')
        }

        result = data
      }

      return NextResponse.json(result, { status: statusCode })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(400, 'Invalid JSON in request body')
      }

      console.error('[Preferences Cartridge POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
