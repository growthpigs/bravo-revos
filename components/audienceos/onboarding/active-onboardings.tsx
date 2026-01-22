"use client"

/**
 * @fileoverview Active Onboardings - Accordion UI with Animated Detail Panel
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  🛡️  PROTECTED COMPONENT - DO NOT REMOVE OR REPLACE                       ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  This component displays the beautiful accordion-style onboarding         ║
 * ║  pipeline that Chase specifically requested. It features:                 ║
 * ║                                                                           ║
 * ║  • 6 expandable stage cards with Framer Motion animations                 ║
 * ║  • Sliding detail panel when selecting a client                           ║
 * ║  • Real-time connection to onboarding store data                          ║
 * ║  • Compact mode for side-by-side viewing                                  ║
 * ║                                                                           ║
 * ║  History:                                                                 ║
 * ║  - Original: Created with accordion stages (pre-2026-01-08)               ║
 * ║  - Removed: Accidentally replaced with simple grid (2026-01-08)           ║
 * ║  - Restored: By user request (2026-01-10, commit 363e09f)                 ║
 * ║                                                                           ║
 * ║  User quote: "It was really beautiful and it had an animation and         ║
 * ║  everything. Things you clicked on it and it dropped down."               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * @author Chi (restored by request)
 * @since 2026-01-10
 */

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSlideTransition } from "@/hooks/use-slide-transition"
import { useOnboardingStore, type OnboardingInstanceWithRelations, type Stage } from "@/stores/onboarding-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  ClipboardList,
  Key,
  Wrench,
  FileCheck,
  Rocket,
  AlertTriangle,
  X,
  ChevronRight,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Inbox,
  Play,
} from "lucide-react"
import { differenceInDays } from "date-fns"

// =============================================================================
// ONBOARDING STAGES CONFIGURATION
// =============================================================================

type OnboardingStageId = "intake" | "access" | "installation" | "audit" | "live" | "needs_support"

interface OnboardingStageConfig {
  id: OnboardingStageId
  name: string
  icon: React.ReactNode
  color: string
  description: string
}

const onboardingStages: OnboardingStageConfig[] = [
  {
    id: "intake",
    name: "Intake Received",
    icon: <ClipboardList className="w-4 h-4" />,
    color: "text-orange-500",
    description: "New clients pending initial setup",
  },
  {
    id: "access",
    name: "Access Verified",
    icon: <Key className="w-4 h-4" />,
    color: "text-yellow-500",
    description: "Waiting for client credentials and platform access",
  },
  {
    id: "installation",
    name: "Pixel Install",
    icon: <Wrench className="w-4 h-4" />,
    color: "text-blue-500",
    description: "Setting up tracking, pixels, and integrations",
  },
  {
    id: "audit",
    name: "Audit Complete",
    icon: <FileCheck className="w-4 h-4" />,
    color: "text-purple-500",
    description: "Reviewing account setup and configuration",
  },
  {
    id: "live",
    name: "Live Support",
    icon: <Rocket className="w-4 h-4" />,
    color: "text-emerald-500",
    description: "Clients successfully onboarded and active",
  },
  {
    id: "needs_support",
    name: "Needs Support",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-red-500",
    description: "Clients with onboarding blockers",
  },
]

// Map instance status/stage to onboarding stage
function getOnboardingStageForInstance(instance: OnboardingInstanceWithRelations): OnboardingStageId {
  // Check if any stage has "blocked" status
  const hasBlocker = instance.stage_statuses?.some(s => s.status === "blocked")
  if (hasBlocker) return "needs_support"

  // Check if all stages are completed
  const stages = (instance.journey?.stages as Stage[] | undefined) || []
  const completedStages = instance.stage_statuses?.filter(s => s.status === "completed") || []
  if (completedStages.length === stages.length && stages.length > 0) return "live"

  // Find the current stage based on stage_statuses
  const inProgressStage = instance.stage_statuses?.find(s => s.status === "in_progress")
  if (inProgressStage) {
    const stageIndex = stages.findIndex(s => s.id === inProgressStage.stage_id)
    if (stageIndex === 0) return "intake"
    if (stageIndex === 1) return "access"
    if (stageIndex === 2) return "installation"
    if (stageIndex === 3) return "audit"
    return "live"
  }

  // Default to intake if pending
  return "intake"
}

// =============================================================================
// DETAIL PANEL COMPONENT
// =============================================================================

interface ClientDetailPanelProps {
  instance: OnboardingInstanceWithRelations
  stage: OnboardingStageConfig
  onClose: () => void
  onUpdateStageStatus: (instanceId: string, stageId: string, status: string) => Promise<void>
  onViewFullProfile?: (clientId: string) => void
}

function ClientDetailPanel({ instance, stage, onClose, onUpdateStageStatus, onViewFullProfile }: ClientDetailPanelProps) {
  const clientName = instance.client?.name || "Unknown Client"
  const ownerName = instance.triggered_by_user
    ? `${instance.triggered_by_user.first_name || ""} ${instance.triggered_by_user.last_name || ""}`.trim()
    : "Unknown"
  const daysInStage = differenceInDays(new Date(), new Date(instance.triggered_at))
  const stages = (instance.journey?.stages as Stage[] | undefined) || []
  const stageStatusMap = new Map(
    instance.stage_statuses?.map((s) => [s.stage_id, s.status]) || []
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Detail Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 bg-primary">
            <AvatarImage src={instance.triggered_by_user?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
              {clientName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{clientName}</h2>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs", stage.color)}>{stage.name}</span>
              <span className="text-xs text-muted-foreground">• {daysInStage}d in stage</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-secondary rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Client Info */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Info</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Owner:</span>
              <span className="text-foreground">{ownerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Days in Stage:</span>
              <span className="text-foreground">{daysInStage} days</span>
            </div>
            {instance.client?.contact_email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-foreground">{instance.client.contact_email}</span>
              </div>
            )}
            {/* View Full Profile Button */}
            {instance.client?.id && onViewFullProfile && (
              <button
                onClick={() => onViewFullProfile(instance.client!.id)}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                View Full Profile
              </button>
            )}
          </div>
        </div>

        {/* Journey Progress */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Journey Progress
          </h3>
          <p className="text-xs text-muted-foreground">Click to toggle completion status</p>
          <div className="space-y-1">
            {stages.map((s) => {
              const status = stageStatusMap.get(s.id) || "pending"
              const isCompleted = status === "completed"
              const isInProgress = status === "in_progress"
              const isBlocked = status === "blocked"

              // Toggle handler - completed ↔ pending
              const handleToggle = async () => {
                const newStatus = isCompleted ? "pending" : "completed"
                await onUpdateStageStatus(instance.id, s.id, newStatus)
              }

              return (
                <button
                  key={s.id}
                  onClick={handleToggle}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                    "hover:ring-2 hover:ring-primary/30",
                    isCompleted && "bg-emerald-500/5",
                    isInProgress && "bg-blue-500/5",
                    isBlocked && "bg-red-500/5",
                    !isCompleted && !isInProgress && !isBlocked && "bg-secondary/30"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : isInProgress ? (
                    <Play className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : isBlocked ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={cn(
                    "text-sm text-left flex-1",
                    isCompleted && "line-through text-muted-foreground"
                  )}>
                    {s.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Portal Link */}
        {instance.link_token && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Portal Link</h3>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <code className="text-xs text-muted-foreground break-all">
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/onboarding/start?token=${instance.link_token}`}
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// DRAGGABLE CLIENT ITEM
// =============================================================================

interface DraggableClientProps {
  instance: OnboardingInstanceWithRelations
  isSelected: boolean
  isCompact: boolean
  onSelect: (instance: OnboardingInstanceWithRelations) => void
}

function DraggableClient({ instance, isSelected, isCompact, onSelect }: DraggableClientProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: instance.id,
    data: { instance },
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const clientName = instance.client?.name || "Unknown"
  const ownerName = instance.triggered_by_user
    ? `${instance.triggered_by_user.first_name || ""} ${instance.triggered_by_user.last_name || ""}`.trim()
    : "Unknown"
  const daysInStage = differenceInDays(new Date(), new Date(instance.triggered_at))

  // Check if instance is completed (all stages done)
  const stages = (instance.journey?.stages as Stage[] | undefined) || []
  const completedStages = instance.stage_statuses?.filter(s => s.status === "completed") || []
  const isCompleted = completedStages.length === stages.length && stages.length > 0

  if (isCompact) {
    // Compact view
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 pl-8 transition-colors cursor-grab active:cursor-grabbing",
          isSelected
            ? "bg-primary/10 border-l-2 border-l-primary"
            : "hover:bg-secondary/30",
          isDragging && "opacity-50",
          isCompleted && "opacity-70"
        )}
        {...listeners}
        {...attributes}
        onClick={() => onSelect(instance)}
      >
        <Avatar className="h-5 w-5 bg-primary">
          <AvatarFallback className="bg-primary text-[8px] font-medium text-primary-foreground">
            {clientName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          "text-xs text-foreground truncate flex-1 text-left",
          isCompleted && "line-through"
        )}>
          {clientName}
        </span>
      </div>
    )
  }

  // Full view
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        isCompleted && "opacity-70"
      )}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(instance)}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 bg-primary">
          <AvatarImage src={instance.triggered_by_user?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
            {clientName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-left">
          <p className={cn(
            "text-sm font-medium text-foreground",
            isCompleted && "line-through"
          )}>
            {clientName}
          </p>
          <p className="text-xs text-muted-foreground">{ownerName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className={cn(
            "text-xs",
            daysInStage > 4 ? "text-status-red" : ""
          )}>
            {daysInStage}d
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  )
}

// =============================================================================
// DROPPABLE STAGE ROW COMPONENT (Accordion item)
// =============================================================================

interface StageRowProps {
  stage: OnboardingStageConfig
  instances: OnboardingInstanceWithRelations[]
  isExpanded: boolean
  isCompact: boolean
  selectedInstanceId: string | null
  onToggle: () => void
  onInstanceSelect: (instance: OnboardingInstanceWithRelations) => void
}

function StageRow({ stage, instances, isExpanded, isCompact, selectedInstanceId, onToggle, onInstanceSelect }: StageRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stage },
  })

  if (isCompact) {
    // Compact view when detail panel is open
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "border-b border-border/30 transition-colors",
          isOver && "bg-primary/5 border-primary/30"
        )}
      >
        {/* Stage Header - Compact */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/30 transition-colors cursor-pointer"
        >
          <ChevronRight className={cn(
            "w-3 h-3 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-90"
          )} />
          <span className={stage.color}>{stage.icon}</span>
          <span className="text-sm font-medium text-foreground flex-1 text-left">{stage.name}</span>
          <span className="text-xs text-muted-foreground">{instances.length}</span>
        </button>

        {/* Instances - Compact */}
        <AnimatePresence>
          {isExpanded && instances.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pb-2">
                {instances.map((instance) => (
                  <DraggableClient
                    key={instance.id}
                    instance={instance}
                    isSelected={selectedInstanceId === instance.id}
                    isCompact={true}
                    onSelect={onInstanceSelect}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full card view when no detail panel
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-card rounded-lg border border-border/50 overflow-hidden transition-colors",
        isOver && "bg-primary/5 border-primary/30"
      )}
    >
      {/* Stage Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer"
      >
        <ChevronRight className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          isExpanded && "rotate-90"
        )} />
        <span className={stage.color}>{stage.icon}</span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{stage.name}</span>
            <span className="text-xs text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
              {instances.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
        </div>
      </button>

      {/* Instances */}
      <AnimatePresence>
        {isExpanded && instances.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 divide-y divide-border/30">
              {instances.map((instance) => (
                <DraggableClient
                  key={instance.id}
                  instance={instance}
                  isSelected={selectedInstanceId === instance.id}
                  isCompact={false}
                  onSelect={onInstanceSelect}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {isExpanded && instances.length === 0 && (
        <div className="border-t border-border/30 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No clients in this stage</p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MAIN ACTIVE ONBOARDINGS COMPONENT
// =============================================================================

interface ActiveOnboardingsProps {
  /** Callback when user wants to navigate to full client profile */
  onClientClick?: (clientId: string) => void
}

export function ActiveOnboardings({ onClientClick }: ActiveOnboardingsProps) {
  const {
    instances,
    isLoadingInstances,
    fetchInstances,
    selectedInstance,
    setSelectedInstanceId,
    updateStageStatus,
  } = useOnboardingStore()

  const [expandedStages, setExpandedStages] = useState<Set<OnboardingStageId>>(
    new Set(["intake", "access", "installation"])
  )

  const [activeInstance, setActiveInstance] = useState<OnboardingInstanceWithRelations | null>(null)

  // Set up drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before starting
      },
    })
  )

  // Handler to select instance - updates store so buttons work
  const handleSelectInstance = (instance: OnboardingInstanceWithRelations) => {
    setSelectedInstanceId(instance.id)
  }

  // Handler to clear selection
  const handleClearSelection = () => {
    setSelectedInstanceId(null)
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const instance = event.active.data.current?.instance
    if (instance) {
      setActiveInstance(instance)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveInstance(null)

    if (!over || active.id === over.id) {
      return
    }

    const instance = active.data.current?.instance
    const targetStage = over.data.current?.stage

    if (instance && targetStage) {
      // Move instance to new stage (this would trigger API call in real app)
      console.log(`Moving ${instance.client?.name || 'client'} to ${targetStage.name} stage`)
      // TODO: Implement stage transition API call
      // updateStageStatus(instance.id, targetStage.id, 'in_progress')
    }
  }

  const slideTransition = useSlideTransition()

  useEffect(() => {
    fetchInstances()
  }, [fetchInstances])

  // Group instances by onboarding stage
  const instancesByStage = instances.reduce((acc, instance) => {
    const stage = getOnboardingStageForInstance(instance)
    if (!acc[stage]) acc[stage] = []
    acc[stage].push(instance)
    return acc
  }, {} as Record<OnboardingStageId, OnboardingInstanceWithRelations[]>)

  const toggleStage = (stage: OnboardingStageId) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }

  const selectedStage = selectedInstance
    ? onboardingStages.find(s => s.id === getOnboardingStageForInstance(selectedInstance))
    : null

  const isCompact = selectedInstance !== null

  if (isLoadingInstances && instances.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Inbox className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No active onboardings</p>
        <p className="text-sm">Trigger a new onboarding to get started</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full overflow-hidden rounded-lg border border-border/50">
        {/* LEFT PANEL - Stages Accordion (always visible) */}
        <motion.div
          initial={false}
          animate={{ width: isCompact ? 320 : "100%" }}
          transition={slideTransition}
          className="flex flex-col border-r border-border/50 bg-muted/30 overflow-hidden"
          style={{ minWidth: isCompact ? 320 : undefined, flexShrink: isCompact ? 0 : undefined }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/50 bg-background shrink-0">
            <h2 className="text-sm font-semibold text-foreground">Onboarding Pipeline</h2>
            {!isCompact && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Track client onboarding progress through each stage
              </p>
            )}
          </div>

          {/* Stages Accordion - natural flow */}
          <div className="flex-1 p-4 space-y-3">
            {onboardingStages.map((stage) => {
              const stageInstances = instancesByStage[stage.id] || []
              const isExpanded = expandedStages.has(stage.id)

              return (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  instances={stageInstances}
                  isExpanded={isExpanded}
                  isCompact={isCompact}
                  selectedInstanceId={selectedInstance?.id || null}
                  onToggle={() => toggleStage(stage.id)}
                  onInstanceSelect={handleSelectInstance}
                />
              )
            })}
          </div>
        </motion.div>

        {/* RIGHT PANEL - Client Detail View */}
        <AnimatePresence mode="wait">
          {selectedInstance && selectedStage && (
            <motion.div
              key="client-detail-panel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={slideTransition}
              className="flex-1 flex flex-col bg-background overflow-hidden"
            >
              <ClientDetailPanel
                instance={selectedInstance}
                stage={selectedStage}
                onClose={handleClearSelection}
                onUpdateStageStatus={updateStageStatus}
                onViewFullProfile={onClientClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeInstance && (
          <div className="flex items-center gap-3 px-4 py-3 bg-background border border-border/50 rounded-lg shadow-lg">
            <Avatar className="h-8 w-8 bg-primary">
              <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                {(activeInstance.client?.name || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">
                {activeInstance.client?.name || "Unknown Client"}
              </p>
              <p className="text-xs text-muted-foreground">Dragging to new stage...</p>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
