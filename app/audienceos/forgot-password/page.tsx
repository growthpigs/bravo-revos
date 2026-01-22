"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/audienceos/ui/button"
import { Input } from "@/components/audienceos/ui/input"
import { Label } from "@/components/audienceos/ui/label"
import { ArrowLeft, Mail } from "lucide-react"
import { KaizenLogo } from "@/components/audienceos/kaizen-logo"

// TEMPORARY: Using Kaizen logo for demo (2026-01-14) - see RUNBOOK.md

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-1 text-center">
          <KaizenLogo />
          <p className="text-sm text-slate-400">Reset your password</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-white">Check your email</h2>
              <p className="text-sm text-slate-400">
                We&apos;ve sent a password reset link to <span className="text-white">{email}</span>
              </p>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? "Sending..." : "Send reset link"}
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
