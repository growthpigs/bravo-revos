import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, sanitizeString, sanitizeEmail, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { HealthStatus } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Valid values for enums
const VALID_STAGES = ['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-boarding']
const VALID_HEALTH_STATUSES: HealthStatus[] = ['green', 'yellow', 'red']

// GET /api/v1/clients/[id] - Get a single client
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id } = await params

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const _agencyId = request.user.agencyId // Used by RLS

    // Validate UUID format (only for authenticated requests with real data)
    if (!isValidUUID(id)) {
      return createErrorResponse(400, 'Invalid client ID format')
    }

    const { data: client, error } = await supabase
      .from('client')
      .select(`
        *,
        assignments:client_assignment (
          id,
          role,
          user:user_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        ),
        tickets:ticket (
          id,
          number,
          title,
          status,
          priority,
          category,
          created_at
        ),
        communications:communication (
          id,
          platform,
          subject,
          content,
          received_at
        ),
        stage_events:stage_event (
          id,
          from_stage,
          to_stage,
          moved_at,
          notes,
          moved_by:user!moved_by (
            id,
            first_name,
            last_name
          )
        ),
        tasks:task (
          id,
          name,
          description,
          stage,
          is_completed,
          due_date,
          assigned_to,
          sort_order
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(404, 'Client not found')
      }
      return createErrorResponse(500, 'Failed to fetch client')
    }

      return NextResponse.json({ data: client })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// PUT /api/v1/clients/[id] - Update a client
export const PUT = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
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
        return createErrorResponse(400, 'Invalid client ID format')
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

    const {
      name,
      contact_email,
      contact_name,
      stage,
      health_status,
      notes,
      tags,
      is_active,
      install_date,
      total_spend,
      lifetime_value,
    } = body

    // Build validated updates object
    const updates: Record<string, unknown> = {}

    if (name !== undefined) {
      if (typeof name !== 'string') {
        return createErrorResponse(400, 'Name must be a string')
      }
      const sanitizedName = sanitizeString(name).slice(0, 200)
      if (!sanitizedName) {
        return createErrorResponse(400, 'Name cannot be empty')
      }
      updates.name = sanitizedName
    }

    if (contact_email !== undefined) {
      if (contact_email === null) {
        updates.contact_email = null
      } else {
        const sanitizedEmail = sanitizeEmail(contact_email)
        if (sanitizedEmail === null && contact_email !== '') {
          return createErrorResponse(400, 'Invalid email format')
        }
        updates.contact_email = sanitizedEmail
      }
    }

    if (contact_name !== undefined) {
      if (contact_name === null) {
        updates.contact_name = null
      } else if (typeof contact_name === 'string') {
        updates.contact_name = sanitizeString(contact_name).slice(0, 200)
      }
    }

    if (stage !== undefined) {
      if (typeof stage !== 'string' || !VALID_STAGES.includes(stage)) {
        return createErrorResponse(400, `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`)
      }
      updates.stage = stage
    }

    if (health_status !== undefined) {
      if (!VALID_HEALTH_STATUSES.includes(health_status as HealthStatus)) {
        return createErrorResponse(400, 'Invalid health_status. Must be: green, yellow, or red')
      }
      updates.health_status = health_status
    }

    if (notes !== undefined) {
      if (notes === null) {
        updates.notes = null
      } else if (typeof notes === 'string') {
        updates.notes = sanitizeString(notes).slice(0, 5000)
      }
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return createErrorResponse(400, 'Tags must be an array')
      }
      // Early reject if too many tags to prevent DoS via processing
      if (tags.length > 100) {
        return createErrorResponse(400, 'Too many tags (max 100)')
      }
      // Limit first, then filter/map for efficiency
      updates.tags = tags
        .slice(0, 20)
        .filter((t): t is string => typeof t === 'string')
        .map((t) => sanitizeString(t).slice(0, 50))
    }

    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return createErrorResponse(400, 'is_active must be a boolean')
      }
      updates.is_active = is_active
    }

    if (install_date !== undefined) {
      if (install_date === null) {
        updates.install_date = null
      } else if (typeof install_date === 'string' && !isNaN(Date.parse(install_date))) {
        updates.install_date = install_date
      } else {
        return createErrorResponse(400, 'Invalid install_date format')
      }
    }

    if (total_spend !== undefined) {
      if (total_spend === null) {
        updates.total_spend = null
      } else if (typeof total_spend === 'number' && total_spend >= 0) {
        updates.total_spend = total_spend
      } else {
        return createErrorResponse(400, 'total_spend must be a non-negative number')
      }
    }

    if (lifetime_value !== undefined) {
      if (lifetime_value === null) {
        updates.lifetime_value = null
      } else if (typeof lifetime_value === 'number' && lifetime_value >= 0) {
        updates.lifetime_value = lifetime_value
      } else {
        return createErrorResponse(400, 'lifetime_value must be a non-negative number')
      }
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse(400, 'No valid fields to update')
    }

    const { data: client, error } = await supabase
      .from('client')
      .update(updates)
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(404, 'Client not found')
      }
      return createErrorResponse(500, 'Failed to update client')
    }

      return NextResponse.json({ data: client })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/clients/[id] - Soft delete a client (set is_active = false)
export const DELETE = withPermission({ resource: 'clients', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
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
        return createErrorResponse(400, 'Invalid client ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

    // Soft delete - set is_active to false instead of hard delete
    const { data: client, error } = await supabase
      .from('client')
      .update({ is_active: false })
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(404, 'Client not found')
      }
      return createErrorResponse(500, 'Failed to delete client')
    }

      return NextResponse.json({
        data: client,
        message: 'Client deactivated successfully',
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
