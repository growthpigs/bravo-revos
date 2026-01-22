/**
 * Dashboard Supabase Queries
 * Fetches real data for dashboard KPIs and charts
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['client']['Row']
type Ticket = Database['public']['Tables']['ticket']['Row']
type StageEvent = Database['public']['Tables']['stage_event']['Row']
type Integration = Database['public']['Tables']['integration']['Row']

export interface DashboardData {
  clients: Client[]
  tickets: Ticket[]
  stageEvents: StageEvent[]
  integrations: Integration[]
}

/**
 * Fetch all clients for an agency
 */
export async function fetchClients(
  supabase: SupabaseClient<Database>,
  agencyId: string
): Promise<Client[]> {
  const { data, error } = await supabase
    .from('client')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[dashboard-queries] fetchClients error:', error)
    return []
  }

  return data || []
}

/**
 * Fetch tickets for the last 30 days
 */
export async function fetchRecentTickets(
  supabase: SupabaseClient<Database>,
  agencyId: string
): Promise<Ticket[]> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('ticket')
    .select('*')
    .eq('agency_id', agencyId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[dashboard-queries] fetchRecentTickets error:', error)
    return []
  }

  return data || []
}

/**
 * Fetch stage events for chart data
 * @param days - Number of days to look back (7, 30, or 90)
 */
export async function fetchStageEvents(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  days: number = 90
): Promise<StageEvent[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('stage_event')
    .select('*')
    .eq('agency_id', agencyId)
    .gte('moved_at', startDate.toISOString())
    .order('moved_at', { ascending: true })

  if (error) {
    console.error('[dashboard-queries] fetchStageEvents error:', error)
    return []
  }

  return data || []
}

/**
 * Fetch integration status for API Uptime widget
 */
export async function fetchIntegrations(
  supabase: SupabaseClient<Database>,
  agencyId: string
): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('integration')
    .select('*')
    .eq('agency_id', agencyId)
    .order('provider', { ascending: true })

  if (error) {
    console.error('[dashboard-queries] fetchIntegrations error:', error)
    return []
  }

  return data || []
}

/**
 * Fetch all dashboard data in parallel
 */
export async function fetchDashboardData(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  chartDays: number = 90
): Promise<DashboardData> {
  const [clients, tickets, stageEvents, integrations] = await Promise.all([
    fetchClients(supabase, agencyId),
    fetchRecentTickets(supabase, agencyId),
    fetchStageEvents(supabase, agencyId, chartDays),
    fetchIntegrations(supabase, agencyId),
  ])

  return {
    clients,
    tickets,
    stageEvents,
    integrations,
  }
}

/**
 * Calculate active onboardings from real client data
 */
export function calculateActiveOnboardings(clients: Client[]): number {
  return clients.filter(
    (c) =>
      c.is_active &&
      ['Onboarding', 'Installation'].includes(c.stage || '') &&
      c.health_status !== 'red'
  ).length
}

/**
 * Calculate at-risk clients from real client data
 */
export function calculateAtRiskClients(clients: Client[]): number {
  return clients.filter(
    (c) => c.is_active && c.health_status === 'red'
  ).length
}

/**
 * Calculate support hours from tickets
 */
export function calculateSupportHours(tickets: Ticket[]): number {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const weeklyTickets = tickets.filter((t) => {
    const ticketDate = new Date(t.created_at)
    return ticketDate >= weekAgo
  })

  const totalMinutes = weeklyTickets.reduce(
    (sum, t) => sum + (t.time_spent_minutes || 0),
    0
  )

  return Math.round(totalMinutes / 60)
}

/**
 * Calculate average install time (days from Onboarding to Live)
 */
export function calculateAvgInstallTime(
  stageEvents: StageEvent[],
  _clients: Client[]
): number {
  // Find clients that went Live in the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const liveEvents = stageEvents.filter(
    (e) =>
      e.to_stage === 'Live' &&
      new Date(e.moved_at) >= thirtyDaysAgo
  )

  if (liveEvents.length === 0) return 0

  // Calculate days from first event to Live for each client
  const installTimes: number[] = []

  for (const liveEvent of liveEvents) {
    const clientEvents = stageEvents
      .filter((e) => e.client_id === liveEvent.client_id)
      .sort((a, b) => new Date(a.moved_at).getTime() - new Date(b.moved_at).getTime())

    if (clientEvents.length >= 2) {
      const firstEvent = clientEvents[0]
      const lastEvent = clientEvents[clientEvents.length - 1]
      const days = Math.ceil(
        (new Date(lastEvent.moved_at).getTime() - new Date(firstEvent.moved_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      installTimes.push(days)
    }
  }

  if (installTimes.length === 0) return 0

  return Math.round(
    installTimes.reduce((sum, days) => sum + days, 0) / installTimes.length
  )
}

/**
 * Get clients needing attention (at-risk or stuck)
 */
export function getClientsNeedingAttention(
  clients: Client[],
  stuckThresholdDays: number = 7
): Client[] {
  return clients.filter(
    (c) =>
      c.is_active &&
      (c.health_status === 'red' ||
        (c.days_in_stage || 0) > stuckThresholdDays)
  )
}

/**
 * Map integration status for API Uptime widget
 */
export function mapIntegrationStatus(integrations: Integration[]): Array<{
  name: string
  provider: string
  isConnected: boolean
  lastSync: string | null
}> {
  const providerNames: Record<string, string> = {
    meta_ads: 'Meta CAPI',
    google_ads: 'Google EC',
    slack: 'Slack',
    gmail: 'Gmail',
  }

  return integrations.map((i) => ({
    name: providerNames[i.provider] || i.provider,
    provider: i.provider,
    isConnected: i.is_connected,
    lastSync: i.last_sync_at,
  }))
}
