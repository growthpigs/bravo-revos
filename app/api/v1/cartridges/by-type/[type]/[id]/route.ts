import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'

const VALID_TYPES = ['voice', 'brand', 'style', 'instructions']

/**
 * GET /api/v1/cartridges/by-type/[type]/[id]
 * Fetch a single cartridge by type and ID
 * Verifies type to ensure type safety
 */
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: { params: { type: string; id: string } }) => {
    try {
      const { type: typeParam, id } = params

      // Validate type parameter
      if (!VALID_TYPES.includes(typeParam)) {
        return createErrorResponse(400, 'Invalid type')
      }

      // Type-safe cast after validation
      const type = typeParam as 'voice' | 'brand' | 'style' | 'instructions'

      const supabase = await createRouteHandlerClient(cookies)

      const { data: cartridge, error } = await supabase
        .from('cartridges')
        .select('*')
        .eq('id', id)
        .eq('type', type)
        .single()

      if (error || !cartridge) {
        return createErrorResponse(404, `${type} cartridge not found`)
      }

      return NextResponse.json({
        success: true,
        data: cartridge,
      })
    } catch (error) {
      console.error('[Cartridges by type] GET [id] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * PATCH /api/v1/cartridges/by-type/[type]/[id]
 * Update a cartridge by type and ID
 * Type is always enforced in WHERE clause for safety
 */
export const PATCH = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: { type: string; id: string } }) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const csrfError = withCsrfProtection(request)
      if (csrfError) return csrfError

      const { type: typeParam, id } = params

      // Validate type parameter
      if (!VALID_TYPES.includes(typeParam)) {
        return createErrorResponse(400, 'Invalid type')
      }

      // Type-safe cast after validation
      const type = typeParam as 'voice' | 'brand' | 'style' | 'instructions'

      const supabase = await createRouteHandlerClient(cookies)
      const body = await request.json()

      // VALIDATION: Prevent type field changes
      if (body.type !== undefined) {
        return createErrorResponse(
          400,
          'Cannot change cartridge type. Use delete and create instead.'
        )
      }

      // VALIDATION: Prevent immutable fields
      if (body.created_by !== undefined || body.created_at !== undefined) {
        return createErrorResponse(
          400,
          'Cannot modify immutable fields (created_by, created_at)'
        )
      }

      // Add updated_at timestamp
      const updateData = {
        ...body,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('cartridges')
        .update(updateData)
        .eq('id', id)
        .eq('type', type)

      if (error) {
        console.error(`[Cartridges by type: ${type}] PATCH Error:`, error)
        return createErrorResponse(500, `Failed to update ${type} cartridge`)
      }

      return NextResponse.json({
        success: true,
        message: `${type} cartridge updated`,
      })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(400, 'Invalid JSON in request body')
      }

      console.error('[Cartridges by type] PATCH Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * DELETE /api/v1/cartridges/by-type/[type]/[id]
 * Delete a cartridge by type and ID
 * Type is always enforced in WHERE clause for safety
 */
export const DELETE = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: { type: string; id: string } }) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const csrfError = withCsrfProtection(request)
      if (csrfError) return csrfError

      const { type: typeParam, id } = params

      // Validate type parameter
      if (!VALID_TYPES.includes(typeParam)) {
        return createErrorResponse(400, 'Invalid type')
      }

      // Type-safe cast after validation
      const type = typeParam as 'voice' | 'brand' | 'style' | 'instructions'

      const supabase = await createRouteHandlerClient(cookies)

      const { error } = await supabase
        .from('cartridges')
        .delete()
        .eq('id', id)
        .eq('type', type)

      if (error) {
        console.error(`[Cartridges by type: ${type}] DELETE Error:`, error)
        return createErrorResponse(500, `Failed to delete ${type} cartridge`)
      }

      return NextResponse.json({
        success: true,
        message: `${type} cartridge deleted`,
      })
    } catch (error) {
      console.error('[Cartridges by type] DELETE Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
