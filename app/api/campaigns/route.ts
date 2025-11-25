import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { campaignCreateSchema } from '@/lib/validations/campaign'
import { ZodError } from 'zod'

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

    // RLS automatically filters to user's campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (campaignsError) {
      return NextResponse.json(
        { error: campaignsError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: campaigns,
      count: campaigns?.length || 0,
    })
  } catch (error) {
    console.error('[CAMPAIGNS_API] GET error:', error)
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
      validatedData = campaignCreateSchema.parse(body)
    } catch (error) {
      if (error instanceof ZodError) {
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

    console.log('[CAMPAIGNS_API] Creating campaign for user:', user.id)

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

    // Prepare campaign data - both created_by and user_id set from authenticated user
    const campaignData = {
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
      // lead_magnet_id will be set later if custom magnet created

      // Content
      post_template: validatedData.postContent,
      trigger_word: validatedData.triggerWords.join(', '), // Store comma-separated for now

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
      return NextResponse.json(
        { error: `Failed to create campaign: ${campaignError.message}` },
        { status: 400 }
      )
    }

    console.log('[CAMPAIGNS_API] Campaign created successfully:', campaign.id)

    // FUTURE: If custom magnet with file upload, handle file storage
    // FUTURE: If webhook enabled, create webhook_config record

    // If webhook enabled, create webhook config
    if (validatedData.webhookEnabled && validatedData.webhookUrl) {
      console.log('[CAMPAIGNS_API] Creating webhook config')

      const { data: webhookConfig, error: webhookError } = await supabase
        .from('webhook_configs')
        .insert({
          client_id: user.id,
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

    return NextResponse.json({
      success: true,
      data: campaign,
    })
  } catch (error) {
    console.error('[CAMPAIGNS_API] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
