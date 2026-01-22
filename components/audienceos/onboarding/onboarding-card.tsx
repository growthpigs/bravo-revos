"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StageBadge } from "./stage-badge"
import type { OnboardingInstanceWithRelations, Stage } from "@/stores/onboarding-store"
import { differenceInDays } from "date-fns"

interface OnboardingCardProps {
  instance: OnboardingInstanceWithRelations
  isSelected: boolean
  onClick: () => void
}

export function OnboardingCard({ instance, isSelected, onClick }: OnboardingCardProps) {
  const clientName = instance.client?.name || "Unknown Client"
  // Note: tier is not stored in database - using client stage or default
  const clientTier = instance.client?.stage === "Enterprise" ? "Enterprise" : "Core"
  const ownerName = instance.triggered_by_user
    ? `${instance.triggered_by_user.first_name || ""} ${instance.triggered_by_user.last_name || ""}`.trim()
    : "Unknown"
  const ownerInitials = ownerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const daysInStage = differenceInDays(new Date(), new Date(instance.triggered_at))
  const stages = (instance.journey?.stages as Stage[] | undefined) || []

  // Build stage status map
  const stageStatusMap = new Map(
    instance.stage_statuses?.map((s) => [s.stage_id, { status: s.status, platformStatuses: s.platform_statuses }]) || []
  )

  return (
    <div
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-muted-foreground/30"
      )}
      onClick={onClick}
    >
      {/* Header: Client name and tier */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-foreground">{clientName}</h3>
          <Badge
            variant={clientTier === "Enterprise" ? "default" : "secondary"}
            className="mt-1 text-xs"
          >
            {clientTier}
          </Badge>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>{daysInStage} days</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={instance.triggered_by_user?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">{ownerInitials}</AvatarFallback>
            </Avatar>
            <span className="text-xs">{ownerName}</span>
          </div>
        </div>
      </div>

      {/* Stage progress */}
      <div className="flex flex-wrap gap-1.5">
        {stages.map((stage) => {
          const stageStatus = stageStatusMap.get(stage.id)
          return (
            <StageBadge
              key={stage.id}
              name={stage.name}
              status={(stageStatus?.status as "pending" | "in_progress" | "completed" | "blocked") || "pending"}
              platformStatuses={stageStatus?.platformStatuses as Record<string, string> | undefined}
              size="sm"
            />
          )
        })}
      </div>
    </div>
  )
}
