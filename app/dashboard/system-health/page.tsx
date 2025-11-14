import { createClient } from '@/lib/supabase/server'
import { ClientSystemHealthPage } from './client-page'

export const dynamic = 'force-dynamic'

export default async function SystemHealthPage() {
  const supabase = await createClient()

  // Get user and client
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user?.id || '')
    .single()

  // Get client-specific metrics
  const { count: campaignsCount } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', userData?.client_id || '')

  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', (await supabase
      .from('campaigns')
      .select('id')
      .eq('client_id', userData?.client_id || '')).data?.map(c => c.id) || [''])

  const { count: extractionsCount } = await supabase
    .from('email_extractions')
    .select('*', { count: 'exact', head: true })
    .in('lead_id', (await supabase
      .from('leads')
      .select('id')
      .in('campaign_id', (await supabase
        .from('campaigns')
        .select('id')
        .eq('client_id', userData?.client_id || '')).data?.map(c => c.id) || [''])).data?.map(l => l.id) || [''])

  const { count: extractionsSuccessCount } = await supabase
    .from('email_extractions')
    .select('*', { count: 'exact', head: true })
    .in('lead_id', (await supabase
      .from('leads')
      .select('id')
      .in('campaign_id', (await supabase
        .from('campaigns')
        .select('id')
        .eq('client_id', userData?.client_id || '')).data?.map(c => c.id) || [''])).data?.map(l => l.id) || [''])
    .eq('status', 'completed')

  const { count: linkedinAccountsCount } = await supabase
    .from('linkedin_accounts')
    .select('*', { count: 'exact', head: true })
    .in('user_id', (await supabase
      .from('users')
      .select('id')
      .eq('client_id', userData?.client_id || '')).data?.map(u => u.id) || [''])
    .eq('is_active', true)

  const clientMetrics = {
    campaignsCount: campaignsCount || 0,
    leadsCount: leadsCount || 0,
    extractionsSuccessRate: (extractionsCount || 0) > 0
      ? (((extractionsSuccessCount || 0) / (extractionsCount || 1)) * 100).toFixed(1)
      : '0.0',
    linkedinAccountsCount: linkedinAccountsCount || 0,
  }

  return <ClientSystemHealthPage clientMetrics={clientMetrics} />
}
