"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/audienceos/ui/button"
import { Input } from "@/components/audienceos/ui/input"
import { Label } from "@/components/audienceos/ui/label"
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import { KaizenLogo } from "@/components/audienceos/kaizen-logo"

// TEMPORARY: Using Kaizen logo for demo (2026-01-14) - see RUNBOOK.md

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Manually detect and handle recovery tokens from URL hash
  // Required because detectSessionInUrl is disabled to prevent hanging issues
  useEffect(() => {
    const handleRecoveryToken = async () => {
      try {
        // Parse URL hash for tokens (Supabase PKCE flow puts them in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (type === 'recovery' && accessToken && refreshToken) {
          // Manually set session from recovery tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('[ResetPassword] Session error:', sessionError.message)
            setError("Invalid or expired reset link. Please request a new password reset.")
            setInitializing(false)
            return
          }

          // Clear the hash from URL for security (tokens shouldn't linger)
          window.history.replaceState(null, '', window.location.pathname)
          setSessionReady(true)
          setInitializing(false)
          return
        }

        // No tokens in hash - check for existing session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSessionReady(true)
        } else {
          setError("Invalid or expired reset link. Please request a new password reset.")
        }
        setInitializing(false)
      } catch (err) {
        console.error('[ResetPassword] Error handling recovery:', err)
        setError("An error occurred. Please try again.")
        setInitializing(false)
      }
    }

    handleRecoveryToken()
  }, [supabase.auth])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-1 text-center">
          <KaizenLogo />
          <p className="text-sm text-slate-400">Set your new password</p>
        </div>

        {/* Loading state while processing recovery token */}
        {initializing ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-400">Verifying reset link...</p>
          </div>
        ) : !sessionReady && error ? (
          <div className="space-y-4">
            <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 p-3 rounded-md">
              {error}
            </div>
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white">
                Request new reset link
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white hover:bg-slate-900">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-white">Password updated!</h2>
              <p className="text-sm text-slate-400">
                Your password has been reset successfully. Redirecting to login...
              </p>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to login now
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-slate-900 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-slate-900 border-slate-700 text-slate-100"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-white text-slate-900 hover:bg-slate-100" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </Button>

            <Link href="/login" className="block">
              <Button type="button" variant="ghost" className="w-full text-slate-400 hover:text-white hover:bg-slate-900">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
