import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/hgc/linkedin
 * Get LinkedIn performance metrics for HGC agent
 * Query params: date_range (optional, defaults to '7d')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('date_range') || '7d'

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

    // Parse date range
    const daysMap: Record<string, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }
    const days = daysMap[dateRange] || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get campaigns for this client
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('client_id', userData.client_id)

    const campaignIds = campaigns?.map(c => c.id) || []

    if (campaignIds.length === 0) {
      return NextResponse.json({
        success: true,
        performance: {
          date_range: dateRange,
          posts_published: 0,
          total_leads: 0,
          total_dms_sent: 0,
          avg_conversion_rate: 0,
          top_performing_campaigns: [],
        }
      })
    }

    // Count posts in date range
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('created_at', startDate.toISOString())

    // Count leads generated
    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('created_at', startDate.toISOString())

    // Count DMs sent (from dm_queue)
    const { count: dmsCount } = await supabase
      .from('dm_queue')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .eq('status', 'sent')
      .gte('created_at', startDate.toISOString())

    // Get top performing campaigns by lead count
    const { data: topCampaigns } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        leads:leads(count)
      `)
      .in('id', campaignIds)
      .limit(5)

    const conversionRate = postsCount && leadsCount
      ? Math.round((leadsCount / postsCount) * 100 * 100) / 100
      : 0

    const performance = {
      date_range: dateRange,
      days_analyzed: days,
      posts_published: postsCount || 0,
      total_leads: leadsCount || 0,
      total_dms_sent: dmsCount || 0,
      avg_conversion_rate: conversionRate,
      top_performing_campaigns: (topCampaigns || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        leads: c.leads?.[0]?.count || 0,
      })).sort((a, b) => b.leads - a.leads),
    }

    return NextResponse.json({
      success: true,
      performance,
    })
  } catch (error) {
    console.error('[HGC_LINKEDIN_API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
