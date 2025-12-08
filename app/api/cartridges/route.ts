/**
 * Cartridges API
 *
 * GET /api/cartridges - List cartridges with optional filters
 * POST /api/cartridges - Create new cartridge
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  ok,
  badRequest,
  serverError,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const { searchParams } = new URL(request.url)

  // Build query
  let query = supabase
    .from('cartridges')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Apply SAFE filters (tier, agency, client filtering still allowed)
  const tier = searchParams.get('tier')
  const agencyId = searchParams.get('agency_id')
  const clientId = searchParams.get('client_id')
  // RLS handles user filtering automatically - no user_id param needed

  if (tier) query = query.eq('tier', tier)
  if (agencyId) query = query.eq('agency_id', agencyId)
  if (clientId) query = query.eq('client_id', clientId)

  const { data: cartridges, error } = await query

  if (error) {
    return serverError(error.message)
  }

  return ok({
    cartridges,
    count: cartridges?.length || 0,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const {
    name,
    description,
    tier,
    parent_id,
    agency_id,
    client_id,
    voice_params,
  } = body as Record<string, unknown>

  // Validate required fields
  if (!name || !tier) {
    return badRequest('name and tier are required')
  }

  // Validate tier
  if (!['system', 'agency', 'client', 'user'].includes(tier as string)) {
    return badRequest('Invalid tier. Must be: system, agency, client, or user')
  }

  // Validate voice_params structure if provided
  if (voice_params && typeof voice_params === 'object') {
    const params = voice_params as Record<string, unknown>
    const requiredKeys = ['tone', 'style', 'personality', 'vocabulary']
    const hasAllKeys = requiredKeys.every((key) => params[key])

    if (!hasAllKeys) {
      return badRequest(`voice_params must contain: ${requiredKeys.join(', ')}`)
    }
  }

  // Create cartridge - force user_id from auth context, not request body
  const insertData: Record<string, unknown> = {
    name,
    description,
    tier,
    voice_params: voice_params || {},
    created_by: user.id,
  }

  // Set ownership fields based on tier - ALWAYS use authenticated user for user tier
  if (tier === 'agency' && agency_id) {
    insertData.agency_id = agency_id
  } else if (tier === 'client' && client_id) {
    insertData.client_id = client_id
  } else if (tier === 'user') {
    insertData.user_id = user.id // Force from auth, not request
  }

  // Optional parent reference
  if (parent_id) {
    insertData.parent_id = parent_id
  }

  // Insert cartridge - RLS policy will validate during INSERT
  const { error: createError } = await supabase
    .from('cartridges')
    .insert([insertData])

  if (createError) {
    console.error('Cartridge INSERT error:', createError)
    return badRequest(createError.message)
  }

  // Return success - client can fetch via GET if needed
  return NextResponse.json(
    {
      success: true,
      message: 'Cartridge created successfully',
      cartridge: { ...insertData, id: 'generated-id-available-on-fetch' },
    },
    { status: 201 }
  )
}
