// app/api/v1/cartridges/[id]/set-default/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

// POST /api/v1/cartridges/[id]/set-default - Set a cartridge as default for its type
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const { id } = params
      const { type } = await request.json()

      if (!type) {
        return NextResponse.json(
          { error: 'type is required' },
          { status: 400 }
        )
      }

      // Get cartridge to find agency
      const { data: cartridge, error: getError } = await supabase
        .from('cartridges')
        .select('agency_id, type')
        .eq('id', id)
        .single()

      if (getError || !cartridge) {
        return NextResponse.json(
          { error: 'Cartridge not found' },
          { status: 404 }
        )
      }

      // Call transaction-safe RPC function to atomically reset defaults and set new default
      const { data: result, error: rpcError } = await supabase.rpc(
        'set_cartridge_default',
        {
          p_cartridge_id: id,
          p_agency_id: cartridge.agency_id,
          p_type: type,
        }
      )

      if (rpcError) {
        console.error('[Set Default Cartridge] RPC error:', rpcError)
        return NextResponse.json(
          { error: 'Failed to set default cartridge' },
          { status: 400 }
        )
      }

      if (result && !result.success) {
        console.error('[Set Default Cartridge] Function error:', result.error)
        return NextResponse.json(
          { error: result.error || 'Failed to set default cartridge' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Default cartridge set',
      })
    } catch (error) {
      console.error('[Set Default Cartridge] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
