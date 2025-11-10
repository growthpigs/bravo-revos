'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Maximize2, Minimize2, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UIState = 'minimized' | 'panel' | 'fullscreen'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

/**
 * HGCChatKit - 3-State Chat Interface
 *
 * Connects directly to /api/hgc (Python orchestrator with AgentKit + Mem0)
 * Option A: Direct Backend Call (no Agent Builder needed)
 */
export function HGCChatKit() {
  const [uiState, setUiState] = useState<UIState>('minimized')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // Add user message
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)

    // Add placeholder for assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    setIsStreaming(true)

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/hgc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // Stream response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedResponse = ''

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulatedResponse += chunk

        // Update last message (assistant)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: accumulatedResponse
          }
          return updated
        })
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[CHATKIT] Request aborted')
        return
      }

      console.error('[CHATKIT] Error:', err)
      setError('Failed to send message. Please try again.')

      // Remove placeholder message
      setMessages(prev => prev.slice(0, -1))

    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClose = () => {
    setUiState('minimized')
  }

  const renderMessages = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">Ask me about your campaigns, pods, or LinkedIn performance!</p>
          <p className="text-xs text-gray-400 mt-2">Powered by Mem0 - I remember your preferences</p>
        </div>
      )}

      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        </div>
      ))}

      {isStreaming && messages[messages.length - 1]?.content === '' && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-lg px-4 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )

  const renderInput = () => (
    <div className="border-t border-gray-200 p-4">
      {error && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about campaigns, pods, metrics..."
          disabled={isStreaming}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          size="icon"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Minimized: Floating bubble */}
      {uiState === 'minimized' && (
        <button
          onClick={() => setUiState('panel')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-50"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Panel: Bottom-right panel */}
      {uiState === 'panel' && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <h3 className="font-semibold">Holy Grail Chat</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUiState('fullscreen')}
                className="hover:bg-white/20 p-1 rounded transition-colors"
                aria-label="Maximize"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleClose}
                className="hover:bg-white/20 p-1 rounded transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          {renderMessages()}

          {/* Input */}
          {renderInput()}
        </div>
      )}

      {/* Fullscreen: Right-side panel */}
      {uiState === 'fullscreen' && (
        <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <h3 className="font-semibold text-lg">Holy Grail Chat</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUiState('panel')}
                className="hover:bg-white/20 p-2 rounded transition-colors"
                aria-label="Minimize"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
              <button
                onClick={handleClose}
                className="hover:bg-white/20 p-2 rounded transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          {renderMessages()}

          {/* Input */}
          {renderInput()}
        </div>
      )}
    </>
  )
}
