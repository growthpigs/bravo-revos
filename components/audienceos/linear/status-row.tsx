"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Plus, ChevronRight } from "lucide-react"

export type StatusType = "backlog" | "planned" | "in_progress" | "completed" | "canceled" | "blocked"

interface StatusRowProps {
  icon: React.ReactNode
  name: string
  count?: number
  status?: StatusType
  description?: string
  expandable?: boolean
  expanded?: boolean
  onExpand?: () => void
  onAdd?: () => void
  onClick?: () => void
  children?: React.ReactNode
}

const statusColors: Record<StatusType, string> = {
  backlog: "bg-orange-500/10",
  planned: "bg-muted",
  in_progress: "bg-yellow-500/10",
  completed: "bg-emerald-500/10",
  canceled: "bg-muted",
  blocked: "bg-red-500/10",
}

export function StatusRow({
  icon,
  name,
  count,
  status = "planned",
  description,
  expandable = false,
  expanded = false,
  onExpand,
  onAdd,
  onClick,
  children,
}: StatusRowProps) {
  return (
    <div className="bg-secondary/30 rounded-lg overflow-hidden">
      <div
        className={cn(
          "flex items-center justify-between p-4",
          (onClick || expandable) && "cursor-pointer hover:bg-secondary/50 transition-colors"
        )}
        onClick={expandable ? onExpand : onClick}
      >
        <div className="flex items-center gap-3">
          {expandable && (
            <ChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                expanded && "rotate-90"
              )}
            />
          )}
          <div
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center",
              statusColors[status]
            )}
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{name}</span>
              {count !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {count} {count === 1 ? "client" : "clients"}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAdd()
            }}
            className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      {expandable && expanded && children && (
        <div className="border-t border-border px-4 py-3 bg-background/50">
          {children}
        </div>
      )}
    </div>
  )
}

// Pre-configured status icons
export function StatusIcon({ type }: { type: StatusType }) {
  switch (type) {
    case "backlog":
      return (
        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    case "planned":
      return <div className="w-3 h-3 border-2 border-muted-foreground rounded-full" />
    case "in_progress":
      return <div className="w-3 h-3 bg-yellow-500 rounded-full" />
    case "completed":
      return (
        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    case "canceled":
      return <div className="w-3 h-3 border-2 border-muted-foreground rounded-full" />
    case "blocked":
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    default:
      return <div className="w-3 h-3 border-2 border-muted-foreground rounded-full" />
  }
}
