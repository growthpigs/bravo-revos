'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronLeft, Plus, X } from 'lucide-react'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

export default function TriggerWordsStep({ data, onNext, onBack }: StepProps) {
  const [triggerWords, setTriggerWords] = useState<string[]>(data.triggerWords || ['GUIDE'])
  const [newWord, setNewWord] = useState('')

  const handleAddWord = () => {
    if (newWord.trim() && !triggerWords.includes(newWord.trim().toUpperCase())) {
      setTriggerWords([...triggerWords, newWord.trim().toUpperCase()])
      setNewWord('')
    }
  }

  const handleRemoveWord = (word: string) => {
    setTriggerWords(triggerWords.filter((w) => w !== word))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext({ triggerWords })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="triggerWord">Trigger Words</Label>
          <div className="flex gap-2">
            <Input
              id="triggerWord"
              placeholder="e.g., GUIDE, DOWNLOAD, SEND"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddWord()
                }
              }}
            />
            <Button type="button" onClick={handleAddWord}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            Add words that will trigger the lead magnet delivery when commented
          </p>
        </div>

        {triggerWords.length > 0 && (
          <div className="space-y-2">
            <Label>Active Trigger Words</Label>
            <div className="flex flex-wrap gap-2">
              {triggerWords.map((word) => (
                <Badge key={word} variant="secondary" className="pl-3 pr-1">
                  {word}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 ml-1 hover:bg-transparent"
                    onClick={() => handleRemoveWord(word)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={triggerWords.length === 0}>
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
