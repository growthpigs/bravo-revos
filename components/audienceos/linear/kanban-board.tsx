"use client"

/**
 * KanbanBoard - Drag-and-drop pipeline board using @dnd-kit
 *
 * Architecture:
 * - DndContext: Wraps the board, provides drag state and collision detection
 * - KanbanColumn: Droppable zones (one per pipeline stage)
 * - KanbanCard: Draggable items (one per client)
 * - DragOverlay: Visual feedback during drag (renders ghost card)
 *
 * Flow: DragStart → track activeClient → DragEnd → call onClientMove
 */

import React, { useState, useCallback } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"
import { PIPELINE_STAGES, type Stage, type MinimalClient, getOwnerData } from "@/types/client"

interface KanbanBoardProps {
  /** All clients to display across pipeline stages */
  clients: MinimalClient[]
  /** Callback when a client card is clicked (opens detail panel) */
  onClientClick?: (client: MinimalClient) => void
  /** Callback when a client is dragged to a new stage */
  onClientMove?: (clientId: string, toStage: Stage) => void
}

export function KanbanBoard({ clients, onClientClick, onClientMove }: KanbanBoardProps) {
  const [activeClient, setActiveClient] = useState<MinimalClient | null>(null)

  // Configure sensors: 8px drag distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Group clients by stage
  const getClientsForStage = (stage: Stage) =>
    clients.filter((c) => c.stage === stage)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const client = clients.find((c) => c.id === active.id)
    if (client) {
      setActiveClient(client)
    }
  }, [clients])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    setActiveClient(null)

    if (!over) return

    const clientId = active.id as string
    const newStage = over.id as Stage

    // Find the client being dragged
    const draggedClient = clients.find((c) => c.id === clientId)
    if (!draggedClient) return

    // Don't do anything if dropped on the same stage
    if (draggedClient.stage === newStage) return

    // Call the onClientMove callback if provided
    if (onClientMove) {
      onClientMove(clientId, newStage)
    }
  }, [clients, onClientMove])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full min-w-max">
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              title={stage}
              clients={getClientsForStage(stage)}
              onClientClick={onClientClick}
            />
          ))}
        </div>
      </div>

      {/* Drag Overlay - renders the card being dragged */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
      }}>
        {activeClient ? (() => {
          const ownerData = getOwnerData(activeClient.owner)
          return (
            <KanbanCard
              id={activeClient.logo}
              clientId={activeClient.id}
              name={activeClient.name}
              health={activeClient.health}
              owner={{
                name: ownerData.name,
                initials: ownerData.avatar,
                color: ownerData.color,
              }}
              daysInStage={activeClient.daysInStage}
              blocker={activeClient.blocker}
              tier={activeClient.tier}
              isDragOverlay
            />
          )
        })() : null}
      </DragOverlay>
    </DndContext>
  )
}
