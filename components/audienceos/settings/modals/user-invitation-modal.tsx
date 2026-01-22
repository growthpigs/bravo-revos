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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Mail, AlertCircle, Loader2, Info } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/types/database"

interface UserInvitationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function UserInvitationModal({
  isOpen,
  onClose,
  onSuccess,
}: UserInvitationModalProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const agencyId = profile?.agency_id
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("member")
  const [error, setError] = useState<string | null>(null)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!email.trim()) {
      setError("Email is required")
      return
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    if (!role) {
      setError("Please select a role")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/v1/settings/invitations", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          role,
          agency_id: agencyId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(
          data.error || `Failed to send invitation (${response.status})`
        )
      }

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${email}. They have 7 days to accept.`,
        variant: "default",
      })

      // Reset form and close
      setEmail("")
      setRole("member")
      setError(null)
      onClose()
      onSuccess?.()
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to send invitation. Please try again."

      // Handle specific error cases
      if (errorMessage.includes("already exists")) {
        setError(
          "This email is already a member of your agency. Try inviting a different email."
        )
      } else if (errorMessage.includes("already invited")) {
        setError(
          "This email has already been invited. You can resend the invitation from the pending list."
        )
      } else {
        setError(errorMessage)
      }

      toast({
        title: "Error sending invitation",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail("")
      setRole("member")
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a new team member to join your agency.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              We'll send an invitation link to this email.
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm">
              Role
            </Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={isSubmitting}>
              <SelectTrigger id="role" className="h-9">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              <strong>Owner:</strong> Full system access, billing, and team management
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Admin:</strong> Can manage team, settings, and agency configuration
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Manager:</strong> Can manage all clients and run reports
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Member:</strong> Can only access assigned clients
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2 py-2 px-3 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-500">
                {error}
              </p>
            </div>
          )}

          {/* Info Alert */}
          <div className="flex items-start gap-2 py-2 px-3 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-md">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-500">
              Invitations expire after 7 days. The recipient will need to create
              a password when they accept.
            </p>
          </div>

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
              disabled={isSubmitting || !email.trim()}
              className="h-9 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
