'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Check, Rocket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
      console.log('[CAMPAIGN_CREATE] Campaign data:', {
        name: data.name,
        description: data.description,
        triggerWords: data.triggerWords,
      })

      // Call API endpoint to create campaign
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          trigger_words: data.triggerWords,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create campaign')
      }

      const result = await response.json()
      console.log('[CAMPAIGN_CREATE] Campaign created successfully:', result.data)

      // TODO: Upload lead magnet to Supabase Storage
      // TODO: Create DM sequences
      // TODO: Create webhook config if enabled

      router.push('/dashboard/campaigns')
    } catch (error) {
      console.error('[CAMPAIGN_CREATE] Error:', error)
      alert(`Error creating campaign: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
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
              <dd className="font-medium text-slate-900">{data.leadMagnetTemplate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Title:</dt>
              <dd className="font-medium text-slate-900">{data.leadMagnetTitle}</dd>
            </div>
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
