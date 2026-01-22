import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  DashboardState,
  DashboardKPIs,
  DashboardTrends,
  RefreshState,
  TimePeriod,
  KPIType,
  KPI,
} from '@/types/dashboard'

const initialRefreshState: RefreshState = {
  isRefreshing: false,
  lastRefreshed: null,
  nextRefreshAt: null,
  error: null,
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      kpis: null,
      kpisLoading: false,
      kpisError: null,
      trends: null,
      trendsLoading: false,
      trendsError: null,
      selectedPeriod: 30,
      refresh: initialRefreshState,
      realtimeConnected: false,

      // Actions
      setKPIs: (kpis: DashboardKPIs) =>
        set({
          kpis,
          kpisLoading: false,
          kpisError: null,
          refresh: {
            ...get().refresh,
            lastRefreshed: new Date().toISOString(),
            isRefreshing: false,
          },
        }),

      setKPIsLoading: (loading: boolean) =>
        set({ kpisLoading: loading }),

      setKPIsError: (error: string | null) =>
        set({
          kpisError: error,
          kpisLoading: false,
          refresh: {
            ...get().refresh,
            isRefreshing: false,
            error,
          },
        }),

      setTrends: (trends: DashboardTrends) =>
        set({
          trends,
          trendsLoading: false,
          trendsError: null,
        }),

      setTrendsLoading: (loading: boolean) =>
        set({ trendsLoading: loading }),

      setTrendsError: (error: string | null) =>
        set({
          trendsError: error,
          trendsLoading: false,
        }),

      setSelectedPeriod: (period: TimePeriod) =>
        set({ selectedPeriod: period }),

      setRefreshState: (refresh: Partial<RefreshState>) =>
        set((state) => ({
          refresh: { ...state.refresh, ...refresh },
        })),

      setRealtimeConnected: (connected: boolean) =>
        set({ realtimeConnected: connected }),

      updateSingleKPI: (kpiType: KPIType, updates: Partial<KPI>) => {
        const { kpis } = get()
        if (!kpis) return

        const kpiKeyMap: Record<KPIType, keyof DashboardKPIs> = {
          active_onboardings: 'activeOnboardings',
          at_risk_clients: 'atRiskClients',
          support_hours: 'supportHoursWeek',
          avg_install_time: 'avgInstallTime',
          clients_needing_attention: 'clientsNeedingAttention',
        }

        const key = kpiKeyMap[kpiType]
        if (!key) return

        set({
          kpis: {
            ...kpis,
            [key]: { ...kpis[key], ...updates },
          },
        })
      },

      reset: () =>
        set({
          kpis: null,
          kpisLoading: false,
          kpisError: null,
          trends: null,
          trendsLoading: false,
          trendsError: null,
          selectedPeriod: 30,
          refresh: initialRefreshState,
          realtimeConnected: false,
        }),

      // API Actions
      fetchKPIs: async () => {
        set({ kpisLoading: true, kpisError: null })

        try {
          const response = await fetch('/api/v1/dashboard/kpis', { credentials: 'include' })

          if (!response.ok) {
            throw new Error('Failed to fetch KPIs')
          }

          const { data } = await response.json()
          set({
            kpis: data,
            kpisLoading: false,
            kpisError: null,
            refresh: {
              ...get().refresh,
              lastRefreshed: new Date().toISOString(),
              isRefreshing: false,
            },
          })
        } catch (error) {
          set({
            kpisError: error instanceof Error ? error.message : 'Failed to fetch KPIs',
            kpisLoading: false,
          })
        }
      },

      fetchTrends: async (period?: TimePeriod) => {
        const selectedPeriod = period || get().selectedPeriod
        set({ trendsLoading: true, trendsError: null })

        try {
          const response = await fetch(`/api/v1/dashboard/trends?period=${selectedPeriod}`, { credentials: 'include' })

          if (!response.ok) {
            throw new Error('Failed to fetch trends')
          }

          const { data } = await response.json()
          set({
            trends: data,
            trendsLoading: false,
            trendsError: null,
            selectedPeriod,
          })
        } catch (error) {
          set({
            trendsError: error instanceof Error ? error.message : 'Failed to fetch trends',
            trendsLoading: false,
          })
        }
      },

      refreshAll: async () => {
        set((state) => ({
          refresh: { ...state.refresh, isRefreshing: true },
        }))

        await Promise.all([
          get().fetchKPIs(),
          get().fetchTrends(),
        ])
      },
    }),
    { name: 'dashboard-store' }
  )
)
