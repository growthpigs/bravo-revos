'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'

interface SmartBuilderModalProps {
  open: boolean
  onClose: () => void
}

export function SmartBuilderModal({ open, onClose }: SmartBuilderModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    topic: '',
    targetAudience: '',
    mainBenefit: '',
    proofPoint: '',
    deliveryFormat: ''
  })

  const handleNext = () => {
    if (step < 5) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = () => {
    // TODO: Generate offer with AI
    console.log('Creating offer with:', formData)
    onClose()
    setStep(1)
    setFormData({
      topic: '',
      targetAudience: '',
      mainBenefit: '',
      proofPoint: '',
      deliveryFormat: ''
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Smart Offer Builder - Step {step} of 5</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="topic">What topic do you want to create an offer about?</Label>
                <Input
                  id="topic"
                  placeholder="e.g., LinkedIn engagement strategies"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                This will be the main focus of your lead magnet
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="audience">Who is this for?</Label>
                <Input
                  id="audience"
                  placeholder="e.g., B2B founders with 0-10k followers"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Be specific about who will benefit most
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="benefit">What's the main outcome they'll get?</Label>
                <Textarea
                  id="benefit"
                  placeholder="e.g., 10x their engagement in 30 days without spending hours creating content"
                  value={formData.mainBenefit}
                  onChange={(e) => setFormData({ ...formData, mainBenefit: e.target.value })}
                  rows={3}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Focus on the transformation, not just the features
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="proof">What proof do you have this works?</Label>
                <Textarea
                  id="proof"
                  placeholder="e.g., Used this to grow from 2k to 50k followers in 6 months"
                  value={formData.proofPoint}
                  onChange={(e) => setFormData({ ...formData, proofPoint: e.target.value })}
                  rows={3}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Social proof makes your offer credible
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="format">How will you deliver this?</Label>
                <select
                  id="format"
                  className="w-full p-2 border rounded-md"
                  value={formData.deliveryFormat}
                  onChange={(e) => setFormData({ ...formData, deliveryFormat: e.target.value })}
                >
                  <option value="">Select format...</option>
                  <option value="pdf">PDF Guide</option>
                  <option value="notion">Notion Template</option>
                  <option value="excel">Excel Spreadsheet</option>
                  <option value="checklist">Checklist</option>
                  <option value="video">Video Training</option>
                  <option value="link">Direct Link/Resource</option>
                </select>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose the format that best delivers value
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {step < 5 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                Generate Offer
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
