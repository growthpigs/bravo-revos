// app/api/v1/cartridges/instructions/[id]/route.ts
// Single instruction cartridge operations - uses instruction_cartridge table
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/cartridges/instructions/[id] - Fetch single instruction cartridge
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest, context: RouteParams) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const { id } = await context.params

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Fetch single instruction cartridge (uses instruction_cartridge table)
      const { data, error } = await supabase
        .from('instruction_cartridge')
        .select('*')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 })
        }
        console.error('[Instructions GET] Error:', error)
        return createErrorResponse(500, 'Failed to fetch cartridge')
      }

      return NextResponse.json(data)
    } catch (error) {
      console.error('[Instructions GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/cartridges/instructions/[id] - Delete instruction cartridge
export const DELETE = withPermission({ resource: 'cartridges', action: 'delete' })(
  async (request: AuthenticatedRequest, context: RouteParams) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const { id } = await context.params

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Get cartridge to find training docs (uses instruction_cartridge table)
      const { data: cartridge, error: fetchError } = await supabase
        .from('instruction_cartridge')
        .select('id, training_docs')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (fetchError || !cartridge) {
        return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 })
      }

      // Delete training docs from storage
      if (cartridge.training_docs && Array.isArray(cartridge.training_docs) && cartridge.training_docs.length > 0) {
        const docs = cartridge.training_docs as Array<{ file_path?: string }>
        const filePaths = docs.map((doc) => doc.file_path).filter(Boolean)
        if (filePaths.length > 0) {
          await supabase.storage.from('instruction-documents').remove(filePaths as string[])
        }
      }

      // Hard delete instruction cartridge
      const { error } = await supabase
        .from('instruction_cartridge')
        .delete()
        .eq('id', id)
        .eq('agency_id', agencyId)

      if (error) {
        console.error('[Instructions DELETE] Error:', error)
        return createErrorResponse(500, 'Failed to delete cartridge')
      }

      return NextResponse.json({ success: true, message: 'Instruction cartridge deleted successfully' })
    } catch (error) {
      console.error('[Instructions DELETE] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
