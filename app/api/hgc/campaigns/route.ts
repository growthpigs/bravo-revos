import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/hgc/campaigns
 * Get campaign metrics for HGC agent
 * Query params: campaign_id (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Query campaigns with metrics - RLS filters to user's campaigns
    let query = supabase
      .from('campaign')
      .select(`
        id,
        name,
        description,
        status,
        created_at,
        post_template,
        trigger_word,
        dm_template_step1,
        dm_template_step2,
        lead_magnet_source,
        webhook_config_id
      `)

    // Filter by specific campaign if provided
    if (campaignId) {
      query = query.eq('id', campaignId)
    }

    const { data: campaigns, error: campaignsError } = await query

    if (campaignsError) {
      return NextResponse.json(
        { error: `Failed to fetch campaigns: ${campaignsError.message}` },
        { status: 400 }
      )
    }

    // For each campaign, fetch performance metrics
    const campaignsWithMetrics = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // Count leads generated
        const { count: leadsCount } = await supabase
          .from('lead')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)

        // Count posts created
        const { count: postsCount } = await supabase
          .from('post')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)

        return {
          ...campaign,
          metrics: {
            leads_generated: leadsCount || 0,
            posts_created: postsCount || 0,
            status: campaign.status,
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      campaigns: campaignsWithMetrics,
      count: campaignsWithMetrics.length,
    })
  } catch (error) {
    console.error('[HGC_CAMPAIGNS_API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
