'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UnipileConnectionModal } from '@/components/onboarding/unipile-connection-modal'

export function LinkedInConnectionChecker() {
  const [showModal, setShowModal] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkLinkedInConnection()
  }, [])

  async function checkLinkedInConnection() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsChecking(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('unipile_account_id')
        .eq('id', user.id)
        .single()

      // Show modal if no LinkedIn connected
      if (!userData?.unipile_account_id) {
        setShowModal(true)
      }
    } catch (error) {
      console.error('[LINKEDIN_CHECKER] Error checking connection:', error)
    } finally {
      setIsChecking(false)
    }
  }

  if (isChecking || !showModal) {
    return null
  }

  return <UnipileConnectionModal blocking={true} />
}
