import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const campaignId = params.id

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Update campaign - RLS ensures user can only update their own
    const { data: updated, error: updateError } = await supabase
      .from('campaigns')
      .update(body)
      .eq('id', campaignId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update campaign: ${updateError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('[CAMPAIGNS_API] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const campaignId = params.id

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First fetch to get webhook_config_id - RLS ensures we can only see our own
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, webhook_config_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Delete webhook config if exists
    if (campaign.webhook_config_id) {
      await supabase
        .from('webhook_configs')
        .delete()
        .eq('id', campaign.webhook_config_id)
    }

    // Delete campaign - RLS ensures user can only delete their own
    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete campaign: ${deleteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    })
  } catch (error) {
    console.error('[CAMPAIGNS_API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
