'use client'

import { useRef, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThreadGroup } from './thread-group'
import type { ThreadGroup as ThreadGroupType } from '@/stores/communications-store'

interface CommunicationsTimelineProps {
  threads: ThreadGroupType[]
  isLoading: boolean
  hasMore: boolean
  selectedMessageId: string | null
  onSelectMessage: (id: string) => void
  onReply: (id: string) => void
  onMarkAsRead: (id: string) => void
  onMarkNeedsReply: (id: string, needsReply: boolean) => void
  onToggleThreadExpanded: (threadId: string) => void
  onLoadMore: () => void
  className?: string
}

export function CommunicationsTimeline({
  threads,
  isLoading,
  hasMore,
  selectedMessageId,
  onSelectMessage,
  onReply,
  onMarkAsRead,
  onMarkNeedsReply,
  onToggleThreadExpanded,
  onLoadMore,
  className,
}: CommunicationsTimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Calculate estimated size based on thread state
  const estimateSize = useCallback((index: number) => {
    const thread = threads[index]
    if (!thread) return 120 // Default height

    // Base height for root message
    let height = 100

    // Add height for replies toggle if has replies
    if (thread.replies.length > 0) {
      height += 32 // Toggle button height

      // Add height for expanded replies
      if (thread.isExpanded) {
        height += thread.replies.length * 88 // Reply height each
      }
    }

    return height
  }, [threads])

  const virtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5,
    getItemKey: (index) => threads[index]?.id || index,
  })

  // Infinite scroll detection
  useEffect(() => {
    if (!parentRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[0]
        if (lastEntry?.isIntersecting && hasMore && !isLoading) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    // Observe a sentinel element at the bottom
    const sentinel = parentRef.current.querySelector('[data-sentinel]')
    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  // Empty state
  if (!isLoading && threads.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-64 text-muted-foreground',
          className
        )}
      >
        <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm font-medium">No messages</p>
        <p className="text-xs mt-1">
          Messages from Slack and Gmail will appear here
        </p>
      </div>
    )
  }

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={cn('h-full overflow-auto', className)}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const thread = threads[virtualRow.index]
          if (!thread) return null

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ThreadGroup
                thread={thread}
                selectedMessageId={selectedMessageId}
                onSelectMessage={onSelectMessage}
                onReply={onReply}
                onMarkAsRead={onMarkAsRead}
                onMarkNeedsReply={onMarkNeedsReply}
                onToggleExpanded={onToggleThreadExpanded}
              />
            </div>
          )
        })}
      </div>

      {/* Load more sentinel */}
      <div data-sentinel className="h-px" />

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      )}
    </div>
  )
}
