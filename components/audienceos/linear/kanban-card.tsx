"use client"

/**
 * KanbanCard - Draggable client card for the pipeline board
 *
 * Uses @dnd-kit useDraggable hook for drag operations.
 * The clientId (UUID) is used as the draggable ID for backend API calls.
 *
 * Dual rendering modes:
 * - Normal: Renders as draggable card in column
 * - Overlay: Renders in DragOverlay with elevated styling (isDragOverlay=true)
 *
 * PointerSensor activation: 8px distance prevents accidental drags on click.
 */

import React from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, MoreVertical, ExternalLink, Edit, UserPlus, Trash2, ArrowRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface KanbanCardProps {
  /** Display ID (e.g., "AB" for Agro Bros) - shown on card */
  id: string
  /** Client UUID - used as draggable ID for API operations */
  clientId: string
  /** Client name */
  name: string
  /** Health status indicator */
  health: "Green" | "Yellow" | "Red" | "Blocked"
  /** Owner info with avatar */
  owner: {
    name: string
    initials: string
    color: string
  }
  /** Days in current stage (highlights >4 days in red) */
  daysInStage: number
  /** Optional blocker tag */
  blocker?: string | null
  /** Client tier (Enterprise/Core/Starter) */
  tier?: string
  /** Click handler (opens detail panel) */
  onClick?: () => void
  /** When true, renders as overlay during drag (elevated styling) */
  isDragOverlay?: boolean
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

function getHealthCheckbox(health: string) {
  if (health === "Green") {
    return (
      <div className="w-4 h-4 bg-status-green rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }
  return (
    <div className={cn("w-4 h-4 rounded-full border-2",
      health === "Red" ? "border-status-red" :
      health === "Yellow" ? "border-status-yellow" :
      health === "Blocked" ? "border-status-blocked" :
      "border-border"
    )} />
  )
}

export function KanbanCard({
  id,
  clientId,
  name,
  health,
  owner,
  daysInStage,
  blocker,
  tier,
  onClick,
  isDragOverlay = false,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: clientId,
    data: { clientId, name, health, owner },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  // Render card content (shared between draggable and overlay)
  const cardContent = (
    <>
      {/* Header row: checkbox, ID, avatar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getHealthCheckbox(health)}
          <span className="text-xs text-muted-foreground font-mono">{id}</span>
        </div>
        <div className="flex items-center gap-1">
          <Avatar className={cn("h-5 w-5", owner.color)}>
            <AvatarFallback className={cn(owner.color, "text-[9px] font-medium text-white")}>
              {owner.initials}
            </AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Move to Stage
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Onboarding</DropdownMenuItem>
                  <DropdownMenuItem>Installation</DropdownMenuItem>
                  <DropdownMenuItem>Audit</DropdownMenuItem>
                  <DropdownMenuItem>Live</DropdownMenuItem>
                  <DropdownMenuItem>Needs Support</DropdownMenuItem>
                  <DropdownMenuItem>Off-boarding</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Brent</DropdownMenuItem>
                  <DropdownMenuItem>Roderic</DropdownMenuItem>
                  <DropdownMenuItem>Trevor</DropdownMenuItem>
                  <DropdownMenuItem>Chase</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm text-foreground leading-relaxed mb-3">{name}</h4>

      {/* Footer: health dot, days, blocker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", getHealthDotColor(health))} />
          {daysInStage > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className={cn(
                "text-xs",
                daysInStage > 4 ? "text-status-red font-medium" : "text-muted-foreground"
              )}>
                {daysInStage}d
              </span>
            </div>
          )}
        </div>
        {tier && (
          <span className="text-[10px] text-muted-foreground">{tier}</span>
        )}
      </div>

      {/* Blocker tag */}
      {blocker && (
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] bg-status-red/10 border border-status-red/30 rounded text-status-red">
            {blocker}
          </span>
        </div>
      )}
    </>
  )

  // For DragOverlay - render without drag handlers
  if (isDragOverlay) {
    return (
      <div className="bg-card border border-primary/50 rounded-lg p-3 shadow-lg cursor-grabbing">
        {cardContent}
      </div>
    )
  }

  // Normal draggable card
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        if (!isDragging) onClick?.()
      }}
      className={cn(
        "bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-grab group touch-none",
        isDragging && "opacity-30"
      )}
      {...attributes}
      {...listeners}
    >
      {cardContent}
    </div>
  )
}
