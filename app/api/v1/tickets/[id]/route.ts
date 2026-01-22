/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { TicketCategory, TicketPriority } from '@/types/database'

// Valid enum values
const VALID_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'critical']
const VALID_CATEGORIES: TicketCategory[] = ['technical', 'billing', 'campaign', 'general', 'escalation']

// GET /api/v1/tickets/[id] - Get single ticket with notes and history
export const GET = withPermission({ resource: 'tickets', action: 'read' })(
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
        return createErrorResponse(400, 'Invalid ticket ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

    // Fetch ticket with related data
    const { data: ticket, error } = await supabase
      .from('ticket')
      .select(`
        *,
        client:client_id (
          id,
          name,
          health_status,
          contact_email,
          contact_name,
          days_in_stage
        ),
        assignee:assignee_id (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        creator:created_by (
          id,
          first_name,
          last_name
        ),
        resolver:resolved_by (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(404, 'Ticket not found')
      }
      return createErrorResponse(500, 'Failed to fetch ticket')
    }

      return NextResponse.json({ data: ticket })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// PATCH /api/v1/tickets/[id] - Update ticket fields
export const PATCH = withPermission({ resource: 'tickets', action: 'write' })(
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
        return createErrorResponse(400, 'Invalid ticket ID format')
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

    const { title, description, category, priority, assignee_id, due_date } = body

    // Build validated updates object
    const updates: Record<string, unknown> = {}

    if (title !== undefined) {
      if (typeof title !== 'string') {
        return createErrorResponse(400, 'Title must be a string')
      }
      const sanitizedTitle = sanitizeString(title).slice(0, 500)
      if (sanitizedTitle) {
        updates.title = sanitizedTitle
      }
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return createErrorResponse(400, 'Description must be a string')
      }
      updates.description = sanitizeString(description).slice(0, 10000)
    }

    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category as TicketCategory)) {
        return createErrorResponse(400, `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`)
      }
      updates.category = category
    }

    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority as TicketPriority)) {
        return createErrorResponse(400, `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`)
      }
      updates.priority = priority
    }

    if (assignee_id !== undefined) {
      if (assignee_id === null) {
        updates.assignee_id = null
      } else if (typeof assignee_id === 'string' && isValidUUID(assignee_id)) {
        updates.assignee_id = assignee_id
      } else {
        return createErrorResponse(400, 'Invalid assignee_id format')
      }
    }

    if (due_date !== undefined) {
      if (due_date === null) {
        updates.due_date = null
      } else if (typeof due_date === 'string' && !isNaN(Date.parse(due_date))) {
        updates.due_date = due_date
      } else {
        return createErrorResponse(400, 'Invalid due_date format')
      }
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse(400, 'No valid fields to update')
    }

    const { data: ticket, error } = await supabase
      .from('ticket')
      .update(updates)
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .select(`
        *,
        client:client_id (
          id,
          name,
          health_status
        ),
        assignee:assignee_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      return createErrorResponse(500, 'Failed to update ticket')
    }

      return NextResponse.json({ data: ticket })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/tickets/[id] - Delete ticket (soft delete in future)
export const DELETE = withPermission({ resource: 'tickets', action: 'manage' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 20 deletes per minute (stricter for destructive ops)
    const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params

      // Validate UUID format
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid ticket ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

    // Delete ticket (notes will cascade due to FK)
    const { error } = await supabase
      .from('ticket')
      .delete()
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)

    if (error) {
      return createErrorResponse(500, 'Failed to delete ticket')
    }

      return NextResponse.json({ success: true }, { status: 200 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
