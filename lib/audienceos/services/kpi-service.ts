/**
 * KPI Calculation Service
 * Handles all dashboard KPI calculations with caching support
 */

import type {
  KPI,
  DashboardKPIs,
  TrendDirection,
  TimePeriod,
  TrendDataPoint,
  DashboardTrends,
  CacheEntry,
} from '@/types/dashboard'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['client']['Row']
type Ticket = Database['public']['Tables']['ticket']['Row']
type StageEvent = Database['public']['Tables']['stage_event']['Row']

// Cache configuration
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const cache = new Map<string, CacheEntry<unknown>>()

// Cache helpers
function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache<T>(key: string, data: T, durationMs = CACHE_DURATION_MS): void {
  const now = Date.now()
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + durationMs,
  })
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

// Trend calculation helper
function calculateTrend(current: number, previous: number): TrendDirection {
  if (previous === 0) return current > 0 ? 'up' : 'stable'
  const change = ((current - previous) / previous) * 100
  if (change > 5) return 'up'
  if (change < -5) return 'down'
  return 'stable'
}

function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// KPI Calculations
export function calculateActiveOnboardings(
  clients: Client[],
  previousPeriodClients?: Client[]
): KPI {
  const onboardingStages = ['Onboarding', 'Installation']
  const current = clients.filter(
    (c) => c.is_active && onboardingStages.includes(c.stage) && c.health_status !== 'red'
  ).length

  const previous = previousPeriodClients
    ? previousPeriodClients.filter(
        (c) => c.is_active && onboardingStages.includes(c.stage) && c.health_status !== 'red'
      ).length
    : current

  return {
    id: 'active_onboardings',
    label: 'Active Onboardings',
    value: current,
    displayValue: String(current),
    trend: calculateTrend(current, previous),
    changePercent: calculateChangePercent(current, previous),
    previousValue: previous,
    drillDownUrl: '/pipeline?stage=onboarding',
    lastUpdated: new Date().toISOString(),
  }
}

export function calculateAtRiskClients(
  clients: Client[],
  previousPeriodClients?: Client[]
): KPI {
  const current = clients.filter((c) => c.is_active && c.health_status === 'red').length

  const previous = previousPeriodClients
    ? previousPeriodClients.filter((c) => c.is_active && c.health_status === 'red').length
    : current

  // For at-risk, down is good (fewer at-risk)
  const trend = calculateTrend(current, previous)
  const adjustedTrend: TrendDirection = trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'stable'

  return {
    id: 'at_risk_clients',
    label: 'At-Risk Clients',
    value: current,
    displayValue: String(current),
    trend: adjustedTrend, // Inverted: fewer at-risk = up (good)
    changePercent: calculateChangePercent(current, previous),
    previousValue: previous,
    drillDownUrl: '/clients?health=red',
    lastUpdated: new Date().toISOString(),
  }
}

export function calculateSupportHoursWeek(
  tickets: Ticket[],
  previousPeriodTickets?: Ticket[]
): KPI {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const currentWeekTickets = tickets.filter((t) => new Date(t.created_at) >= weekAgo)
  const currentHours = currentWeekTickets.reduce(
    (sum, t) => sum + (t.time_spent_minutes || 0) / 60,
    0
  )

  const previousHours = previousPeriodTickets
    ? previousPeriodTickets.reduce((sum, t) => sum + (t.time_spent_minutes || 0) / 60, 0)
    : currentHours

  const roundedHours = Math.round(currentHours * 10) / 10

  // For support hours, down is good (less time spent)
  const trend = calculateTrend(currentHours, previousHours)
  const adjustedTrend: TrendDirection = trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'stable'

  return {
    id: 'support_hours',
    label: 'Support Hours This Week',
    value: roundedHours,
    displayValue: `${roundedHours}h`,
    trend: adjustedTrend, // Inverted: less support hours = up (good)
    changePercent: calculateChangePercent(currentHours, previousHours),
    previousValue: Math.round(previousHours * 10) / 10,
    drillDownUrl: '/tickets?timeframe=week',
    lastUpdated: new Date().toISOString(),
  }
}

export function calculateAvgInstallTime(
  stageEvents: StageEvent[],
  previousPeriodEvents?: StageEvent[]
): KPI {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Find clients that went Live in the last 30 days
  const recentLiveEvents = stageEvents.filter(
    (e) => e.to_stage === 'Live' && new Date(e.moved_at) >= thirtyDaysAgo
  )

  // Calculate install time for each client
  const installTimes: number[] = []
  for (const liveEvent of recentLiveEvents) {
    // Find the first onboarding event for this client
    const onboardingEvent = stageEvents.find(
      (e) =>
        e.client_id === liveEvent.client_id &&
        (e.from_stage === null || e.to_stage === 'Onboarding')
    )

    if (onboardingEvent) {
      const startDate = new Date(onboardingEvent.moved_at)
      const endDate = new Date(liveEvent.moved_at)
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      if (days > 0) {
        installTimes.push(days)
      }
    }
  }

  const currentAvg =
    installTimes.length > 0
      ? Math.round((installTimes.reduce((a, b) => a + b, 0) / installTimes.length) * 10) / 10
      : 0

  // Calculate previous period average
  let previousAvg = currentAvg
  if (previousPeriodEvents && previousPeriodEvents.length > 0) {
    const prevLiveEvents = previousPeriodEvents.filter((e) => e.to_stage === 'Live')
    const prevInstallTimes: number[] = []
    for (const liveEvent of prevLiveEvents) {
      const onboardingEvent = previousPeriodEvents.find(
        (e) =>
          e.client_id === liveEvent.client_id &&
          (e.from_stage === null || e.to_stage === 'Onboarding')
      )
      if (onboardingEvent) {
        const days = Math.ceil(
          (new Date(liveEvent.moved_at).getTime() - new Date(onboardingEvent.moved_at).getTime()) /
            (24 * 60 * 60 * 1000)
        )
        if (days > 0) {
          prevInstallTimes.push(days)
        }
      }
    }
    if (prevInstallTimes.length > 0) {
      previousAvg =
        Math.round(
          (prevInstallTimes.reduce((a, b) => a + b, 0) / prevInstallTimes.length) * 10
        ) / 10
    }
  }

  // For install time, down is good (faster installs)
  const trend = calculateTrend(currentAvg, previousAvg)
  const adjustedTrend: TrendDirection = trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'stable'

  return {
    id: 'avg_install_time',
    label: 'Avg Install Time',
    value: currentAvg,
    displayValue: `${currentAvg} Days`,
    trend: adjustedTrend, // Inverted: faster = up (good)
    changePercent: calculateChangePercent(currentAvg, previousAvg),
    previousValue: previousAvg,
    drillDownUrl: '/clients?stage=live&sort=install_time',
    lastUpdated: new Date().toISOString(),
  }
}

export function calculateClientsNeedingAttention(
  clients: Client[],
  previousPeriodClients?: Client[]
): KPI {
  // Clients needing attention: red/yellow health OR in stage too long (>7 days)
  const DAYS_THRESHOLD = 7

  const needsAttention = (c: Client) =>
    c.is_active &&
    (c.health_status === 'red' ||
      c.health_status === 'yellow' ||
      c.days_in_stage > DAYS_THRESHOLD)

  const current = clients.filter(needsAttention).length
  const previous = previousPeriodClients
    ? previousPeriodClients.filter(needsAttention).length
    : current

  // Down is good (fewer clients needing attention)
  const trend = calculateTrend(current, previous)
  const adjustedTrend: TrendDirection = trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'stable'

  return {
    id: 'clients_needing_attention',
    label: 'Clients Needing Attention',
    value: current,
    displayValue: String(current),
    trend: adjustedTrend,
    changePercent: calculateChangePercent(current, previous),
    previousValue: previous,
    drillDownUrl: '/clients?needs_attention=true',
    lastUpdated: new Date().toISOString(),
  }
}

// Main KPI calculation function
export async function calculateAllKPIs(
  agencyId: string,
  clients: Client[],
  tickets: Ticket[],
  stageEvents: StageEvent[],
  forceRefresh = false
): Promise<DashboardKPIs> {
  const cacheKey = `kpis:${agencyId}`

  if (!forceRefresh) {
    const cached = getCached<DashboardKPIs>(cacheKey)
    if (cached) return cached
  }

  const kpis: DashboardKPIs = {
    activeOnboardings: calculateActiveOnboardings(clients),
    atRiskClients: calculateAtRiskClients(clients),
    supportHoursWeek: calculateSupportHoursWeek(tickets),
    avgInstallTime: calculateAvgInstallTime(stageEvents),
    clientsNeedingAttention: calculateClientsNeedingAttention(clients),
  }

  setCache(cacheKey, kpis)
  return kpis
}

// Trends calculation
export function calculateTrends(
  stageEvents: StageEvent[],
  period: TimePeriod
): DashboardTrends {
  const now = new Date()
  const startDate = new Date(now.getTime() - period * 24 * 60 * 60 * 1000)

  // Group events by date
  const dailyData = new Map<string, { newClients: number; completedInstalls: number }>()

  // Initialize all dates in the period
  for (let i = 0; i < period; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    dailyData.set(dateStr, { newClients: 0, completedInstalls: 0 })
  }

  // Count events
  for (const event of stageEvents) {
    const eventDate = new Date(event.moved_at)
    if (eventDate < startDate) continue

    const dateStr = eventDate.toISOString().split('T')[0]
    const dayData = dailyData.get(dateStr)
    if (!dayData) continue

    if (event.to_stage === 'Onboarding' && event.from_stage === null) {
      dayData.newClients++
    }
    if (event.to_stage === 'Live') {
      dayData.completedInstalls++
    }
  }

  // Convert to array
  const data: TrendDataPoint[] = Array.from(dailyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      newClients: counts.newClients,
      completedInstalls: counts.completedInstalls,
    }))

  return {
    data,
    period,
    lastUpdated: new Date().toISOString(),
  }
}

export async function fetchTrends(
  agencyId: string,
  stageEvents: StageEvent[],
  period: TimePeriod,
  forceRefresh = false
): Promise<DashboardTrends> {
  const cacheKey = `trends:${agencyId}:${period}`

  if (!forceRefresh) {
    const cached = getCached<DashboardTrends>(cacheKey)
    if (cached) return cached
  }

  const trends = calculateTrends(stageEvents, period)
  setCache(cacheKey, trends)
  return trends
}
