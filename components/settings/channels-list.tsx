'use client'

import { useState } from 'react'
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
  Loader2
} from 'lucide-react'
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
  profile_name: string
  status: string
  last_synced: string
}

interface ChannelsListProps {
  connections: ConnectedAccount[]
  unipileEnabled: boolean
  onConnect: (provider: string) => void
  onDisconnect: (account: ConnectedAccount) => void
  connecting: string | null
}

const CHANNELS: Channel[] = [
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

export function ChannelsList({ connections, unipileEnabled, onConnect, onDisconnect, connecting }: ChannelsListProps) {
  const [disconnectDialog, setDisconnectDialog] = useState<{ open: boolean; account: ConnectedAccount | null }>({
    open: false,
    account: null
  })

  function getConnection(provider: string): ConnectedAccount | undefined {
    return connections.find(c => c.provider.toLowerCase() === provider.toLowerCase())
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
                {connection.profile_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Last synced: {connection.last_synced ? formatLastSync(connection.last_synced) : 'Never'}
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
            onClick={() => onConnect(channel.provider)}
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

  return (
    <>
      <div className="space-y-4">
        {CHANNELS.map(renderChannelCard)}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={disconnectDialog.open} onOpenChange={(open) => setDisconnectDialog({ open, account: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectDialog.account?.profile_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll need to reconnect to send messages through this channel.
              Are you sure you want to disconnect?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (disconnectDialog.account) {
                onDisconnect(disconnectDialog.account)
                setDisconnectDialog({ open: false, account: null })
              }
            }}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
