import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { Database } from '@/types/database'

type FieldType = Database['public']['Enums']['field_type']
const VALID_FIELD_TYPES: FieldType[] = ['text', 'email', 'url', 'number', 'textarea', 'select']

// PATCH /api/v1/onboarding/fields/[id] - Update a form field
export const PATCH = withPermission({ resource: 'settings', action: 'write' })(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await context.params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return createErrorResponse(400, 'Invalid field ID format')
      }

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { field_label, field_type, placeholder, is_required, validation_regex, options, sort_order, is_active } = body

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {}

      if (field_label !== undefined) {
        const sanitizedLabel = typeof field_label === 'string' ? sanitizeString(field_label).slice(0, 100) : null
        if (!sanitizedLabel) {
          return createErrorResponse(400, 'Field label cannot be empty')
        }
        updateData.field_label = sanitizedLabel
      }

      if (field_type !== undefined) {
        if (typeof field_type === 'string' && VALID_FIELD_TYPES.includes(field_type as FieldType)) {
          updateData.field_type = field_type
        }
      }

      if (placeholder !== undefined) {
        updateData.placeholder = typeof placeholder === 'string' ? sanitizeString(placeholder).slice(0, 200) : null
      }

      if (is_required !== undefined) {
        updateData.is_required = is_required === true
      }

      if (validation_regex !== undefined) {
        updateData.validation_regex = typeof validation_regex === 'string' ? validation_regex.slice(0, 200) : null
      }

      if (options !== undefined) {
        updateData.options = options && typeof options === 'object' ? options : null
      }

      if (sort_order !== undefined && typeof sort_order === 'number') {
        updateData.sort_order = sort_order
      }

      if (is_active !== undefined) {
        updateData.is_active = is_active === true
      }

      if (Object.keys(updateData).length === 0) {
        return createErrorResponse(400, 'No valid fields to update')
      }

      const { data: field, error } = await supabase
        .from('intake_form_field')
        .update(updateData)
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return createErrorResponse(404, 'Field not found')
        }
        console.error('Failed to update form field:', error)
        return createErrorResponse(500, 'Failed to update form field')
      }

      return NextResponse.json({ data: field })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/onboarding/fields/[id] - Soft delete a form field
export const DELETE = withPermission({ resource: 'settings', action: 'delete' })(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await context.params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return createErrorResponse(400, 'Invalid field ID format')
      }

      // Soft delete by setting is_active = false
      const { data: field, error } = await supabase
        .from('intake_form_field')
        .update({ is_active: false })
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return createErrorResponse(404, 'Field not found')
        }
        console.error('Failed to delete form field:', error)
        return createErrorResponse(500, 'Failed to delete form field')
      }

      return NextResponse.json({ data: field })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
