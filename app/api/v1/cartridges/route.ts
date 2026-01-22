// app/api/v1/cartridges/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

// GET /api/v1/cartridges - List cartridges with optional filtering and pagination
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Parse pagination parameters
      const { searchParams } = new URL(request.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100
      const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        return NextResponse.json(
          { error: 'limit must be between 1 and 100' },
          { status: 400 }
        )
      }
      if (offset < 0) {
        return NextResponse.json(
          { error: 'offset must be >= 0' },
          { status: 400 }
        )
      }

      // Build query with pagination and count
      let query = supabase
        .from('cartridges')
        .select('*', { count: 'exact' })
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply filters with validation
      const typeParam = searchParams.get('type')
      const tier = searchParams.get('tier')

      // Validate and apply type filter
      if (typeParam) {
        const validTypes = ['voice', 'brand', 'style', 'instructions']
        if (validTypes.includes(typeParam)) {
          const type = typeParam as 'voice' | 'brand' | 'style' | 'instructions'
          query = query.eq('type', type)
        } else {
          return createErrorResponse(400, `Invalid type. Must be one of: ${validTypes.join(', ')}`)
        }
      }

      if (tier) {
        const validTiers = ['system', 'agency', 'client', 'user']
        if (validTiers.includes(tier)) {
          const validTier = tier as 'system' | 'agency' | 'client' | 'user'
          query = query.eq('tier', validTier)
        } else {
          return createErrorResponse(400, `Invalid tier. Must be one of: ${validTiers.join(', ')}`)
        }
      }

      const { data: cartridges, error, count } = await query

      if (error) {
        console.error('[Cartridges GET] Query error:', error)
        return createErrorResponse(500, 'Failed to fetch cartridges')
      }

      return NextResponse.json({
        success: true,
        data: cartridges || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
          hasMore: offset + limit < (count || 0),
        },
      })
    } catch (error) {
      console.error('[Cartridges GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/cartridges - Create a new cartridge
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const body = await request.json()
      const { name, type, tier, description, client_id, voice_tone, voice_style, voice_personality, voice_vocabulary } = body

      // Validate required fields
      if (!name || !type) {
        return NextResponse.json(
          { error: 'name and type are required' },
          { status: 400 }
        )
      }

      // Validate type
      if (!['voice', 'brand', 'style', 'instructions'].includes(type)) {
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        )
      }

      const insertData: any = {
        name,
        description,
        type,
        tier: tier || 'agency',
        agency_id: request.user.agencyId,
        created_by: request.user.id,
      }

      // Add tier-specific fields
      if (tier === 'client' && client_id) {
        insertData.client_id = client_id
      } else if (tier === 'user') {
        insertData.user_id = request.user.id
      }

      // Add voice fields
      if (voice_tone) insertData.voice_tone = voice_tone
      if (voice_style) insertData.voice_style = voice_style
      if (voice_personality) insertData.voice_personality = voice_personality
      if (voice_vocabulary) insertData.voice_vocabulary = voice_vocabulary

      const { error: createError } = await supabase
        .from('cartridges')
        .insert([insertData])

      if (createError) {
        console.error('[Cartridges POST] INSERT error:', createError)
        return NextResponse.json(
          { error: createError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Cartridge created successfully',
      }, { status: 201 })
    } catch (error) {
      console.error('[Cartridges POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
