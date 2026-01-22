"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { usePipelineStore, type Stage, type HealthStatus } from "@/stores/pipeline-store"

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const STAGES: Stage[] = [
  "Onboarding",
  "Installation",
  "Audit",
  "Live",
  "Needs Support",
  "Off-boarding",
]

// API expects lowercase health status values
type ApiHealthStatus = "green" | "yellow" | "red"

const HEALTH_STATUSES: { label: string; value: ApiHealthStatus }[] = [
  { label: "Green", value: "green" },
  { label: "Yellow", value: "yellow" },
  { label: "Red", value: "red" },
]

export function AddClientModal({
  isOpen,
  onClose,
  onSuccess,
}: AddClientModalProps) {
  const { toast } = useToast()
  const { fetchClients } = usePipelineStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactName, setContactName] = useState("")
  const [stage, setStage] = useState<Stage>("Onboarding")
  const [healthStatus, setHealthStatus] = useState<ApiHealthStatus>("green")
  const [notes, setNotes] = useState("")

  // Reset form to initial state
  const resetForm = () => {
    setName("")
    setContactEmail("")
    setContactName("")
    setStage("Onboarding")
    setHealthStatus("green")
    setNotes("")
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!name.trim()) {
      setError("Client name is required")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetchWithCsrf("/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          contact_email: contactEmail.trim() || null,
          contact_name: contactName.trim() || null,
          stage,
          health_status: healthStatus,
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) {
        // Safely parse error response
        let errorMsg = `Failed to create client (${response.status})`
        try {
          const data = await response.json()
          if (data.error) errorMsg = data.error
        } catch {
          // Response wasn't JSON, use default error message
        }
        throw new Error(errorMsg)
      }

      toast({
        title: "Client created",
        description: `${name} has been added to your pipeline.`,
        variant: "default",
      })

      // Reset form and close
      resetForm()

      // Refresh client list
      await fetchClients()

      onClose()
      onSuccess?.()
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to create client. Please try again."
      setError(errorMessage)
      toast({
        title: "Error creating client",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Add Client
          </DialogTitle>
          <DialogDescription>
            Add a new client to your pipeline. They will start in the selected stage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="client-name" className="text-sm">
              Client Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="client-name"
              type="text"
              placeholder="Acme Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="h-9"
              autoFocus
            />
          </div>

          {/* Two-column layout for contact info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="text-sm">
                Contact Name
              </Label>
              <Input
                id="contact-name"
                type="text"
                placeholder="John Smith"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={isSubmitting}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email" className="text-sm">
                Contact Email
              </Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="john@acme.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={isSubmitting}
                className="h-9"
              />
            </div>
          </div>

          {/* Two-column layout for stage and health */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage" className="text-sm">
                Starting Stage
              </Label>
              <Select
                value={stage}
                onValueChange={(value) => setStage(value as Stage)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="stage" className="h-9">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="health" className="text-sm">
                Health Status
              </Label>
              <Select
                value={healthStatus}
                onValueChange={(value) => setHealthStatus(value as ApiHealthStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="health" className="h-9">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {HEALTH_STATUSES.map((h) => (
                    <SelectItem key={h.value} value={h.value}>
                      {h.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any initial notes about this client..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2 py-2 px-3 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-500">{error}</p>
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="h-9 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
