"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/stores/settings-store"
import { fetchWithCsrf } from "@/lib/csrf"
import {
  Workflow,
  GripVertical,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react"

// Default pipeline stages
const DEFAULT_STAGES = [
  "Onboarding",
  "Installation",
  "Audit",
  "Live",
  "Needs Support",
  "Off-Boarding",
]

export function PipelineSection() {
  const { toast } = useToast()
  const { agencySettings, updateAgencySettings, setHasUnsavedChanges } = useSettingsStore()

  // Local state
  const [stages, setStages] = useState<string[]>(DEFAULT_STAGES)
  const [yellowDays, setYellowDays] = useState(7)
  const [redDays, setRedDays] = useState(14)
  const [isSaving, setIsSaving] = useState(false)
  const [newStageName, setNewStageName] = useState("")

  // Sync with store
  useEffect(() => {
    if (agencySettings) {
      setStages(agencySettings.pipeline_stages || DEFAULT_STAGES)
      setYellowDays(agencySettings.health_thresholds?.yellow_days || 7)
      setRedDays(agencySettings.health_thresholds?.red_days || 14)
    }
  }, [agencySettings])

  const handleAddStage = () => {
    if (newStageName.trim() && !stages.includes(newStageName.trim())) {
      setStages([...stages, newStageName.trim()])
      setNewStageName("")
      setHasUnsavedChanges(true)
    }
  }

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 3) {
      toast({
        title: "Cannot remove stage",
        description: "Minimum 3 pipeline stages required",
        variant: "destructive",
      })
      return
    }
    setStages(stages.filter((_, i) => i !== index))
    setHasUnsavedChanges(true)
  }

  const handleStageRename = (index: number, newName: string) => {
    const updated = [...stages]
    updated[index] = newName
    setStages(updated)
    setHasUnsavedChanges(true)
  }

  const _handleMoveStage = (fromIndex: number, toIndex: number) => {
    const updated = [...stages]
    const [removed] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, removed)
    setStages(updated)
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    // Validation
    if (stages.length < 3) {
      toast({
        title: "Validation error",
        description: "Minimum 3 pipeline stages required",
        variant: "destructive",
      })
      return
    }

    if (yellowDays >= redDays) {
      toast({
        title: "Validation error",
        description: "Yellow threshold must be less than red threshold",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetchWithCsrf('/api/v1/settings/agency', {
        method: 'PATCH',
        body: JSON.stringify({
          pipeline_stages: stages,
          health_thresholds: { yellow: yellowDays, red: redDays },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save pipeline settings')
      }

      const { data } = await response.json()
      updateAgencySettings({
        pipeline_stages: data.pipeline_stages,
        health_thresholds: data.health_thresholds,
      })

      setHasUnsavedChanges(false)
      toast({
        title: "Pipeline settings saved",
        description: "Your pipeline configuration has been updated.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save pipeline settings'
      console.error('[PipelineSection] Error saving settings:', message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h2 className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5" />
          Pipeline Stages
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Configure client pipeline stages and health thresholds
        </p>
      </div>

      {/* Pipeline Stages Card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium">Pipeline Stages</CardTitle>
          <CardDescription className="text-[10px]">
            Drag to reorder. Each client moves through these stages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          {stages.map((stage, index) => (
            <div
              key={`${stage}-${index}`}
              className="flex items-center gap-1.5 p-1.5 rounded-md bg-secondary/30 border border-border"
            >
              <button
                className="cursor-grab hover:bg-muted rounded p-0.5"
                title="Drag to reorder"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </button>
              <span className="w-5 text-[10px] text-muted-foreground font-mono">
                {index + 1}.
              </span>
              <Input
                value={stage}
                onChange={(e) => handleStageRename(index, e.target.value)}
                className="flex-1 bg-transparent border-0 h-6 text-[11px] focus-visible:ring-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveStage(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Add New Stage */}
          <div className="flex items-center gap-1.5 pt-1.5">
            <Input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="New stage name..."
              className="bg-secondary border-border h-7 text-[11px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddStage()
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddStage}
              disabled={!newStageName.trim()}
              className="h-7 text-[10px] bg-transparent"
            >
              <Plus className="h-3 w-3 mr-0.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Health Thresholds Card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-500" />
            Health Thresholds
          </CardTitle>
          <CardDescription className="text-[10px]">
            Define when clients are flagged as yellow or red based on days in stage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-3 pb-3">
          {/* Yellow Threshold */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <Label className="text-[10px] font-medium">Yellow Warning</Label>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <span className="text-[10px] text-muted-foreground">After</span>
              <Input
                type="number"
                min={1}
                max={redDays - 1}
                value={yellowDays}
                onChange={(e) => {
                  setYellowDays(parseInt(e.target.value) || 7)
                  setHasUnsavedChanges(true)
                }}
                className="w-14 bg-secondary border-border h-6 text-[10px]"
              />
              <span className="text-[10px] text-muted-foreground">days in the same stage</span>
            </div>
          </div>

          {/* Red Threshold */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <Label className="text-[10px] font-medium">Red Alert</Label>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <span className="text-[10px] text-muted-foreground">After</span>
              <Input
                type="number"
                min={yellowDays + 1}
                value={redDays}
                onChange={(e) => {
                  setRedDays(parseInt(e.target.value) || 14)
                  setHasUnsavedChanges(true)
                }}
                className="w-14 bg-secondary border-border h-6 text-[10px]"
              />
              <span className="text-[10px] text-muted-foreground">days in the same stage</span>
            </div>
          </div>

          {/* Preview */}
          <div className="p-2.5 rounded-md bg-muted/50">
            <p className="text-[10px] text-muted-foreground">
              <strong>Preview:</strong> Clients will turn yellow after{" "}
              <span className="text-amber-600 dark:text-amber-500 font-medium">{yellowDays} days</span> and red
              after <span className="text-red-600 dark:text-red-500 font-medium">{redDays} days</span> in any
              stage.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2 pt-3 border-t border-border">
        <Button variant="outline" disabled={isSaving} className="h-7 text-[10px] bg-transparent">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="h-7 text-[10px]">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
