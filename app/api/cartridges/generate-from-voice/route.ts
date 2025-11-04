/**
 * Create Cartridge from Generated Voice
 *
 * POST /api/cartridges/generate-from-voice
 * - Takes generated voice parameters
 * - Creates a new cartridge with those parameters
 * - Returns the created cartridge
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, voiceParams, description, tier = 'user', parentId } = body

    // Validate inputs
    if (!name || !voiceParams) {
      return NextResponse.json(
        { error: 'Cartridge name and voice parameters required' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Create cartridge
    const { data: cartridge, error } = await supabase
      .from('cartridges')
      .insert({
        name,
        description: description || `Auto-generated from LinkedIn analysis`,
        tier,
        parent_id: parentId || null,
        voice_params: voiceParams,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Cartridge creation error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create cartridge' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      cartridge,
      message: `Cartridge "${name}" created successfully`,
    })
  } catch (error: any) {
    console.error('Cartridge creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create cartridge' },
      { status: 500 }
    )
  }
}