import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

// POST /api/v1/tickets/[id]/reopen - Reopen a resolved ticket
export const POST = withPermission({ resource: 'tickets', action: 'write' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 30 reopens per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: ticketId } = await params

      // Validate UUID format
      if (!isValidUUID(ticketId)) {
        return createErrorResponse(400, 'Invalid ticket ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId
      const userId = request.user.id

    let body: Record<string, unknown> = {}
    try {
      body = await request.json()
    } catch {
      // Body is optional for reopen
    }

    const { reason } = body

    // Verify ticket exists and is resolved
    const { data: currentTicket, error: fetchError } = await supabase
      .from('ticket')
      .select('id, status, resolved_at, agency_id')
      .eq('id', ticketId)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .single()

    if (fetchError || !currentTicket) {
      return createErrorResponse(404, 'Ticket not found')
    }

    if (currentTicket.status !== 'resolved') {
      return createErrorResponse(400, 'Only resolved tickets can be reopened')
    }

    // Reopen ticket - set status to in_progress, clear resolution data
    const { data: ticket, error: updateError } = await supabase
      .from('ticket')
      .update({
        status: 'in_progress',
        resolved_by: null,
        resolved_at: null,
        // Note: Keep resolution_notes for historical reference
      })
      .eq('id', ticketId)
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
      return createErrorResponse(500, 'Failed to reopen ticket')
    }

    // Add a note about reopening if reason provided
    if (typeof reason === 'string') {
      const sanitizedReason = sanitizeString(reason).slice(0, 1000)
      if (sanitizedReason) {
        await supabase.from('ticket_note').insert({
          ticket_id: ticketId,
          agency_id: currentTicket.agency_id,
          content: `Ticket reopened: ${sanitizedReason}`,
          is_internal: true,
          added_by: userId,
        })
      }
    }

      return NextResponse.json({
        data: ticket,
        message: 'Ticket reopened successfully',
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
