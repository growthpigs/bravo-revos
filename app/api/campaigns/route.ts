import { NextRequest, NextResponse } from 'next/server'
import {
  ok,
  badRequest,
  requireAuth,
  requireAuthAndValidate,
} from '@/lib/api'
import { campaignCreateSchema } from '@/lib/validations/campaign'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // RLS automatically filters to user's campaigns
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (campaignsError) {
    return badRequest(campaignsError.message)
  }

  return ok({
    campaigns,
    count: campaigns?.length || 0,
  })
}

export async function POST(request: NextRequest) {
  const result = await requireAuthAndValidate(request, campaignCreateSchema)
  if (result instanceof NextResponse) return result
  const { user, supabase, data: validatedData } = result

  console.log('[CAMPAIGNS_API] Creating campaign for user:', user.id)

  // Get user's client_id (REQUIRED for RLS)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.client_id) {
    console.error('[CAMPAIGNS_API] User client_id not found:', userError)
    return badRequest('User profile incomplete - missing client assignment')
  }

  console.log('[CAMPAIGNS_API] User client_id:', userData.client_id)

  // Get user's default pod (first active pod membership)
  let defaultPodId: string | null = null
  const { data: podMemberships } = await supabase
    .from('pod_members')
    .select('pod_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (podMemberships && podMemberships.length > 0) {
    defaultPodId = podMemberships[0].pod_id
    console.log('[CAMPAIGNS_API] Found user default pod:', defaultPodId)
  } else {
    console.log('[CAMPAIGNS_API] No pod membership found for user')
  }

  // Determine lead magnet source
  let leadMagnetSource: 'library' | 'custom' | 'none' = 'none'
  if (validatedData.libraryId) {
    leadMagnetSource = 'library'
  } else if (validatedData.isCustom && validatedData.leadMagnetTitle) {
    leadMagnetSource = 'custom'
  }

  // Prepare campaign data - client_id is REQUIRED for RLS
  const campaignData = {
    client_id: userData.client_id, // REQUIRED: RLS checks this field
    created_by: user.id,
    user_id: user.id,
    name: validatedData.name,
    description: validatedData.description || null,
    status: validatedData.status,

    // Pod assignment (auto-assign user's default pod)
    pod_id: defaultPodId,

    // Lead magnet
    lead_magnet_source: leadMagnetSource,
    library_magnet_id: validatedData.libraryId || null,

    // Content
    post_template: validatedData.postContent,
    trigger_word: validatedData.triggerWords.join(', '), // Keep for backward compatibility
    trigger_words: validatedData.triggerWords, // JSONB[] - Supabase handles conversion

    // DM Sequence
    dm_template_step1: validatedData.dm1,
    dm_template_step2: validatedData.dm2 || null,
  }

  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert(campaignData)
    .select()
    .single()

  if (campaignError) {
    console.error('[CAMPAIGNS_API] INSERT error:', campaignError)
    return badRequest(`Failed to create campaign: ${campaignError.message}`)
  }

  console.log('[CAMPAIGNS_API] Campaign created successfully:', campaign.id)

  // If webhook enabled, create webhook config
  if (validatedData.webhookEnabled && validatedData.webhookUrl) {
    console.log('[CAMPAIGNS_API] Creating webhook config')

    const { data: webhookConfig, error: webhookError } = await supabase
      .from('webhook_configs')
      .insert({
        client_id: userData.client_id,
        name: `${validatedData.name} - Webhook`,
        url: validatedData.webhookUrl,
        esp_type: validatedData.webhookType || 'custom',
        active: true,
      })
      .select()
      .single()

    if (webhookError) {
      console.error('[CAMPAIGNS_API] Webhook creation error:', webhookError)
      // Don't fail the entire request, just log the error
    } else {
      // Update campaign with webhook_config_id
      await supabase
        .from('campaigns')
        .update({ webhook_config_id: webhookConfig.id })
        .eq('id', campaign.id)

      console.log('[CAMPAIGNS_API] Webhook config created:', webhookConfig.id)
    }
  }

  return ok({ campaign })
}
