'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Import step components
import LeadMagnetSelectStep from './wizard-steps/lead-magnet-select'
import CampaignBasicsStep from './wizard-steps/campaign-basics'
import ContentCreationStep from './wizard-steps/content-creation'
import TriggerWordsStep from './wizard-steps/trigger-words'
import DMSequenceStep from './wizard-steps/dm-sequence'
import WebhookConfigStep from './wizard-steps/webhook-config'
import ReviewStep from './wizard-steps/review'

interface CampaignWizardProps {
  onComplete: () => void
}

const steps = [
  { id: 1, name: 'Lead Magnet', component: LeadMagnetSelectStep },
  { id: 2, name: 'Campaign Details', component: CampaignBasicsStep },
  { id: 3, name: 'Post Content', component: ContentCreationStep },
  { id: 4, name: 'Trigger Words', component: TriggerWordsStep },
  { id: 5, name: 'DM Sequence', component: DMSequenceStep },
  { id: 6, name: 'Webhook & Delivery', component: WebhookConfigStep },
  { id: 7, name: 'Review & Launch', component: ReviewStep },
]

export default function CampaignWizard({ onComplete }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [campaignData, setCampaignData] = useState<any>({})

  const handleNext = (stepData: any) => {
    setCampaignData({ ...campaignData, ...stepData })
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const CurrentStepComponent = steps[currentStep - 1].component
  const progress = (currentStep / steps.length) * 100

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-slate-600">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps Navigation */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                  currentStep > step.id
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : currentStep === step.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium',
                  currentStep >= step.id ? 'text-slate-900' : 'text-slate-400'
                )}
              >
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mt-5',
                  currentStep > step.id ? 'bg-emerald-600' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].name}</CardTitle>
          <CardDescription>
            Complete this step to continue with your campaign setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent
            data={campaignData}
            onNext={handleNext}
            onBack={handleBack}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === steps.length}
          />
        </CardContent>
      </Card>
    </div>
  )
}
