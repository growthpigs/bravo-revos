// app/api/v1/cartridges/brand/route.ts
// Brand cartridge operations - uses brand_cartridge table
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

// Default brand cartridge structure
const DEFAULT_BRAND = {
  name: 'My Brand',
  core_values: [],
  brand_personality: [],
  brand_colors: {
    primary: '#000000',
    secondary: '#FFFFFF',
    accent: '#0066CC'
  },
  social_links: {}
}

// GET /api/v1/cartridges/brand - Fetch the agency's brand cartridge
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Fetch agency's brand cartridge (should only have one)
      const { data, error } = await supabase
        .from('brand_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('[Brand GET] Database error:', error)
        return createErrorResponse(500, 'Failed to fetch brand')
      }

      // If no brand exists, create default one
      if (!data) {
        const { data: newBrand, error: createError } = await supabase
          .from('brand_cartridge')
          .insert({
            agency_id: agencyId,
            ...DEFAULT_BRAND
          })
          .select()
          .single()

        if (createError) {
          console.error('[Brand GET] Create default error:', createError)
          return createErrorResponse(500, 'Failed to create brand')
        }

        return NextResponse.json({ brand: newBrand })
      }

      return NextResponse.json({ brand: data })
    } catch (error) {
      console.error('[Brand GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/cartridges/brand - Create or update brand cartridge
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const body = await request.json()

      // Validate required fields
      if (!body.name) {
        return NextResponse.json(
          { error: 'name is required' },
          { status: 400 }
        )
      }

      // Check if agency already has a brand cartridge
      const { data: existing, error: checkError } = await supabase
        .from('brand_cartridge')
        .select('id')
        .eq('agency_id', agencyId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[Brand POST] Check error:', checkError)
        return createErrorResponse(500, 'Failed to check brand')
      }

      let result

      if (existing) {
        // Update existing brand
        const { data, error } = await supabase
          .from('brand_cartridge')
          .update({
            name: body.name,
            company_name: body.companyName || body.company_name,
            company_description: body.description || body.company_description,
            company_tagline: body.tagline || body.company_tagline,
            industry: body.industry,
            target_audience: body.targetAudience || body.target_audience,
            core_values: body.core_values || body.coreValues || [],
            brand_voice: body.brand_voice || body.brandVoice,
            brand_personality: body.brand_personality || body.brandPersonality || [],
            logo_url: body.logo_url || body.logoUrl,
            brand_colors: body.brand_colors || body.brandColors,
            social_links: body.social_links || body.socialLinks,
            core_messaging: body.core_messaging || body.coreMessaging,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .eq('agency_id', agencyId)
          .select()
          .single()

        if (error) {
          console.error('[Brand POST] Update error:', error)
          return createErrorResponse(500, 'Failed to update brand')
        }

        result = data
      } else {
        // Create new brand
        const { data, error } = await supabase
          .from('brand_cartridge')
          .insert({
            agency_id: agencyId,
            name: body.name || 'My Brand',
            company_name: body.companyName || body.company_name,
            company_description: body.description || body.company_description,
            company_tagline: body.tagline || body.company_tagline,
            industry: body.industry,
            target_audience: body.targetAudience || body.target_audience,
            core_values: body.core_values || body.coreValues || [],
            brand_voice: body.brand_voice || body.brandVoice,
            brand_personality: body.brand_personality || body.brandPersonality || [],
            logo_url: body.logo_url || body.logoUrl,
            brand_colors: body.brand_colors || body.brandColors || DEFAULT_BRAND.brand_colors,
            social_links: body.social_links || body.socialLinks || {},
            core_messaging: body.core_messaging || body.coreMessaging
          })
          .select()
          .single()

        if (error) {
          console.error('[Brand POST] Create error:', error)
          return createErrorResponse(500, 'Failed to create brand')
        }

        result = data
      }

      return NextResponse.json(result)
    } catch (error) {
      console.error('[Brand POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// PATCH /api/v1/cartridges/brand - Update brand cartridge
export const PATCH = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const body = await request.json()

      // Update brand (agency can only have one)
      const { data, error } = await supabase
        .from('brand_cartridge')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('agency_id', agencyId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
        }
        console.error('[Brand PATCH] Update error:', error)
        return createErrorResponse(500, 'Failed to update brand')
      }

      return NextResponse.json({ brand: data })
    } catch (error) {
      console.error('[Brand PATCH] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/cartridges/brand - Delete brand cartridge
export const DELETE = withPermission({ resource: 'cartridges', action: 'delete' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Get brand to find logo
      const { data: brand, error: fetchError } = await supabase
        .from('brand_cartridge')
        .select('id, logo_url')
        .eq('agency_id', agencyId)
        .single()

      if (fetchError || !brand) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
      }

      // Delete logo from storage if exists
      if (brand.logo_url) {
        await supabase.storage.from('brand-assets').remove([brand.logo_url])
      }

      // Hard delete for brand_cartridge table
      const { error } = await supabase
        .from('brand_cartridge')
        .delete()
        .eq('id', brand.id)
        .eq('agency_id', agencyId)

      if (error) {
        console.error('[Brand DELETE] Error:', error)
        return createErrorResponse(500, 'Failed to delete brand')
      }

      return NextResponse.json({ success: true, message: 'Brand deleted successfully' })
    } catch (error) {
      console.error('[Brand DELETE] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
