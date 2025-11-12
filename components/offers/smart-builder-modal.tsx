'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'

interface SmartBuilderModalProps {
  open: boolean
  onClose: () => void
}

export function SmartBuilderModal({ open, onClose }: SmartBuilderModalProps) {
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [answers, setAnswers] = useState({
    problem: '',
    solution: '',
    format: 'pdf',
    outcome: '',
    delivery: 'email'
  })

  const questions = [
    {
      id: 'problem',
      question: "What's the main problem your audience faces?",
      placeholder: "e.g., They struggle to get engagement on LinkedIn posts",
      type: 'textarea'
    },
    {
      id: 'solution',
      question: "What unique insight or solution do you have?",
      placeholder: "e.g., A 7-step framework I used to 10x my engagement",
      type: 'textarea'
    },
    {
      id: 'format',
      question: "What format works best?",
      type: 'radio',
      options: [
        { value: 'pdf', label: 'PDF Guide' },
        { value: 'template', label: 'Template (Notion/Excel)' },
        { value: 'checklist', label: 'Checklist' },
        { value: 'swipefile', label: 'Swipe File' }
      ]
    },
    {
      id: 'outcome',
      question: "What's the desired outcome for readers?",
      placeholder: "e.g., They can immediately apply the framework to their next post",
      type: 'textarea'
    },
    {
      id: 'delivery',
      question: "How will they access it?",
      type: 'radio',
      options: [
        { value: 'email', label: 'Email capture (recommended)' },
        { value: 'link', label: 'Direct link (no email required)' }
      ]
    }
  ]

  const currentQuestion = questions[step - 1]

  const handleNext = () => {
    if (step < questions.length) {
      setStep(step + 1)
    } else {
      generateOffer()
    }
  }

  const generateOffer = async () => {
    setIsGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      console.log('Generated offer with answers:', answers)
      setIsGenerating(false)
      onClose()
      // In production, this would call your AI API
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Smart Offer Builder</DialogTitle>
          <DialogDescription>
            Step {step} of {questions.length}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <Label className="text-base mb-3 block">
            {currentQuestion.question}
          </Label>

          {currentQuestion.type === 'textarea' ? (
            <Textarea
              className="min-h-[100px]"
              placeholder={currentQuestion.placeholder}
              value={answers[currentQuestion.id as keyof typeof answers]}
              onChange={(e) => setAnswers({
                ...answers,
                [currentQuestion.id]: e.target.value
              })}
            />
          ) : (
            <RadioGroup
              value={answers[currentQuestion.id as keyof typeof answers]}
              onValueChange={(value) => setAnswers({
                ...answers,
                [currentQuestion.id]: value
              })}
            >
              {currentQuestion.options?.map(option => (
                <div key={option.value} className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isGenerating}
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={isGenerating || !answers[currentQuestion.id as keyof typeof answers]}
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step < questions.length ? 'Next' : 'Generate Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
