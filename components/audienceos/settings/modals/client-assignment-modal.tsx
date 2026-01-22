"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MultiSelectDropdown, type MultiSelectOption } from "@/components/ui/multi-select-dropdown"
import {
  Users,
  AlertCircle,
  Loader2,
  X,
  Building2,
  Eye,
  Pencil,
} from "lucide-react"
import { useClientAssignment } from "@/hooks/use-client-assignment"
import { useToast } from "@/hooks/use-toast"
import type { TeamMember } from "@/types/settings"
import { cn } from "@/lib/utils"

interface ClientAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  member: TeamMember | null
  onSuccess?: () => void
}

export function ClientAssignmentModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}: ClientAssignmentModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [newPermission, setNewPermission] = useState<"read" | "write">("read")

  const {
    assignments,
    availableClients,
    isLoading,
    error,
    fetchAssignments,
    fetchAvailableClients,
    assignClient,
    updatePermission,
    removeAssignment,
  } = useClientAssignment(member?.id || "")

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && member?.id) {
      fetchAssignments()
      fetchAvailableClients()
    }
  }, [isOpen, member?.id, fetchAssignments, fetchAvailableClients])

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedClientIds([])
      setNewPermission("read")
    }
  }, [isOpen])

  // Filter available clients to exclude already assigned ones
  const unassignedClients = useMemo(() => {
    const assignedIds = new Set(assignments.map((a) => a.client_id))
    return availableClients.filter((c) => !assignedIds.has(c.id))
  }, [availableClients, assignments])

  // Convert to MultiSelectOption format
  const clientOptions: MultiSelectOption[] = unassignedClients.map((client) => ({
    value: client.id,
    label: client.company_name || client.name,
    metadata: { logo_url: client.logo_url },
  }))

  // Handle assigning selected clients
  const handleAssign = async () => {
    if (selectedClientIds.length === 0) return

    setIsSubmitting(true)
    let successCount = 0

    for (const clientId of selectedClientIds) {
      const success = await assignClient(clientId, newPermission)
      if (success) successCount++
    }

    setIsSubmitting(false)
    setSelectedClientIds([])

    if (successCount > 0) {
      toast({
        title: "Clients assigned",
        description: `${successCount} client${successCount > 1 ? "s" : ""} assigned to ${member?.first_name}`,
      })
      onSuccess?.()
    }
  }

  // Handle permission change for existing assignment
  const handlePermissionChange = async (assignmentId: string, permission: "read" | "write") => {
    const success = await updatePermission(assignmentId, permission)
    if (success) {
      toast({
        title: "Permission updated",
        description: `Changed to ${permission} access`,
      })
    }
  }

  // Handle removing an assignment
  const handleRemove = async (assignmentId: string, clientName: string) => {
    const success = await removeAssignment(assignmentId)
    if (success) {
      toast({
        title: "Assignment removed",
        description: `${clientName} access revoked`,
      })
      onSuccess?.()
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  if (!member) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Client Access
          </DialogTitle>
          <DialogDescription>
            Assign clients to{" "}
            <span className="font-medium text-foreground">
              {member.first_name} {member.last_name}
            </span>
            . Members can only see clients they are assigned to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2 py-2 px-3 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-500">{error}</p>
            </div>
          )}

          {/* Add New Assignments */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Add Client Access</Label>

            <div className="flex gap-2">
              <div className="flex-1">
                <MultiSelectDropdown
                  options={clientOptions}
                  selected={selectedClientIds}
                  onChange={setSelectedClientIds}
                  placeholder="Select clients..."
                  disabled={isLoading || isSubmitting}
                />
              </div>
              <Select
                value={newPermission}
                onValueChange={(v) => setNewPermission(v as "read" | "write")}
                disabled={isLoading || isSubmitting}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-3 w-3" /> Read
                    </span>
                  </SelectItem>
                  <SelectItem value="write">
                    <span className="flex items-center gap-1.5">
                      <Pencil className="h-3 w-3" /> Write
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAssign}
              disabled={selectedClientIds.length === 0 || isSubmitting}
              className="h-8 text-sm"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Assign {selectedClientIds.length > 0 && `(${selectedClientIds.length})`}
            </Button>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Current Assignments */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Current Assignments ({assignments.length})
            </Label>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No clients assigned yet</p>
                <p className="text-xs mt-1">
                  This member won&apos;t see any clients until assigned.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-secondary/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {assignment.client?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={assignment.client.logo_url}
                          alt=""
                          className="h-6 w-6 rounded object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <span className="text-sm font-medium truncate">
                        {assignment.client?.company_name || assignment.client?.name || "Unknown"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Select
                        value={assignment.permission}
                        onValueChange={(v) =>
                          handlePermissionChange(assignment.id, v as "read" | "write")
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-7 w-20 text-xs",
                            assignment.permission === "write"
                              ? "border-amber-500/50 bg-amber-500/10"
                              : "border-blue-500/50 bg-blue-500/10"
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">
                            <Badge variant="outline" className="text-xs border-blue-500/50">
                              Read
                            </Badge>
                          </SelectItem>
                          <SelectItem value="write">
                            <Badge variant="outline" className="text-xs border-amber-500/50">
                              Write
                            </Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          handleRemove(
                            assignment.id,
                            assignment.client?.company_name || assignment.client?.name || "Client"
                          )
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
