import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useIntegrationsStore } from '@/lib/store'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Integration = Database['public']['Tables']['integration']['Row']

/**
 * Hook for fetching and subscribing to integration updates
 * Uses Supabase Realtime for live updates
 */
export function useIntegrations() {
  const integrations = useIntegrationsStore((state) => state.integrations)
  const isLoading = useIntegrationsStore((state) => state.isLoading)
  const initialFetchDone = useRef(false)

  // Set up Realtime subscription - runs once on mount
  useEffect(() => {
    const supabase = createClient()
    const store = useIntegrationsStore.getState()

    // Subscribe to integration changes
    const channel = supabase
      .channel('integrations-changes')
      .on<Integration>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integration',
        },
        (payload: RealtimePostgresChangesPayload<Integration>) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          // Use getState() to get fresh state and stable methods
          const currentStore = useIntegrationsStore.getState()

          switch (eventType) {
            case 'INSERT':
              if (newRecord) {
                currentStore.addIntegration(newRecord as Integration)
              }
              break
            case 'UPDATE':
              if (newRecord && 'id' in newRecord) {
                // Check current state, not stale closure
                const exists = currentStore.integrations.find(i => i.id === newRecord.id)
                if (exists) {
                  currentStore.updateIntegration(newRecord.id, newRecord as Partial<Integration>)
                }
              }
              break
            case 'DELETE':
              if (oldRecord && 'id' in oldRecord && typeof oldRecord.id === 'string') {
                currentStore.removeIntegration(oldRecord.id)
              }
              break
          }
        }
      )
      .subscribe()

    // Initial fetch - only once
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
      store.setLoading(true)
      fetch('/api/v1/integrations', { credentials: 'include' })
        .then(res => res.json())
        .then(({ data }) => store.setIntegrations(data || []))
        .catch(error => {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Error fetching integrations:', error)
          }
        })
        .finally(() => store.setLoading(false))
    }

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // Empty deps - subscription is static, uses getState() for fresh data

  // Refetch function using stable store reference
  const refetch = () => {
    const store = useIntegrationsStore.getState()
    store.setLoading(true)
    fetch('/api/v1/integrations', { credentials: 'include' })
      .then(res => res.json())
      .then(({ data }) => store.setIntegrations(data || []))
      .catch(error => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error fetching integrations:', error)
        }
      })
      .finally(() => store.setLoading(false))
  }

  return {
    integrations,
    isLoading,
    refetch,
  }
}

/**
 * Hook for subscribing to a single integration's status
 */
export function useIntegrationStatus(integrationId: string) {
  const integrations = useIntegrationsStore((state) => state.integrations)
  const integration = integrations.find((i) => i.id === integrationId)

  useEffect(() => {
    if (!integrationId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`integration-${integrationId}`)
      .on<Integration>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'integration',
          filter: `id=eq.${integrationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Integration>) => {
          if (payload.new && 'id' in payload.new) {
            // Use getState() for stable reference
            useIntegrationsStore.getState().updateIntegration(
              payload.new.id,
              payload.new as Partial<Integration>
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [integrationId]) // Removed updateIntegration - using getState() pattern

  return integration
}
