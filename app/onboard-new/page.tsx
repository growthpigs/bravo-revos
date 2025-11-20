'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import { UnipileConnectionModal } from '@/components/onboarding/unipile-connection-modal'
import { SetPasswordModal } from '@/components/onboarding/set-password-modal'

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
    // Check if returning from LinkedIn OAuth
    const step = searchParams.get('step')
    if (step === 'linkedin-success') {
      console.log('[ONBOARD_NEW] Returned from LinkedIn OAuth, checking connection...')
      checkLinkedInConnection()
    } else {
      verifyMagicLink()
    }
  }, [])

  async function checkLinkedInConnection() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.error('[ONBOARD_NEW] No authenticated user found after LinkedIn OAuth')
        setState('invalid')
        setError('Session expired. Please request a new magic link.')
        return
      }

      // Check if unipile_account_id has been set by the webhook
      const { data: userData } = await supabase
        .from('users')
        .select('unipile_account_id')
        .eq('id', user.id)
        .single()

      if (userData?.unipile_account_id) {
        console.log('[ONBOARD_NEW] LinkedIn connected successfully, moving to password setup')
        setState('setting_password')
      } else {
        // Webhook might not have completed yet, wait a bit and check again
        console.log('[ONBOARD_NEW] Unipile account ID not set yet, waiting for webhook...')
        setTimeout(async () => {
          const { data: retryData } = await supabase
            .from('users')
            .select('unipile_account_id')
            .eq('id', user.id)
            .single()

          if (retryData?.unipile_account_id) {
            console.log('[ONBOARD_NEW] LinkedIn connection confirmed after retry')
            setState('setting_password')
          } else {
            console.error('[ONBOARD_NEW] LinkedIn connection not confirmed after webhook delay')
            setState('invalid')
            setError('LinkedIn connection failed. Please try again or contact support.')
          }
        }, 3000) // Wait 3 seconds for webhook to complete
      }
    } catch (err) {
      console.error('[ONBOARD_NEW] Error checking LinkedIn connection:', err)
      setState('invalid')
      setError('Failed to verify LinkedIn connection.')
    }
  }

  async function verifyMagicLink() {
    try {
      const supabase = createClient()

      // Check for error passed from auth callback or in hash
      const errorParam = searchParams.get('error')
      if (errorParam) {
        console.error('[ONBOARD_NEW] Error from auth callback:', errorParam)
        setState('invalid')
        setError(decodeURIComponent(errorParam))
        return
      }

      // Check for errors in hash fragment (Supabase error responses)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const hashError = hashParams.get('error_description')
        if (hashError) {
          console.error('[ONBOARD_NEW] Error in hash:', hashError)
          setState('invalid')
          setError(decodeURIComponent(hashError.replace(/\+/g, ' ')))
          return
        }
      }

      // User should already be authenticated via auth callback
      // The callback exchanged the code for a session before redirecting here
      const { data: { user }, error: getUserError } = await supabase.auth.getUser()

      console.log('[ONBOARD_NEW] Checking authenticated user:', {
        hasUser: !!user,
        userId: user?.id,
        error: getUserError?.message
      })

      if (!user) {
        console.error('[ONBOARD_NEW] No authenticated user - auth callback may have failed')
        setState('invalid')
        setError('Authentication failed. Please request a new invite link from your administrator.')
        return
      }

      console.log('[ONBOARD_NEW] User authenticated, proceeding:', user.id)

      // Check if user already has LinkedIn connected and password set
      // If so, redirect straight to dashboard
      const { data: userData } = await supabase
        .from('users')
        .select('unipile_account_id')
        .eq('id', user.id)
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
    return <UnipileConnectionModal blocking={true} />
  }

  if (state === 'setting_password') {
    return <SetPasswordModal onSuccess={handlePasswordSet} blocking={true} />
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
