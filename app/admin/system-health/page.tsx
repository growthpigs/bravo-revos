import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SystemHealthClient } from './system-health-client'

export const dynamic = 'force-dynamic'

export default async function AdminSystemHealthPage() {
  const supabase = await createClient()

  // Get user and agency
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('user')
    .select('agency_id')
    .eq('id', user?.id || '')
    .single()

  // Get agency-scoped metrics
  const { count: clientsCount } = await supabase
    .from('client')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', userData?.agency_id || '')

  const { data: clients } = await supabase
    .from('client')
    .select('id')
    .eq('agency_id', userData?.agency_id || '')

  const clientIds = clients?.map(c => c.id) || []

  const { count: campaignsCount } = await supabase
    .from('campaign')
    .select('*', { count: 'exact', head: true })
    .in('client_id', clientIds.length > 0 ? clientIds : [''])

  const { count: usersCount } = await supabase
    .from('user')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', userData?.agency_id || '')

  // Get LinkedIn account status
  const { count: linkedinActiveCount } = await supabase
    .from('linkedin_account')
    .select('*', { count: 'exact', head: true })
    .in('user_id', (await supabase
      .from('user')
      .select('id')
      .eq('agency_id', userData?.agency_id || '')).data?.map(u => u.id) || [''])
    .eq('is_active', true)

  // Get pod activity stats (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: podsPending } = await supabase
    .from('pod_activity')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', (await supabase
      .from('campaign')
      .select('id')
      .in('client_id', clientIds.length > 0 ? clientIds : [''])).data?.map(c => c.id) || [''])
    .eq('status', 'pending')

  const { count: podsFailed } = await supabase
    .from('pod_activity')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', (await supabase
      .from('campaign')
      .select('id')
      .in('client_id', clientIds.length > 0 ? clientIds : [''])).data?.map(c => c.id) || [''])
    .eq('status', 'failed')
    .gte('created_at', oneDayAgo)

  const { count: podsTotal } = await supabase
    .from('pod_activity')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', (await supabase
      .from('campaign')
      .select('id')
      .in('client_id', clientIds.length > 0 ? clientIds : [''])).data?.map(c => c.id) || [''])
    .gte('created_at', oneDayAgo)

  const agencyMetrics = {
    clientsCount: clientsCount || 0,
    campaignsCount: campaignsCount || 0,
    usersCount: usersCount || 0,
    linkedinActiveCount: linkedinActiveCount || 0,
    podsPending: podsPending || 0,
    podsFailed: podsFailed || 0,
    podsTotal: podsTotal || 0,
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
        <p className="text-gray-600 mt-2">
          Agency-wide system monitoring and health status
        </p>
      </div>

      <SystemHealthClient agencyMetrics={agencyMetrics} />
    </div>
  )
}
