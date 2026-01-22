import { create } from 'zustand'
import { fetchWithCsrf } from '@/lib/csrf'

// Types matching DATA-MODEL.md
export type Stage =
  | 'Onboarding'
  | 'Installation'
  | 'Audit'
  | 'Live'
  | 'Needs Support'
  | 'Off-boarding'

export type HealthStatus = 'Green' | 'Yellow' | 'Red' | 'Blocked'

export interface Client {
  id: string
  agency_id: string
  name: string
  contact_email: string | null
  contact_name: string | null
  stage: Stage
  health_status: HealthStatus
  days_in_stage: number
  notes: string | null
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  // UI-only fields
  owner?: string
  owner_avatar?: string
}

export interface StageEvent {
  id: string
  agency_id: string
  client_id: string
  from_stage: Stage | null
  to_stage: Stage
  moved_by: string
  moved_at: string
  notes: string | null
}

interface PipelineState {
  // Data
  clients: Client[]
  stageHistory: Record<string, StageEvent[]>
  isLoading: boolean
  error: string | null

  // Filters
  filters: {
    stage: Stage | 'all'
    health: HealthStatus | 'all'
    owner: string | 'all'
    search: string
  }

  // Selected client for drawer
  selectedClientId: string | null

  // Actions - Data fetching
  fetchClients: () => Promise<void>
  setClients: (clients: Client[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Actions - Stage management with API
  updateClientStage: (clientId: string, toStage: Stage) => Promise<boolean>

  // Optimistic update with rollback (internal)
  moveClient: (clientId: string, toStage: Stage) => void
  rollbackMove: (clientId: string, fromStage: Stage) => void

  // Filters
  setFilter: <K extends keyof PipelineState['filters']>(
    key: K,
    value: PipelineState['filters'][K]
  ) => void
  clearFilters: () => void

  // Selection
  selectClient: (clientId: string | null) => void

  // Computed
  getClientsByStage: (stage: Stage) => Client[]
  getFilteredClients: () => Client[]
}

const STAGES: Stage[] = [
  'Onboarding',
  'Installation',
  'Audit',
  'Live',
  'Needs Support',
  'Off-boarding'
]

// Map DB health_status to UI HealthStatus
function mapHealthStatus(dbStatus: string): HealthStatus {
  switch (dbStatus) {
    case 'green':
      return 'Green'
    case 'yellow':
      return 'Yellow'
    case 'red':
      return 'Red'
    default:
      return 'Green'
  }
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  // Initial state
  clients: [],
  stageHistory: {},
  isLoading: false,
  error: null,

  filters: {
    stage: 'all',
    health: 'all',
    owner: 'all',
    search: ''
  },

  selectedClientId: null,

  // Fetch clients from API
  fetchClients: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch('/api/v1/clients', { credentials: 'include' })

      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }

      const { data } = await response.json()

      // Transform DB format to UI format
      const clients: Client[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        agency_id: row.agency_id as string,
        name: row.name as string,
        contact_email: row.contact_email as string | null,
        contact_name: row.contact_name as string | null,
        stage: row.stage as Stage,
        health_status: mapHealthStatus(row.health_status as string),
        days_in_stage: row.days_in_stage as number,
        notes: row.notes as string | null,
        tags: (row.tags as string[]) || [],
        is_active: row.is_active as boolean,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        // Get primary owner from assignments if available
        owner: (row.assignments as Array<{ user: { first_name: string; last_name: string } }>)?.[0]?.user
          ? `${(row.assignments as Array<{ user: { first_name: string; last_name: string } }>)[0].user.first_name}`
          : undefined,
      }))

      set({ clients, isLoading: false })
    } catch (error) {
      console.error('Error fetching clients:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch clients',
        isLoading: false
      })
    }
  },

  // Actions
  setClients: (clients) => set({ clients }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Update stage via API with optimistic update
  // RACE CONDITION FIX (2026-01-10): Only rollback if state hasn't changed
  // since our optimistic update. This prevents stale rollbacks from overwriting
  // successful concurrent mutations.
  updateClientStage: async (clientId, toStage) => {
    const client = get().clients.find((c) => c.id === clientId)
    if (!client) return false

    const previousStage = client.stage
    const optimisticStage = toStage // Track what we set

    // Optimistic update
    get().moveClient(clientId, toStage)

    try {
      const response = await fetchWithCsrf(`/api/v1/clients/${clientId}/stage`, {
        method: 'PUT',
        body: JSON.stringify({ stage: toStage }),
      })

      if (!response.ok) {
        throw new Error('Failed to update stage')
      }

      return true
    } catch (error) {
      console.error('Error updating stage:', error)

      // RACE CONDITION FIX: Only rollback if current stage still matches
      // our optimistic update. If it changed, a newer mutation succeeded.
      const currentClient = get().clients.find((c) => c.id === clientId)
      if (currentClient && currentClient.stage === optimisticStage) {
        get().rollbackMove(clientId, previousStage)
      } else {
        console.log(`[Pipeline] Skipping rollback: stage changed from ${optimisticStage} to ${currentClient?.stage}`)
      }
      return false
    }
  },

  // Optimistic move - update UI immediately (internal)
  moveClient: (clientId, toStage) => {
    set((state) => ({
      clients: state.clients.map((client) =>
        client.id === clientId
          ? { ...client, stage: toStage, days_in_stage: 0 }
          : client
      )
    }))
  },

  // Rollback if API fails (internal)
  rollbackMove: (clientId, fromStage) => {
    set((state) => ({
      clients: state.clients.map((client) =>
        client.id === clientId
          ? { ...client, stage: fromStage }
          : client
      )
    }))
  },

  // Filters
  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value }
    }))
  },

  clearFilters: () => {
    set({
      filters: {
        stage: 'all',
        health: 'all',
        owner: 'all',
        search: ''
      }
    })
  },

  // Selection
  selectClient: (clientId) => set({ selectedClientId: clientId }),

  // Computed helpers
  getClientsByStage: (stage) => {
    const { clients } = get()
    return clients.filter((c) => c.stage === stage)
  },

  getFilteredClients: () => {
    const { clients, filters } = get()

    return clients.filter((client) => {
      // Stage filter
      if (filters.stage !== 'all' && client.stage !== filters.stage) {
        return false
      }

      // Health filter
      if (filters.health !== 'all' && client.health_status !== filters.health) {
        return false
      }

      // Owner filter
      if (filters.owner !== 'all' && client.owner !== filters.owner) {
        return false
      }

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const matchesName = client.name.toLowerCase().includes(search)
        const matchesEmail = client.contact_email?.toLowerCase().includes(search)
        if (!matchesName && !matchesEmail) {
          return false
        }
      }

      return true
    })
  }
}))

// Export stages for use in components
export { STAGES }
