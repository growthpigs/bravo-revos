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
      console.log('[CAMPAIGN_LAUNCH] ========================================')
      console.log('[CAMPAIGN_LAUNCH] Starting full launch sequence...')
      console.log('[CAMPAIGN_LAUNCH] Full campaign data:', data)

      // Validate required fields
      if (!data.name || !data.name.trim()) {
        toast.error('Campaign name is required')
        setLoading(false)
        return
      }

      // ========================================
      // STEP 1: Create Campaign (Save to DB)
      // ========================================
      console.log('[CAMPAIGN_LAUNCH] Step 1: Creating campaign...')
      toast.info('Creating campaign...', { id: 'launch-progress' })

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Campaign details
          name: data.name.trim(),
          description: data.description || null,
          status: 'active', // Set to active since we're launching

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

      console.log('[CAMPAIGN_LAUNCH] Campaign API Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CAMPAIGN_LAUNCH] Campaign creation error:', errorText)
        try {
          const error = JSON.parse(errorText)
          throw new Error(error.error || `Failed to create campaign (${response.status})`)
        } catch {
          throw new Error(`Failed to create campaign (${response.status}): ${errorText}`)
        }
      }

      const campaignResult = await response.json()
      const campaign = campaignResult.data
      console.log('[CAMPAIGN_LAUNCH] ✅ Campaign created:', campaign.id)

      // ========================================
      // STEP 2: Publish to LinkedIn
      // ========================================
      console.log('[CAMPAIGN_LAUNCH] Step 2: Publishing to LinkedIn...')
      toast.info('Publishing to LinkedIn...', { id: 'launch-progress' })

      let postUrl: string | null = null
      let publishError: string | null = null

      if (data.postContent) {
        try {
          const publishResponse = await fetch('/api/linkedin/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: data.postContent,
              campaignId: campaign.id,  // Link post to campaign
              triggerWord: data.triggerWords?.[0] || 'guide',  // Use first trigger word
            }),
          })

          if (publishResponse.ok) {
            const publishResult = await publishResponse.json()
            postUrl = publishResult.post?.url || null
            console.log('[CAMPAIGN_LAUNCH] ✅ Post published:', postUrl)
          } else {
            const publishErrorText = await publishResponse.text()
            console.warn('[CAMPAIGN_LAUNCH] ⚠️ LinkedIn publish failed:', publishErrorText)
            publishError = 'LinkedIn post failed - you can post manually later'
          }
        } catch (err) {
          console.warn('[CAMPAIGN_LAUNCH] ⚠️ LinkedIn API error:', err)
          publishError = 'LinkedIn API unavailable - post manually'
        }
      }

      // ========================================
      // STEP 3: Trigger Pod Amplification
      // ========================================
      let podTriggered = false
      let podError: string | null = null

      if (postUrl && campaign.pod_id) {
        console.log('[CAMPAIGN_LAUNCH] Step 3: Triggering pod amplification...')
        toast.info('Activating pod boost...', { id: 'launch-progress' })

        try {
          const podResponse = await fetch('/api/campaigns/trigger-pod', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              campaign_id: campaign.id,
              post_url: postUrl,
            }),
          })

          if (podResponse.ok) {
            const podResult = await podResponse.json()
            console.log('[CAMPAIGN_LAUNCH] ✅ Pod triggered:', podResult)
            podTriggered = true
          } else {
            const podErrorText = await podResponse.text()
            console.warn('[CAMPAIGN_LAUNCH] ⚠️ Pod trigger failed:', podErrorText)
            podError = 'Pod notification failed'
          }
        } catch (err) {
          console.warn('[CAMPAIGN_LAUNCH] ⚠️ Pod API error:', err)
          podError = 'Pod API unavailable'
        }
      } else if (!campaign.pod_id) {
        console.log('[CAMPAIGN_LAUNCH] ℹ️ No pod associated - skipping amplification')
        podError = 'No pod assigned'
      } else if (!postUrl) {
        console.log('[CAMPAIGN_LAUNCH] ℹ️ No post URL - cannot trigger pod')
        podError = 'Post not published'
      }

      // ========================================
      // STEP 4: Show Final Result
      // ========================================
      console.log('[CAMPAIGN_LAUNCH] ========================================')
      console.log('[CAMPAIGN_LAUNCH] Launch sequence complete!')
      console.log('[CAMPAIGN_LAUNCH] Summary:', {
        campaignCreated: true,
        campaignId: campaign.id,
        postPublished: !!postUrl,
        postUrl,
        podTriggered,
      })

      // Build success message
      if (podTriggered) {
        toast.success('🚀 Campaign Created & Pod Activated!', {
          id: 'launch-progress',
          description: 'Your post is live and your pod has been notified!',
          duration: 5000,
        })
      } else if (postUrl) {
        toast.success('✅ Campaign Created & Post Published!', {
          id: 'launch-progress',
          description: podError ? `Note: ${podError}` : 'Redirecting to campaigns...',
          duration: 5000,
        })
      } else {
        toast.success('✅ Campaign Created!', {
          id: 'launch-progress',
          description: publishError || 'You can publish your post later.',
          duration: 5000,
        })
      }

      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/dashboard/campaigns')
    } catch (error) {
      console.error('[CAMPAIGN_LAUNCH] Fatal error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      toast.error('Failed to launch campaign', {
        id: 'launch-progress',
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
