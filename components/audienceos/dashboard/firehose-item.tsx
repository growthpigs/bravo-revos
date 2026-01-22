"use client"

import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

export type FirehoseSeverity = "critical" | "warning" | "info"
export type FirehoseTab = "tasks" | "clients" | "alerts" | "performance"

export interface FirehoseItemData {
  id: string
  severity: FirehoseSeverity
  title: string
  description: string
  timestamp: Date
  clientName?: string
  clientId?: string
  assignee?: string
  targetTab: FirehoseTab
  targetItemId?: string
}

interface FirehoseItemProps {
  item: FirehoseItemData
  onClick?: (item: FirehoseItemData) => void
  className?: string
}

const severityColors: Record<FirehoseSeverity, { dot: string; bg: string }> = {
  critical: { dot: "bg-rose-500", bg: "hover:bg-rose-500/5" },
  warning: { dot: "bg-amber-500", bg: "hover:bg-amber-500/5" },
  info: { dot: "bg-slate-400", bg: "hover:bg-slate-500/5" },
}

const tabLabels: Record<FirehoseTab, string> = {
  tasks: "Tasks",
  clients: "Clients",
  alerts: "Alerts",
  performance: "Performance",
}

export function FirehoseItem({ item, onClick, className }: FirehoseItemProps) {
  const colors = severityColors[item.severity]
  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: false })

  return (
    <button
      onClick={() => onClick?.(item)}
      className={cn(
        "w-full text-left p-3 border-b border-border transition-colors cursor-pointer",
        colors.bg,
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Severity dot */}
        <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", colors.dot)} />

        <div className="flex-1 min-w-0">
          {/* Title + Time */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {item.title}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {timeAgo}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {item.description}
          </p>

          {/* Tags row */}
          <div className="flex items-center gap-2 mt-2">
            {item.clientName && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded text-muted-foreground">
                {item.clientName}
              </span>
            )}
            {item.assignee && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 rounded text-primary">
                @{item.assignee}
              </span>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground">
              → {tabLabels[item.targetTab]}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export function FirehoseItemSkeleton() {
  return (
    <div className="p-3 border-b border-border animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-muted mt-1.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-12 bg-muted rounded" />
          </div>
          <div className="h-3 w-48 bg-muted rounded mt-1" />
          <div className="flex items-center gap-2 mt-2">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
