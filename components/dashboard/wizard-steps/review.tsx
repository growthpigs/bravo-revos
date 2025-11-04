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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', user?.id || '')
        .single()

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          client_id: userData?.client_id,
          name: data.name,
          description: data.description,
          trigger_words: data.triggerWords,
          status: 'draft',
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // TODO: Upload lead magnet to Supabase Storage
      // TODO: Create DM sequences
      // TODO: Create webhook config if enabled

      router.push('/dashboard/campaigns')
    } catch (error) {
      console.error('Error creating campaign:', error)
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
          <h4 className="font-semibold text-slate-900 mb-2">Campaign Basics</h4>
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
          <h4 className="font-semibold text-slate-900 mb-2">Lead Magnet</h4>
          <p className="text-sm text-slate-900">{data.leadMagnetTitle}</p>
          <p className="text-xs text-slate-500 mt-1">
            File: {data.leadMagnetFile?.name || 'Not uploaded'}
          </p>
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
          <p className="text-sm text-slate-600">
            {data.dm1 ? '3-step sequence configured' : 'Not configured'}
          </p>
          {data.backupDmEnabled && (
            <p className="text-xs text-amber-600 mt-1">Backup sequence enabled</p>
          )}
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
