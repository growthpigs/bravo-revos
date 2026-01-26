# Kakiyo Offers Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace placeholder Offers page with Kakiyo-focused UI for instant-value content assets (PDFs, templates, checklists) that capture LinkedIn leads.

**Architecture:** Client-side React page with Smart Builder modal using shadcn/ui Dialog component. Mock data for demonstration. Focus on LinkedIn-specific offer types with email capture vs direct link delivery options.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, shadcn/ui (Dialog, Button, Card, Label, Textarea, RadioGroup), lucide-react icons

---

## Task 1: Create Smart Builder Modal Component

**Files:**
- Create: `components/offers/smart-builder-modal.tsx`

**Step 1: Create component directory**

```bash
mkdir -p components/offers
```

**Step 2: Write the Smart Builder Modal component**

Create `components/offers/smart-builder-modal.tsx`:

```typescript
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
              value={answers[currentQuestion.id]}
              onChange={(e) => setAnswers({
                ...answers,
                [currentQuestion.id]: e.target.value
              })}
            />
          ) : (
            <RadioGroup
              value={answers[currentQuestion.id]}
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
            disabled={isGenerating || !answers[currentQuestion.id]}
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step < questions.length ? 'Next' : 'Generate Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 3: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors

**Step 4: Commit the modal component**

```bash
git add components/offers/smart-builder-modal.tsx
git commit -m "feat(offers): add Smart Builder modal with 5-step wizard"
```

---

## Task 2: Replace Offers Page with Kakiyo UI

**Files:**
- Modify: `app/dashboard/offers/page.tsx` (replace entire file)

**Step 1: Replace Offers page with Kakiyo-focused version**

Replace entire contents of `app/dashboard/offers/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Edit, Globe, Download, Link, Mail } from 'lucide-react'
import { SmartBuilderModal } from '@/components/offers/smart-builder-modal'

export default function OffersPage() {
  const [showSmartBuilder, setShowSmartBuilder] = useState(false)
  const [offers, setOffers] = useState([
    {
      id: 1,
      name: "7 Steps to 10x Your LinkedIn Engagement",
      type: "PDF Guide",
      delivery: "Email",
      leads_captured: 247,
      conversion_rate: "34%",
      status: "active"
    },
    {
      id: 2,
      name: "My $100K Content Strategy Template",
      type: "Notion Template",
      delivery: "Link",
      leads_captured: 189,
      conversion_rate: "28%",
      status: "active"
    }
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Offers</h1>
        <p className="text-muted-foreground mt-2">
          Create valuable content that prospects want - PDFs, templates, checklists -
          delivered instantly via email capture or direct link
        </p>
      </div>

      {/* Create Offer Section - Kakiyo Style */}
      <Card className="mb-8 p-6 bg-gray-900/50 border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Create New Offer</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowSmartBuilder(true)}
            className="p-6 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all text-center group"
          >
            <FileText className="w-8 h-8 mx-auto mb-3 group-hover:text-blue-400" />
            <div className="font-medium mb-1">Smart Builder</div>
            <div className="text-sm text-muted-foreground">
              Answer 5 questions, AI creates your offer
            </div>
          </button>

          <button className="p-6 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all text-center group">
            <Edit className="w-8 h-8 mx-auto mb-3 group-hover:text-blue-400" />
            <div className="font-medium mb-1">Manual Entry</div>
            <div className="text-sm text-muted-foreground">
              Write your own offer content
            </div>
          </button>

          <button className="p-6 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all text-center group">
            <Globe className="w-8 h-8 mx-auto mb-3 group-hover:text-blue-400" />
            <div className="font-medium mb-1">Website Scraping</div>
            <div className="text-sm text-muted-foreground">
              Extract from existing content
            </div>
          </button>
        </div>
      </Card>

      {/* Existing Offers */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Offers</h2>
        <div className="space-y-4">
          {offers.map(offer => (
            <Card key={offer.id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{offer.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      offer.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {offer.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {offer.type}
                    </span>
                    <span className="flex items-center gap-1">
                      {offer.delivery === 'Email' ? <Mail className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                      {offer.delivery}
                    </span>
                    <span>📊 {offer.leads_captured} leads</span>
                    <span>🎯 {offer.conversion_rate} conversion</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm">Preview</Button>
                  <Button variant="outline" size="sm">Stats</Button>
                  <Button variant="destructive" size="sm">Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Popular Offer Types */}
      <Card className="p-6 bg-blue-950/20 border-blue-900/50">
        <h3 className="font-semibold text-lg mb-4">🚀 Popular LinkedIn Offer Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">"How I did X" PDF guides</div>
                <div className="text-xs text-muted-foreground">Share your success story</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Excel/Notion templates</div>
                <div className="text-xs text-muted-foreground">Ready-to-use tools</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Checklists & frameworks</div>
                <div className="text-xs text-muted-foreground">Actionable processes</div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Case study breakdowns</div>
                <div className="text-xs text-muted-foreground">Real results analyzed</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Swipe files & scripts</div>
                <div className="text-xs text-muted-foreground">Copy-paste templates</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Resource lists</div>
                <div className="text-xs text-muted-foreground">Curated tools & links</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Smart Builder Modal */}
      <SmartBuilderModal
        open={showSmartBuilder}
        onClose={() => setShowSmartBuilder(false)}
      />
    </div>
  )
}
```

**Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors

**Step 3: Verify dev server compiles successfully**

Check dev server output - should show compilation success with no errors.

**Step 4: Commit the updated page**

```bash
git add app/dashboard/offers/page.tsx
git commit -m "feat(offers): replace placeholder with Kakiyo-focused UI for instant-value content"
```

---

## Task 3: Manual Browser Testing

**Step 1: Navigate to Offers page**

1. Ensure dev server is running: `npm run dev`
2. Navigate to: `http://localhost:3000/dashboard/offers`
3. Verify page loads without errors

**Step 2: Verify page content**

Check the following elements are visible:
- ✅ Page title: "Offers"
- ✅ Subtitle mentions PDFs, templates, checklists
- ✅ Dark "Create New Offer" card with 3 options
- ✅ 2 mock offers displayed with stats (247 leads, 189 leads)
- ✅ "Popular LinkedIn Offer Types" section with 6 items

**Step 3: Test Smart Builder modal**

1. Click "Smart Builder" button
2. Verify modal opens with title "Smart Offer Builder"
3. Verify "Step 1 of 5" is displayed
4. Verify first question: "What's the main problem your audience faces?"
5. Type some text in textarea
6. Click "Next" button
7. Verify Step 2 appears
8. Click "Back" button
9. Verify returns to Step 1
10. Click through all 5 steps
11. Verify final step shows "Generate Offer" button
12. Click "Generate Offer"
13. Verify loading spinner appears
14. After 2 seconds, verify modal closes
15. Check browser console for log: "Generated offer with answers: {...}"

**Step 4: Test hover states**

1. Hover over "Smart Builder" card - verify background darkens, icon turns blue
2. Hover over "Manual Entry" card - verify same effect
3. Hover over "Website Scraping" card - verify same effect
4. Hover over offer cards - verify shadow increases

**Step 5: Take screenshots**

1. Screenshot: Full Offers page showing all sections
2. Screenshot: Smart Builder modal on Step 1
3. Screenshot: Smart Builder modal on Step 3 (radio buttons visible)

---

## Task 4: Final Verification

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: ✅ No errors

**Step 2: Check git status**

```bash
git status
```

Expected: Clean working directory (all changes committed)

**Step 3: Review commits**

```bash
git log --oneline -3
```

Expected: See 2 commits:
1. "feat(offers): add Smart Builder modal with 5-step wizard"
2. "feat(offers): replace placeholder with Kakiyo-focused UI for instant-value content"

---

## Success Criteria

- ✅ Offers page focuses on instant-value content (PDFs, templates, checklists)
- ✅ Kakiyo-style dark card with 3 creation options
- ✅ Smart Builder modal works with 5-step wizard
- ✅ Mock data shows 2 offers with realistic stats
- ✅ Clear delivery options (email capture vs direct link)
- ✅ LinkedIn-specific offer types highlighted
- ✅ All TypeScript compilation passes
- ✅ Page loads without errors
- ✅ Modal interaction works (next, back, generate)

---

## Notes for Engineer

**Why Kakiyo Concept:**
- Focus on INSTANT-VALUE content (downloadable/linkable)
- NOT webinars/events/trials - those require scheduling
- LinkedIn-specific: people want quick wins they can apply immediately
- Email capture is preferred but direct link also supported

**Component Architecture:**
- Page is client component (uses useState)
- Modal is separate component for reusability
- Mock data structure matches future API shape
- All buttons placeholder except Smart Builder

**Future Enhancements:**
- Connect Smart Builder to AI API
- Implement Manual Entry form
- Implement Website Scraping
- Add actual offer CRUD operations
- Connect to backend storage
