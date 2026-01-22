/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, sanitizeSearchPattern, isValidUUID, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { TicketCategory, TicketPriority, TicketStatus } from '@/types/database'

// Valid enum values
const VALID_STATUSES: TicketStatus[] = ['new', 'in_progress', 'waiting_client', 'resolved']
const VALID_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'critical']
const VALID_CATEGORIES: TicketCategory[] = ['technical', 'billing', 'campaign', 'general', 'escalation']

// GET /api/v1/tickets - List all tickets for the agency
export const GET = withPermission({ resource: 'tickets', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const clientId = searchParams.get('client_id')
    const assigneeId = searchParams.get('assignee_id')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    // Build query - RLS will filter by agency_id
    let query = supabase
      .from('ticket')
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
      .order('created_at', { ascending: false })

    // Apply filters with validation
    if (status && VALID_STATUSES.includes(status as TicketStatus)) {
      query = query.eq('status', status as TicketStatus)
    }
    if (priority && VALID_PRIORITIES.includes(priority as TicketPriority)) {
      query = query.eq('priority', priority as TicketPriority)
    }
    if (clientId && isValidUUID(clientId)) {
      query = query.eq('client_id', clientId)
    }
    if (assigneeId && isValidUUID(assigneeId)) {
      query = query.eq('assignee_id', assigneeId)
    }
    if (category && VALID_CATEGORIES.includes(category as TicketCategory)) {
      query = query.eq('category', category as TicketCategory)
    }
    if (search) {
      const sanitizedSearch = sanitizeSearchPattern(search)
      if (sanitizedSearch) {
        query = query.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`)
      }
    }

    const { data: tickets, error } = await query

    if (error) {
      return createErrorResponse(500, 'Failed to fetch tickets')
    }

      return NextResponse.json({ data: tickets })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/tickets - Create a new ticket
export const POST = withPermission({ resource: 'tickets', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    // Rate limit: 30 creates per minute (stricter for writes)
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
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

    const { client_id, title, description, category, priority, assignee_id, due_date } = body

    // Validate required fields
    if (!client_id || !isValidUUID(client_id)) {
      return createErrorResponse(400, 'Valid client_id is required')
    }
    if (!title || typeof title !== 'string') {
      return createErrorResponse(400, 'Title is required')
    }
    if (!category || !VALID_CATEGORIES.includes(category as TicketCategory)) {
      return createErrorResponse(400, 'Valid category is required')
    }
    if (!priority || !VALID_PRIORITIES.includes(priority as TicketPriority)) {
      return createErrorResponse(400, 'Valid priority is required')
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeString(title).slice(0, 500)
    const sanitizedDescription = description ? sanitizeString(description as string).slice(0, 10000) : ''

    if (!sanitizedTitle) {
      return createErrorResponse(400, 'Title is required')
    }

    // Validate optional fields with explicit type narrowing
    const validatedAssigneeId: string | null = typeof assignee_id === 'string' && isValidUUID(assignee_id)
      ? assignee_id
      : null
    const validatedDueDate: string | null = typeof due_date === 'string' && !isNaN(Date.parse(due_date))
      ? due_date
      : null

    // Use agencyId from getAuthenticatedUser (SEC-006 - already fetched from DB)
    // Create ticket
    const { data: ticket, error } = await supabase
      .from('ticket')
      .insert({
        agency_id: agencyId,
        client_id: client_id as string,
        title: sanitizedTitle,
        description: sanitizedDescription,
        category: category as TicketCategory,
        priority: priority as TicketPriority,
        assignee_id: validatedAssigneeId,
        due_date: validatedDueDate,
        created_by: userId,
      })
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
      return createErrorResponse(500, 'Failed to create ticket')
    }

      return NextResponse.json({ data: ticket }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
