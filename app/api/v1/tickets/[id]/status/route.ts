/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { TicketStatus } from '@/types/database'

const VALID_STATUSES: TicketStatus[] = ['new', 'in_progress', 'waiting_client', 'resolved']

// Allowed status transitions
const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['in_progress', 'waiting_client'],
  in_progress: ['waiting_client', 'resolved'],
  waiting_client: ['in_progress', 'resolved'],
  resolved: ['in_progress'], // Reopening
}

// PATCH /api/v1/tickets/[id]/status - Change ticket status
export const PATCH = withPermission({ resource: 'tickets', action: 'write' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 50 status changes per minute
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

    const { status: newStatus } = body

    // Validate status is a valid enum value
    if (typeof newStatus !== 'string' || !VALID_STATUSES.includes(newStatus as TicketStatus)) {
      return createErrorResponse(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    // Get current ticket status
    const { data: currentTicket, error: fetchError } = await supabase
      .from('ticket')
      .select('status')
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .single()

    if (fetchError || !currentTicket) {
      return createErrorResponse(404, 'Ticket not found')
    }

    const currentStatus = currentTicket.status as TicketStatus

    // Validate transition
    if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus as TicketStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from "${currentStatus}" to "${newStatus}"`,
          allowed: ALLOWED_TRANSITIONS[currentStatus],
        },
        { status: 400 }
      )
    }

    // Special handling for resolved status - require resolution notes
    if (newStatus === 'resolved') {
      return createErrorResponse(400, 'Use /api/v1/tickets/[id]/resolve endpoint to resolve tickets')
    }

    // Update status
    const { data: ticket, error: updateError } = await supabase
      .from('ticket')
      .update({ status: newStatus as TicketStatus })
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

    if (updateError) {
      return createErrorResponse(500, 'Failed to update ticket status')
    }

      return NextResponse.json({
        data: ticket,
        previousStatus: currentStatus,
        newStatus,
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
