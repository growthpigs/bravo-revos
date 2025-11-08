'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ChevronRight, ChevronLeft, Sparkles, Eraser } from 'lucide-react'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

// Generate LinkedIn post based on lead magnet details
const generateDefaultPost = (leadMagnetTitle?: string, category?: string) => {
  const title = leadMagnetTitle || 'our exclusive guide'
  const hook = category === 'AI & Automation'
    ? 'Want to automate your workflow and save 10+ hours per week?'
    : category === 'LinkedIn & Growth'
    ? 'Struggling to grow your LinkedIn presence and generate quality leads?'
    : 'Want to level up your business results fast?'

  return `${hook}

I've spent years perfecting a system that actually works.

And I'm sharing it with you for FREE.

Comment "GUIDE" below and I'll send you "${title}" directly.

Inside you'll discover:
✓ Proven strategies that get results
✓ Step-by-step implementation guides
✓ Real examples from successful campaigns

No fluff. No theory. Just what works.

Drop "GUIDE" in the comments 👇

#LinkedInGrowth #LeadGeneration #MarketingStrategy`
}

export default function ContentCreationStep({ data, onNext, onBack }: StepProps) {
  const getDefaultContent = () => {
    if (data.postContent) return data.postContent
    // Auto-generate based on lead magnet selection
    return generateDefaultPost(data.libraryMagnetTitle || data.leadMagnetTitle, data.libraryMagnetCategory)
  }

  const [formData, setFormData] = useState({
    postContent: getDefaultContent(),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  const handleGenerateAI = () => {
    // Regenerate with fresh content (will use AgentKit/Mem0 when available)
    const newContent = generateDefaultPost(
      data.libraryMagnetTitle || data.leadMagnetTitle,
      data.libraryMagnetCategory
    )
    setFormData({ ...formData, postContent: newContent })
  }

  const handleClear = () => {
    setFormData({ ...formData, postContent: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="postContent">LinkedIn Post Content</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                <Eraser className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateAI}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
          <Textarea
            id="postContent"
            placeholder="Write your LinkedIn post that will drive engagement and comments..."
            value={formData.postContent}
            onChange={(e) => setFormData({ ...formData, postContent: e.target.value })}
            rows={12}
            required
            className="font-mono text-sm"
          />
          <p className="text-sm text-slate-500">
            Pre-filled with LinkedIn best practices. Edit as needed, or click &quot;Regenerate&quot; for fresh copy.
            Make sure to include a clear call-to-action for users to comment with a trigger word.
          </p>
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
