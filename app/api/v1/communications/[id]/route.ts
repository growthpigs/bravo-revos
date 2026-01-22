import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { Database } from '@/types/database'

type CommunicationUpdate = Database['public']['Tables']['communication']['Update']

/**
 * GET /api/v1/communications/[id]
 * Get a single communication with thread context
 */
export const GET = withPermission({ resource: 'communications', action: 'read' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id } = await params

      // Validate UUID format
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid communication ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      const { data, error } = await supabase
        .from('communication')
        .select('*')
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return createErrorResponse(404, 'Communication not found')
        }
        return createErrorResponse(500, 'Failed to fetch communication')
      }

      return NextResponse.json(data)
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * PATCH /api/v1/communications/[id]
 * Update communication (mark as read, needs_reply flag, etc.)
 */
export const PATCH = withPermission({ resource: 'communications', action: 'write' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 50 updates per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 50, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params

      // Validate UUID format
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid communication ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      // Allowed update fields
      const allowedFields: (keyof CommunicationUpdate)[] = ['needs_reply', 'replied_at', 'replied_by']
      const updates: CommunicationUpdate = {}

      for (const field of allowedFields) {
        if (field in body) {
          // Validate specific fields
          if (field === 'needs_reply' && typeof body[field] !== 'boolean') {
            return createErrorResponse(400, 'needs_reply must be a boolean')
          }
          if (field === 'replied_at' && body[field] !== null && typeof body[field] !== 'string') {
            return createErrorResponse(400, 'replied_at must be a string or null')
          }
          if (field === 'replied_by' && body[field] !== null && !isValidUUID(body[field])) {
            return createErrorResponse(400, 'replied_by must be a valid UUID or null')
          }
          (updates as Record<string, unknown>)[field] = body[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        return createErrorResponse(400, 'No valid fields to update')
      }

      const { data, error } = await supabase
        .from('communication')
        .update(updates as never)
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return createErrorResponse(404, 'Communication not found')
        }
        return createErrorResponse(500, 'Failed to update communication')
      }

      return NextResponse.json(data)
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
