import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'

const VALID_TYPES = ['voice', 'brand', 'style', 'instructions']

/**
 * GET /api/v1/cartridges/by-type/[type]
 * List all cartridges of a specific type for the authenticated user's agency
 * Supports: voice, brand, style, instructions
 */
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: { params: { type: string } }) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const { type: typeParam } = params

      // Validate type parameter
      if (!VALID_TYPES.includes(typeParam)) {
        return createErrorResponse(
          400,
          `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
        )
      }

      // Type-safe cast after validation
      const type = typeParam as 'voice' | 'brand' | 'style' | 'instructions'

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const { data: cartridges, error } = await supabase
        .from('cartridges')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('type', type)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`[Cartridges by type: ${type}] GET Query error:`, error)
        return createErrorResponse(500, `Failed to fetch ${type} cartridges`)
      }

      return NextResponse.json({
        success: true,
        data: cartridges || [],
        count: cartridges?.length || 0,
      })
    } catch (error) {
      console.error('[Cartridges by type] GET Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * POST /api/v1/cartridges/by-type/[type]
 * Create new cartridge of specified type
 * Validates required 'name' field
 * All type-specific fields are passed through dynamically
 */
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: { type: string } }) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const csrfError = withCsrfProtection(request)
      if (csrfError) return csrfError

      const { type: typeParam } = params

      // Validate type parameter
      if (!VALID_TYPES.includes(typeParam)) {
        return createErrorResponse(
          400,
          `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
        )
      }

      // Type-safe cast after validation
      const type = typeParam as 'voice' | 'brand' | 'style' | 'instructions'

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const userId = request.user.id

      const body = await request.json()
      const { name, ...typeSpecificFields } = body

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return createErrorResponse(400, 'name is required')
      }

      // Prepare cartridge data
      const cartridgeData = {
        agency_id: agencyId,
        name: name.trim(),
        type,
        tier: 'agency',
        is_active: true,
        ...typeSpecificFields,
        created_by: userId,
      }

      const { data, error } = await supabase
        .from('cartridges')
        .insert([cartridgeData])
        .select()
        .single()

      if (error) {
        console.error(`[Cartridges by type: ${type}] POST Error:`, error)
        return createErrorResponse(500, `Failed to create ${type} cartridge`)
      }

      return NextResponse.json(data, { status: 201 })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(400, 'Invalid JSON in request body')
      }

      console.error('[Cartridges by type] POST Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
