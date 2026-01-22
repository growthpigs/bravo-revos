import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

// GET /api/v1/onboarding/journeys - List journey templates
export const GET = withPermission({ resource: 'settings', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const { data: journeys, error } = await supabase
        .from('onboarding_journey')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch journeys:', error)
        return createErrorResponse(500, 'Failed to fetch journeys')
      }

      return NextResponse.json({ data: journeys })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/onboarding/journeys - Create a journey template
export const POST = withPermission({ resource: 'settings', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { name, description, welcome_video_url, ai_analysis_prompt, stages, is_default } = body

      if (!name || typeof name !== 'string') {
        return createErrorResponse(400, 'Journey name is required')
      }

      const sanitizedName = sanitizeString(name).slice(0, 100)
      if (!sanitizedName) {
        return createErrorResponse(400, 'Journey name is required')
      }

      // If setting as default, unset other defaults first
      if (is_default === true) {
        await supabase
          .from('onboarding_journey')
          .update({ is_default: false })
          .eq('agency_id', agencyId)
      }

      const { data: journey, error } = await supabase
        .from('onboarding_journey')
        .insert({
          agency_id: agencyId,
          name: sanitizedName,
          description: typeof description === 'string' ? sanitizeString(description).slice(0, 500) : null,
          welcome_video_url: typeof welcome_video_url === 'string' ? welcome_video_url.slice(0, 500) : null,
          ai_analysis_prompt: typeof ai_analysis_prompt === 'string' ? ai_analysis_prompt.slice(0, 2000) : null,
          stages: Array.isArray(stages) ? stages : [],
          is_default: is_default === true,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create journey:', error)
        return createErrorResponse(500, 'Failed to create journey')
      }

      return NextResponse.json({ data: journey }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
