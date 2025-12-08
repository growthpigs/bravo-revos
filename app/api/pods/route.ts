import { NextRequest, NextResponse } from 'next/server'
import {
  ok,
  badRequest,
  forbidden,
  conflict,
  serverError,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

interface PodMember {
  id: string
  user_id: string
  role: string
  status: string
  participation_score: number
}

interface PodWithMembers {
  id: string
  client_id: string
  name: string
  description: string | null
  min_members: number
  max_members: number
  participation_threshold: number
  suspension_threshold: number
  status: string
  created_at: string
  updated_at: string
  clients: { name: string } | null
  pod_members: PodMember[] | null
}

/**
 * GET /api/pods
 * List all pods for the authenticated user's clients
 * SECURITY: Requires authentication and scopes to user's client
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // Get user's client_id for tenant scoping
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.client_id) {
    console.warn('[PODS_API] User has no client association:', user.id)
    return forbidden('User not associated with a client')
  }

  const userClientId = userData.client_id
  const { searchParams } = new URL(request.url)

  const clientId = searchParams.get('clientId')
  const status = searchParams.get('status')

  // SECURITY: If clientId provided, verify user has access to that client
  if (clientId && clientId !== userClientId) {
    console.warn('[PODS_API] User attempting cross-tenant access:', {
      userId: user.id,
      requestedClientId: clientId,
      userClientId,
    })
    return forbidden('Access to this client not allowed')
  }

  let query = supabase
    .from('pods')
    .select(
      `
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
        clients (name),
        pod_members (
          id,
          user_id,
          role,
          status,
          participation_score
        )
      `
    )
    .eq('client_id', userClientId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: pods, error } = await query

  if (error) {
    console.error('[PODS_API] Error fetching pods:', error)
    return serverError('Failed to fetch pods')
  }

  // Calculate member counts
  const podsWithCounts = (pods || []).map((pod) => {
    const podData = pod as unknown as PodWithMembers
    return {
      ...podData,
      member_count:
        podData.pod_members?.filter((m) => m.status === 'active').length || 0,
      total_members: podData.pod_members?.length || 0,
      pod_members: undefined,
    }
  })

  return ok({
    status: 'success',
    pods: podsWithCounts,
    total: podsWithCounts.length,
  })
}

/**
 * POST /api/pods
 * Create a new engagement pod
 * SECURITY: Requires authentication and validates client ownership
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // Get user's client_id for tenant scoping
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.client_id) {
    console.warn('[PODS_API] User has no client association:', user.id)
    return forbidden('User not associated with a client')
  }

  const userClientId = userData.client_id
  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const {
    clientId,
    name,
    description,
    minMembers = 3,
    maxMembers = 20,
    participationThreshold = 0.8,
    suspensionThreshold = 0.5,
  } = body as {
    clientId?: string
    name?: string
    description?: string
    minMembers?: number
    maxMembers?: number
    participationThreshold?: number
    suspensionThreshold?: number
  }

  // SECURITY: Use user's client_id, not request body
  const effectiveClientId = userClientId

  // If clientId was explicitly provided, verify it matches user's client
  if (clientId && clientId !== userClientId) {
    console.warn('[PODS_API] User attempting cross-tenant pod creation:', {
      userId: user.id,
      requestedClientId: clientId,
      userClientId,
    })
    return forbidden('Cannot create pods for other clients')
  }

  // Validate required fields
  if (!name) {
    return badRequest('Missing required field: name')
  }

  // Validate thresholds
  if (minMembers < 3) {
    return badRequest('Minimum 3 members required for a pod')
  }

  if (participationThreshold < 0 || participationThreshold > 1) {
    return badRequest('Participation threshold must be between 0 and 1')
  }

  if (suspensionThreshold < 0 || suspensionThreshold > 1) {
    return badRequest('Suspension threshold must be between 0 and 1')
  }

  // Create pod - SECURITY: Use effectiveClientId (verified user's client)
  const { data: pod, error: podError } = await supabase
    .from('pods')
    .insert({
      client_id: effectiveClientId,
      name,
      description,
      min_members: minMembers,
      max_members: maxMembers,
      participation_threshold: participationThreshold,
      suspension_threshold: suspensionThreshold,
      status: 'active',
    })
    .select()
    .single()

  if (podError) {
    console.error('[PODS_API] Error creating pod:', podError)

    if (podError.code === '23505') {
      return conflict('Pod with this name already exists for this client')
    }

    return serverError('Failed to create pod')
  }

  return ok({ status: 'success', pod })
}
