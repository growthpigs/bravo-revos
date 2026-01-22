"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import {
  calculateAllKPIs,
  fetchTrends,
} from "@/lib/services/kpi-service"
import {
  fetchDashboardData,
  calculateActiveOnboardings,
  calculateAtRiskClients,
  calculateSupportHours,
  calculateAvgInstallTime,
} from "@/lib/services/dashboard-queries"
import { createClient, getAuthenticatedUser } from "@/lib/supabase"
import type { TimePeriod, DashboardKPIs, DashboardTrends, RefreshState } from "@/types/dashboard"
import type { Database } from "@/types/database"

type Client = Database['public']['Tables']['client']['Row']
type Ticket = Database['public']['Tables']['ticket']['Row']
type StageEvent = Database['public']['Tables']['stage_event']['Row']

interface UseDashboardReturn {
  // State
  kpis: DashboardKPIs | null
  kpisLoading: boolean
  kpisError: string | null
  trends: DashboardTrends | null
  trendsLoading: boolean
  trendsError: string | null
  selectedPeriod: TimePeriod
  refresh: RefreshState
  realtimeConnected: boolean
  isUsingRealData: boolean

  // Actions
  setSelectedPeriod: (period: TimePeriod) => void
  refreshDashboard: () => Promise<void>
}

export function useDashboard(): UseDashboardReturn {
  const [isUsingRealData, setIsUsingRealData] = useState(false)
  const supabase = createClient()

  const {
    kpis,
    kpisLoading,
    kpisError,
    trends,
    trendsLoading,
    trendsError,
    selectedPeriod,
    refresh,
    realtimeConnected,
    setKPIs,
    setKPIsLoading,
    setKPIsError,
    setTrends,
    setTrendsLoading,
    setTrendsError,
    setSelectedPeriod,
    setRefreshState,
    setRealtimeConnected,
  } = useDashboardStore()

  const loadKPIs = useCallback(async (forceRefresh = false) => {
    setKPIsLoading(true)
    try {
      // Try to get authenticated user with timeout (5s max)
      let user = null
      let agencyId: string | null = null

      try {
        const authPromise = getAuthenticatedUser(supabase)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        const authResult = await Promise.race([authPromise, timeoutPromise])
        user = authResult.user
        agencyId = authResult.agencyId
      } catch {
        // Auth failed or timed out - silently fall back to mock data
      }

      let clients: Client[]
      let tickets: Ticket[]
      let stageEvents: StageEvent[]
      let usingReal = false

      if (user && agencyId) {
        // Fetch real data from Supabase
        const dashboardData = await fetchDashboardData(supabase, agencyId, 90)
        clients = dashboardData.clients
        tickets = dashboardData.tickets
        stageEvents = dashboardData.stageEvents
        usingReal = clients.length > 0
        setIsUsingRealData(usingReal)
      } else {
        // Not authenticated - use empty data
        clients = []
        tickets = []
        stageEvents = []
        setIsUsingRealData(false)
      }

      const kpisData = await calculateAllKPIs(
        agencyId || "mock-agency",
        clients,
        tickets,
        stageEvents,
        forceRefresh
      )

      // If using real data, override KPI values
      if (usingReal) {
        const activeOnboardings = calculateActiveOnboardings(clients)
        const atRiskClients = calculateAtRiskClients(clients)
        const supportHours = calculateSupportHours(tickets)
        const avgInstallTime = calculateAvgInstallTime(stageEvents, clients)

        kpisData.activeOnboardings = {
          ...kpisData.activeOnboardings,
          value: activeOnboardings,
          displayValue: String(activeOnboardings),
        }
        kpisData.atRiskClients = {
          ...kpisData.atRiskClients,
          value: atRiskClients,
          displayValue: String(atRiskClients),
        }
        kpisData.supportHoursWeek = {
          ...kpisData.supportHoursWeek,
          value: supportHours,
          displayValue: `${supportHours}h`,
        }
        kpisData.avgInstallTime = {
          ...kpisData.avgInstallTime,
          value: avgInstallTime,
          displayValue: avgInstallTime === 0 ? '0 Days' : `${avgInstallTime} Days`,
        }
      }

      setKPIs(kpisData)
      // Note: setKPIs already sets kpisLoading: false in the store
    } catch (error) {
      console.error('[use-dashboard] loadKPIs error:', error)
      setKPIsError(error instanceof Error ? error.message : "Failed to load KPIs")
      setIsUsingRealData(false)
      // Note: setKPIsError already sets kpisLoading: false in the store
    }
  }, [supabase, setKPIs, setKPIsLoading, setKPIsError])

  const loadTrends = useCallback(async (period: TimePeriod, forceRefresh = false) => {
    setTrendsLoading(true)
    try {
      // Try to get authenticated user with timeout (5s max)
      let agencyId: string | null = null
      try {
        const authPromise = getAuthenticatedUser(supabase)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        const authResult = await Promise.race([authPromise, timeoutPromise])
        agencyId = authResult.agencyId
      } catch {
        // Auth failed or timed out - use empty data
      }

      let stageEvents: StageEvent[] = []

      if (agencyId) {
        const dashboardData = await fetchDashboardData(supabase, agencyId, 90)
        stageEvents = dashboardData.stageEvents
      }

      const trendsData = await fetchTrends(
        agencyId || "no-agency",
        stageEvents,
        period,
        forceRefresh
      )
      setTrends(trendsData)
      // Note: setTrends already sets trendsLoading: false in the store
    } catch (error) {
      console.error('[use-dashboard] loadTrends error:', error)
      setTrendsError(error instanceof Error ? error.message : "Failed to load trends")
      // Note: setTrendsError already sets trendsLoading: false in the store
    }
  }, [supabase, setTrends, setTrendsLoading, setTrendsError])

  const refreshDashboard = useCallback(async () => {
    setRefreshState({ isRefreshing: true, error: null })
    try {
      await Promise.all([
        loadKPIs(true),
        loadTrends(selectedPeriod, true),
      ])
      setRefreshState({
        isRefreshing: false,
        lastRefreshed: new Date().toISOString(),
        error: null,
      })
    } catch (error) {
      setRefreshState({
        isRefreshing: false,
        error: error instanceof Error ? error.message : "Failed to refresh",
      })
    }
  }, [loadKPIs, loadTrends, selectedPeriod, setRefreshState])

  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period)
    loadTrends(period)
  }, [setSelectedPeriod, loadTrends])

  // Track if initial load has happened (true mount-only behavior)
  const hasInitializedRef = useRef(false)

  // Initial load - runs once on mount using ref guard
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    loadKPIs()
    loadTrends(selectedPeriod)
    setRealtimeConnected(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: mount-only effect guarded by ref
  }, [])

  return {
    kpis,
    kpisLoading,
    kpisError,
    trends,
    trendsLoading,
    trendsError,
    selectedPeriod,
    refresh,
    realtimeConnected,
    isUsingRealData,
    setSelectedPeriod: handlePeriodChange,
    refreshDashboard,
  }
}
