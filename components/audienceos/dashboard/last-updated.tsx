"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { RefreshCw, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LastUpdatedProps {
  lastUpdated: string | null
  isRefreshing: boolean
  onRefresh: () => void
  realtimeConnected?: boolean
  className?: string
}

export function LastUpdated({
  lastUpdated,
  isRefreshing,
  onRefresh,
  realtimeConnected = false,
  className,
}: LastUpdatedProps) {
  const [relativeTime, setRelativeTime] = useState<string>("")

  // Update relative time every minute
  useEffect(() => {
    if (!lastUpdated) {
      setRelativeTime("")
      return
    }

    const updateRelativeTime = () => {
      setRelativeTime(
        formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })
      )
    }

    updateRelativeTime()
    const interval = setInterval(updateRelativeTime, 60000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  return (
    <div
      className={cn(
        "flex items-center gap-3 text-sm text-muted-foreground",
        className
      )}
    >
      {/* Real-time indicator */}
      <div
        className="flex items-center gap-1.5"
        title={realtimeConnected ? "Real-time updates active" : "Real-time updates disconnected"}
      >
        {realtimeConnected ? (
          <Wifi className="h-3.5 w-3.5 text-primary" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="hidden sm:inline">
          {realtimeConnected ? "Live" : "Offline"}
        </span>
      </div>

      {/* Last updated time */}
      {lastUpdated && (
        <span className="hidden md:inline">
          Updated {relativeTime}
        </span>
      )}

      {/* Refresh button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="h-7 px-2"
        aria-label={isRefreshing ? "Refreshing data..." : "Refresh dashboard data"}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5 mr-1", isRefreshing && "animate-spin")}
        />
        <span className="hidden sm:inline">
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </span>
      </Button>
    </div>
  )
}
