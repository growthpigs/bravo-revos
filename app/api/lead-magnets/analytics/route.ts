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

    // Get client_id
    const { data: userData } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!userData?.client_id) {
      return NextResponse.json({ error: 'No client associated' }, { status: 400 })
    }

    const clientId = userData.client_id

    // 1. Total custom magnets count
    const { count: customMagnetsCount } = await supabase
      .from('lead_magnets')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    // 2. Total downloads sum
    const { data: downloadData } = await supabase
      .from('lead_magnets')
      .select('download_count')
      .eq('client_id', clientId)

    const totalDownloads = downloadData?.reduce((sum, m) => sum + (m.download_count || 0), 0) || 0

    // 3. Most popular custom magnet
    const { data: mostPopular } = await supabase
      .from('lead_magnets')
      .select('id, name, download_count')
      .eq('client_id', clientId)
      .order('download_count', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 4. Active campaigns using lead magnets
    const { count: activeCampaignsCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'active')
      .or('lead_magnet_id.not.is.null,library_magnet_id.not.is.null')

    // 5. Campaign usage per custom magnet
    const { data: campaignUsage } = await supabase
      .from('campaigns')
      .select('lead_magnet_id')
      .eq('client_id', clientId)
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
