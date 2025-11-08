'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Check, Rocket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

export default function ReviewStep({ data, onBack }: StepProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLaunch = async () => {
    setLoading(true)
    try {
      console.log('[CAMPAIGN_CREATE] Starting campaign creation...')
      console.log('[CAMPAIGN_CREATE] Full campaign data:', data)

      // Validate required fields
      if (!data.name || !data.name.trim()) {
        toast.error('Campaign name is required')
        setLoading(false)
        return
      }

      // Call API endpoint to create campaign with ALL wizard data
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Campaign details
          name: data.name.trim(),
          description: data.description || null,
          status: 'draft',

          // Lead magnet
          leadMagnetSource: data.libraryId ? 'library' : data.isCustom ? 'custom' : 'none',
          libraryId: data.libraryId || null,
          libraryMagnetTitle: data.libraryMagnetTitle || null,
          libraryMagnetUrl: data.libraryMagnetUrl || null,
          libraryMagnetCategory: data.libraryMagnetCategory || null,
          isCustom: data.isCustom || false,
          leadMagnetTitle: data.leadMagnetTitle || null,
          deliveryMethod: data.deliveryMethod || null,
          leadMagnetLink: data.leadMagnetLink || null,
          leadMagnetText: data.leadMagnetText || null,

          // Content
          postContent: data.postContent || '',
          triggerWords: data.triggerWords || [],

          // DM Sequence
          dm1: data.dm1 || '',
          dm2: data.dm2 || null,

          // Webhook
          webhookEnabled: data.webhookEnabled || false,
          webhookUrl: data.webhookUrl || null,
          webhookType: data.webhookType || null,
        }),
      })

      console.log('[CAMPAIGN_CREATE] API Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CAMPAIGN_CREATE] Error response:', errorText)
        try {
          const error = JSON.parse(errorText)
          throw new Error(error.error || `Failed to create campaign (${response.status})`)
        } catch {
          throw new Error(`Failed to create campaign (${response.status}): ${errorText}`)
        }
      }

      const result = await response.json()
      console.log('[CAMPAIGN_CREATE] Campaign created successfully:', result.data)

      // Show success toast
      toast.success('Campaign created successfully!', {
        description: 'Redirecting to campaigns page...',
      })

      // Small delay to ensure DB is ready before redirect
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push('/dashboard/campaigns')
    } catch (error) {
      console.error('[CAMPAIGN_CREATE] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      toast.error('Failed to create campaign', {
        description: errorMessage,
        duration: 5000,
      })

      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">
          Review Your Campaign
        </h3>
        <p className="text-slate-600">
          Check everything looks good before launching
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h4 className="font-semibold text-slate-900 mb-2">Lead Magnet</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Type:</dt>
              <dd className="font-medium text-slate-900">
                {data.isCustom ? 'Custom' : 'Library Template'}
              </dd>
            </div>
            {!data.isCustom && data.libraryMagnetTitle && (
              <>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Title:</dt>
                  <dd className="font-medium text-slate-900">{data.libraryMagnetTitle}</dd>
                </div>
                {data.libraryMagnetCategory && (
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Category:</dt>
                    <dd className="font-medium text-slate-900">{data.libraryMagnetCategory}</dd>
                  </div>
                )}
              </>
            )}
            {data.isCustom && data.leadMagnetTitle && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Title:</dt>
                <dd className="font-medium text-slate-900">{data.leadMagnetTitle}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold text-slate-900 mb-2">Campaign Details</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Name:</dt>
              <dd className="font-medium text-slate-900">{data.name}</dd>
            </div>
            {data.description && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Description:</dt>
                <dd className="font-medium text-slate-900 text-right max-w-xs truncate">
                  {data.description}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold text-slate-900 mb-2">Trigger Words</h4>
          <div className="flex flex-wrap gap-2">
            {data.triggerWords?.map((word: string) => (
              <Badge key={word} variant="secondary">
                {word}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold text-slate-900 mb-2">Webhook Integration</h4>
          <p className="text-sm text-slate-600">
            {data.webhookEnabled ? (
              <>
                <span className="text-emerald-600 font-medium">Enabled</span> - {data.webhookType}
              </>
            ) : (
              <span className="text-slate-500">Disabled</span>
            )}
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold text-slate-900 mb-2">DM Sequence</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">DM 1 (Email Request):</dt>
              <dd className="font-medium text-emerald-600">✓ Configured</dd>
            </div>
            {data.dm2Enabled && (
              <div className="flex justify-between">
                <dt className="text-slate-600">DM 2 (5-min fallback):</dt>
                <dd className="font-medium text-emerald-600">✓ Enabled</dd>
              </div>
            )}
            {data.dm3Enabled && (
              <div className="flex justify-between">
                <dt className="text-slate-600">DM 3 (Follow-up):</dt>
                <dd className="font-medium text-emerald-600">✓ Enabled ({data.dm3DelayMinutes} min delay)</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleLaunch} disabled={loading}>
          {loading ? (
            'Launching...'
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Launch Campaign
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
