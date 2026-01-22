"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
// Browser client for invite acceptance
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/audienceos/ui/button"
import { Input } from "@/components/audienceos/ui/input"
import { Label } from "@/components/audienceos/ui/label"
import { cn } from "@/lib/audienceos/utils"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

interface UserInvitation {
  id: string
  email: string
  role: "owner" | "admin" | "manager" | "member"
  expires_at: string
  accepted_at: string | null
  agency_name?: string
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken] = React.useState<string>("")
  const [invitation, setInvitation] = React.useState<UserInvitation | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const router = useRouter()

  // Load and validate invitation on mount
  React.useEffect(() => {
    const loadInvitation = async () => {
      try {
        const resolvedParams = await params
        setToken(resolvedParams.token)

        // Validate invitation token
        const response = await fetch(
          `/api/v1/settings/invitations/${resolvedParams.token}/accept`,
          {
            method: "GET",
          }
        )

        if (!response.ok) {
          if (response.status === 410) {
            setError("This invitation has expired or has already been accepted")
          } else if (response.status === 404) {
            setError("This invitation link is invalid")
          } else {
            const errorData = await response.json().catch(() => ({}))
            setError(
              errorData.error || "Failed to load invitation. Please try again."
            )
          }
          setIsLoading(false)
          return
        }

        const data = await response.json()
        setInvitation(data.invitation)
        setIsLoading(false)
      } catch (err) {
        console.error("[InvitePage] Error loading invitation:", err)
        setError("Network error. Please check your connection and try again.")
        setIsLoading(false)
      }
    }

    loadInvitation()
  }, [params])

  // Validate password strength
  const validatePassword = (pwd: string): string | null => {
    if (!pwd) return "Password is required"
    if (pwd.length < 8) return "Password must be at least 8 characters"
    if (!/[a-z]/.test(pwd))
      return "Password must contain a lowercase letter"
    if (!/[A-Z]/.test(pwd))
      return "Password must contain an uppercase letter"
    if (!/[0-9]/.test(pwd)) return "Password must contain a number"
    return null
  }

  // Validate form
  const validateForm = (): string | null => {
    if (!firstName.trim()) return "First name is required"
    if (!lastName.trim()) return "Last name is required"

    const passwordError = validatePassword(password)
    if (passwordError) return passwordError

    return null
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!token || !invitation) {
      setError("Invalid invitation state. Please refresh the page.")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Accept invitation via API
      const acceptResponse = await fetch(
        `/api/v1/settings/invitations/${token}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            password,
          }),
        }
      )

      if (!acceptResponse.ok) {
        const errorData = await acceptResponse.json().catch(() => ({}))
        setError(
          errorData.error ||
            "Failed to accept invitation. Please try again later."
        )
        setIsSubmitting(false)
        return
      }

      setSuccess(true)

      // Auto-login user
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      })

      if (signInError) {
        console.error("[InvitePage] Sign in error:", signInError)
        // Account was created, but auto-login failed
        // Redirect to login page instead
        setTimeout(() => {
          router.push(`/login?email=${encodeURIComponent(invitation.email)}`)
          router.refresh()
        }, 1500)
        return
      }

      // Successful login - redirect to dashboard
      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 1500)
    } catch (err) {
      console.error("[InvitePage] Submission error:", err)
      setError("Network error. Please check your connection and try again.")
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Setting up your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Verifying your invitation...
            </p>
          </div>

          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Invitation Issue
            </h1>
          </div>

          <div className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              If you believe this is an error, please contact your agency
              administrator for a new invitation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {firstName}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Your account has been created
            </p>
          </div>

          <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Signing you in...
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  // Form state
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Accept Invitation
          </h1>
          <p className="text-sm text-muted-foreground">
            Create your account to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={invitation?.email || ""}
              disabled
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              This email was used to send the invitation
            </p>
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-xs font-medium">
              First Name
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isSubmitting}
              autoComplete="given-name"
              required
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-xs font-medium">
              Last Name
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isSubmitting}
              autoComplete="family-name"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              required
            />
            <div className="space-y-1 pt-1 text-xs text-muted-foreground">
              <div
                className={cn(
                  "flex items-center gap-2",
                  password.length >= 8
                    ? "text-green-600"
                    : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    password.length >= 8 ? "bg-green-600" : "bg-border"
                  )}
                />
                At least 8 characters
              </div>
              <div
                className={cn(
                  "flex items-center gap-2",
                  /[a-z]/.test(password)
                    ? "text-green-600"
                    : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    /[a-z]/.test(password) ? "bg-green-600" : "bg-border"
                  )}
                />
                One lowercase letter
              </div>
              <div
                className={cn(
                  "flex items-center gap-2",
                  /[A-Z]/.test(password)
                    ? "text-green-600"
                    : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    /[A-Z]/.test(password) ? "bg-green-600" : "bg-border"
                  )}
                />
                One uppercase letter
              </div>
              <div
                className={cn(
                  "flex items-center gap-2",
                  /[0-9]/.test(password)
                    ? "text-green-600"
                    : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    /[0-9]/.test(password) ? "bg-green-600" : "bg-border"
                  )}
                />
                One number
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !firstName || !lastName || !password}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>

          {/* Role display */}
          {invitation && (
            <div className="pt-2 text-center">
              <p className="text-xs text-muted-foreground">
                You'll be added as a{" "}
                <span className="font-medium capitalize">
                  {invitation.role}
                </span>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
