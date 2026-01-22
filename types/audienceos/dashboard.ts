/**
 * Dashboard Types
 * KPI, trends, and dashboard state types
 */

// KPI trend direction
export type TrendDirection = 'up' | 'down' | 'stable'

// Individual KPI data
export interface KPI {
  id: string
  label: string
  value: number
  displayValue: string // Formatted for display (e.g., "5.2 Days", "12h")
  trend: TrendDirection
  changePercent: number
  previousValue: number
  drillDownUrl: string | null
  lastUpdated: string
  isLoading?: boolean
  error?: string | null
}

// KPI identifiers
export type KPIType =
  | 'active_onboardings'
  | 'at_risk_clients'
  | 'support_hours'
  | 'avg_install_time'
  | 'clients_needing_attention'

// Dashboard KPIs response
export interface DashboardKPIs {
  activeOnboardings: KPI
  atRiskClients: KPI
  supportHoursWeek: KPI
  avgInstallTime: KPI
  clientsNeedingAttention: KPI
}

// Time period for charts
export type TimePeriod = 7 | 30 | 90

// Trend data point for charts
export interface TrendDataPoint {
  date: string
  newClients: number
  completedInstalls: number
}

// Trends API response
export interface DashboardTrends {
  data: TrendDataPoint[]
  period: TimePeriod
  lastUpdated: string
}

// Dashboard refresh state
export interface RefreshState {
  isRefreshing: boolean
  lastRefreshed: string | null
  nextRefreshAt: string | null
  error: string | null
}

// Dashboard store state
export interface DashboardState {
  // KPIs
  kpis: DashboardKPIs | null
  kpisLoading: boolean
  kpisError: string | null

  // Trends/Charts
  trends: DashboardTrends | null
  trendsLoading: boolean
  trendsError: string | null
  selectedPeriod: TimePeriod

  // Refresh state
  refresh: RefreshState

  // Real-time subscription status
  realtimeConnected: boolean

  // Actions
  setKPIs: (kpis: DashboardKPIs) => void
  setKPIsLoading: (loading: boolean) => void
  setKPIsError: (error: string | null) => void
  setTrends: (trends: DashboardTrends) => void
  setTrendsLoading: (loading: boolean) => void
  setTrendsError: (error: string | null) => void
  setSelectedPeriod: (period: TimePeriod) => void
  setRefreshState: (refresh: Partial<RefreshState>) => void
  setRealtimeConnected: (connected: boolean) => void
  updateSingleKPI: (kpiType: KPIType, value: Partial<KPI>) => void
  reset: () => void

  // API Actions
  fetchKPIs: () => Promise<void>
  fetchTrends: (period?: TimePeriod) => Promise<void>
  refreshAll: () => Promise<void>
}

// API request/response types
export interface FetchKPIsRequest {
  agencyId: string
  forceRefresh?: boolean
}

export interface FetchTrendsRequest {
  agencyId: string
  period: TimePeriod
}

// Cache metadata
export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}
