"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle, UserX } from "lucide-react"
import type { Stage } from "@/types/pipeline"

interface StageConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientName: string
  fromStage: Stage
  toStage: Stage
  onConfirm: (notes?: string) => void
  onCancel: () => void
}

const SENSITIVE_STAGES: Stage[] = ["Needs Support", "Off-boarding"]

function getStageIcon(stage: Stage) {
  switch (stage) {
    case "Needs Support":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />
    case "Off-boarding":
      return <UserX className="h-5 w-5 text-rose-500" />
    default:
      return null
  }
}

function getStageDescription(stage: Stage): string {
  switch (stage) {
    case "Needs Support":
      return "This will flag the client as needing attention. The client will appear in at-risk reports and team members will be notified."
    case "Off-boarding":
      return "This indicates the client is in the process of leaving. This action should be taken only after discussing with the client."
    default:
      return ""
  }
}

function getStageColor(stage: Stage): string {
  switch (stage) {
    case "Needs Support":
      return "bg-amber-500/10 border-amber-500/30"
    case "Off-boarding":
      return "bg-rose-500/10 border-rose-500/30"
    default:
      return ""
  }
}

export function StageConfirmModal({
  open,
  onOpenChange,
  clientName,
  fromStage,
  toStage,
  onConfirm,
  onCancel,
}: StageConfirmModalProps) {
  const [notes, setNotes] = useState("")

  const handleConfirm = () => {
    onConfirm(notes.trim() || undefined)
    setNotes("")
  }

  const handleCancel = () => {
    onCancel()
    setNotes("")
  }

  const isSensitive = SENSITIVE_STAGES.includes(toStage)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getStageIcon(toStage)}
            Confirm Stage Change
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are about to move <span className="font-medium text-foreground">{clientName}</span> from{" "}
                <span className="font-medium">{fromStage}</span> to{" "}
                <span className="font-medium">{toStage}</span>.
              </p>
              {isSensitive && (
                <div className={`p-3 rounded-lg border ${getStageColor(toStage)}`}>
                  <p className="text-sm">{getStageDescription(toStage)}</p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Reason for move (optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Add a note explaining why this client is being moved..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              toStage === "Off-boarding"
                ? "bg-rose-600 hover:bg-rose-700"
                : toStage === "Needs Support"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : ""
            }
          >
            Confirm Move
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Export helper to check if a stage is sensitive
export function isSensitiveStage(stage: Stage): boolean {
  return SENSITIVE_STAGES.includes(stage)
}
