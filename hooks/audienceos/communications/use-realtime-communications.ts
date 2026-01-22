'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useCommunicationsStore, type CommunicationWithMeta } from '@/stores/communications-store'
import { communicationsKeys } from './use-communications'
import { toast } from 'sonner'

interface UseRealtimeCommunicationsOptions {
  clientId: string
  enabled?: boolean
}

/**
 * Hook to subscribe to real-time communication updates for a client
 * Uses Supabase Realtime to receive INSERT/UPDATE events
 */
export function useRealtimeCommunications({
  clientId,
  enabled = true,
}: UseRealtimeCommunicationsOptions) {
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  // Use refs to avoid stale closures while keeping stable effect deps
  const queryClientRef = useRef(queryClient)
  const clientIdRef = useRef(clientId)

  // Keep refs in sync
  useEffect(() => {
    queryClientRef.current = queryClient
    clientIdRef.current = clientId
  }, [queryClient, clientId])

  useEffect(() => {
    if (!enabled || !clientId) return

    const supabase = createClient()

    // Create a unique channel name for this client's communications
    const channelName = `client-comms-${clientId}`

    // Subscribe to changes - using refs and getState() for stable handlers
    const channel = supabase
      .channel(channelName)
      .on<CommunicationWithMeta>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newMessage = (payload as { new: CommunicationWithMeta }).new

          // Add to store using getState()
          useCommunicationsStore.getState().addCommunication({
            ...newMessage,
            is_read: false,
            reply_to_id: null,
          })

          // Show toast notification
          const platformLabel = newMessage.platform === 'slack' ? 'Slack' : 'Gmail'
          const senderName = newMessage.sender_name || newMessage.sender_email || 'Unknown'

          toast.info(`New ${platformLabel} message`, {
            description: `From ${senderName}`,
            duration: 5000,
          })

          // Invalidate query cache using ref
          queryClientRef.current.invalidateQueries({
            queryKey: communicationsKeys.list(clientIdRef.current),
          })
        }
      )
      .on<CommunicationWithMeta>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'communication',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const updatedMessage = (payload as { new: CommunicationWithMeta }).new

          // Update in store using getState()
          useCommunicationsStore.getState().updateCommunication(updatedMessage.id, updatedMessage)

          // Invalidate query cache using ref
          queryClientRef.current.invalidateQueries({
            queryKey: communicationsKeys.detail(updatedMessage.id),
          })
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          if (status === 'SUBSCRIBED') {
            console.log(`Realtime: Subscribed to ${channelName}`)
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`Realtime: Error subscribing to ${channelName}`)
          }
        }
      })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [clientId, enabled]) // Removed callback deps - using refs and getState()

  // Return unsubscribe function
  return {
    unsubscribe: () => {
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    },
  }
}
