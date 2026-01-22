'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { fetchWithCsrf } from '@/lib/csrf'
import type { Database } from '@/types/database'

type IntegrationProvider = Database['public']['Enums']['integration_provider']

interface CredentialField {
  key: string
  label: string
  placeholder: string
  helpText?: string
  type?: 'text' | 'password'
  required?: boolean
}

// Credential fields for each provider
const providerCredentials: Record<IntegrationProvider, {
  title: string
  description: string
  helpUrl: string
  helpLabel: string
  fields: CredentialField[]
}> = {
  slack: {
    title: 'Connect Slack',
    description: 'Enter your Slack app credentials to enable workspace integration.',
    helpUrl: 'https://api.slack.com/apps',
    helpLabel: 'Get credentials from Slack API',
    fields: [
      {
        key: 'client_id',
        label: 'Client ID',
        placeholder: 'Enter your Slack Client ID',
        helpText: 'Found in your Slack app settings under "Basic Information"',
        required: true,
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        placeholder: 'Enter your Slack Client Secret',
        type: 'password',
        required: true,
      },
      {
        key: 'signing_secret',
        label: 'Signing Secret',
        placeholder: 'Enter your Slack Signing Secret',
        helpText: 'Used to verify requests from Slack',
        type: 'password',
        required: true,
      },
    ],
  },
  gmail: {
    title: 'Connect Google Workspace',
    description: 'Connect Gmail, Calendar, Drive, Sheets & Docs with one click. Uses Google OAuth for secure access.',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
    helpLabel: 'Google Cloud Console',
    fields: [], // Google Workspace uses OAuth, not manual credentials
  },
  google_ads: {
    title: 'Connect Google Ads',
    description: 'Enter your Google Ads API credentials.',
    helpUrl: 'https://ads.google.com/home/tools/manager-accounts/',
    helpLabel: 'Google Ads Manager',
    fields: [
      {
        key: 'developer_token',
        label: 'Developer Token',
        placeholder: 'Enter your Google Ads Developer Token',
        helpText: 'Requires Google Ads API access approval',
        type: 'password',
        required: true,
      },
      {
        key: 'customer_id',
        label: 'Customer ID',
        placeholder: '123-456-7890',
        helpText: 'Your Google Ads account ID (with or without dashes)',
        required: true,
      },
    ],
  },
  meta_ads: {
    title: 'Connect Meta Ads',
    description: 'Enter your Meta (Facebook) app credentials.',
    helpUrl: 'https://developers.facebook.com/apps',
    helpLabel: 'Meta for Developers',
    fields: [
      {
        key: 'app_id',
        label: 'App ID',
        placeholder: 'Enter your Meta App ID',
        required: true,
      },
      {
        key: 'app_secret',
        label: 'App Secret',
        placeholder: 'Enter your Meta App Secret',
        type: 'password',
        required: true,
      },
      {
        key: 'access_token',
        label: 'Access Token',
        placeholder: 'Enter your long-lived access token',
        helpText: 'Generate in Meta Business Suite or Graph API Explorer',
        type: 'password',
        required: true,
      },
    ],
  },
}

interface IntegrationConnectModalProps {
  provider: IntegrationProvider | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  icon?: React.ReactNode
  color?: string
}

export function IntegrationConnectModal({
  provider,
  isOpen,
  onClose,
  onSuccess,
  icon,
  color,
}: IntegrationConnectModalProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!provider) return null

  const config = providerCredentials[provider]

  // For providers that use OAuth (like Gmail), redirect to OAuth flow
  const handleOAuthConnect = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetchWithCsrf('/api/v1/integrations', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to initiate connection')
      }

      const { data } = await response.json()

      if (data.oauthUrl) {
        // Redirect to OAuth flow
        window.location.href = data.oauthUrl
      } else {
        toast.success('Connection initiated')
        onSuccess()
        onClose()
      }
    } catch (error) {
      toast.error('Connection failed', {
        description: error instanceof Error ? error.message : 'Failed to connect',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // For providers that need manual credential entry
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const newErrors: Record<string, string> = {}
    config.fields.forEach((field) => {
      if (field.required && !credentials[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} is required`
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      // Create the integration with credentials
      const response = await fetchWithCsrf('/api/v1/integrations', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          credentials,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save credentials')
      }

      toast.success(`${config.title.replace('Connect ', '')} connected`, {
        description: 'Your credentials have been saved securely.',
      })

      setCredentials({})
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('Connection failed', {
        description: error instanceof Error ? error.message : 'Failed to save credentials',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFieldChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const { [key]: _, ...rest } = prev
        return rest
      })
    }
  }

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleClose = () => {
    setCredentials({})
    setErrors({})
    setShowSecrets({})
    onClose()
  }

  // If no fields (OAuth-based), show OAuth button
  if (config.fields.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {icon && (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: color ? `${color}20` : undefined }}
                >
                  {icon}
                </div>
              )}
              {config.title}
            </DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <Button
              onClick={handleOAuthConnect}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect with Google
                </>
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Credential entry form
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {icon && (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: color ? `${color}20` : undefined }}
              >
                {icon}
              </div>
            )}
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCredentialSubmit} className="space-y-4 py-4">
          {config.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <div className="relative">
                <Input
                  id={field.key}
                  type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={credentials[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className={errors[field.key] ? 'border-red-500' : ''}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => toggleShowSecret(field.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets[field.key] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              )}
              {errors[field.key] && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors[field.key]}
                </p>
              )}
            </div>
          ))}

          <a
            href={config.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            {config.helpLabel}
          </a>
        </form>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCredentialSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
