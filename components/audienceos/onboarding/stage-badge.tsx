"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react"

interface StageBadgeProps {
  name: string
  status: "pending" | "in_progress" | "completed" | "blocked"
  platformStatuses?: Record<string, string>
  size?: "sm" | "md"
}

export function StageBadge({ name, status, platformStatuses, size = "md" }: StageBadgeProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className={cn("text-green-500", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      case "in_progress":
        return <Clock className={cn("text-blue-500", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      case "blocked":
        return <AlertTriangle className={cn("text-red-500", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      default:
        return <Circle className={cn("text-muted-foreground", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-700 border-green-500/30"
      case "in_progress":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30"
      case "blocked":
        return "bg-red-500/10 text-red-700 border-red-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        getStatusColor(),
        size === "sm" ? "text-xs" : "text-sm"
      )}
    >
      {getStatusIcon()}
      <span className="font-medium">{name}</span>
      {platformStatuses && Object.keys(platformStatuses).length > 0 && (
        <div className="flex items-center gap-0.5 ml-1">
          {Object.entries(platformStatuses).map(([platform, pStatus]) => (
            <span
              key={platform}
              className={cn(
                "text-[10px] px-1 rounded",
                pStatus === "verified" ? "bg-green-500/20 text-green-700" :
                pStatus === "blocked" ? "bg-red-500/20 text-red-700" :
                "bg-muted text-muted-foreground"
              )}
            >
              {platform}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
