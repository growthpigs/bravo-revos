'use client'

import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MessageBubble } from './message-bubble'
import type { ThreadGroup as ThreadGroupType } from '@/stores/communications-store'

interface ThreadGroupProps {
  thread: ThreadGroupType
  selectedMessageId: string | null
  onSelectMessage: (id: string) => void
  onReply: (id: string) => void
  onMarkAsRead: (id: string) => void
  onMarkNeedsReply: (id: string, needsReply: boolean) => void
  onToggleExpanded: (threadId: string) => void
}

export function ThreadGroup({
  thread,
  selectedMessageId,
  onSelectMessage,
  onReply,
  onMarkAsRead,
  onMarkNeedsReply,
  onToggleExpanded,
}: ThreadGroupProps) {
  const hasReplies = thread.replies.length > 0
  const unreadReplies = thread.replies.filter(r => !r.is_read).length

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Root message */}
      <MessageBubble
        message={thread.rootMessage}
        isSelected={selectedMessageId === thread.rootMessage.id}
        onSelect={onSelectMessage}
        onReply={onReply}
        onMarkAsRead={onMarkAsRead}
        onMarkNeedsReply={onMarkNeedsReply}
      />

      {/* Thread expansion toggle */}
      {hasReplies && (
        <div className="pl-8 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onToggleExpanded(thread.id)}
          >
            {thread.isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
            )}
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
            {unreadReplies > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full">
                {unreadReplies} new
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Replies (when expanded) */}
      {hasReplies && thread.isExpanded && (
        <div
          className={cn(
            'space-y-1 pb-2 overflow-hidden transition-all duration-200',
            thread.isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          {thread.replies.map((reply) => (
            <MessageBubble
              key={reply.id}
              message={reply}
              isReply
              isSelected={selectedMessageId === reply.id}
              onSelect={onSelectMessage}
              onReply={onReply}
              onMarkAsRead={onMarkAsRead}
              onMarkNeedsReply={onMarkNeedsReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}
