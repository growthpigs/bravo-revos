/**
 * Individual User Management API
 * PATCH /api/v1/settings/users/[id] - Update user role or status
 * DELETE /api/v1/settings/users/[id] - Deactivate or delete user
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================================================
// PATCH /api/v1/settings/users/[id]
// ============================================================================

export const PATCH = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // Rate limit: 30 updates per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: userId } = await params

      // Validate userId is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(userId)) {
        return createErrorResponse(400, 'Invalid user ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      // Verify target user exists and belongs to same agency
      const { data: targetUser, error: targetError } = await supabase
        .from('user')
        .select('id, role, is_active')
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .single()

      if (targetError || !targetUser) {
        return createErrorResponse(404, 'User not found')
      }

      // Parse request body
      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { role, is_active } = body as { role?: unknown; is_active?: unknown }
      const updates: Record<string, unknown> = {}

      // Handle role change
      if (role !== undefined) {
        if (typeof role !== 'string' || !['admin', 'user'].includes(role)) {
          return createErrorResponse(400, 'Role must be "admin" or "user"')
        }

        // Prevent removing the last admin
        if (targetUser.role === 'admin' && role !== 'admin') {
          // Check if this is the last admin
          const { count } = await supabase
            .from('user')
            .select('id', { count: 'exact' })
            .eq('agency_id', agencyId)
            .eq('role', 'admin')

          if (count === 1) {
            return createErrorResponse(400, 'Cannot remove the last admin from the agency')
          }
        }

        updates.role = role
      }

      // Handle activation status change
      if (is_active !== undefined) {
        if (typeof is_active !== 'boolean') {
          return createErrorResponse(400, 'is_active must be a boolean')
        }
        updates.is_active = is_active
      }

      if (Object.keys(updates).length === 0) {
        return createErrorResponse(400, 'No fields to update')
      }

      // Update user
      const { data: updated, error } = await supabase
        .from('user')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .select()
        .single()

      if (error) {
        return createErrorResponse(500, 'Failed to update user')
      }

      return NextResponse.json({ data: updated })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// ============================================================================
// DELETE /api/v1/settings/users/[id]
// ============================================================================

export const DELETE = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // Rate limit: 10 deletes per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: userId } = await params

      // Validate userId is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(userId)) {
        return createErrorResponse(400, 'Invalid user ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId
      const user = request.user

      // Cannot delete yourself
      if (userId === user.id) {
        return createErrorResponse(400, 'Cannot delete your own user account')
      }

      // Verify target user exists and belongs to same agency
      const { data: targetUser, error: targetError } = await supabase
        .from('user')
        .select('id, role')
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .single()

      if (targetError || !targetUser) {
        return createErrorResponse(404, 'User not found')
      }

      // Check if this is the last admin
      if (targetUser.role === 'admin') {
        const { count } = await supabase
          .from('user')
          .select('id', { count: 'exact' })
          .eq('agency_id', agencyId)
          .eq('role', 'admin')

        if (count === 1) {
          return createErrorResponse(400, 'Cannot delete the last admin from the agency')
        }
      }

      // Check for client assignments
      const { data: assignments, error: assignError } = await supabase
        .from('client_assignment')
        .select('id, client_id')
        .eq('user_id', userId)

      if (!assignError && assignments && assignments.length > 0) {
        // Parse body for reassignment instructions
        let bodyData: Record<string, unknown> = {}
        try {
          bodyData = await request.json()
        } catch {
          // If no body, that's ok - we'll ask for reassignment
        }

        const { reassign_to } = bodyData as { reassign_to?: unknown }

        if (!reassign_to || typeof reassign_to !== 'string') {
          return NextResponse.json(
            {
              error: 'reassignment_required',
              message: 'User has active client assignments and must be reassigned',
              assignments: assignments.map((a) => ({
                id: a.id,
                client_id: a.client_id,
              })),
            },
            { status: 400 }
          )
        }

        // Validate reassignment target exists and is active
        const { data: reassignTarget } = await supabase
          .from('user')
          .select('id')
          .eq('id', reassign_to)
          .eq('agency_id', agencyId)
          .eq('is_active', true)
          .single()

        if (!reassignTarget) {
          return createErrorResponse(400, 'Invalid reassignment target user')
        }

        // Reassign all clients
        const { error: reassignError } = await supabase
          .from('client_assignment')
          .update({ user_id: reassign_to })
          .eq('user_id', userId)

        if (reassignError) {
          return createErrorResponse(500, 'Failed to reassign clients')
        }
      }

      // Delete user
      const { error } = await supabase
        .from('user')
        .delete()
        .eq('id', userId)
        .eq('agency_id', agencyId)

      if (error) {
        return createErrorResponse(500, 'Failed to delete user')
      }

      return NextResponse.json({ message: 'User deleted successfully' })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
