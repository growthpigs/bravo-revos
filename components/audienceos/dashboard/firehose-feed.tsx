"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Flame } from "lucide-react"
import { FirehoseItem, FirehoseItemSkeleton, type FirehoseItemData } from "./firehose-item"

type FirehoseFilter = "all" | "critical" | "action" | "fyi"

interface FirehoseFeedProps {
  items: FirehoseItemData[]
  onItemClick?: (item: FirehoseItemData) => void
  isLoading?: boolean
  className?: string
}

const filterConfig: { id: FirehoseFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "action", label: "Needs Action" },
  { id: "fyi", label: "FYI" },
]

export function FirehoseFeed({ items, onItemClick, isLoading, className }: FirehoseFeedProps) {
  const [activeFilter, setActiveFilter] = useState<FirehoseFilter>("all")

  const filteredItems = items.filter((item) => {
    if (activeFilter === "all") return true
    if (activeFilter === "critical") return item.severity === "critical"
    if (activeFilter === "action") return item.severity === "critical" || item.severity === "warning"
    if (activeFilter === "fyi") return item.severity === "info"
    return true
  })

  return (
    <div className={cn("flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-medium text-foreground">Firehose</h3>
          <span className="text-xs text-muted-foreground">
            {filteredItems.length} items
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          {filterConfig.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors cursor-pointer",
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed list - natural flow, no nested scroll */}
      <div className="flex-1">
        {isLoading ? (
          <>
            <FirehoseItemSkeleton />
            <FirehoseItemSkeleton />
            <FirehoseItemSkeleton />
            <FirehoseItemSkeleton />
            <FirehoseItemSkeleton />
          </>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No items to show
          </div>
        ) : (
          filteredItems.map((item) => (
            <FirehoseItem
              key={item.id}
              item={item}
              onClick={onItemClick}
            />
          ))
        )}
      </div>
    </div>
  )
}
