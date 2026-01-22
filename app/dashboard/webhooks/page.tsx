'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Copy, Trash2, Edit, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface WebhookConfig {
  id: string
  client_id: string
  name: string
  url: string
  headers: Record<string, string>
  esp_type: string | null
  retry_enabled: boolean
  max_retries: number
  timeout_ms: number
  active: boolean
  created_at: string
  updated_at: string
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookConfig | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    esp_type: 'custom',
    retry_enabled: true,
    max_retries: 3,
    timeout_ms: 30000,
    active: true
  })

  const supabase = createClient()

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      setIsLoading(true)

      // Get current user and client_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('user')
        .select('client_id')
        .eq('id', user.id)
        .single()

      if (!userData?.client_id) throw new Error('No client associated with user')

      // Fetch webhooks for this client
      const { data, error } = await supabase
        .from('webhook_config')
        .select('*')
        .eq('client_id', userData.client_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWebhooks(data || [])
    } catch (error) {
      console.error('Error loading webhooks:', error)
      toast.error('Failed to load webhooks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingWebhook(null)
    setFormData({
      name: '',
      url: '',
      esp_type: 'custom',
      retry_enabled: true,
      max_retries: 3,
      timeout_ms: 30000,
      active: true
    })
    setShowModal(true)
  }

  const handleOpenEdit = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook)
    setFormData({
      name: webhook.name,
      url: webhook.url,
      esp_type: webhook.esp_type || 'custom',
      retry_enabled: webhook.retry_enabled,
      max_retries: webhook.max_retries,
      timeout_ms: webhook.timeout_ms,
      active: webhook.active
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.url) {
        toast.error('Name and URL are required')
        return
      }

      // URL validation
      try {
        new URL(formData.url)
      } catch {
        toast.error('Invalid URL format')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('user')
        .select('client_id')
        .eq('id', user.id)
        .single()

      if (editingWebhook) {
        // Update existing webhook
        const { error } = await supabase
          .from('webhook_config')
          .update({
            name: formData.name,
            url: formData.url,
            esp_type: formData.esp_type,
            retry_enabled: formData.retry_enabled,
            max_retries: formData.max_retries,
            timeout_ms: formData.timeout_ms,
            active: formData.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingWebhook.id)

        if (error) throw error
        toast.success('Webhook updated successfully')
      } else {
        // Create new webhook
        if (!userData?.client_id) throw new Error('No client associated with user')

        const { error } = await supabase
          .from('webhook_config')
          .insert({
            client_id: userData.client_id,
            name: formData.name,
            url: formData.url,
            esp_type: formData.esp_type,
            retry_enabled: formData.retry_enabled,
            max_retries: formData.max_retries,
            timeout_ms: formData.timeout_ms,
            active: formData.active,
            headers: {}
          })

        if (error) throw error
        toast.success('Webhook created successfully')
      }

      setShowModal(false)
      loadWebhooks()
    } catch (error: any) {
      console.error('Error saving webhook:', error)
      if (error.code === '23505') {
        toast.error('A webhook with this name already exists')
      } else {
        toast.error('Failed to save webhook')
      }
    }
  }

  const handleDeleteClick = (webhook: WebhookConfig) => {
    setWebhookToDelete(webhook)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!webhookToDelete) return

    try {
      const { error } = await supabase
        .from('webhook_config')
        .delete()
        .eq('id', webhookToDelete.id)

      if (error) throw error

      toast.success('Webhook deleted successfully')
      setDeleteDialogOpen(false)
      setWebhookToDelete(null)
      loadWebhooks()
    } catch (error) {
      console.error('Error deleting webhook:', error)
      toast.error('Failed to delete webhook')
    }
  }

  const handleToggleActive = async (webhook: WebhookConfig) => {
    try {
      const { error } = await supabase
        .from('webhook_config')
        .update({
          active: !webhook.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhook.id)

      if (error) throw error

      toast.success(`Webhook ${!webhook.active ? 'enabled' : 'disabled'}`)
      loadWebhooks()
    } catch (error) {
      console.error('Error toggling webhook:', error)
      toast.error('Failed to update webhook status')
    }
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Webhook URL copied to clipboard')
  }

  const espPresets: Record<string, string> = {
    zapier: 'https://hooks.zapier.com/hooks/catch/',
    make: 'https://hook.make.com/',
    convertkit: 'https://api.convertkit.com/v3/',
    mailchimp: 'https://api.mailchimp.com/',
    custom: ''
  }

  const handleEspChange = (esp: string) => {
    setFormData({
      ...formData,
      esp_type: esp,
      url: espPresets[esp] || formData.url
    })
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-muted-foreground mt-2">
            Configure webhooks to send lead data to your CRM or email service provider
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Loading webhooks...</p>
          </CardContent>
        </Card>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Webhook className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No webhooks configured
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first webhook to start sending lead data to your tools
            </p>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {webhook.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {webhook.esp_type && webhook.esp_type !== 'custom' && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            {webhook.esp_type}
                          </span>
                        )}
                        <button
                          onClick={() => handleToggleActive(webhook)}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            webhook.active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {webhook.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <code className="px-2 py-1 bg-gray-100 rounded font-mono text-xs break-all">
                        {webhook.url}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(webhook.url)}
                        className="shrink-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Retries: {webhook.max_retries}</span>
                      <span>Timeout: {webhook.timeout_ms}ms</span>
                      <span>Created: {new Date(webhook.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(webhook)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(webhook)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Webhook Events</h3>
          <p className="text-sm text-blue-800 mb-3">
            Webhooks are triggered for the following events:
          </p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>lead.captured</strong> - When a lead provides their email</li>
            <li>• <strong>lead.verified</strong> - When email is verified as valid</li>
            <li>• <strong>lead.enriched</strong> - When lead data is enriched with LinkedIn profile</li>
          </ul>
          <div className="mt-4 p-3 bg-white rounded border border-blue-200">
            <p className="text-xs font-mono text-gray-700">
              Payload format: {'{'}
              <br />
              &nbsp;&nbsp;&quot;event&quot;: &quot;lead.captured&quot;,
              <br />
              &nbsp;&nbsp;&quot;lead_id&quot;: &quot;uuid&quot;,
              <br />
              &nbsp;&nbsp;&quot;email&quot;: &quot;user@example.com&quot;,
              <br />
              &nbsp;&nbsp;&quot;campaign_id&quot;: &quot;uuid&quot;,
              <br />
              &nbsp;&nbsp;&quot;timestamp&quot;: &quot;ISO8601&quot;
              <br />
              {'}'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
            </DialogTitle>
            <DialogDescription>
              {editingWebhook
                ? 'Update webhook configuration'
                : 'Add a new webhook endpoint to receive lead notifications'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Webhook Name *</Label>
              <Input
                id="name"
                placeholder="Production CRM"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="esp_type">Service Provider</Label>
              <Select value={formData.esp_type} onValueChange={handleEspChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="zapier">Zapier</SelectItem>
                  <SelectItem value="make">Make.com</SelectItem>
                  <SelectItem value="convertkit">ConvertKit</SelectItem>
                  <SelectItem value="mailchimp">Mailchimp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://your-endpoint.com/webhook"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Full URL where POST requests will be sent
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_retries">Max Retries</Label>
                <Input
                  id="max_retries"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.max_retries}
                  onChange={(e) =>
                    setFormData({ ...formData, max_retries: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min="1000"
                  max="60000"
                  step="1000"
                  value={formData.timeout_ms}
                  onChange={(e) =>
                    setFormData({ ...formData, timeout_ms: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="retry_enabled"
                checked={formData.retry_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, retry_enabled: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="retry_enabled" className="font-normal">
                Enable automatic retries on failure
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="active" className="font-normal">
                Active (send events to this webhook)
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingWebhook ? 'Save Changes' : 'Create Webhook'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Webhook?"
        description={`This will permanently delete "${webhookToDelete?.name}" and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}
