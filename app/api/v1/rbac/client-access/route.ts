/**
 * Client Access API - List and Create member-client assignments
 * GET /api/v1/rbac/client-access?user_id={id} - List member's assigned clients
 * POST /api/v1/rbac/client-access - Create new assignment
 *
 * Protected by: withPermission({ resource: 'users', action: 'manage' })
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { permissionService } from '@/lib/audienceos/rbac/permission-service'
import { RoleHierarchyLevel } from '@/types/audienceos/rbac'

// Type for Supabase query result with role join
interface UserWithRoleInfo {
  id: string
  first_name?: string
  last_name?: string
  role_id: string | null
  role_info: { hierarchy_level: number } | null
}

// ============================================================================
// GET /api/v1/rbac/client-access?user_id={id}
// List all client assignments for a member
// ============================================================================

export const GET = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId } = request.user

      // Get user_id from query params
      const { searchParams } = new URL(request.url)
      const userId = searchParams.get('user_id')

      if (!userId) {
        return createErrorResponse(400, 'user_id query parameter is required')
      }

      // Verify the target user belongs to this agency and is a Member
      const { data: targetUser, error: userError } = await supabase
        .from('user')
        .select(`
          id, first_name, last_name, role_id,
          role_info:role_id (
            hierarchy_level
          )
        `)
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .single()

      if (userError || !targetUser) {
        return createErrorResponse(404, 'User not found')
      }

      // Only Members (hierarchy_level=4) can have client assignments
      const typedUser = targetUser as UserWithRoleInfo
      const hierarchyLevel = typedUser.role_info?.hierarchy_level
      if (hierarchyLevel !== RoleHierarchyLevel.MEMBER) {
        return createErrorResponse(400, 'Only Member users can have client assignments')
      }

      // Fetch assignments with client details
      const { data: assignments, error: assignError } = await supabase
        .from('member_client_access')
        .select(`
          id, client_id, permission, assigned_at, assigned_by,
          client:client_id (
            id, name, company_name, logo_url
          )
        `)
        .eq('user_id', userId)
        .eq('agency_id', agencyId)
        .order('assigned_at', { ascending: false })

      if (assignError) {
        console.error('[ClientAccess] Fetch error:', assignError)
        return createErrorResponse(500, 'Failed to fetch client assignments')
      }

      return NextResponse.json({
        data: assignments || [],
        user: {
          id: typedUser.id,
          first_name: typedUser.first_name,
          last_name: typedUser.last_name,
        },
      })
    } catch (err) {
      console.error('[ClientAccess] GET error:', err)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// ============================================================================
// POST /api/v1/rbac/client-access
// Create a new client assignment for a member
// ============================================================================

export const POST = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId, id: assignedBy } = request.user

      // Parse request body
      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { user_id, client_id, permission } = body as {
        user_id?: string
        client_id?: string
        permission?: string
      }

      // Validate required fields
      if (!user_id || typeof user_id !== 'string') {
        return createErrorResponse(400, 'user_id is required')
      }
      if (!client_id || typeof client_id !== 'string') {
        return createErrorResponse(400, 'client_id is required')
      }
      if (!permission || !['read', 'write'].includes(permission)) {
        return createErrorResponse(400, 'permission must be "read" or "write"')
      }

      // Verify target user is a Member in this agency
      const { data: targetUser, error: userError } = await supabase
        .from('user')
        .select(`
          id, role_id,
          role_info:role_id (
            hierarchy_level
          )
        `)
        .eq('id', user_id)
        .eq('agency_id', agencyId)
        .single()

      if (userError || !targetUser) {
        return createErrorResponse(404, 'User not found')
      }

      const typedTargetUser = targetUser as UserWithRoleInfo
      if (typedTargetUser.role_info?.hierarchy_level !== RoleHierarchyLevel.MEMBER) {
        return createErrorResponse(400, 'Only Member users can be assigned to clients')
      }

      // Verify client belongs to this agency
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('id')
        .eq('id', client_id)
        .eq('agency_id', agencyId)
        .single()

      if (clientError || !client) {
        return createErrorResponse(404, 'Client not found')
      }

      // Create the assignment - handle unique constraint violation atomically
      // (no check-then-insert race condition)
      const { data: assignment, error: insertError } = await supabase
        .from('member_client_access')
        .insert({
          agency_id: agencyId,
          user_id,
          client_id,
          permission: permission as 'read' | 'write',
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString(),
        })
        .select(`
          id, client_id, permission, assigned_at,
          client:client_id (
            id, name, company_name, logo_url
          )
        `)
        .single()

      if (insertError) {
        // PostgreSQL unique violation code is 23505
        if (insertError.code === '23505') {
          return createErrorResponse(409, 'User is already assigned to this client')
        }
        console.error('[ClientAccess] Insert error:', insertError)
        return createErrorResponse(500, 'Failed to create assignment')
      }

      // Invalidate permission cache for the affected user
      permissionService.invalidateCache(user_id, agencyId)

      return NextResponse.json({ data: assignment }, { status: 201 })
    } catch (err) {
      console.error('[ClientAccess] POST error:', err)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
