/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
'use client'

import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Reply, Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { PlatformIcon } from './platform-icon'
import type { CommunicationWithMeta } from '@/stores/communications-store'

interface MessageBubbleProps {
  message: CommunicationWithMeta
  isSelected?: boolean
  isReply?: boolean
  onSelect?: (id: string) => void
  onReply?: (id: string) => void
  onMarkAsRead?: (id: string) => void
  onMarkNeedsReply?: (id: string, needsReply: boolean) => void
}

export function MessageBubble({
  message,
  isSelected = false,
  isReply = false,
  onSelect,
  onReply,
  onMarkAsRead,
  onMarkNeedsReply,
}: MessageBubbleProps) {
  const isUnread = !message.is_read
  const timeAgo = formatDistanceToNow(new Date(message.received_at), { addSuffix: true })

  return (
    <div
      className={cn(
        'group relative flex gap-3 p-3 rounded-md transition-colors cursor-pointer',
        isSelected && 'bg-primary/5 border border-primary/20',
        !isSelected && 'hover:bg-muted/50',
        isReply && 'ml-8 border-l-2 border-muted'
      )}
      onClick={() => onSelect?.(message.id)}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2">
          <Circle className="h-2 w-2 fill-primary text-primary" />
        </div>
      )}

      {/* Platform icon */}
      <div className="flex-shrink-0 mt-0.5">
        <PlatformIcon platform={message.platform} size="md" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Sender, Subject (email), Time */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {message.sender_name || message.sender_email || 'Unknown'}
              </span>
              {message.needs_reply && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  Needs Reply
                </Badge>
              )}
              {!message.is_inbound && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Sent
                </Badge>
              )}
            </div>
            {message.subject && (
              <p className="text-sm text-muted-foreground truncate">
                {message.subject}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo}
            </span>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onReply?.(message.id)}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                {isUnread && (
                  <DropdownMenuItem onClick={() => onMarkAsRead?.(message.id)}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onMarkNeedsReply?.(message.id, !message.needs_reply)}
                >
                  {message.needs_reply ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Mark as replied
                    </>
                  ) : (
                    <>
                      <Reply className="h-4 w-4 mr-2" />
                      Mark needs reply
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Message content - truncated preview */}
        <p className="text-sm text-foreground line-clamp-2">
          {message.content}
        </p>

        {/* Footer: replied indicator */}
        {message.replied_at && (
          <div className="flex items-center gap-1 mt-1.5">
            <Check className="h-3 w-3 text-green-500" />
            <span className="text-xs text-muted-foreground">
              Replied {formatDistanceToNow(new Date(message.replied_at), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
