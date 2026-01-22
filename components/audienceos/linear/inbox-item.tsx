"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export type TicketPriority = "urgent" | "high" | "medium" | "low"
export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed"

interface InboxItemProps {
  id: string
  title: string
  preview: string
  client: {
    name: string
    initials: string
    color?: string
  }
  priority: TicketPriority
  status: TicketStatus
  timestamp: string
  unread?: boolean
  selected?: boolean
  compact?: boolean
  onClick?: () => void
}

const priorityColors: Record<TicketPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-slate-400",
}

const priorityLabels: Record<TicketPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
}

const statusColors: Record<TicketStatus, string> = {
  open: "bg-blue-500/10 text-blue-500",
  in_progress: "bg-yellow-500/10 text-yellow-500",
  waiting: "bg-purple-500/10 text-purple-500",
  resolved: "bg-emerald-500/10 text-emerald-500",
  closed: "bg-slate-500/10 text-slate-400",
}

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
}

export function InboxItem({
  id,
  title,
  preview,
  client,
  priority,
  status,
  timestamp,
  unread = false,
  selected = false,
  compact = false,
  onClick,
}: InboxItemProps) {
  // Keyboard handler for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick?.()
    }
  }

  // Compact view when detail panel is open
  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-selected={selected}
        className={cn(
          "px-3 py-2.5 cursor-pointer transition-colors border-b border-border/30",
          selected
            ? "bg-primary/10 border-l-2 border-l-primary"
            : "hover:bg-secondary/50 border-l-2 border-l-transparent"
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2">
          {/* Priority dot */}
          <div className={cn("w-2 h-2 rounded-full shrink-0", priorityColors[priority])} />
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-foreground truncate">
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">
                {client.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                #{id}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full view when no detail panel
  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={selected}
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2 border-b border-border/30",
        selected
          ? "bg-secondary border-l-primary"
          : "border-l-transparent hover:bg-secondary/50",
        unread && "bg-primary/5"
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Unread indicator */}
      <div className="pt-1.5">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            unread ? "bg-primary" : "bg-transparent"
          )}
        />
      </div>

      {/* Client avatar */}
      <Avatar className={cn("h-8 w-8", client.color || "bg-primary")}>
        <AvatarFallback
          className={cn(
            "text-xs font-medium text-primary-foreground",
            client.color || "bg-primary"
          )}
        >
          {client.initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {client.name}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {timestamp}
          </span>
        </div>
        <p
          className={cn(
            "text-sm truncate mb-1",
            unread ? "font-medium text-foreground" : "text-foreground"
          )}
        >
          {title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{preview}</p>

        {/* Tags row */}
        <div className="flex items-center gap-2 mt-2">
          {/* Priority indicator */}
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", priorityColors[priority])} />
            <span className="text-[10px] text-muted-foreground">
              {priorityLabels[priority]}
            </span>
          </div>

          {/* Status badge */}
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              statusColors[status]
            )}
          >
            {statusLabels[status]}
          </span>

          {/* Ticket ID */}
          <span className="text-[10px] text-muted-foreground">#{id}</span>
        </div>
      </div>
    </div>
  )
}

// Skeleton for loading state
export function InboxItemSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="px-3 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            <div className="h-2 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="pt-1.5">
        <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
        <div className="flex gap-2 mt-2">
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
