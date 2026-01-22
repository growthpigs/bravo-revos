"use client"

import { useOnboardingStore, type Stage } from "@/stores/onboarding-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { StageBadge } from "./stage-badge"
import { Video, FileText, CheckCircle2, Clock, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export function ClientJourneyPanel() {
  const { selectedInstance } = useOnboardingStore()

  if (!selectedInstance) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a client to view their journey</p>
      </div>
    )
  }

  const ownerName = selectedInstance.triggered_by_user
    ? `${selectedInstance.triggered_by_user.first_name || ""} ${selectedInstance.triggered_by_user.last_name || ""}`.trim()
    : "Unknown"
  const ownerInitials = ownerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const journey = selectedInstance.journey
  const hasWelcomeVideo = !!journey?.welcome_video_url
  const hasIntakeSubmission = selectedInstance.responses && selectedInstance.responses.length > 0
  const submittedAt = hasIntakeSubmission
    ? format(new Date(selectedInstance.responses![0].submitted_at), "MMM d, yyyy")
    : null

  // Build stage status map
  const stages = (journey?.stages as Stage[] | undefined) || []
  const stageStatusMap = new Map(
    selectedInstance.stage_statuses?.map((s) => [s.stage_id, { status: s.status, platformStatuses: s.platform_statuses }]) || []
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={selectedInstance.triggered_by_user?.avatar_url || undefined} />
          <AvatarFallback>{ownerInitials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm text-muted-foreground">Owner: {ownerName}</p>
          <h2 className="font-semibold text-lg">Client Journey</h2>
        </div>
      </div>

      {/* Welcome Video Section */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Welcome Video</h3>
          </div>
          {hasWelcomeVideo ? (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Configured
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Not Set
            </span>
          )}
        </div>
        {hasWelcomeVideo && (
          <div className="mt-3 rounded bg-muted aspect-video flex items-center justify-center text-muted-foreground">
            <span className="text-sm">Video thumbnail</span>
          </div>
        )}
      </div>

      {/* Intake Form Section */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Intake Form</h3>
          </div>
          {hasIntakeSubmission ? (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Submitted
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-yellow-600">
              <Clock className="h-4 w-4" />
              Pending
            </span>
          )}
        </div>
        {hasIntakeSubmission && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-muted-foreground">Submitted on {submittedAt}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {selectedInstance.responses?.slice(0, 4).map((response) => (
                <div key={response.id} className="bg-muted rounded p-2">
                  <p className="text-xs text-muted-foreground">{response.field?.field_label}</p>
                  <p className="font-medium truncate">{response.value || "—"}</p>
                </div>
              ))}
            </div>
            <Link
              href={`/clients/${selectedInstance.client_id}`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View Full Details
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Stage Progress */}
      <div className="rounded-lg border p-4">
        <h3 className="font-medium mb-3">Stage Progress</h3>
        <div className="space-y-2">
          {stages.map((stage) => {
            const stageStatus = stageStatusMap.get(stage.id)
            return (
              <div key={stage.id} className="flex items-center justify-between">
                <span className="text-sm">{stage.name}</span>
                <StageBadge
                  name=""
                  status={(stageStatus?.status as "pending" | "in_progress" | "completed" | "blocked") || "pending"}
                  size="sm"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <a href={selectedInstance.portal_url} target="_blank" rel="noopener noreferrer">
            View as Client
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            if (selectedInstance.portal_url) {
              navigator.clipboard.writeText(selectedInstance.portal_url)
            }
          }}
        >
          Copy Portal Link
        </Button>
      </div>
    </div>
  )
}
