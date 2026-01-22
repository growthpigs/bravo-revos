/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
'use client'

import { useState, useCallback } from 'react'
import { Send, Sparkles, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PlatformIcon } from './platform-icon'
import type { CommunicationWithMeta } from '@/stores/communications-store'

interface ReplyComposerProps {
  message: CommunicationWithMeta
  onSend: (content: string) => Promise<void>
  onGenerateDraft: (tone: 'professional' | 'casual') => Promise<string>
  onClose: () => void
  isSending?: boolean
  isGeneratingDraft?: boolean
  className?: string
}

type DraftTone = 'professional' | 'casual'

export function ReplyComposer({
  message,
  onSend,
  onGenerateDraft,
  onClose,
  isSending,
  isGeneratingDraft,
  className,
}: ReplyComposerProps) {
  const [content, setContent] = useState('')
  const [tone, setTone] = useState<DraftTone>('professional')
  const [localIsGenerating, setLocalIsGenerating] = useState(false)
  const [localIsSending, setLocalIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use props if provided, otherwise fall back to local state
  const isGeneratingDraftState = isGeneratingDraft !== undefined ? isGeneratingDraft : localIsGenerating
  const isSendingState = isSending !== undefined ? isSending : localIsSending

  const handleGenerateDraft = useCallback(async () => {
    setLocalIsGenerating(true)
    setError(null)

    try {
      const draft = await onGenerateDraft(tone)
      setContent(draft)
    } catch (_err) {
      setError('Failed to generate draft. Please try again.')
    } finally {
      setLocalIsGenerating(false)
    }
  }, [tone, onGenerateDraft])

  const handleSend = useCallback(async () => {
    if (!content.trim()) return

    setLocalIsSending(true)
    setError(null)

    try {
      await onSend(content.trim())
      setContent('')
      onClose()
    } catch (_err) {
      setError('Failed to send reply. Please try again.')
    } finally {
      setLocalIsSending(false)
    }
  }, [content, onSend, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl + Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
      // Escape to close
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [handleSend, onClose]
  )

  return (
    <div className={cn('border rounded-lg bg-card p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Reply via</span>
          <PlatformIcon platform={message.platform} size="sm" />
          <span className="font-medium text-foreground">
            {message.platform === 'slack' ? 'Slack' : 'Gmail'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Textarea */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your reply..."
        className="min-h-[120px] resize-none mb-3"
        disabled={isSendingState}
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive mb-3">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {/* AI Draft controls */}
        <div className="flex items-center gap-2">
          <Select
            value={tone}
            onValueChange={(value: DraftTone) => setTone(value)}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateDraft}
            disabled={isGeneratingDraftState || isSendingState}
            className="h-8"
          >
            {isGeneratingDraftState ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            Draft Reply
          </Button>
        </div>

        {/* Send button */}
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!content.trim() || isSendingState}
          className="h-8"
        >
          {isSendingState ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1.5" />
          )}
          Send
        </Button>
      </div>

      {/* Keyboard hint */}
      <p className="text-[10px] text-muted-foreground mt-2 text-right">
        Press ⌘+Enter to send
      </p>
    </div>
  )
}
