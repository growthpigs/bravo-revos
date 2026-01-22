// app/api/v1/cartridges/style/route.ts
// Style cartridge operations - uses style_cartridge table (one per agency)
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

// GET /api/v1/cartridges/style - Fetch agency's style cartridge
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Fetch agency's style cartridge (one per agency)
      const { data, error } = await supabase
        .from('style_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('[Style GET] Database error:', error)
        return createErrorResponse(500, 'Failed to fetch style cartridge')
      }

      // If no style cartridge exists, return empty
      if (!data) {
        return NextResponse.json({ style: null })
      }

      return NextResponse.json({ style: data })
    } catch (error) {
      console.error('[Style GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/cartridges/style - Create or update style cartridge
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Check if agency already has a style cartridge
      const { data: existing, error: checkError } = await supabase
        .from('style_cartridge')
        .select('id')
        .eq('agency_id', agencyId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[Style POST] Check error:', checkError)
        return createErrorResponse(500, 'Failed to check style cartridge')
      }

      let result

      if (existing) {
        // Style cartridge already exists - return it
        const { data, error } = await supabase
          .from('style_cartridge')
          .select('*')
          .eq('id', existing.id)
          .single()

        if (error) {
          console.error('[Style POST] Fetch error:', error)
          return createErrorResponse(500, 'Failed to fetch style cartridge')
        }

        result = data
      } else {
        // Create new style cartridge
        const mem0Namespace = `style::${agencyId}::${Date.now()}`

        const { data, error } = await supabase
          .from('style_cartridge')
          .insert({
            agency_id: agencyId,
            mem0_namespace: mem0Namespace,
            analysis_status: 'pending',
            source_files: []
          })
          .select()
          .single()

        if (error) {
          console.error('[Style POST] Create error:', error)
          return createErrorResponse(500, 'Failed to create style cartridge')
        }

        result = data
      }

      return NextResponse.json({ style: result }, { status: existing ? 200 : 201 })
    } catch (error) {
      console.error('[Style POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// PATCH /api/v1/cartridges/style - Update style cartridge
export const PATCH = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const body = await request.json()

      // Only allow updating specific fields
      const allowedFields = ['analysis_status', 'learned_style', 'source_files', 'mem0_namespace']
      const updates: Record<string, unknown> = {}

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field]
        }
      }

      updates.updated_at = new Date().toISOString()

      // Update style cartridge (one per agency)
      const { data, error } = await supabase
        .from('style_cartridge')
        .update(updates)
        .eq('agency_id', agencyId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Style cartridge not found' }, { status: 404 })
        }
        console.error('[Style PATCH] Update error:', error)
        return createErrorResponse(500, 'Failed to update style cartridge')
      }

      return NextResponse.json({ style: data })
    } catch (error) {
      console.error('[Style PATCH] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/cartridges/style - Delete style cartridge
export const DELETE = withPermission({ resource: 'cartridges', action: 'delete' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Get style cartridge to find source files
      const { data: style, error: fetchError } = await supabase
        .from('style_cartridge')
        .select('id, source_files')
        .eq('agency_id', agencyId)
        .single()

      if (fetchError || !style) {
        return NextResponse.json({ error: 'Style cartridge not found' }, { status: 404 })
      }

      // Delete source files from storage
      if (style.source_files && Array.isArray(style.source_files) && style.source_files.length > 0) {
        const docs = style.source_files as Array<{ file_path?: string }>
        const filePaths = docs.map((doc) => doc.file_path).filter(Boolean)
        if (filePaths.length > 0) {
          await supabase.storage.from('style-documents').remove(filePaths as string[])
        }
      }

      // Hard delete style cartridge
      const { error } = await supabase
        .from('style_cartridge')
        .delete()
        .eq('id', style.id)
        .eq('agency_id', agencyId)

      if (error) {
        console.error('[Style DELETE] Error:', error)
        return createErrorResponse(500, 'Failed to delete style cartridge')
      }

      return NextResponse.json({ success: true, message: 'Style cartridge deleted successfully' })
    } catch (error) {
      console.error('[Style DELETE] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
