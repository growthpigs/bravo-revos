'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

export default function CampaignBasicsStep({ data, onNext, onBack }: StepProps) {
  // Auto-populate from library magnet if selected
  const getDefaultName = () => {
    if (data.name) return data.name
    if (data.libraryMagnetTitle) return `${data.libraryMagnetTitle} Campaign`
    return ''
  }

  const getDefaultDescription = () => {
    if (data.description) return data.description
    if (data.libraryMagnetTitle) {
      return `Lead generation campaign offering "${data.libraryMagnetTitle}" to engage prospects and capture emails on LinkedIn.`
    }
    return ''
  }

  const [formData, setFormData] = useState({
    name: getDefaultName(),
    description: getDefaultDescription(),
  })
  const [error, setError] = useState<string | null>(null)
  const [existingNames, setExistingNames] = useState<string[]>([])

  // Fetch existing campaign names to check for duplicates
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/campaigns')
        if (response.ok) {
          const result = await response.json()
          setExistingNames(result.data?.map((c: any) => c.name.toLowerCase()) || [])
        }
      } catch (err) {
        console.error('Failed to fetch campaigns:', err)
      }
    }
    fetchCampaigns()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Check for duplicate name
    if (existingNames.includes(formData.name.toLowerCase())) {
      setError(`A campaign named "${formData.name}" already exists. Please choose a different name.`)
      return
    }

    if (formData.name.trim().length < 3) {
      setError('Campaign name must be at least 3 characters long')
      return
    }

    setError(null)
    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name *</Label>
          <Input
            id="name"
            placeholder="e.g., LinkedIn Growth Q1 2024"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value })
              setError(null)
            }}
            required
            minLength={3}
          />
          <p className="text-sm text-slate-500">
            Choose a unique, descriptive name for your campaign
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe your campaign goals, target audience, or any special notes..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
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
