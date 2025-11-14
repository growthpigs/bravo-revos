'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Lock, Wifi } from 'lucide-react'
import { ChannelsList } from '@/components/settings/channels-list'
import { toast } from 'sonner'

interface ConnectedAccount {
  id: string
  provider: string
  profile_name: string
  status: string
  last_synced: string
}

export default function SettingsPage() {
  const supabase = createClient()

  // General settings state
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Connections state
  const [connections, setConnections] = useState<ConnectedAccount[]>([])
  const [unipileEnabled, setUnipileEnabled] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [connectionsLoading, setConnectionsLoading] = useState(true)

  useEffect(() => {
    loadUserData()
    loadConnections()
    checkUnipileStatus()
  }, [])

  async function loadUserData() {
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      setEmail(data.email || '')
      setName(data.full_name || '')
      setCompany(data.company || '')
    } catch (err) {
      console.error('Failed to load user data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function checkUnipileStatus() {
    try {
      // Check if UniPile is configured via environment variables (simplest check)
      const statusResponse = await fetch('/api/unipile/status')
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        // If we got a response (even if not connected), UniPile is configured
        setUnipileEnabled(statusData.configured || false)
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
      setConnectionsLoading(true)
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        // Handle schema cache error gracefully (table exists but PostgREST cache hasn't refreshed)
        if (error.code === 'PGRST205') {
          console.log('[Schema Cache] connected_accounts not in cache yet, will retry on next load')
          setConnections([])
          return
        }
        throw error
      }
      setConnections(data || [])
    } catch (error) {
      console.error('Error loading connections:', error)
      toast.error('Failed to load connections')
    } finally {
      setConnectionsLoading(false)
    }
  }

  async function handleConnect(provider: string) {
    try {
      setConnecting(provider)

      // Request UniPile Hosted Auth URL (CORRECT flow)
      const response = await fetch('/api/unipile/create-hosted-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.toLowerCase() })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'UNIPILE_NOT_CONFIGURED') {
          toast.error(data.message)
          setConnecting(null)
          return
        }
        throw new Error(data.message || 'Failed to initiate connection')
      }

      // Open UniPile in a popup window (keeps app visible behind it)
      const popup = window.open(
        data.authUrl,
        'unipile-connect',
        'width=600,height=800,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        toast.error('Popup blocked! Please allow popups for this site and try again')
        setConnecting(null)
        return
      }

      // Poll to detect when popup closes
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup)
          setConnecting(null)
          // Refresh connections list to show newly connected account
          toast.success(`${provider} connection complete!`)
          loadConnections()
        }
      }, 500)

    } catch (error) {
      console.error('Connection error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect')
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

      toast.success(`${account.profile_name} disconnected successfully`)
      loadConnections()

    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect account')
    }
  }

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess('')
    setError('')

    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, company }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account and preferences</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Manage your basic account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={email} disabled />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Your company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Connected Channels
              </CardTitle>
              <CardDescription>
                Connect your communication channels through UniPile. All connections are secure and encrypted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Summary */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Active Connections</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {connections.length} of 8 channels connected
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{connections.length}/8</div>
                </div>
              </div>

              {/* Channels List */}
              {connectionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-600">Loading connections...</div>
                </div>
              ) : (
                <ChannelsList
                  connections={connections}
                  unipileEnabled={unipileEnabled}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  connecting={connecting}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="font-medium mb-2">Password Management</p>
                <p className="text-sm text-gray-600 mb-4">
                  Use your email address to reset your password through authentication email
                </p>
                <Button variant="outline" disabled>
                  Change Password (via email)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
