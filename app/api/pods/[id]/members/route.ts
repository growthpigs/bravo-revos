import { NextRequest, NextResponse } from 'next/server'
import {
  ok,
  badRequest,
  notFound,
  conflict,
  serverError,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/pods/[id]/members
 * Add a member to a pod
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const { id: podId } = await params
  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const { userId, linkedInAccountId, role = 'member' } = body as {
    userId?: string
    linkedInAccountId?: string
    role?: string
  }

  // Validate required fields
  if (!userId) {
    return badRequest('Missing required field: userId')
  }

  // Validate role
  if (!['owner', 'member'].includes(role)) {
    return badRequest('Invalid role. Must be: owner or member')
  }

  // Check if pod exists and get current member count
  const { data: pod, error: podError } = await supabase
    .from('pods')
    .select('id, max_members, min_members')
    .eq('id', podId)
    .single()

  if (podError || !pod) {
    return notFound('Pod not found')
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('pod_members')
    .select('id, status')
    .eq('pod_id', podId)
    .eq('user_id', userId)
    .single()

  if (existingMember) {
    if (existingMember.status === 'left') {
      // Reactivate member
      const { data: member, error } = await supabase
        .from('pod_members')
        .update({
          status: 'active',
          suspended_at: null,
          suspension_reason: null,
          joined_at: new Date().toISOString(),
        })
        .eq('id', existingMember.id)
        .select()
        .single()

      if (error) {
        console.error('[POD_MEMBERS_API] Error reactivating member:', error)
        return serverError('Failed to reactivate member')
      }

      return ok({
        status: 'success',
        member,
        message: 'Member reactivated successfully',
      })
    }

    return conflict('User is already a member of this pod')
  }

  // Check max members limit
  const { count: memberCount } = await supabase
    .from('pod_members')
    .select('*', { count: 'exact', head: true })
    .eq('pod_id', podId)
    .eq('status', 'active')

  if (memberCount && memberCount >= pod.max_members) {
    return badRequest(`Pod is full (max ${pod.max_members} members)`)
  }

  // Add member
  const { data: member, error: memberError } = await supabase
    .from('pod_members')
    .insert({
      pod_id: podId,
      user_id: userId,
      linkedin_account_id: linkedInAccountId,
      role,
      status: 'active',
      participation_score: 1.0,
    })
    .select(
      `
        id,
        pod_id,
        user_id,
        linkedin_account_id,
        role,
        participation_score,
        total_engagements,
        completed_engagements,
        missed_engagements,
        status,
        joined_at,
        users (id, email, full_name)
      `
    )
    .single()

  if (memberError) {
    console.error('[POD_MEMBERS_API] Error adding member:', memberError)

    if (memberError.code === '23505') {
      return conflict('User is already a member of this pod')
    }

    return serverError('Failed to add member')
  }

  return ok({ status: 'success', member })
}
