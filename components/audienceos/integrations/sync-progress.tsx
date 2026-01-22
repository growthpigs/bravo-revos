"use client"

import { cn } from "@/lib/utils"
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export type SyncStatus = "idle" | "syncing" | "success" | "failed"

interface SyncProgressProps {
  status: SyncStatus
  lastSyncAt?: string | null
  progress?: number // 0-100, only used when syncing
  onSync?: () => void
  onCancel?: () => void
  className?: string
}

export function SyncProgress({
  status,
  lastSyncAt,
  progress,
  onSync,
  onCancel,
  className,
}: SyncProgressProps) {
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "syncing" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                Syncing... {progress !== undefined && `${progress}%`}
              </span>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-emerald-500">Sync complete</span>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-500">Sync failed</span>
            </>
          )}
          {status === "idle" && lastSyncAt && (
            <>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Last sync: {formatRelativeTime(lastSyncAt)}
              </span>
            </>
          )}
        </div>

        {status === "syncing" && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {(status === "idle" || status === "failed") && onSync && (
          <Button variant="ghost" size="sm" onClick={onSync}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync Now
          </Button>
        )}
      </div>

      {status === "syncing" && progress !== undefined && (
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

interface SyncTimestampProps {
  lastSyncAt: string | null
  className?: string
}

export function SyncTimestamp({ lastSyncAt, className }: SyncTimestampProps) {
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never synced"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {formatRelativeTime(lastSyncAt)}
    </span>
  )
}
