'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { IOSToggle } from '@/components/ui/ios-toggle'
import { ChevronRight, ChevronLeft } from 'lucide-react'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

export default function DMSequenceStep({ data, onNext, onBack }: StepProps) {
  const [formData, setFormData] = useState({
    dm1: data.dm1 || '',
    dm2: data.dm2 || '',
    dm3: data.dm3 || '',
    backupDmEnabled: data.backupDmEnabled ?? true,
    backupDm: data.backupDm || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dm1">DM Message 1 (Immediate)</Label>
          <Textarea
            id="dm1"
            placeholder="Hi {name}! Thanks for your interest. Here's your guide: {lead_magnet_url}"
            value={formData.dm1}
            onChange={(e) => setFormData({ ...formData, dm1: e.target.value })}
            rows={4}
            required
          />
          <p className="text-sm text-slate-500">
            Sent immediately after trigger word is detected
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dm2">DM Message 2 (24 hours later)</Label>
          <Textarea
            id="dm2"
            placeholder="Hi {name}, did you get a chance to check out the guide?"
            value={formData.dm2}
            onChange={(e) => setFormData({ ...formData, dm2: e.target.value })}
            rows={3}
          />
          <p className="text-sm text-slate-500">Optional follow-up message</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dm3">DM Message 3 (48 hours later)</Label>
          <Textarea
            id="dm3"
            placeholder="Hi {name}, I'd love to hear your thoughts on the guide!"
            value={formData.dm3}
            onChange={(e) => setFormData({ ...formData, dm3: e.target.value })}
            rows={3}
          />
          <p className="text-sm text-slate-500">Optional second follow-up</p>
        </div>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <IOSToggle
            checked={formData.backupDmEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, backupDmEnabled: checked })}
            label="Enable Backup DM Sequence"
            description="If user doesn't respond with email, send alternative sequence"
          />

          {formData.backupDmEnabled && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="backupDm">Backup DM Message</Label>
              <Textarea
                id="backupDm"
                placeholder="Hi {name}, I couldn't DM you the guide. Can you send me your email?"
                value={formData.backupDm}
                onChange={(e) => setFormData({ ...formData, backupDm: e.target.value })}
                rows={3}
                required={formData.backupDmEnabled}
              />
            </div>
          )}
        </Card>

        <div className="text-sm text-slate-600 bg-blue-50 p-4 rounded-lg">
          <strong>Available variables:</strong>
          <code className="ml-2 text-xs">
            {'{name}'} {'{lead_magnet_url}'} {'{campaign_name}'}
          </code>
        </div>
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
