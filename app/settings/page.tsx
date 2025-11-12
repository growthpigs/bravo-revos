'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Loader2, LogOut } from 'lucide-react'
import Link from 'next/link'
import { ChannelsList } from '@/components/settings/channels-list'
import { toast } from 'sonner'

interface ConnectedAccount {
  id: string
  provider: string
  account_name: string
  status: string
  last_sync_at: string
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<ConnectedAccount[]>([])
  const [unipileEnabled, setUnipileEnabled] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      await Promise.all([
        loadConnections(),
        checkUnipileStatus()
      ])
    } finally {
      setLoading(false)
    }
  }

  async function checkUnipileStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', user.id)
        .single()

      if (!profile?.client_id) return

      const { data: client } = await supabase
        .from('clients')
        .select('unipile_enabled')
        .eq('id', profile.client_id)
        .single()

      setUnipileEnabled(client?.unipile_enabled || false)
    } catch (error) {
      console.error('Error checking UniPile status:', error)
    }
  }

  async function loadConnections() {
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setConnections(data || [])
    } catch (error) {
      console.error('Error loading connections:', error)
      toast.error('Failed to load connections')
    }
  }

  async function handleConnect(provider: string) {
    try {
      setConnecting(provider)

      // Request OAuth URL
      const response = await fetch('/api/unipile/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'UNIPILE_NOT_CONFIGURED') {
          toast.error(data.message)
          return
        }
        throw new Error(data.message || 'Failed to initiate connection')
      }

      // Open OAuth popup
      const popup = window.open(
        data.oauth_url,
        'unipile-oauth',
        'width=600,height=700,scrollbars=yes'
      )

      if (!popup) {
        toast.error('Popup blocked! Please allow popups for this site and try again')
        return
      }

      // Listen for completion
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'UNIPILE_CONNECTED') {
          window.removeEventListener('message', messageHandler)
          toast.success(`${event.data.provider} account connected successfully`)
          loadConnections()
        } else if (event.data.type === 'UNIPILE_ERROR') {
          window.removeEventListener('message', messageHandler)
          toast.error(event.data.error || 'Connection failed. Please try again')
        }
      }

      window.addEventListener('message', messageHandler)

      // Check if popup was closed without completing
      const popupChecker = setInterval(() => {
        if (popup.closed) {
          clearInterval(popupChecker)
          window.removeEventListener('message', messageHandler)
          setConnecting(null)
        }
      }, 500)

    } catch (error) {
      console.error('Connection error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect')
    } finally {
      setConnecting(null)
    }
  }

  async function handleDisconnect(account: ConnectedAccount) {
    try {
      const response = await fetch('/api/unipile/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id })
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect account')
      }

      toast.success(`${account.account_name} disconnected successfully`)
      loadConnections()

    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect account')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and connected channels
        </p>
      </div>

      {/* Section 1: Connect Channels */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Connect Channels</h2>
          <p className="text-gray-600 mt-1">
            Connect your communication channels through UniPile. All connections are secure and encrypted.
          </p>
        </div>

        {/* Connection Summary */}
        <Card className="mb-6 p-6 bg-gray-50 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Connected Channels</h3>
              <p className="text-sm text-gray-600 mt-1">
                {connections.length} of 8 channels connected
              </p>
            </div>
            <div className="text-3xl font-bold text-gray-900">{connections.length}/8</div>
          </div>
        </Card>

        {/* Channels List */}
        <ChannelsList
          connections={connections}
          unipileEnabled={unipileEnabled}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          connecting={connecting}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Section 2: Settings */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
        <Card className="p-6 bg-gray-50 border-gray-200">
          <p className="text-gray-600">Additional settings coming soon...</p>
        </Card>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Section 3: Sign Out */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Account</h2>
        <Card className="p-6 bg-gray-50 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Sign Out</h3>
              <p className="text-sm text-gray-600 mt-1">
                Sign out of your Bravo revOS account
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
