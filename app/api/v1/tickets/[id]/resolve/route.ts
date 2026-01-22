import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

// POST /api/v1/tickets/[id]/resolve - Resolve a ticket with mandatory final note
export const POST = withPermission({ resource: 'tickets', action: 'write' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 30 resolves per minute
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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { resolution_notes, time_spent_minutes, send_client_email = false } = body

    // Validate required resolution notes
    if (typeof resolution_notes !== 'string') {
      return createErrorResponse(400, 'Resolution notes are required to resolve a ticket')
    }

    const sanitizedNotes = sanitizeString(resolution_notes).slice(0, 10000)
    if (!sanitizedNotes) {
      return createErrorResponse(400, 'Resolution notes are required to resolve a ticket')
    }

    // Validate time_spent_minutes if provided
    let validatedTimeSpent: number | null = null
    if (time_spent_minutes !== undefined && time_spent_minutes !== null) {
      if (typeof time_spent_minutes !== 'number' || time_spent_minutes < 0 || time_spent_minutes > 99999) {
        return createErrorResponse(400, 'time_spent_minutes must be a non-negative number')
      }
      validatedTimeSpent = time_spent_minutes
    }

    // Verify ticket exists and get current state
    const { data: currentTicket, error: fetchError } = await supabase
      .from('ticket')
      .select(`
        id,
        status,
        client:client_id (
          id,
          name,
          contact_email
        )
      `)
      .eq('id', ticketId)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .single()

    if (fetchError || !currentTicket) {
      return createErrorResponse(404, 'Ticket not found')
    }

    // Check if already resolved
    if (currentTicket.status === 'resolved') {
      return createErrorResponse(400, 'Ticket is already resolved')
    }

    // Update ticket to resolved status
    const { data: ticket, error: updateError } = await supabase
      .from('ticket')
      .update({
        status: 'resolved',
        resolution_notes: sanitizedNotes,
        time_spent_minutes: validatedTimeSpent,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .select(`
        *,
        client:client_id (
          id,
          name,
          health_status,
          contact_email
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
      return createErrorResponse(500, 'Failed to resolve ticket')
    }

    // TODO: If send_client_email is true, queue an email to the client
    // This would integrate with an email service like SendGrid or Resend
    const emailSent = false
    if (send_client_email === true) {
      // Future: Send email via email integration
    }

      return NextResponse.json({
        data: ticket,
        emailSent,
        message: 'Ticket resolved successfully',
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
