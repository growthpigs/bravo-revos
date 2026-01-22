import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { Database, Json } from '@/types/database'

type FieldType = Database['public']['Enums']['field_type']
const VALID_FIELD_TYPES: FieldType[] = ['text', 'email', 'url', 'number', 'textarea', 'select']

// GET /api/v1/onboarding/fields - List form fields
export const GET = withPermission({ resource: 'settings', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Optional journey_id filter
      const { searchParams } = new URL(request.url)
      const journeyId = searchParams.get('journey_id')

      let query = supabase
        .from('intake_form_field')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (journeyId) {
        query = query.eq('journey_id', journeyId)
      }

      const { data: fields, error } = await query

      if (error) {
        console.error('Failed to fetch form fields:', error)
        return createErrorResponse(500, 'Failed to fetch form fields')
      }

      return NextResponse.json({ data: fields })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/onboarding/fields - Create a form field
export const POST = withPermission({ resource: 'settings', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { field_label, field_type, placeholder, is_required, validation_regex, options, sort_order, journey_id } = body

      if (!field_label || typeof field_label !== 'string') {
        return createErrorResponse(400, 'Field label is required')
      }

      const sanitizedLabel = sanitizeString(field_label).slice(0, 100)
      if (!sanitizedLabel) {
        return createErrorResponse(400, 'Field label is required')
      }

      // Validate field_type
      const validatedFieldType: FieldType = typeof field_type === 'string' && VALID_FIELD_TYPES.includes(field_type as FieldType)
        ? (field_type as FieldType)
        : 'text'

      const { data: field, error } = await supabase
        .from('intake_form_field')
        .insert({
          agency_id: agencyId,
          journey_id: typeof journey_id === 'string' ? journey_id : null,
          field_label: sanitizedLabel,
          field_type: validatedFieldType,
          placeholder: typeof placeholder === 'string' ? sanitizeString(placeholder).slice(0, 200) : null,
          is_required: is_required === true,
          validation_regex: typeof validation_regex === 'string' ? validation_regex.slice(0, 200) : null,
          options: options && typeof options === 'object' ? (options as Json) : null,
          sort_order: typeof sort_order === 'number' ? sort_order : 0,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create form field:', error)
        return createErrorResponse(500, 'Failed to create form field')
      }

      return NextResponse.json({ data: field }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
