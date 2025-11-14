'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from 'sonner'
import { CreateDMSequenceInput } from '@/types/dm-sequences'

interface Campaign {
  id: string
  name: string
}

interface VoiceCartridge {
  id: string
  name: string
}

interface CreateDMSequenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateDMSequenceModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateDMSequenceModalProps) {
  const [loading, setLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [voiceCartridges, setVoiceCartridges] = useState<VoiceCartridge[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState<CreateDMSequenceInput>({
    campaign_id: '',
    name: '',
    description: '',
    step1_template: '',
    step1_delay_min: 2,
    step1_delay_max: 15,
    voice_cartridge_id: undefined,
    step2_confirmation_template: 'Got it! Sending your lead magnet now...',
    step3_enabled: true,
    step3_delay: 5,
    step3_template: 'Here is your direct download link',
    step3_link_expiry: 24,
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoadingData(true)

      // Load campaigns
      const campaignsResponse = await fetch('/api/campaigns')
      if (campaignsResponse.ok) {
        const campaignsResult = await campaignsResponse.json()
        setCampaigns(campaignsResult.data || [])
      }

      // Load voice cartridges
      const cartridgesResponse = await fetch('/api/cartridges?tier=client')
      if (cartridgesResponse.ok) {
        const cartridgesResult = await cartridgesResponse.json()
        setVoiceCartridges(cartridgesResult.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load campaigns and voice cartridges')
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.campaign_id) {
      toast.error('Please select a campaign')
      return
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a sequence name')
      return
    }

    if (!formData.step1_template.trim()) {
      toast.error('Please enter Step 1 message template')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/dm-sequences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create DM sequence')
      }

      toast.success('DM sequence created successfully')
      onOpenChange(false)
      onSuccess()

      // Reset form
      setFormData({
        campaign_id: '',
        name: '',
        description: '',
        step1_template: '',
        step1_delay_min: 2,
        step1_delay_max: 15,
        voice_cartridge_id: undefined,
        step2_confirmation_template: 'Got it! Sending your lead magnet now...',
        step3_enabled: true,
        step3_delay: 5,
        step3_template: 'Here is your direct download link',
        step3_link_expiry: 24,
      })
    } catch (error) {
      console.error('Error creating DM sequence:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create DM sequence')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create DM Sequence</DialogTitle>
          <DialogDescription>
            Set up an automated 3-step DM sequence to nurture your LinkedIn leads
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign">Campaign *</Label>
              <Select
                value={formData.campaign_id}
                onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
                disabled={loadingData}
              >
                <SelectTrigger id="campaign">
                  <SelectValue placeholder={loadingData ? 'Loading campaigns...' : 'Select a campaign'} />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Sequence Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Lead Magnet Follow-up"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this sequence for?"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="voice_cartridge">Voice Cartridge (Optional)</Label>
              <Select
                value={formData.voice_cartridge_id || ''}
                onValueChange={(value) => setFormData({ ...formData, voice_cartridge_id: value || undefined })}
                disabled={loadingData}
              >
                <SelectTrigger id="voice_cartridge">
                  <SelectValue placeholder={loadingData ? 'Loading cartridges...' : 'Select a voice cartridge'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {voiceCartridges.map((cartridge) => (
                    <SelectItem key={cartridge.id} value={cartridge.id}>
                      {cartridge.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 1: Initial DM */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Step 1: Initial DM</h3>
            <div>
              <Label htmlFor="step1_template">Message Template *</Label>
              <Textarea
                id="step1_template"
                value={formData.step1_template}
                onChange={(e) => setFormData({ ...formData, step1_template: e.target.value })}
                placeholder="Hi {{first_name}}, I saw your comment and wanted to share..."
                rows={4}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{'}{'{'} first_name {'}'}{'}'}, {'{'}{'{'} last_name {'}'}{'}'}, {'{'}{'{'} company {'}'}{'}'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="step1_delay_min">Min Delay (minutes)</Label>
                <Input
                  id="step1_delay_min"
                  type="number"
                  min="1"
                  value={formData.step1_delay_min}
                  onChange={(e) => setFormData({ ...formData, step1_delay_min: parseInt(e.target.value) || 2 })}
                />
              </div>
              <div>
                <Label htmlFor="step1_delay_max">Max Delay (minutes)</Label>
                <Input
                  id="step1_delay_max"
                  type="number"
                  min="1"
                  value={formData.step1_delay_max}
                  onChange={(e) => setFormData({ ...formData, step1_delay_max: parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>
          </div>

          {/* Step 2: Email Capture */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Step 2: Email Capture Response</h3>
            <div>
              <Label htmlFor="step2_confirmation_template">Confirmation Message</Label>
              <Textarea
                id="step2_confirmation_template"
                value={formData.step2_confirmation_template}
                onChange={(e) => setFormData({ ...formData, step2_confirmation_template: e.target.value })}
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Sent immediately when lead replies with their email
              </p>
            </div>
          </div>

          {/* Step 3: Backup DM */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Step 3: Backup DM (with download link)</h3>
            <div>
              <Label htmlFor="step3_template">Message Template</Label>
              <Textarea
                id="step3_template"
                value={formData.step3_template}
                onChange={(e) => setFormData({ ...formData, step3_template: e.target.value })}
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{'}{'{'} download_url {'}'}{'}'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="step3_delay">Delay After Step 2 (minutes)</Label>
                <Input
                  id="step3_delay"
                  type="number"
                  min="1"
                  value={formData.step3_delay}
                  onChange={(e) => setFormData({ ...formData, step3_delay: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div>
                <Label htmlFor="step3_link_expiry">Link Expiry (hours)</Label>
                <Input
                  id="step3_link_expiry"
                  type="number"
                  min="1"
                  value={formData.step3_link_expiry}
                  onChange={(e) => setFormData({ ...formData, step3_link_expiry: parseInt(e.target.value) || 24 })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingData}>
              {loading ? 'Creating...' : 'Create Sequence'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
