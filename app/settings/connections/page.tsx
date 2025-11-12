'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Send,
  MessageCircle,
  Linkedin,
  Instagram,
  Twitter,
  Mail,
  Calendar,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Channel {
  provider: string
  name: string
  description: string
  icon: any
  features: string[]
}

interface ConnectedAccount {
  id: string
  provider: string
  account_name: string
  status: string
  last_sync_at: string
}

const CHANNELS = [
  {
    provider: 'LINKEDIN',
    name: 'LinkedIn',
    description: 'Professional networking and lead generation',
    icon: Linkedin,
    features: ['Messages', 'Posts', 'Engagement', 'Lead Capture']
  },
  {
    provider: 'WHATSAPP',
    name: 'WhatsApp',
    description: 'Send messages and manage WhatsApp conversations',
    icon: MessageSquare,
    features: ['Messages', 'Groups', 'Media Sharing', 'Status Updates']
  },
  {
    provider: 'TELEGRAM',
    name: 'Telegram',
    description: 'Connect Telegram for messaging and bot integration',
    icon: Send,
    features: ['Messages', 'Groups', 'Channels', 'Bots']
  },
  {
    provider: 'MESSENGER',
    name: 'Messenger',
    description: 'Facebook Messenger for social messaging',
    icon: MessageCircle,
    features: ['Messages', 'Groups', 'Voice Calls', 'Video Calls']
  },
  {
    provider: 'INSTAGRAM',
    name: 'Instagram',
    description: 'Visual storytelling and DM automation',
    icon: Instagram,
    features: ['Direct Messages', 'Posts', 'Stories', 'Comments']
  },
  {
    provider: 'TWITTER',
    name: 'Twitter',
    description: 'Real-time engagement and tweet automation',
    icon: Twitter,
    features: ['Tweets', 'Direct Messages', 'Replies', 'Analytics']
  },
  {
    provider: 'EMAIL',
    name: 'Email',
    description: 'Connect email for outreach campaigns',
    icon: Mail,
    features: ['Send/Receive', 'Templates', 'Sequences', 'Tracking']
  },
  {
    provider: 'CALENDAR',
    name: 'Calendar',
    description: 'Schedule meetings and manage appointments',
    icon: Calendar,
    features: ['Events', 'Scheduling', 'Reminders', 'Availability']
  }
]

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectedAccount[]>([])
  const [unipileEnabled, setUnipileEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnectDialog, setDisconnectDialog] = useState<{ open: boolean; account: ConnectedAccount | null }>({
    open: false,
    account: null
  })
  const supabase = createClient()

  useEffect(() => {
    loadConnections()
    checkUnipileStatus()
  }, [])

  async function checkUnipileStatus() {
    try {
      // Check if UniPile is configured via environment variables (simplest check)
      const statusResponse = await fetch('/api/unipile/status')
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        // If we got a response (even if not connected), UniPile is configured
        setUnipileEnabled(true)
        return
      }

      // Fallback: check database configuration
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUnipileEnabled(false)
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', user.id)
        .single()

      if (!profile?.client_id) {
        setUnipileEnabled(false)
        return
      }

      const { data: client } = await supabase
        .from('clients')
        .select('unipile_enabled')
        .eq('id', profile.client_id)
        .single()

      setUnipileEnabled(client?.unipile_enabled || false)
    } catch (error) {
      console.error('Error checking UniPile status:', error)
      setUnipileEnabled(false)
    }
  }

  async function loadConnections() {
    try {
      setLoading(true)

      // Load from database
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      const dbConnections = data || []

      // Also check UniPile API directly (bypasses database)
      try {
        const statusResponse = await fetch('/api/unipile/status')
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()

          // If LinkedIn is connected in UniPile but not in database, add it
          if (statusData.connected && statusData.provider === 'LINKEDIN') {
            const hasLinkedIn = dbConnections.some(conn => conn.provider === 'LINKEDIN')
            if (!hasLinkedIn) {
              dbConnections.unshift({
                id: statusData.account_id,
                provider: 'LINKEDIN',
                account_name: statusData.account_name,
                status: 'active',
                last_sync_at: statusData.created_at
              })
            }
          }
        }
      } catch (statusError) {
        console.log('Could not check UniPile status:', statusError)
      }

      setConnections(dbConnections)
    } catch (error) {
      console.error('Error loading connections:', error)
      toast.error('Failed to load connections')
    } finally {
      setLoading(false)
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

  async function handleDisconnect() {
    if (!disconnectDialog.account) return

    try {
      const response = await fetch('/api/unipile/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: disconnectDialog.account.id })
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect account')
      }

      toast.success(`${disconnectDialog.account.account_name} disconnected successfully`)

      setDisconnectDialog({ open: false, account: null })
      loadConnections()

    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect account')
    }
  }

  function getConnection(provider: string): ConnectedAccount | undefined {
    return connections.find(c => c.provider === provider)
  }

  function formatLastSync(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  function renderChannelCard(channel: Channel) {
    const connection = getConnection(channel.provider)
    const Icon = channel.icon
    const isConnected = !!connection
    const isConnecting = connecting === channel.provider

    // State 3: Client Not Configured
    if (!unipileEnabled) {
      return (
        <Card key={channel.provider} className="bg-gray-100 border-gray-200 p-5">
          <div className="flex items-start gap-4">
            <Icon className="w-8 h-8 text-gray-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-700">{channel.name}</h3>
                <AlertCircle className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-sm text-gray-600 mt-1">Unavailable</p>
              <p className="text-sm text-gray-700 mt-2">
                Your organization has not configured UniPile integration.
                Please contact your administrator.
              </p>
            </div>
          </div>
        </Card>
      )
    }

    // State 1: Connected
    if (isConnected) {
      return (
        <Card key={channel.provider} className="bg-white border-gray-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <Icon className="w-8 h-8 text-gray-700 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                <CheckCircle className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600 mt-1">Connected</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {connection.account_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Last synced: {formatLastSync(connection.last_sync_at)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisconnectDialog({ open: true, account: connection })}
            >
              Disconnect
            </Button>
          </div>
        </Card>
      )
    }

    // State 2: Not Connected
    return (
      <Card key={channel.provider} className="bg-gray-50 border-gray-200 p-5">
        <div className="flex items-start gap-4">
          <Icon className="w-8 h-8 text-gray-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{channel.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
            <ul className="text-sm text-gray-700 mt-3 space-y-1">
              {channel.features.map(feature => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          </div>
          <Button
            size="sm"
            onClick={() => handleConnect(channel.provider)}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </div>
      </Card>
    )
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
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Manage Connections</h1>
        <p className="text-gray-600 mt-2">
          Connect your communication channels through UniPile. All connections are secure and encrypted.
        </p>
      </div>

      {/* Connection Summary */}
      <Card className="mb-8 p-6 bg-gray-50 border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Connected Channels</h2>
            <p className="text-sm text-gray-600 mt-1">
              {connections.length} of 8 channels connected
            </p>
          </div>
          <div className="text-3xl font-bold text-gray-900">{connections.length}/8</div>
        </div>
      </Card>

      {/* Channels List */}
      <div className="space-y-4">
        {CHANNELS.map(renderChannelCard)}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={disconnectDialog.open} onOpenChange={(open) => setDisconnectDialog({ open, account: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectDialog.account?.account_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to reconnect to send messages through this channel.
              Are you sure you want to disconnect?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
