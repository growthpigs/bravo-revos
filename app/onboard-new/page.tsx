'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'

type OnboardState =
  | 'verifying'              // Verifying OTP token
  | 'invalid'                // Invalid/expired token
  | 'connecting_linkedin'    // Show Unipile modal
  | 'setting_password'       // Show password modal
  | 'complete'               // Redirect to dashboard

function OnboardNewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<OnboardState>('verifying')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    verifyMagicLink()
  }, [])

  async function verifyMagicLink() {
    try {
      // Extract token_hash from URL parameters
      // Supabase magic links use these parameters:
      // - token_hash: The actual OTP token
      // - type: Should be 'magiclink'
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      console.log('[ONBOARD_NEW] Verifying magic link:', { tokenHash: tokenHash?.substring(0, 10) + '...', type })

      if (!tokenHash || type !== 'magiclink') {
        console.error('[ONBOARD_NEW] Invalid URL parameters')
        setState('invalid')
        setError('Invalid magic link. Please request a new link from your administrator.')
        return
      }

      // Verify the OTP token with Supabase
      const supabase = createClient()
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink',
      })

      if (verifyError || !data.user) {
        console.error('[ONBOARD_NEW] OTP verification failed:', verifyError)
        setState('invalid')
        setError(verifyError?.message || 'Failed to verify magic link. It may have expired.')
        return
      }

      console.log('[ONBOARD_NEW] OTP verified successfully, user:', data.user.id)

      // Check if user already has LinkedIn connected and password set
      // If so, redirect straight to dashboard
      const { data: userData } = await supabase
        .from('users')
        .select('unipile_account_id')
        .eq('id', data.user.id)
        .single()

      if (userData?.unipile_account_id) {
        console.log('[ONBOARD_NEW] User already has LinkedIn connected, checking password...')
        // User has LinkedIn connected, check if they have a password
        // If they've already set a password, go straight to dashboard
        // Note: We can't directly check if password is set, so we'll show password modal anyway
        setState('setting_password')
      } else {
        // New user - needs to connect LinkedIn first
        setState('connecting_linkedin')
      }

    } catch (err) {
      console.error('[ONBOARD_NEW] Unexpected error:', err)
      setState('invalid')
      setError('An unexpected error occurred. Please try again.')
    }
  }

  // Handle LinkedIn connection completion
  async function handleLinkedInConnected(unipileAccountId: string) {
    console.log('[ONBOARD_NEW] LinkedIn connected:', unipileAccountId)

    // Store the unipile_account_id in the users table
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase
        .from('users')
        .update({ unipile_account_id: unipileAccountId })
        .eq('id', user.id)

      if (error) {
        console.error('[ONBOARD_NEW] Failed to store unipile_account_id:', error)
        setError('Failed to save LinkedIn connection. Please try again.')
        return
      }

      console.log('[ONBOARD_NEW] Unipile account ID saved, moving to password setup')
      setState('setting_password')
    }
  }

  // Handle password set completion
  async function handlePasswordSet(password: string) {
    console.log('[ONBOARD_NEW] Setting password')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('[ONBOARD_NEW] Failed to set password:', error)
      setError('Failed to set password. Please try again.')
      return
    }

    console.log('[ONBOARD_NEW] Password set successfully, redirecting to dashboard')
    setState('complete')
    router.push('/dashboard')
  }

  // Render based on state
  if (state === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-12 text-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-900 font-medium">Verifying your magic link...</p>
            <p className="text-sm text-gray-500 mt-2">This will only take a moment</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-red-200">
          <CardHeader className="border-b border-gray-100 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-900">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-700 text-center">{error}</p>
            <p className="text-sm text-gray-500 text-center mt-4">
              Please contact your administrator for a new magic link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'connecting_linkedin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="border-b border-gray-100 text-center">
            <CardTitle className="text-2xl">Connect LinkedIn</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-700 text-center mb-6">
              To get started, we need to connect your LinkedIn account.
            </p>
            <button
              onClick={() => {
                // TODO: Implement Unipile OAuth flow
                // For now, simulate connection
                handleLinkedInConnected('mock-unipile-account-id')
              }}
              className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect LinkedIn
            </button>
            <p className="text-xs text-gray-500 text-center mt-4">
              You cannot proceed without connecting LinkedIn
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'setting_password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="border-b border-gray-100 text-center">
            <CardTitle className="text-2xl">Set Your Password</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-700 text-center mb-6">
              Choose a secure password for your account.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const password = formData.get('password') as string
              handlePasswordSet(password)
            }}>
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                minLength={8}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Set Password
              </button>
            </form>
            <p className="text-xs text-gray-500 text-center mt-4">
              Minimum 8 characters required
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Complete state - will redirect to dashboard
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-12 text-center">
          <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Setup complete!</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OnboardNewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-12 text-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <OnboardNewContent />
    </Suspense>
  )
}
