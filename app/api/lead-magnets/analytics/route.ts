import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Total custom magnets count - RLS filters to user's magnets
    const { count: customMagnetsCount } = await supabase
      .from('lead_magnet')
      .select('*', { count: 'exact', head: true })

    // 2. Total downloads sum - RLS filters to user's magnets
    const { data: downloadData } = await supabase
      .from('lead_magnet')
      .select('download_count')

    const totalDownloads = downloadData?.reduce((sum, m) => sum + (m.download_count || 0), 0) || 0

    // 3. Most popular custom magnet - RLS filters to user's magnets
    const { data: mostPopular } = await supabase
      .from('lead_magnet')
      .select('id, name, download_count')
      .order('download_count', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 4. Active campaigns using lead magnets - RLS filters to user's campaigns
    const { count: activeCampaignsCount } = await supabase
      .from('campaign')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .or('lead_magnet_id.not.is.null,library_magnet_id.not.is.null')

    // 5. Campaign usage per custom magnet - RLS filters to user's campaigns
    const { data: campaignUsage } = await supabase
      .from('campaign')
      .select('lead_magnet_id')
      .eq('lead_magnet_source', 'custom')
      .not('lead_magnet_id', 'is', null)

    // Count campaigns per magnet
    const usageMap: Record<string, number> = {}
    campaignUsage?.forEach(c => {
      if (c.lead_magnet_id) {
        usageMap[c.lead_magnet_id] = (usageMap[c.lead_magnet_id] || 0) + 1
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        customMagnetsCount: customMagnetsCount || 0,
        totalDownloads,
        mostPopular: mostPopular || null,
        activeCampaignsCount: activeCampaignsCount || 0,
        campaignUsageMap: usageMap
      }
    })
  } catch (error) {
    console.error('[LEAD_MAGNETS_ANALYTICS] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
