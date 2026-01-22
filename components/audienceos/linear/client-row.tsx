"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

interface ClientRowProps {
  id: string
  clientId?: string
  name: string
  stage: string
  health: "Green" | "Yellow" | "Red" | "Blocked"
  owner: {
    name: string
    initials: string
    color: string
  }
  daysInStage: number
  blocker?: string | null
  onClick?: () => void
  onOpenDetail?: () => void
  selected?: boolean
}

function getHealthDotColor(health: string) {
  switch (health) {
    case "Green":
      return "bg-status-green"
    case "Yellow":
      return "bg-status-yellow"
    case "Red":
      return "bg-status-red"
    case "Blocked":
      return "bg-status-blocked"
    default:
      return "bg-muted"
  }
}

function getStageColor(stage: string) {
  switch (stage) {
    case "Live":
      return "text-status-green"
    case "Installation":
    case "Audit":
      return "text-primary"
    case "Intake":
    case "Access":
      return "text-status-yellow"
    default:
      return "text-muted-foreground"
  }
}

export function ClientRow({
  id,
  clientId,
  name,
  stage,
  health,
  owner,
  daysInStage,
  blocker,
  onClick,
  onOpenDetail,
  selected,
}: ClientRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center p-4 border-b border-border cursor-pointer transition-colors",
        selected
          ? "bg-primary/10 border-l-2 border-l-primary"
          : "hover:bg-card/50"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar */}
        <Avatar className={cn("h-8 w-8", owner.color)}>
          <AvatarFallback className={cn(owner.color, "text-sm font-medium text-white")}>
            {owner.initials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Health dot */}
            <span className={cn("w-2 h-2 rounded-full shrink-0", getHealthDotColor(health))} />
            {/* ID */}
            <span className="text-sm font-medium text-muted-foreground">{id}</span>
            {/* Name */}
            <span className="text-sm text-foreground truncate">{name}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-xs", getStageColor(stage))}>{stage}</span>
            {blocker && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-status-red">{blocker}</span>
              </>
            )}
          </div>
        </div>

        {/* Right side - Open button and days indicator */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Open button - appears on hover */}
          {onOpenDetail && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDetail()
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Open</span>
            </Button>
          )}
          {/* Days indicator */}
          <span
            className={cn(
              "text-xs tabular-nums",
              daysInStage > 4 ? "text-status-red font-medium" : "text-muted-foreground"
            )}
          >
            {daysInStage}d
          </span>
        </div>
      </div>
    </div>
  )
}

// Skeleton for loading states
export function ClientRowSkeleton() {
  return (
    <div className="flex items-center p-4 border-b border-border animate-pulse">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
        <div className="h-3 w-8 bg-muted rounded" />
      </div>
    </div>
  )
}
