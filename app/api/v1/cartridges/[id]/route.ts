// app/api/v1/cartridges/[id]/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

// GET /api/v1/cartridges/[id] - Fetch a single cartridge
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const { id } = params

      const { data: cartridge, error } = await supabase
        .from('cartridges')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !cartridge) {
        return NextResponse.json(
          { error: 'Cartridge not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: cartridge,
      })
    } catch (error) {
      console.error('[Cartridge GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// PATCH /api/v1/cartridges/[id] - Update a cartridge
export const PATCH = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const { id } = params
      const body = await request.json()

      // VALIDATION: Prevent type field changes
      if (body.type !== undefined) {
        return NextResponse.json(
          { error: 'Cannot change cartridge type. Use delete and create instead.' },
          { status: 400 }
        )
      }

      // VALIDATION: Prevent immutable fields
      if (body.created_by !== undefined || body.created_at !== undefined) {
        return NextResponse.json(
          { error: 'Cannot modify immutable fields (created_by, created_at)' },
          { status: 400 }
        )
      }

      const { error: updateError } = await supabase
        .from('cartridges')
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        console.error('[Cartridge PATCH] UPDATE error:', updateError)
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Cartridge updated',
      })
    } catch (error) {
      console.error('[Cartridge PATCH] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/cartridges/[id] - Delete a cartridge
export const DELETE = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const { id } = params

      const { error: deleteError } = await supabase
        .from('cartridges')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('[Cartridge DELETE] DELETE error:', deleteError)
        return NextResponse.json(
          { error: deleteError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Cartridge deleted',
      })
    } catch (error) {
      console.error('[Cartridge DELETE] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
