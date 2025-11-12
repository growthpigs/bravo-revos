'use client'

import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Loader2, Search, Sparkles, BookOpen } from 'lucide-react'
import { mapTemplateToAnswers, answersToOffering, type LeadMagnetTemplate, type SmartBuilderAnswers } from '@/lib/utils/template-mapper'

interface SmartBuilderModalProps {
  open: boolean
  onClose: () => void
}

export function SmartBuilderModal({ open, onClose }: SmartBuilderModalProps) {
  const [view, setView] = useState<'start' | 'library' | 'questions'>('start')
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)
  const [templates, setTemplates] = useState<LeadMagnetTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<LeadMagnetTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState<LeadMagnetTemplate | null>(null)
  const [answers, setAnswers] = useState<SmartBuilderAnswers>({
    problem: '',
    solution: '',
    format: 'pdf',
    outcome: '',
    delivery: 'email-capture'
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
        { value: 'email-capture', label: 'Email capture (recommended)' },
        { value: 'direct-link', label: 'Direct link (no email required)' }
      ]
    }
  ]

  // Fetch library templates
  useEffect(() => {
    if (view === 'library' && templates.length === 0) {
      fetchLibrary()
    }
  }, [view])

  // Filter templates based on search and category
  useEffect(() => {
    let filtered = templates

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        t =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, selectedCategory, searchQuery])

  const fetchLibrary = async () => {
    setIsLoadingLibrary(true)
    try {
      const response = await fetch('/api/lead-magnet-library')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
        setFilteredTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching library:', error)
    } finally {
      setIsLoadingLibrary(false)
    }
  }

  const handleSelectTemplate = (template: LeadMagnetTemplate) => {
    setSelectedTemplate(template)
    const mappedAnswers = mapTemplateToAnswers(template)
    setAnswers(mappedAnswers)
    setView('questions')
    setStep(1)
  }

  const handleStartFromScratch = () => {
    setSelectedTemplate(null)
    setAnswers({
      problem: '',
      solution: '',
      format: 'pdf',
      outcome: '',
      delivery: 'email-capture'
    })
    setView('questions')
    setStep(1)
  }

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
    try {
      // Convert answers to offering data structure
      const offeringData = answersToOffering(answers, selectedTemplate || undefined)

      // Save to database
      const response = await fetch('/api/offerings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offeringData),
      })

      if (!response.ok) {
        throw new Error('Failed to create offering')
      }

      const result = await response.json()
      console.log('Offering created successfully:', result.offering)

      // Close modal on success
      onClose()

      // TODO: Show success toast notification
      // TODO: Refresh offers list in parent component
    } catch (error) {
      console.error('Error generating offer:', error)
      // TODO: Show error toast notification
      alert('Failed to create offering. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const categories = [
    'all',
    ...Array.from(new Set(templates.map(t => t.category).filter((c): c is string => Boolean(c))))
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Smart Offer Builder</DialogTitle>
          <DialogDescription>
            {view === 'start' && 'Choose how to create your offer'}
            {view === 'library' && 'Browse our library of proven templates'}
            {view === 'questions' && `Step ${step} of ${questions.length}${selectedTemplate ? ` (Customizing: ${selectedTemplate.title})` : ''}`}
          </DialogDescription>
        </DialogHeader>

        {/* Start View */}
        {view === 'start' && (
          <div className="py-6 space-y-4">
            <Button
              onClick={handleStartFromScratch}
              variant="outline"
              className="w-full h-auto py-6 flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">Start from Scratch</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                Answer 5 questions and let AI generate your unique offer
              </span>
            </Button>

            <Button
              onClick={() => setView('library')}
              variant="outline"
              className="w-full h-auto py-6 flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span className="font-semibold">Select from Library</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                Choose from 98 proven templates and customize them
              </span>
            </Button>
          </div>
        )}

        {/* Library View */}
        {view === 'library' && (
          <div className="py-4 space-y-4">
            {/* Search and Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'All' : category}
                  </Button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            {isLoadingLibrary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{template.title}</h4>
                        {template.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        {template.category && (
                          <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {template.category}
                          </span>
                        )}
                      </div>
                      <Button size="sm" variant="ghost">
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setView('start')}>
                Back
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Questions View */}
        {view === 'questions' && currentQuestion && (
          <div>
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
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={isGenerating}
                >
                  Back
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setView('start')
                    setStep(1)
                  }}
                  disabled={isGenerating}
                >
                  Cancel
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
