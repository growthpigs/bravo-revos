"use client"

/**
 * KanbanColumn - Droppable zone for a single pipeline stage
 *
 * Uses @dnd-kit useDroppable hook to register as a drop target.
 * The column's title (stage name) serves as the droppable ID.
 *
 * Visual feedback: Highlights with bg-primary/5 when a card hovers over it.
 */

import React from "react"
import { useDroppable } from "@dnd-kit/core"
import { KanbanCard } from "./kanban-card"
import { MoreHorizontal, Plus, SortAsc, Filter, EyeOff, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type MinimalClient, getOwnerData } from "@/types/client"

interface KanbanColumnProps {
  /** Stage name (e.g., "Onboarding", "Live") - also used as droppable ID */
  title: string
  /** Clients currently in this stage */
  clients: MinimalClient[]
  /** Optional color indicator (unused, reserved for future) */
  color?: string
  /** Callback when a card is clicked */
  onClientClick?: (client: MinimalClient) => void
  /** Callback when the "+" button is clicked */
  onAddClick?: () => void
}

function getColumnIndicator(title: string) {
  switch (title) {
    case "Live":
      return <div className="w-2 h-2 bg-status-green rounded-full" />
    case "Installation":
    case "Audit":
      return <div className="w-2 h-2 bg-primary rounded-full" />
    case "Intake":
    case "Access":
      return <div className="w-2 h-2 bg-status-yellow rounded-full" />
    case "Needs Support":
    case "Off-boarding":
      return <div className="w-2 h-2 bg-status-red rounded-full" />
    default:
      return <div className="w-2 h-2 bg-muted-foreground rounded-full" />
  }
}

export function KanbanColumn({
  title,
  clients,
  onClientClick,
  onAddClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: title, // Stage name is the droppable ID
  })

  return (
    <div className={cn(
      "flex-shrink-0 w-72 border-r border-border last:border-r-0 transition-colors duration-200",
      isOver && "bg-primary/5"
    )}>
      {/* Column header */}
      <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-background">
        <div className="flex items-center gap-2">
          {getColumnIndicator(title)}
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">{clients.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <SortAsc className="w-4 h-4 mr-2" />
                Sort by Health
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Column
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Column Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onAddClick}>
            <Plus className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Cards container - droppable zone */}
      <div ref={setNodeRef} className="p-2 space-y-2 min-h-[400px]">
        {clients.map((client) => {
          const ownerData = getOwnerData(client.owner)
          return (
            <KanbanCard
              key={client.id}
              id={client.logo}
              clientId={client.id}
              name={client.name}
              health={client.health}
              owner={{
                name: ownerData.name,
                initials: ownerData.avatar,
                color: ownerData.color,
              }}
              daysInStage={client.daysInStage}
              blocker={client.blocker}
              tier={client.tier}
              onClick={() => onClientClick?.(client)}
            />
          )
        })}

        {clients.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No clients
          </div>
        )}
      </div>
    </div>
  )
}
