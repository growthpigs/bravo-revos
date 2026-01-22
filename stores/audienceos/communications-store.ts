import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { fetchWithCsrf } from '@/lib/csrf'
import type { Database } from '@/types/audienceos/database'

// Extract table types
type Tables = Database['public']['Tables']
type Communication = Tables['communication']['Row']

// Extended types for UI
export interface CommunicationWithMeta extends Communication {
  is_read?: boolean
  reply_to_id?: string | null
}

export interface ThreadGroup {
  id: string
  rootMessage: CommunicationWithMeta
  replies: CommunicationWithMeta[]
  isExpanded: boolean
}

export type SourceFilter = 'all' | 'slack' | 'gmail'

export interface CommunicationsFilters {
  source: SourceFilter
  needsReply: boolean
  searchQuery: string
  isRead: boolean | null
}

// ============================================================================
// COMMUNICATIONS STORE
// ============================================================================
interface CommunicationsState {
  // Data
  communications: CommunicationWithMeta[]
  threads: ThreadGroup[]

  // Filters
  filters: CommunicationsFilters

  // UI State
  selectedMessageId: string | null
  expandedThreadIds: Set<string>
  isLoading: boolean
  error: string | null

  // Pagination
  cursor: string | null
  hasMore: boolean

  // Counts for badges
  unreadCount: number
  needsReplyCount: number

  // Actions
  setCommunications: (communications: CommunicationWithMeta[]) => void
  addCommunication: (communication: CommunicationWithMeta) => void
  updateCommunication: (id: string, updates: Partial<CommunicationWithMeta>) => void
  setThreads: (threads: ThreadGroup[]) => void
  toggleThreadExpanded: (threadId: string) => void
  setFilters: (filters: Partial<CommunicationsFilters>) => void
  resetFilters: () => void
  setSelectedMessage: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCursor: (cursor: string | null) => void
  setHasMore: (hasMore: boolean) => void
  markAsRead: (id: string) => void
  markAsReplied: (id: string, repliedBy: string) => void

  // API Actions
  fetchCommunications: (clientId: string, options?: { source?: SourceFilter; needsReply?: boolean; cursor?: string }) => Promise<void>
  fetchAllCommunications: (options?: { source?: SourceFilter; needsReply?: boolean; cursor?: string; limit?: number }) => Promise<void>
  markCommunicationAsReplied: (id: string, repliedBy: string) => Promise<boolean>
}

const defaultFilters: CommunicationsFilters = {
  source: 'all',
  needsReply: false,
  searchQuery: '',
  isRead: null,
}

export const useCommunicationsStore = create<CommunicationsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      communications: [],
      threads: [],
      filters: defaultFilters,
      selectedMessageId: null,
      expandedThreadIds: new Set(),
      isLoading: false,
      error: null,
      cursor: null,
      hasMore: true,
      unreadCount: 0,
      needsReplyCount: 0,

      // Actions
      setCommunications: (communications) => {
        const threads = buildThreadHierarchy(communications)
        const unreadCount = communications.filter(c => !c.is_read).length
        const needsReplyCount = communications.filter(c => c.needs_reply).length

        set({
          communications,
          threads,
          unreadCount,
          needsReplyCount,
        })
      },

      addCommunication: (communication) => {
        set((state) => {
          const newCommunications = [communication, ...state.communications]
          const threads = buildThreadHierarchy(newCommunications)
          const unreadCount = newCommunications.filter(c => !c.is_read).length
          const needsReplyCount = newCommunications.filter(c => c.needs_reply).length

          return {
            communications: newCommunications,
            threads,
            unreadCount,
            needsReplyCount,
          }
        })
      },

      updateCommunication: (id, updates) => {
        set((state) => {
          const newCommunications = state.communications.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          )
          const threads = buildThreadHierarchy(newCommunications)
          const unreadCount = newCommunications.filter(c => !c.is_read).length
          const needsReplyCount = newCommunications.filter(c => c.needs_reply).length

          return {
            communications: newCommunications,
            threads,
            unreadCount,
            needsReplyCount,
          }
        })
      },

      setThreads: (threads) => set({ threads }),

      toggleThreadExpanded: (threadId) => {
        set((state) => {
          const newExpandedIds = new Set(state.expandedThreadIds)
          if (newExpandedIds.has(threadId)) {
            newExpandedIds.delete(threadId)
          } else {
            newExpandedIds.add(threadId)
          }

          const threads = state.threads.map(t => ({
            ...t,
            isExpanded: newExpandedIds.has(t.id),
          }))

          return { expandedThreadIds: newExpandedIds, threads }
        })
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
          // Reset pagination when filters change
          cursor: null,
          hasMore: true,
        }))
      },

      resetFilters: () => {
        set({
          filters: defaultFilters,
          cursor: null,
          hasMore: true,
        })
      },

      setSelectedMessage: (selectedMessageId) => set({ selectedMessageId }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      setCursor: (cursor) => set({ cursor }),

      setHasMore: (hasMore) => set({ hasMore }),

      markAsRead: (id) => {
        const state = get()
        state.updateCommunication(id, { is_read: true })
      },

      markAsReplied: (id, repliedBy) => {
        const state = get()
        state.updateCommunication(id, {
          needs_reply: false,
          replied_at: new Date().toISOString(),
          replied_by: repliedBy,
        })
      },

      // API Actions
      fetchCommunications: async (clientId, options = {}) => {
        set({ isLoading: true, error: null })

        try {
          const params = new URLSearchParams()
          if (options.source && options.source !== 'all') {
            params.append('source', options.source)
          }
          if (options.needsReply) {
            params.append('needs_reply', 'true')
          }
          if (options.cursor) {
            params.append('cursor', options.cursor)
          }

          const url = `/api/v1/clients/${clientId}/communications${params.toString() ? `?${params.toString()}` : ''}`
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error('Failed to fetch communications')
          }

          const { items, pagination } = await response.json()

          // If cursor was provided, append to existing communications
          if (options.cursor) {
            set((state) => {
              const newCommunications = [...state.communications, ...items]
              const threads = buildThreadHierarchy(newCommunications)
              const unreadCount = newCommunications.filter(c => !c.is_read).length
              const needsReplyCount = newCommunications.filter(c => c.needs_reply).length
              return {
                communications: newCommunications,
                threads,
                unreadCount,
                needsReplyCount,
                cursor: pagination.cursor,
                hasMore: pagination.has_more,
                isLoading: false,
              }
            })
          } else {
            // Fresh fetch - replace all
            const threads = buildThreadHierarchy(items)
            const unreadCount = items.filter((c: CommunicationWithMeta) => !c.is_read).length
            const needsReplyCount = items.filter((c: CommunicationWithMeta) => c.needs_reply).length
            set({
              communications: items,
              threads,
              unreadCount,
              needsReplyCount,
              cursor: pagination.cursor,
              hasMore: pagination.has_more,
              isLoading: false,
            })
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch communications',
            isLoading: false,
          })
        }
      },

      // Fetch ALL communications across all clients (for dashboard)
      fetchAllCommunications: async (options = {}) => {
        set({ isLoading: true, error: null })

        try {
          const params = new URLSearchParams()
          if (options.source && options.source !== 'all') {
            params.append('source', options.source)
          }
          if (options.needsReply) {
            params.append('needs_reply', 'true')
          }
          if (options.cursor) {
            params.append('cursor', options.cursor)
          }
          if (options.limit) {
            params.append('limit', options.limit.toString())
          }

          const url = `/api/v1/communications${params.toString() ? `?${params.toString()}` : ''}`
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error('Failed to fetch communications')
          }

          const { items, pagination } = await response.json()

          // If cursor was provided, append to existing communications
          if (options.cursor) {
            set((state) => {
              const newCommunications = [...state.communications, ...items]
              const threads = buildThreadHierarchy(newCommunications)
              const unreadCount = newCommunications.filter(c => !c.is_read).length
              const needsReplyCount = newCommunications.filter(c => c.needs_reply).length
              return {
                communications: newCommunications,
                threads,
                unreadCount,
                needsReplyCount,
                cursor: pagination.cursor,
                hasMore: pagination.has_more,
                isLoading: false,
              }
            })
          } else {
            // Fresh fetch - replace all
            const threads = buildThreadHierarchy(items)
            const unreadCount = items.filter((c: CommunicationWithMeta) => !c.is_read).length
            const needsReplyCount = items.filter((c: CommunicationWithMeta) => c.needs_reply).length
            set({
              communications: items,
              threads,
              unreadCount,
              needsReplyCount,
              cursor: pagination.cursor,
              hasMore: pagination.has_more,
              isLoading: false,
            })
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch communications',
            isLoading: false,
          })
        }
      },

      markCommunicationAsReplied: async (id, repliedBy) => {
        // Optimistic update
        get().markAsReplied(id, repliedBy)

        try {
          const response = await fetchWithCsrf(`/api/v1/communications/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              needs_reply: false,
              replied_at: new Date().toISOString(),
              replied_by: repliedBy,
            }),
          })

          if (!response.ok) {
            throw new Error('Failed to mark as replied')
          }

          return true
        } catch (error) {
          console.error('Failed to mark communication as replied:', error)
          // Rollback optimistic update
          get().updateCommunication(id, { needs_reply: true, replied_at: null, replied_by: null })
          return false
        }
      },
    }),
    { name: 'communications-store' }
  )
)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build thread hierarchy from flat list of communications
 * Groups messages by thread_id and sorts by received_at
 */
function buildThreadHierarchy(messages: CommunicationWithMeta[]): ThreadGroup[] {
  const threadMap = new Map<string, CommunicationWithMeta[]>()

  // Group messages by thread_id
  messages.forEach(msg => {
    const threadKey = msg.thread_id || msg.id

    if (!threadMap.has(threadKey)) {
      threadMap.set(threadKey, [])
    }
    threadMap.get(threadKey)!.push(msg)
  })

  // Build ThreadGroup objects
  const threads: ThreadGroup[] = []

  threadMap.forEach((threadMessages, threadId) => {
    // Sort by received_at ascending (oldest first for replies)
    const sorted = [...threadMessages].sort(
      (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
    )

    const rootMessage = sorted[0]
    const replies = sorted.slice(1)

    threads.push({
      id: threadId,
      rootMessage,
      replies,
      isExpanded: false,
    })
  })

  // Sort threads by most recent activity (descending)
  threads.sort((a, b) => {
    const aLatest = a.replies.length > 0
      ? a.replies[a.replies.length - 1].received_at
      : a.rootMessage.received_at
    const bLatest = b.replies.length > 0
      ? b.replies[b.replies.length - 1].received_at
      : b.rootMessage.received_at

    return new Date(bLatest).getTime() - new Date(aLatest).getTime()
  })

  return threads
}

/**
 * Filter communications based on current filters
 */
export function filterCommunications(
  communications: CommunicationWithMeta[],
  filters: CommunicationsFilters
): CommunicationWithMeta[] {
  return communications.filter(comm => {
    // Source filter
    if (filters.source !== 'all' && comm.platform !== filters.source) {
      return false
    }

    // Needs reply filter
    if (filters.needsReply && !comm.needs_reply) {
      return false
    }

    // Read status filter
    if (filters.isRead !== null && comm.is_read !== filters.isRead) {
      return false
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      const searchableText = [
        comm.content,
        comm.subject,
        comm.sender_name,
        comm.sender_email,
      ].filter(Boolean).join(' ').toLowerCase()

      if (!searchableText.includes(query)) {
        return false
      }
    }

    return true
  })
}
