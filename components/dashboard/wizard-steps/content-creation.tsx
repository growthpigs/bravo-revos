'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

export default function ContentCreationStep({ data, onNext, onBack }: StepProps) {
  const [formData, setFormData] = useState({
    postContent: data.postContent || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  const handleGenerateAI = () => {
    // TODO: Integrate AI content generation
    const sampleContent = `Struggling to generate quality leads on LinkedIn?

I've spent the last 5 years perfecting a system that consistently brings in 50+ qualified leads per month.

And I'm giving it away for FREE.

Comment "GUIDE" below and I'll send you my complete LinkedIn Growth Blueprint.

Inside you'll discover:
✓ The exact post formula that gets 10x engagement
✓ How to turn comments into conversations
✓ My proven outreach sequence that converts at 35%

No fluff. No theory. Just what actually works.

Drop "GUIDE" in the comments 👇`

    setFormData({ ...formData, postContent: sampleContent })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="postContent">LinkedIn Post Content</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateAI}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
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
            Make sure to include a clear call-to-action for users to comment with a trigger word
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
