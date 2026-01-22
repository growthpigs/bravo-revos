import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withCsrfProtection } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/v1/clients/[id]/stage - Update client stage (for kanban drag-drop)
export const PUT = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId
      const userId = request.user.id

    const body = await request.json()
    const { stage } = body

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage is required' },
        { status: 400 }
      )
    }

    // Get current client to log stage change
    const { data: currentClient, error: fetchError } = await supabase
      .from('client')
      .select('stage')
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .single()

    if (fetchError || !currentClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const previousStage = currentClient.stage

    // Update client stage and reset days_in_stage
    const { data: client, error: updateError } = await supabase
      .from('client')
      .update({
        stage,
        days_in_stage: 0, // Reset when stage changes
      })
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating client stage:', updateError)
      return NextResponse.json(
        { error: 'Failed to update client stage' },
        { status: 500 }
      )
    }

    // Log stage change event
    const { error: eventError } = await supabase
      .from('stage_event')
      .insert({
        agency_id: client.agency_id,
        client_id: id,
        from_stage: previousStage,
        to_stage: stage,
        moved_by: userId,
      })

    if (eventError) {
      console.error('Error logging stage event:', eventError)
      // Don't fail the request, stage was updated successfully
    }

      return NextResponse.json({
        data: client,
        previousStage,
        message: `Client moved from ${previousStage} to ${stage}`
      })
    } catch (error) {
      console.error('Client stage PUT error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
)
