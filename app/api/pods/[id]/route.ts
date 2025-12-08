import { NextRequest, NextResponse } from 'next/server'
import {
  ok,
  okMessage,
  badRequest,
  notFound,
  serverError,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface PodMember {
  status: string
  participation_score: string | null
}

/**
 * GET /api/pods/[id]
 * Get detailed information about a specific pod
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const { id } = await params

  const { data: pod, error } = await supabase
    .from('pods')
    .select(`
      id,
      client_id,
      name,
      description,
      min_members,
      max_members,
      participation_threshold,
      suspension_threshold,
      status,
      created_at,
      updated_at,
      clients (id, name),
      pod_members (
        id,
        user_id,
        linkedin_account_id,
        role,
        participation_score,
        total_engagements,
        completed_engagements,
        missed_engagements,
        status,
        joined_at,
        last_activity_at,
        users (id, email, full_name)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return notFound('Pod not found')
    }
    console.error('[PODS_API] Error fetching pod:', error)
    return serverError(`Failed to fetch pod: ${error.message}`)
  }

  // Calculate statistics
  const activeMembers =
    pod.pod_members?.filter((m: PodMember) => m.status === 'active') || []
  const avgParticipation =
    activeMembers.length > 0
      ? activeMembers.reduce(
          (sum: number, m: PodMember) =>
            sum + parseFloat(m.participation_score || '0'),
          0
        ) / activeMembers.length
      : 0

  return ok({
    pod: {
      ...pod,
      member_count: activeMembers.length,
      total_members: pod.pod_members?.length || 0,
      avg_participation: Math.round(avgParticipation * 100) / 100,
    },
  })
}

/**
 * PATCH /api/pods/[id]
 * Update a pod's settings
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const { id } = await params

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const {
    name,
    description,
    minMembers,
    maxMembers,
    participationThreshold,
    suspensionThreshold,
    status,
  } = body as Record<string, unknown>

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {}

  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (minMembers !== undefined) {
    if ((minMembers as number) < 3) {
      return badRequest('Minimum 3 members required for a pod')
    }
    updates.min_members = minMembers
  }
  if (maxMembers !== undefined) updates.max_members = maxMembers
  if (participationThreshold !== undefined) {
    const threshold = participationThreshold as number
    if (threshold < 0 || threshold > 1) {
      return badRequest('Participation threshold must be between 0 and 1')
    }
    updates.participation_threshold = participationThreshold
  }
  if (suspensionThreshold !== undefined) {
    const threshold = suspensionThreshold as number
    if (threshold < 0 || threshold > 1) {
      return badRequest('Suspension threshold must be between 0 and 1')
    }
    updates.suspension_threshold = suspensionThreshold
  }
  if (status !== undefined) {
    if (!['active', 'paused', 'archived'].includes(status as string)) {
      return badRequest('Invalid status. Must be: active, paused, or archived')
    }
    updates.status = status
  }

  if (Object.keys(updates).length === 0) {
    return badRequest('No valid fields to update')
  }

  const { data: pod, error } = await supabase
    .from('pods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return notFound('Pod not found')
    }
    console.error('[PODS_API] Error updating pod:', error)
    return serverError(`Failed to update pod: ${error.message}`)
  }

  return ok({ pod })
}

/**
 * DELETE /api/pods/[id]
 * Delete a pod (cascades to members and activities)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const { id } = await params

  const { error } = await supabase.from('pods').delete().eq('id', id)

  if (error) {
    if (error.code === 'PGRST116') {
      return notFound('Pod not found')
    }
    console.error('[PODS_API] Error deleting pod:', error)
    return serverError(`Failed to delete pod: ${error.message}`)
  }

  return okMessage('Pod deleted successfully')
}
