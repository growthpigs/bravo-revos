import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

// GET /api/v1/tickets/[id]/notes - List notes for a ticket
export const GET = withPermission({ resource: 'tickets', action: 'read' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id: ticketId } = await params

      // Validate UUID format
      if (!isValidUUID(ticketId)) {
        return createErrorResponse(400, 'Invalid ticket ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const isInternal = searchParams.get('is_internal')

    // Build query
    let query = supabase
      .from('ticket_note')
      .select(`
        *,
        author:added_by (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (isInternal !== null) {
      query = query.eq('is_internal', isInternal === 'true')
    }

    const { data: notes, error } = await query

    if (error) {
      return createErrorResponse(500, 'Failed to fetch notes')
    }

      return NextResponse.json({ data: notes })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/tickets/[id]/notes - Add a note to a ticket
export const POST = withPermission({ resource: 'tickets', action: 'write' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 50 creates per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 50, windowMs: 60000 })
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
      const userId = request.user.id

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { content, is_internal = true } = body

    // Validate and sanitize content
    if (typeof content !== 'string') {
      return createErrorResponse(400, 'Note content is required')
    }

    const sanitizedContent = sanitizeString(content).slice(0, 10000)
    if (!sanitizedContent) {
      return createErrorResponse(400, 'Note content is required')
    }

    // Validate is_internal
    const isInternalBool = is_internal === true || is_internal === 'true'

    // Verify ticket exists and get agency_id
    const { data: ticket, error: ticketError } = await supabase
      .from('ticket')
      .select('agency_id')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return createErrorResponse(404, 'Ticket not found')
    }

    // Create note
    const { data: note, error } = await supabase
      .from('ticket_note')
      .insert({
        ticket_id: ticketId,
        agency_id: ticket.agency_id,
        content: sanitizedContent,
        is_internal: isInternalBool,
        added_by: userId,
      })
      .select(`
        *,
        author:added_by (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      return createErrorResponse(500, 'Failed to create note')
    }

      return NextResponse.json({ data: note }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
