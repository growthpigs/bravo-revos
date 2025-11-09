/**
 * Create Cartridge from Generated Voice
 *
 * POST /api/cartridges/generate-from-voice
 * - Takes generated voice parameters
 * - Creates a new cartridge with those parameters
 * - Returns the created cartridge
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, voiceParams, description, tier = 'user', parentId, clientId, agencyId } = body

    // Validate inputs
    if (!name || !voiceParams) {
      return NextResponse.json(
        { error: 'Cartridge name and voice parameters required' },
        { status: 400 }
      )
    }

    // Validate voice_params structure
    const requiredKeys = ['tone', 'style', 'personality', 'vocabulary']
    const hasAllKeys = requiredKeys.every(key => voiceParams[key])
    if (!hasAllKeys) {
      return NextResponse.json(
        { error: `voice_params must contain: ${requiredKeys.join(', ')}` },
        { status: 400 }
      )
    }

    // Build insert data - always set user_id from auth context
    const insertData: any = {
      name,
      description: description || `Auto-generated from LinkedIn analysis`,
      tier,
      voice_params: voiceParams,
      is_active: true,
      created_by: user.id,
    }

    // Set ownership fields based on tier
    if (tier === 'agency' && agencyId) {
      insertData.agency_id = agencyId
    } else if (tier === 'client' && clientId) {
      insertData.client_id = clientId
    } else if (tier === 'user') {
      insertData.user_id = user.id // ✅ Force from auth, not request
    }

    // Optional parent reference
    if (parentId) {
      insertData.parent_id = parentId
    }

    // Create cartridge
    const { error } = await supabase
      .from('cartridges')
      .insert([insertData])

    if (error) {
      console.error('[API_CARTRIDGES_GEN] Cartridge creation error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create cartridge' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Cartridge "${name}" created successfully`,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API_CARTRIDGES_GEN] Caught error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create cartridge' },
      { status: 500 }
    )
  }
}