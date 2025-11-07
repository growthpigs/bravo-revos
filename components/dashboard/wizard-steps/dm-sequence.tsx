'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { IOSToggle } from '@/components/ui/ios-toggle'
import { ChevronRight, ChevronLeft, Copy, Check } from 'lucide-react'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

// Casual variations for DM1 (requesting email)
const DM1_VARIATIONS = {
  option1: "Hey {name}! 👋 Just send me your email and I'll send you the {lead_magnet_name}",
  option2: "Great to connect! What's your email so I can send you the {lead_magnet_name}?",
  option3: "Perfect! Just reply with your email and I'll get you the {lead_magnet_name} right away",
  option4: "Thanks for reaching out! Send me your email and I'll share the {lead_magnet_name}",
  option5: "Hey {name}, just your email and you'll get instant access to the {lead_magnet_name}",
  option6: "Quick question - what's the best email to send you the {lead_magnet_name}?",
}

export default function DMSequenceStep({ data, onNext, onBack }: StepProps) {
  const [formData, setFormData] = useState({
    dm1: data.dm1 || DM1_VARIATIONS.option1,
    dm1Option: data.dm1Option || 'option1',
    dm2Enabled: data.dm2Enabled ?? true,
    dm2: data.dm2 || "Hey! Just in case you didn't get the email, you can download the {lead_magnet_name} here: [link]",
    dm3Enabled: data.dm3Enabled ?? false,
    dm3DelayMinutes: data.dm3DelayMinutes || 180, // 3 hours default
    dm3: data.dm3 || "One more thing - did you get a chance to check out the {lead_magnet_name}? Let me know if you have any questions!",
  })

  const [copied, setCopied] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.dm1) {
      alert('Please select or create DM1')
      return
    }
    onNext(formData)
  }

  const handleSelectVariation = (option: string) => {
    setFormData({
      ...formData,
      dm1Option: option,
      dm1: DM1_VARIATIONS[option as keyof typeof DM1_VARIATIONS] || '',
    })
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const delayOptions = [
    { value: 60, label: '1 hour' },
    { value: 180, label: '3 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: '1 day' },
    { value: 4320, label: '3 days' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        {/* DM 1: Email Request - REQUIRED */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">1</div>
            <h3 className="font-bold text-lg text-slate-900">First DM: Ask for Email</h3>
            <span className="text-xs font-semibold text-red-600 ml-auto">REQUIRED</span>
          </div>

          <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded">
            💡 People respond with email when you ask. Choose a friendly, casual variation below or write your own.
          </p>

          {/* Variation Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Quick Select: Choose a variation</Label>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(DM1_VARIATIONS).map(([key, template]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectVariation(key)}
                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                    formData.dm1Option === key
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm text-slate-900">{template}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(template, key)
                      }}
                      className="mt-1"
                    >
                      {copied === key ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                      )}
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Editor */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="dm1" className="text-sm font-semibold">Or customize your message</Label>
            <Textarea
              id="dm1"
              placeholder="Write your custom DM message..."
              value={formData.dm1}
              onChange={(e) => setFormData({ ...formData, dm1: e.target.value })}
              rows={3}
              className="text-sm"
            />
            <p className="text-xs text-slate-600">
              Use {'{name}'} and {'{lead_magnet_name}'} as variables
            </p>
          </div>
        </div>

        {/* DM 2: Fallback / Alternative Delivery - Optional but Recommended */}
        <Card className="p-4 bg-amber-50 border-amber-300">
          <div className="flex items-start gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white text-sm font-bold">2</div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">5-Minute Fallback DM (Optional)</h3>
              <p className="text-xs text-amber-700 mt-1">Sent 5 min after email is captured, in case they missed the email</p>
            </div>
            <IOSToggle
              checked={formData.dm2Enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, dm2Enabled: checked })}
            />
          </div>

          {formData.dm2Enabled && (
            <div className="space-y-2 ml-10">
              <Textarea
                id="dm2"
                placeholder="Hey! Just in case the email didn't arrive, you can download it here: [link]"
                value={formData.dm2}
                onChange={(e) => setFormData({ ...formData, dm2: e.target.value })}
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-amber-700">This protects users if their email bounces or gets filtered</p>
            </div>
          )}
        </Card>

        {/* DM 3: Follow-up - Optional */}
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-start gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-600 text-white text-sm font-bold">3</div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Follow-up DM (Optional)</h3>
              <p className="text-xs text-slate-600 mt-1">Send a follow-up message after a delay</p>
            </div>
            <IOSToggle
              checked={formData.dm3Enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, dm3Enabled: checked })}
            />
          </div>

          {formData.dm3Enabled && (
            <div className="space-y-4 ml-10">
              <div className="space-y-2">
                <Label htmlFor="delay" className="text-sm font-medium">Send after:</Label>
                <select
                  id="delay"
                  value={formData.dm3DelayMinutes}
                  onChange={(e) => setFormData({ ...formData, dm3DelayMinutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {delayOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dm3" className="text-sm font-medium">Message:</Label>
                <Textarea
                  id="dm3"
                  placeholder="Did you check out the {lead_magnet_name}? Let me know if you have any questions!"
                  value={formData.dm3}
                  onChange={(e) => setFormData({ ...formData, dm3: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </Card>

        <div className="text-xs text-slate-600 bg-slate-100 p-3 rounded border border-slate-200">
          <strong>Variables you can use:</strong>
          <div className="font-mono text-slate-700 mt-1">
            {'{name}'} • {'{lead_magnet_name}'} • {'{link}'}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
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
