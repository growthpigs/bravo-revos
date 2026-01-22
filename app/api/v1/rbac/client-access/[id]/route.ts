/**
 * Client Access API - Update and Delete individual assignments
 * PATCH /api/v1/rbac/client-access/[id] - Update permission level
 * DELETE /api/v1/rbac/client-access/[id] - Remove assignment
 *
 * Protected by: withPermission({ resource: 'users', action: 'manage' })
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { permissionService } from '@/lib/audienceos/rbac/permission-service'

// ============================================================================
// PATCH /api/v1/rbac/client-access/[id]
// Update permission level for an existing assignment
// ============================================================================

export const PATCH = withPermission({ resource: 'users', action: 'manage' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId } = request.user

      if (!id) {
        return createErrorResponse(400, 'Assignment ID is required')
      }

      // Parse request body
      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { permission } = body as { permission?: string }

      // Validate permission
      if (!permission || !['read', 'write'].includes(permission)) {
        return createErrorResponse(400, 'permission must be "read" or "write"')
      }

      // Fetch the existing assignment to get user_id for cache invalidation
      const { data: existing, error: fetchError } = await supabase
        .from('member_client_access')
        .select('id, user_id')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (fetchError || !existing) {
        return createErrorResponse(404, 'Assignment not found')
      }

      // Update the assignment
      const { data: updated, error: updateError } = await supabase
        .from('member_client_access')
        .update({ permission: permission as 'read' | 'write' })
        .eq('id', id)
        .eq('agency_id', agencyId)
        .select(`
          id, client_id, permission, assigned_at,
          client:client_id (
            id, name, company_name, logo_url
          )
        `)
        .single()

      if (updateError) {
        console.error('[ClientAccess] Update error:', updateError)
        return createErrorResponse(500, 'Failed to update assignment')
      }

      // Invalidate permission cache for the affected user
      permissionService.invalidateCache(existing.user_id, agencyId)

      return NextResponse.json({ data: updated })
    } catch (err) {
      console.error('[ClientAccess] PATCH error:', err)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// ============================================================================
// DELETE /api/v1/rbac/client-access/[id]
// Remove a client assignment
// ============================================================================

export const DELETE = withPermission({ resource: 'users', action: 'manage' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId } = request.user

      if (!id) {
        return createErrorResponse(400, 'Assignment ID is required')
      }

      // Fetch the existing assignment to get user_id for cache invalidation
      const { data: existing, error: fetchError } = await supabase
        .from('member_client_access')
        .select('id, user_id')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (fetchError || !existing) {
        return createErrorResponse(404, 'Assignment not found')
      }

      // Delete the assignment
      const { error: deleteError } = await supabase
        .from('member_client_access')
        .delete()
        .eq('id', id)
        .eq('agency_id', agencyId)

      if (deleteError) {
        console.error('[ClientAccess] Delete error:', deleteError)
        return createErrorResponse(500, 'Failed to delete assignment')
      }

      // Invalidate permission cache for the affected user
      permissionService.invalidateCache(existing.user_id, agencyId)

      return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
      console.error('[ClientAccess] DELETE error:', err)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
