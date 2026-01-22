'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Building2, Key, Bell, Palette } from 'lucide-react'
import { toast } from 'sonner'

interface Agency {
  id: string
  name: string
  slug: string
  settings: {
    company?: {
      logo_url?: string
      contact_email?: string
      support_email?: string
      website?: string
    }
    branding?: {
      primary_color?: string
      secondary_color?: string
      accent_color?: string
    }
    notifications?: {
      email_enabled?: boolean
      slack_webhook?: string
      admin_emails?: string[]
    }
    api_keys?: {
      openai_key_masked?: string
      unipile_key_masked?: string
    }
  }
  subscription_tier: string
  subscription_status: string
  created_at: string
}

export default function AdminSettingsPage() {
  const [agency, setAgency] = useState<Agency | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  // Branding
  const [primaryColor, setPrimaryColor] = useState('#000000')
  const [secondaryColor, setSecondaryColor] = useState('#6B7280')
  const [accentColor, setAccentColor] = useState('#3B82F6')

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [slackWebhook, setSlackWebhook] = useState('')
  const [adminEmails, setAdminEmails] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadAgency()
  }, [])

  const loadAgency = async () => {
    try {
      setIsLoading(true)

      // Get current user to find their agency
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user's client and agency
      const { data: userData } = await supabase
        .from('user')
        .select('client_id, clients(agency_id)')
        .eq('id', user.id)
        .single()

      if (!userData?.clients) throw new Error('No client found')

      // Get agency details
      const { data: agencyData, error } = await supabase
        .from('agency')
        .select('*')
        .eq('id', (userData.clients as any).agency_id)
        .single()

      if (error) throw error

      setAgency(agencyData)

      // Populate form fields
      setCompanyName(agencyData.name || '')
      setContactEmail(agencyData.settings?.company?.contact_email || '')
      setSupportEmail(agencyData.settings?.company?.support_email || '')
      setWebsite(agencyData.settings?.company?.website || '')
      setLogoUrl(agencyData.settings?.company?.logo_url || '')

      setPrimaryColor(agencyData.settings?.branding?.primary_color || '#000000')
      setSecondaryColor(agencyData.settings?.branding?.secondary_color || '#6B7280')
      setAccentColor(agencyData.settings?.branding?.accent_color || '#3B82F6')

      setEmailNotifications(agencyData.settings?.notifications?.email_enabled !== false)
      setSlackWebhook(agencyData.settings?.notifications?.slack_webhook || '')
      setAdminEmails((agencyData.settings?.notifications?.admin_emails || []).join(', '))
    } catch (error) {
      console.error('Error loading agency:', error)
      toast.error('Failed to load agency settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!agency) return

    try {
      setIsSaving(true)

      const updatedSettings = {
        ...agency.settings,
        company: {
          contact_email: contactEmail,
          support_email: supportEmail,
          website,
          logo_url: logoUrl
        }
      }

      const { error } = await supabase
        .from('agency')
        .update({
          name: companyName,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', agency.id)

      if (error) throw error

      toast.success('Company settings saved')
      loadAgency()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveBranding = async () => {
    if (!agency) return

    try {
      setIsSaving(true)

      const updatedSettings = {
        ...agency.settings,
        branding: {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor
        }
      }

      const { error } = await supabase
        .from('agency')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', agency.id)

      if (error) throw error

      toast.success('Branding settings saved')
      loadAgency()
    } catch (error) {
      console.error('Error saving branding:', error)
      toast.error('Failed to save branding')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    if (!agency) return

    try {
      setIsSaving(true)

      const emailList = adminEmails
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0)

      const updatedSettings = {
        ...agency.settings,
        notifications: {
          email_enabled: emailNotifications,
          slack_webhook: slackWebhook,
          admin_emails: emailList
        }
      }

      const { error } = await supabase
        .from('agency')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', agency.id)

      if (error) throw error

      toast.success('Notification settings saved')
      loadAgency()
    } catch (error) {
      console.error('Error saving notifications:', error)
      toast.error('Failed to save notifications')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    )
  }

  if (!agency) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600">Failed to load agency settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure agency-wide settings and preferences
        </p>
      </div>

      {/* Subscription Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Subscription Status</h3>
              <p className="text-sm text-blue-800">
                {agency.subscription_tier.charAt(0).toUpperCase() + agency.subscription_tier.slice(1)} Plan
                {' • '}
                {agency.subscription_status.charAt(0).toUpperCase() + agency.subscription_status.slice(1)}
              </p>
            </div>
            <Button variant="outline" size="sm">
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company">
            <Building2 className="h-4 w-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Basic company details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Agency Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="hello@agency.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@agency.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://agency.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://agency.com/logo.png"
                />
                <p className="text-xs text-gray-500">
                  Direct URL to your company logo (PNG or SVG recommended)
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCompany} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Company Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Colors</CardTitle>
              <CardDescription>
                Customize the look and feel of your admin portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#6B7280"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent_color">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent_color"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-900 mb-2">Color Preview</p>
                <div className="flex gap-4">
                  <div
                    className="h-16 w-16 rounded-lg border"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div
                    className="h-16 w-16 rounded-lg border"
                    style={{ backgroundColor: secondaryColor }}
                  />
                  <div
                    className="h-16 w-16 rounded-lg border"
                    style={{ backgroundColor: accentColor }}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBranding} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Branding'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive system notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="email_notifications"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="email_notifications" className="font-normal">
                  Enable email notifications
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_emails">Admin Email Addresses</Label>
                <Input
                  id="admin_emails"
                  value={adminEmails}
                  onChange={(e) => setAdminEmails(e.target.value)}
                  placeholder="admin1@agency.com, admin2@agency.com"
                />
                <p className="text-xs text-gray-500">
                  Comma-separated list of emails to receive admin notifications
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slack_webhook">Slack Webhook URL (Optional)</Label>
                <Input
                  id="slack_webhook"
                  type="url"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <p className="text-xs text-gray-500">
                  Receive notifications in Slack channel
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Notifications'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage external service API keys (displayed masked for security)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>OpenAI API Key</Label>
                <Input
                  type="password"
                  value="sk-••••••••••••••••••••••••••••"
                  disabled
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  Configured via environment variables (OPENAI_API_KEY)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Unipile API Key</Label>
                <Input
                  type="password"
                  value="up_••••••••••••••••••••••••••••"
                  disabled
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  Configured via environment variables (UNIPILE_API_KEY)
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Security Note:</strong> API keys are stored as environment variables
                  and cannot be viewed or edited through the UI. Contact your system administrator
                  to update API keys.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
