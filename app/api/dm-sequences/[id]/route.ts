import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const dmSequenceUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  step1_template: z.string().min(1).optional(),
  step1_delay_min: z.number().int().min(1).optional(),
  step1_delay_max: z.number().int().min(1).optional(),
  voice_cartridge_id: z.string().uuid().optional().nullable(),
  step2_auto_extract: z.boolean().optional(),
  step2_confirmation_template: z.string().optional(),
  step3_enabled: z.boolean().optional(),
  step3_delay: z.number().int().min(1).optional(),
  step3_template: z.string().optional(),
  step3_link_expiry: z.number().int().min(1).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 400 }
      )
    }

    // Fetch sequence with client isolation
    const { data: sequence, error: sequenceError } = await supabase
      .from('dm_sequences')
      .select('*')
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .maybeSingle()

    if (sequenceError) {
      return NextResponse.json(
        { error: sequenceError.message },
        { status: 400 }
      )
    }

    if (!sequence) {
      return NextResponse.json(
        { error: 'DM sequence not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sequence,
    })
  } catch (error) {
    console.error('[DM_SEQUENCES_API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 400 }
      )
    }

    // Verify sequence exists and belongs to client
    const { data: existingSequence, error: fetchError } = await supabase
      .from('dm_sequences')
      .select('id, client_id')
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .maybeSingle()

    if (fetchError || !existingSequence) {
      return NextResponse.json(
        { error: 'DM sequence not found or access denied' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()

    let validatedData
    try {
      validatedData = dmSequenceUpdateSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Update sequence
    const { data: sequence, error: updateError } = await supabase
      .from('dm_sequences')
      .update(validatedData)
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .select()
      .single()

    if (updateError) {
      console.error('[DM_SEQUENCES_API] UPDATE error:', updateError)
      return NextResponse.json(
        { error: `Failed to update DM sequence: ${updateError.message}` },
        { status: 400 }
      )
    }

    console.log('[DM_SEQUENCES_API] DM sequence updated successfully:', sequence.id)

    return NextResponse.json({
      success: true,
      data: sequence,
    })
  } catch (error) {
    console.error('[DM_SEQUENCES_API] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 400 }
      )
    }

    // Delete sequence with client isolation
    const { error: deleteError } = await supabase
      .from('dm_sequences')
      .delete()
      .eq('id', params.id)
      .eq('client_id', userData.client_id)

    if (deleteError) {
      console.error('[DM_SEQUENCES_API] DELETE error:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete DM sequence: ${deleteError.message}` },
        { status: 400 }
      )
    }

    console.log('[DM_SEQUENCES_API] DM sequence deleted successfully:', params.id)

    return NextResponse.json({
      success: true,
      message: 'DM sequence deleted successfully',
    })
  } catch (error) {
    console.error('[DM_SEQUENCES_API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
