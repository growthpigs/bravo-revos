'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IOSToggle } from '@/components/ui/ios-toggle'
import { ChevronRight, ChevronLeft } from 'lucide-react'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

const webhookPresets = {
  zapier: { name: 'Zapier', url: 'https://hooks.zapier.com/hooks/catch/' },
  make: { name: 'Make (Integromat)', url: 'https://hook.make.com/' },
  convertkit: { name: 'ConvertKit', url: 'https://api.convertkit.com/v3/' },
  custom: { name: 'Custom Webhook', url: '' },
}

export default function WebhookConfigStep({ data, onNext, onBack }: StepProps) {
  const [formData, setFormData] = useState({
    webhookEnabled: data.webhookEnabled ?? true,
    webhookType: data.webhookType || 'zapier',
    webhookUrl: data.webhookUrl || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <IOSToggle
          checked={formData.webhookEnabled}
          onCheckedChange={(checked) => setFormData({ ...formData, webhookEnabled: checked })}
          label="Enable Webhook Integration"
          description="Send lead data to your CRM or email marketing platform"
        />

        {formData.webhookEnabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="webhookType">Webhook Type</Label>
              <Select
                value={formData.webhookType}
                onValueChange={(value) => setFormData({ ...formData, webhookType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select webhook type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(webhookPresets).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder={webhookPresets[formData.webhookType as keyof typeof webhookPresets]?.url || 'https://your-webhook-url.com'}
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                required={formData.webhookEnabled}
              />
              <p className="text-sm text-slate-500">
                Leads will be sent to this URL when they provide their email
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit">
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
