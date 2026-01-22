import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { Database } from '@/types/database'

type StageStatus = Database['public']['Enums']['stage_status']
const VALID_STAGE_STATUSES: StageStatus[] = ['pending', 'in_progress', 'completed', 'blocked']

// PATCH /api/v1/onboarding/instances/[id]/stage - Update stage status
export const PATCH = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: instanceId } = await context.params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const userId = request.user.id

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(instanceId)) {
        return createErrorResponse(400, 'Invalid instance ID format')
      }

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { stage_id, status, blocked_reason, platform_statuses } = body

      if (!stage_id || typeof stage_id !== 'string') {
        return createErrorResponse(400, 'Stage ID is required')
      }

      if (!status || !VALID_STAGE_STATUSES.includes(status as StageStatus)) {
        return createErrorResponse(400, 'Valid status is required (pending, in_progress, completed, blocked)')
      }

      // Verify the instance belongs to this agency
      const { data: instance, error: instanceError } = await supabase
        .from('onboarding_instance')
        .select('id, journey_id')
        .eq('id', instanceId)
        .eq('agency_id', agencyId)
        .single()

      if (instanceError || !instance) {
        return createErrorResponse(404, 'Onboarding instance not found')
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        status: status as StageStatus,
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        updateData.completed_by = userId
      }

      if (status === 'blocked' && typeof blocked_reason === 'string') {
        updateData.blocked_reason = sanitizeString(blocked_reason).slice(0, 200)
      }

      if (platform_statuses && typeof platform_statuses === 'object') {
        updateData.platform_statuses = platform_statuses
      }

      // Upsert the stage status
      const { data: stageStatus, error: stageError } = await supabase
        .from('onboarding_stage_status')
        .upsert({
          agency_id: agencyId,
          instance_id: instanceId,
          stage_id: stage_id,
          ...updateData,
        }, {
          onConflict: 'instance_id,stage_id',
        })
        .select()
        .single()

      if (stageError) {
        console.error('Failed to update stage status:', stageError)
        return createErrorResponse(500, 'Failed to update stage status')
      }

      // Update the current_stage_id on the instance
      await supabase
        .from('onboarding_instance')
        .update({ current_stage_id: stage_id })
        .eq('id', instanceId)

      // Check if all stages are completed to mark instance as completed
      const { data: journey } = await supabase
        .from('onboarding_journey')
        .select('stages')
        .eq('id', instance.journey_id)
        .single()

      if (journey && Array.isArray(journey.stages)) {
        const { data: allStatuses } = await supabase
          .from('onboarding_stage_status')
          .select('stage_id, status')
          .eq('instance_id', instanceId)

        const completedStages = allStatuses?.filter(s => s.status === 'completed').length || 0
        const totalStages = journey.stages.length

        if (completedStages === totalStages) {
          await supabase
            .from('onboarding_instance')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', instanceId)
        } else if (status === 'in_progress') {
          // Mark instance as in_progress if not already
          await supabase
            .from('onboarding_instance')
            .update({ status: 'in_progress' })
            .eq('id', instanceId)
            .eq('status', 'pending')
        }
      }

      return NextResponse.json({ data: stageStatus })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
