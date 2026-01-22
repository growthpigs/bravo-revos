// app/api/v1/cartridges/instructions/route.ts
// Instructions cartridge operations - uses instruction_cartridge table
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

// Sanitize HTML to prevent XSS
function sanitizeHtml(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+on\w+="[^"]*"/gi, '')
    .replace(/<[^>]+on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/<object/gi, '')
    .replace(/<embed/gi, '')
}

// GET /api/v1/cartridges/instructions - Fetch agency's instruction cartridges
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Fetch agency's instruction cartridges (uses instruction_cartridge table)
      const { data, error } = await supabase
        .from('instruction_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Instructions GET] Database error:', error)
        return createErrorResponse(500, 'Failed to fetch instruction cartridges')
      }

      return NextResponse.json({ cartridges: data || [] })
    } catch (error) {
      console.error('[Instructions GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/cartridges/instructions - Create new instruction set
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const body = await request.json()
      let { name, description } = body

      // Validate name
      if (!name) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
      }

      if (typeof name !== 'string') {
        return NextResponse.json({ error: 'name must be a string' }, { status: 400 })
      }

      // Sanitize inputs
      name = sanitizeHtml(name.trim())
      if (description) {
        description = sanitizeHtml(String(description).trim())
      }

      // Generate Mem0 namespace
      const mem0Namespace = `instructions::${agencyId}::${Date.now()}`

      // Create instruction cartridge (uses instruction_cartridge table)
      const { data, error } = await supabase
        .from('instruction_cartridge')
        .insert({
          agency_id: agencyId,
          name,
          description,
          mem0_namespace: mem0Namespace,
          process_status: 'pending',
          training_docs: []
        })
        .select()
        .single()

      if (error) {
        console.error('[Instructions POST] Create error:', error)
        return createErrorResponse(500, 'Failed to create instruction cartridge')
      }

      return NextResponse.json({
        id: data.id,
        name: data.name,
        description: data.description,
        process_status: data.process_status,
        training_docs: data.training_docs || []
      }, { status: 201 })
    } catch (error) {
      console.error('[Instructions POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// PATCH /api/v1/cartridges/instructions - Update instruction cartridge
export const PATCH = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const body = await request.json()
      const { id, ...updates } = body

      if (!id) {
        return NextResponse.json({ error: 'Cartridge ID is required' }, { status: 400 })
      }

      // Sanitize updates if name/description provided
      if (updates.name) updates.name = sanitizeHtml(String(updates.name).trim())
      if (updates.description) updates.description = sanitizeHtml(String(updates.description).trim())

      // Update instruction cartridge (uses instruction_cartridge table)
      const { data, error } = await supabase
        .from('instruction_cartridge')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('agency_id', agencyId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 })
        }
        console.error('[Instructions PATCH] Update error:', error)
        return createErrorResponse(500, 'Failed to update instruction cartridge')
      }

      return NextResponse.json({ cartridge: data })
    } catch (error) {
      console.error('[Instructions PATCH] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
