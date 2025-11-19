import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const dmSequenceCreateSchema = z.object({
  campaign_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  step1_template: z.string().min(1),
  step1_delay_min: z.number().int().min(1).default(2),
  step1_delay_max: z.number().int().min(1).default(15),
  voice_cartridge_id: z.string().uuid().optional().nullable(),
  step2_confirmation_template: z.string().default('Got it! Sending your lead magnet now...'),
  step3_enabled: z.boolean().default(true),
  step3_delay: z.number().int().min(1).default(5),
  step3_template: z.string().default('Here is your direct download link'),
  step3_link_expiry: z.number().int().min(1).default(24),
})

export async function GET(request: NextRequest) {
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

    // Get campaign_id from query params if provided
    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('campaign_id')

    // Build query - RLS enforces user access
    let query = supabase
      .from('dm_sequences')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by campaign if provided
    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data: sequences, error: sequencesError } = await query

    if (sequencesError) {
      return NextResponse.json(
        { error: sequencesError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sequences,
      count: sequences?.length || 0,
    })
  } catch (error) {
    console.error('[DM_SEQUENCES_API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()

    let validatedData
    try {
      validatedData = dmSequenceCreateSchema.parse(body)
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

    // Verify campaign exists - RLS ensures user can only access their own campaigns
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', validatedData.campaign_id)
      .maybeSingle()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 403 }
      )
    }

    // Create DM sequence
    const sequenceData = {
      ...validatedData,
      status: 'active',
    }

    const { data: sequence, error: sequenceError } = await supabase
      .from('dm_sequences')
      .insert(sequenceData)
      .select()
      .single()

    if (sequenceError) {
      console.error('[DM_SEQUENCES_API] INSERT error:', sequenceError)
      return NextResponse.json(
        { error: `Failed to create DM sequence: ${sequenceError.message}` },
        { status: 400 }
      )
    }

    console.log('[DM_SEQUENCES_API] DM sequence created successfully:', sequence.id)

    return NextResponse.json({
      success: true,
      data: sequence,
    })
  } catch (error) {
    console.error('[DM_SEQUENCES_API] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
