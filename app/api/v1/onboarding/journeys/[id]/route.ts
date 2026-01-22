import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

// PATCH /api/v1/onboarding/journeys/[id] - Update a journey template
export const PATCH = withPermission({ resource: 'settings', action: 'write' })(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await context.params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return createErrorResponse(400, 'Invalid journey ID format')
      }

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { name, description, welcome_video_url, ai_analysis_prompt, stages, is_default, is_active } = body

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {}

      if (name !== undefined) {
        const sanitizedName = typeof name === 'string' ? sanitizeString(name).slice(0, 100) : null
        if (!sanitizedName) {
          return createErrorResponse(400, 'Journey name cannot be empty')
        }
        updateData.name = sanitizedName
      }

      if (description !== undefined) {
        updateData.description = typeof description === 'string' ? sanitizeString(description).slice(0, 500) : null
      }

      if (welcome_video_url !== undefined) {
        updateData.welcome_video_url = typeof welcome_video_url === 'string' ? welcome_video_url.slice(0, 500) : null
      }

      if (ai_analysis_prompt !== undefined) {
        updateData.ai_analysis_prompt = typeof ai_analysis_prompt === 'string' ? ai_analysis_prompt.slice(0, 2000) : null
      }

      if (stages !== undefined && Array.isArray(stages)) {
        updateData.stages = stages
      }

      if (is_active !== undefined) {
        updateData.is_active = is_active === true
      }

      // If setting as default, unset other defaults first
      if (is_default === true) {
        await supabase
          .from('onboarding_journey')
          .update({ is_default: false })
          .eq('agency_id', agencyId)
        updateData.is_default = true
      } else if (is_default === false) {
        updateData.is_default = false
      }

      if (Object.keys(updateData).length === 0) {
        return createErrorResponse(400, 'No valid fields to update')
      }

      const { data: journey, error } = await supabase
        .from('onboarding_journey')
        .update(updateData)
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return createErrorResponse(404, 'Journey not found')
        }
        console.error('Failed to update journey:', error)
        return createErrorResponse(500, 'Failed to update journey')
      }

      return NextResponse.json({ data: journey })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
