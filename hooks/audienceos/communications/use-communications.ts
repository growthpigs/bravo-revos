'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { fetchWithCsrf } from '@/lib/csrf'
import type { CommunicationWithMeta, CommunicationsFilters } from '@/stores/communications-store'
import type { Database } from '@/types/database'

type Communication = Database['public']['Tables']['communication']['Row']
type CommunicationUpdate = Database['public']['Tables']['communication']['Update']

// Query keys factory
export const communicationsKeys = {
  all: ['communications'] as const,
  list: (clientId: string, filters?: CommunicationsFilters) =>
    [...communicationsKeys.all, 'list', clientId, filters] as const,
  detail: (id: string) => [...communicationsKeys.all, 'detail', id] as const,
  thread: (threadId: string) => [...communicationsKeys.all, 'thread', threadId] as const,
}

interface FetchCommunicationsParams {
  clientId: string
  filters?: CommunicationsFilters
  cursor?: string
  limit?: number
}

interface CommunicationsResponse {
  items: CommunicationWithMeta[]
  cursor: string | null
  hasMore: boolean
  total: number
}

/**
 * Fetch communications for a client with filtering and pagination
 */
async function fetchCommunications({
  clientId,
  filters,
  cursor,
  limit = 25,
}: FetchCommunicationsParams): Promise<CommunicationsResponse> {
  const supabase = createClient()

  let query = supabase
    .from('communication')
    .select('*', { count: 'exact' })
    .eq('client_id', clientId)
    .order('received_at', { ascending: false })
    .limit(limit)

  // Apply filters
  if (filters?.source && filters.source !== 'all') {
    query = query.eq('platform', filters.source)
  }

  if (filters?.needsReply) {
    query = query.eq('needs_reply', true)
  }

  if (filters?.searchQuery) {
    query = query.or(
      `content.ilike.%${filters.searchQuery}%,subject.ilike.%${filters.searchQuery}%,sender_name.ilike.%${filters.searchQuery}%`
    )
  }

  // Cursor-based pagination
  if (cursor) {
    query = query.lt('received_at', cursor)
  }

  const { data, error, count } = await query

  if (error) {
    throw new Error(error.message)
  }

  const items: CommunicationWithMeta[] = ((data || []) as Communication[]).map((item) => ({
    ...item,
    is_read: true, // Default to read for now
    reply_to_id: null,
  }))

  const lastItem = items[items.length - 1]
  const nextCursor = lastItem?.received_at || null
  const hasMore = items.length === limit

  return {
    items,
    cursor: nextCursor,
    hasMore,
    total: count || 0,
  }
}

/**
 * Hook to fetch communications list
 */
export function useCommunications({
  clientId,
  filters,
  cursor,
  limit,
}: FetchCommunicationsParams) {
  return useQuery({
    queryKey: communicationsKeys.list(clientId, filters),
    queryFn: () => fetchCommunications({ clientId, filters, cursor, limit }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch a single message with thread context
 */
export function useCommunicationDetail(messageId: string) {
  return useQuery({
    queryKey: communicationsKeys.detail(messageId),
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('communication')
        .select('*')
        .eq('id', messageId)
        .single()

      if (error) throw new Error(error.message)
      return data as CommunicationWithMeta
    },
    enabled: !!messageId,
  })
}

/**
 * Hook to fetch full thread
 */
export function useCommunicationThread(threadId: string) {
  return useQuery({
    queryKey: communicationsKeys.thread(threadId),
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('communication')
        .select('*')
        .eq('thread_id', threadId)
        .order('received_at', { ascending: true })

      if (error) throw new Error(error.message)
      return data as CommunicationWithMeta[]
    },
    enabled: !!threadId,
  })
}

/**
 * Hook to update a communication (mark as read, needs_reply, etc.)
 */
export function useUpdateCommunication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: CommunicationUpdate
    }) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('communication')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: (_data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: communicationsKeys.all,
      })
    },
  })
}

/**
 * Hook to send a reply
 */
export function useSendReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
      sendImmediately = true,
    }: {
      messageId: string
      content: string
      sendImmediately?: boolean
    }) => {
      // Call the API to send reply via Slack/Gmail
      const response = await fetchWithCsrf(`/api/v1/communications/${messageId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content, send_immediately: sendImmediately }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send reply')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: communicationsKeys.all,
      })
    },
  })
}

/**
 * Hook to generate AI draft reply
 */
export function useGenerateDraft() {
  return useMutation({
    mutationFn: async ({
      messageId,
      tone = 'professional',
    }: {
      messageId: string
      tone?: 'professional' | 'casual'
    }) => {
      const response = await fetchWithCsrf('/api/v1/assistant/draft', {
        method: 'POST',
        body: JSON.stringify({
          type: 'reply',
          context: { message_id: messageId },
          tone,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate draft')
      }

      const data = await response.json()
      return data.draft as string
    },
  })
}
