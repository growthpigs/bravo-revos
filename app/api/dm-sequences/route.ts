import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ok,
  badRequest,
  forbidden,
  requireAuth,
  requireAuthAndValidate,
} from '@/lib/api'

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
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

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
    return badRequest(sequencesError.message)
  }

  return ok({
    sequences,
    count: sequences?.length || 0,
  })
}

export async function POST(request: NextRequest) {
  const result = await requireAuthAndValidate(request, dmSequenceCreateSchema)
  if (result instanceof NextResponse) return result
  const { supabase, data: validatedData } = result

  // Verify campaign exists - RLS ensures user can only access their own campaigns
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', validatedData.campaign_id)
    .maybeSingle()

  if (campaignError || !campaign) {
    return forbidden('Campaign not found or access denied')
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
    return badRequest(`Failed to create DM sequence: ${sequenceError.message}`)
  }

  console.log('[DM_SEQUENCES_API] DM sequence created successfully:', sequence.id)

  return ok({ sequence })
}
