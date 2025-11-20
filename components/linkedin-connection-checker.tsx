'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function LinkedInConnectionChecker() {
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    checkLinkedInConnection()
  }, [])

  async function checkLinkedInConnection() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('unipile_account_id')
        .eq('id', user.id)
        .single()

      // If no LinkedIn connected, redirect directly to Unipile OAuth
      if (!userData?.unipile_account_id) {
        setIsRedirecting(true)

        // Call the API to get Unipile OAuth URL
        const response = await fetch('/api/unipile/create-hosted-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'linkedin',
            onboarding: true,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          console.error('[LINKEDIN_CHECKER] API error:', error)
          toast.error('Failed to connect LinkedIn. Please try again.')
          setIsRedirecting(false)
          return
        }

        const data = await response.json()

        // Redirect directly to Unipile OAuth
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('[LINKEDIN_CHECKER] Error:', error)
      toast.error('An unexpected error occurred. Please try again.')
      setIsRedirecting(false)
    }
  }

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-900 font-medium">Connecting to LinkedIn...</p>
        </div>
      </div>
    )
  }

  return null
}
