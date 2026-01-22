import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

// GET /api/v1/onboarding/instances/[id] - Get single instance with full details
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id } = await context.params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return createErrorResponse(400, 'Invalid instance ID format')
      }

      const { data: instance, error } = await supabase
        .from('onboarding_instance')
        .select(`
          *,
          link_token,
          client:client_id (
            id,
            name,
            contact_email,
            contact_name,
            stage,
            tags,
            website_url,
            seo_data
          ),
          journey:journey_id (
            id,
            name,
            description,
            welcome_video_url,
            ai_analysis_prompt,
            stages
          ),
          triggered_by_user:triggered_by (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          stage_statuses:onboarding_stage_status (*),
          responses:intake_response (
            id,
            field_id,
            value,
            submitted_at,
            field:field_id (
              id,
              field_label,
              field_type
            )
          )
        `)
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return createErrorResponse(404, 'Onboarding instance not found')
        }
        console.error('Failed to fetch onboarding instance:', error)
        return createErrorResponse(500, 'Failed to fetch onboarding instance')
      }

      // Generate the portal URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://audienceos-agro-bros.vercel.app'
      const portalUrl = `${baseUrl}/onboarding/start?token=${instance.link_token}`

      return NextResponse.json({
        data: {
          ...instance,
          portal_url: portalUrl,
        }
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
