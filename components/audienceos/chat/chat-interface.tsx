"use client"

/**
 * ChatInterface - War Room style glassmorphism chat (DARK THEME)
 *
 * Architecture:
 * 1. Persistent Input Bar - always visible at bottom
 * 2. Slide-up Message Panel - appears when input is focused
 *
 * Ported from Holy Grail Chat with dark theme adaptations.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import * as ReactDOM from "react-dom"
import rehypeRaw from "rehype-raw"
import {
  MessageSquare,
  Send,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  Globe,
  Database,
  MessageCircle,
  LayoutDashboard,
  X,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStreamingText } from "./use-streaming-text"
import { TypingCursor } from "./typing-cursor"
import type { ChatMessage as ChatMessageType, RouteType, Citation, SessionContext } from "@/lib/chat/types"

// Panel dimensions
const PANEL_WIDTH = "85%"
const MAX_PANEL_WIDTH = "1000px"

// Safe markdown elements - XSS protection
const SAFE_MARKDOWN_ELEMENTS = [
  "p", "br", "strong", "em", "b", "i", "u",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "code", "pre",
  "a", "hr",
]

interface ChatInterfaceProps {
  agencyId: string
  userId?: string
  context?: SessionContext
  onSendMessage?: (message: string) => void
}

export function ChatInterface({
  agencyId,
  userId = "user",
  context,
  onSendMessage,
}: ChatInterfaceProps) {
  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [panelHeight, setPanelHeight] = useState(60)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ y: number; height: number } | null>(null)
  const [isInputFocused, setIsInputFocused] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID()) // Generate session ID once

  // File upload state
  const [uploadProgress, setUploadProgress] = useState<{
    stage: "idle" | "uploading" | "processing" | "complete" | "error"
    progress: number
    message: string
    fileName?: string
  }>({ stage: "idle", progress: 0, message: "" })
  const [isDragOver, setIsDragOver] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Streaming text hook
  const streaming = useStreamingText({ charsPerSecond: 40 })

  // Track if user has manually scrolled up
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  // Drag handle functionality
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = { y: e.clientY, height: panelHeight }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return
      const deltaY = dragStartRef.current.y - e.clientY
      const deltaVh = (deltaY / window.innerHeight) * 100
      const newHeight = Math.min(90, Math.max(30, dragStartRef.current.height + deltaVh))
      setPanelHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  // Detect when user scrolls up manually
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    setUserScrolledUp(!isAtBottom)
  }, [])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isPanelOpen && !userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length, isPanelOpen, userScrolledUp])

  // Load messages from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`cc-chat-${agencyId}-${userId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setMessages(
          parsed.map((m: ChatMessageType) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        )
      } catch {
        // Invalid stored data
      }
    }
  }, [agencyId, userId])

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        `cc-chat-${agencyId}-${userId}`,
        JSON.stringify(messages)
      )
    }
  }, [messages, agencyId, userId])

  // Expose global method to open chat with pre-filled message
  // NOTE: Using ref pattern to avoid stale closure issues
  const openChatRef = useRef<((message: string) => void) | undefined>(undefined)

  openChatRef.current = (message: string) => {
    setInputValue(message)
    setIsPanelOpen(true)
    setIsClosing(false)
    setIsInputFocused(true)
    // Focus textarea after state updates
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.openChatWithMessage = (message: string) => {
        openChatRef.current?.(message)
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        delete window.openChatWithMessage
      }
    }
  }, [])

  // Handle input focus - opens panel
  const handleInputFocus = () => {
    setIsInputFocused(true)
    if (!isPanelOpen) {
      setIsPanelOpen(true)
      setIsClosing(false)
    }
  }

  const handleInputBlur = () => {
    setIsInputFocused(false)
  }

  // Close panel with animation
  const closePanel = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsPanelOpen(false)
      setIsClosing(false)
    }, 200)
  }

  // Handle textarea change with auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  // Core chat function with SSE streaming support (Phase 2)
  const sendChatMessage = async (messageContent: string) => {
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    streaming.reset()

    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Send auth cookies
        body: JSON.stringify({
          message: messageContent,
          sessionId,
          agencyId,
          userId,
          stream: true, // Enable SSE streaming
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Check if response is SSE stream
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('text/event-stream')) {
        // SSE streaming response
        await handleStreamingResponse(response)
      } else {
        // Fallback to JSON response (backwards compatibility)
        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        const messageData = data.message
        if (!messageData) {
          throw new Error('Invalid API response: missing message data')
        }

        const assistantMessage: ChatMessageType = {
          id: messageData.id || crypto.randomUUID(),
          role: "assistant",
          content: messageData.content || "I received your message.",
          timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date(),
          route: messageData.route,
          citations: messageData.citations || [],
          suggestions: messageData.suggestions,
        }

        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
        route: "casual",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // SSE stream handler (Phase 2)
  const handleStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let streamedContent = ''
    let metadata: { route?: RouteType; sessionId?: string } = {}

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events (format: "data: {...}\n\n")
        const events = buffer.split('\n\n')
        buffer = events.pop() || '' // Keep incomplete event in buffer

        for (const event of events) {
          if (!event.startsWith('data: ')) continue

          const data = event.slice(6) // Remove "data: " prefix

          try {
            const parsed = JSON.parse(data)

            switch (parsed.type) {
              case 'metadata':
                // Store metadata for final message
                metadata.route = parsed.route
                metadata.sessionId = parsed.sessionId
                break

              case 'content':
                // Accumulate content and trigger streaming display
                streamedContent += parsed.content
                streaming.processChunk({ type: 'content', content: parsed.content })
                break

              case 'complete': {
                // Final message with citations
                const messageData = parsed.message

                const assistantMessage: ChatMessageType = {
                  id: messageData.id || crypto.randomUUID(),
                  role: "assistant",
                  content: messageData.content || streamedContent,
                  timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date(),
                  route: messageData.route || metadata.route,
                  citations: messageData.citations || [],
                  suggestions: messageData.suggestions,
                }

                setMessages((prev) => [...prev, assistantMessage])
                break
              }

              case 'error':
                throw new Error(parsed.error || 'Streaming error')

              default:
                // Unknown event type - ignore silently
                break
            }
          } catch {
            // Failed to parse SSE event - skip malformed data
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // File upload handlers - ported from Holy Grail Chat
  const SUPPORTED_TYPES = [
    "application/pdf",
    "text/plain",
    "text/csv",
    "text/html",
    "application/json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ]
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

  // eslint-disable-next-line react-hooks/exhaustive-deps -- SUPPORTED_TYPES and MAX_FILE_SIZE are stable constants
  const handleFileSelect = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      // Prevent multiple simultaneous uploads
      if (uploadProgress.stage === "uploading") {
        console.warn("[File Upload] Upload already in progress, ignoring new file")
        return
      }

      // Handle one file at a time
      const file = fileArray[0]

      // Validate file type
      if (!SUPPORTED_TYPES.includes(file.type) && !file.name.endsWith(".md")) {
        setUploadProgress({
          stage: "error",
          progress: 0,
          message: `Unsupported file type: ${file.type || "unknown"}. Supported: PDF, TXT, CSV, HTML, JSON, DOCX, XLSX, MD, PNG, JPG, GIF, WebP`,
          fileName: file.name,
        })
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setUploadProgress({
          stage: "error",
          progress: 0,
          message: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 50MB`,
          fileName: file.name,
        })
        return
      }

      // Validate not empty
      if (file.size === 0) {
        setUploadProgress({
          stage: "error",
          progress: 0,
          message: "Cannot upload empty file",
          fileName: file.name,
        })
        return
      }

      // Start upload
      setUploadProgress({
        stage: "uploading",
        progress: 10,
        message: "Uploading...",
        fileName: file.name,
      })

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append(
          "metadata",
          JSON.stringify({
            agencyId,
            displayName: file.name,
            uploadedBy: userId,
            scope: "global",
            tags: [],
          })
        )

        setUploadProgress({
          stage: "uploading",
          progress: 30,
          message: "Sending to server...",
          fileName: file.name,
        })

        // AOS uses /api/v1/documents/ instead of /api/rag
        const response = await fetch("/api/v1/documents/", {
          method: "POST",
          body: formData,
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()

        if (result.success || result.id) {
          setUploadProgress({
            stage: "complete",
            progress: 100,
            message: `"${file.name}" uploaded successfully!`,
            fileName: file.name,
          })

          // Auto-dismiss after 3 seconds
          setTimeout(() => {
            setUploadProgress({ stage: "idle", progress: 0, message: "" })
          }, 3000)
        } else {
          throw new Error(result.error || "Upload failed")
        }
      } catch (error) {
        console.error("Upload error:", error)
        setUploadProgress({
          stage: "error",
          progress: 0,
          message: error instanceof Error ? error.message : "Upload failed. Please try again.",
          fileName: file.name,
        })
      }
    },
    [agencyId, userId, uploadProgress.stage]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFileSelect(e.target.files)
        e.target.value = "" // Reset for same file selection
      }
    },
    [handleFileSelect]
  )

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Drag-and-drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragOverFile = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileSelect(files)
      }
    },
    [handleFileSelect]
  )

  // Handle send button / Enter key
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const message = inputValue.trim()
    setInputValue("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    onSendMessage?.(message)
    await sendChatMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle suggestion pill click
  const handleSuggestionSelect = async (suggestion: string) => {
    if (isLoading) return
    await sendChatMessage(suggestion)
  }

  // CSS Keyframes for slide animations
  useEffect(() => {
    const styleId = "cc-chat-animations"
    const refCountAttr = "data-ref-count"
    let existingStyle = document.getElementById(styleId) as HTMLStyleElement | null

    if (!existingStyle) {
      existingStyle = document.createElement("style")
      existingStyle.id = styleId
      existingStyle.setAttribute(refCountAttr, "1")
      existingStyle.textContent = `
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%) scale(0.90); opacity: 0; }
          to { transform: translateX(-50%) translateY(0) scale(0.90); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(0) scale(0.90); opacity: 1; }
          to { transform: translateX(-50%) translateY(100%) scale(0.90); opacity: 0; }
        }
      `
      document.head.appendChild(existingStyle)
    } else {
      const count = parseInt(existingStyle.getAttribute(refCountAttr) || "0", 10)
      existingStyle.setAttribute(refCountAttr, String(count + 1))
    }

    return () => {
      const style = document.getElementById(styleId)
      if (style) {
        const count = parseInt(style.getAttribute(refCountAttr) || "1", 10)
        if (count <= 1) {
          style.remove()
        } else {
          style.setAttribute(refCountAttr, String(count - 1))
        }
      }
    }
  }, [])

  return (
    <>
      {/* SLIDE-UP MESSAGE PANEL */}
      {isPanelOpen && (
        <>
          {/* Backdrop - frosted blur effect (no dark overlay) */}
          <div
            className="fixed inset-0 z-[9998]"
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            onClick={closePanel}
          />

          {/* Message Panel - iOS Liquid Glass style (true glassmorphic) */}
          <div
            className="z-[9999] flex flex-col"
            style={{
              position: "fixed",
              width: PANEL_WIDTH,
              maxWidth: MAX_PANEL_WIDTH,
              height: `${panelHeight}vh`,
              maxHeight: "85vh",
              bottom: "75px", // Slides up from behind input bar (increased from 65px)
              left: "50%",
              transform: "translateX(-50%) scale(0.90)",
              transformOrigin: "bottom center",
              background: "rgba(255, 255, 255, 0.10)", // 10% white tint - subtle glass effect
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "20px",
              boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.1)",
              animation: isClosing
                ? "slideDown 0.2s ease-out forwards"
                : "slideUp 0.35s ease-out forwards",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header with Handle */}
            <div className="border-b border-black/5 relative">
              {/* Handle Bar */}
              <div
                className={`flex items-center justify-center pt-3 pb-3 px-8 group ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                onMouseDown={handleDragStart}
              >
                <div className={`w-12 h-1 rounded-full pointer-events-none transition-colors ${isDragging ? "bg-blue-500" : "bg-gray-300 group-hover:bg-gray-400"}`} />
              </div>

              {/* Expand Button - Top Right Corner */}
              <button
                onClick={() => setPanelHeight(panelHeight === 85 ? 50 : 85)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-black/5"
                title={panelHeight === 85 ? "Minimize" : "Expand"}
              >
                {panelHeight === 85 ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide"
              style={{
                minHeight: 0,
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none', /* IE/Edge */
              }}
            >
              {messages.length === 0 && !isLoading && (
                <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                  <div className="flex flex-col items-center">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-black/5 dark:border-white/10 mb-4">
                      <Sparkles className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[400px]">
                      Ask me anything about your clients, alerts, or agency data.
                      I can search your knowledge base and help with insights.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, msgIndex) => (
                <div
                  key={msg.id}
                  className={`flex flex-col w-full ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {/* Timestamp (user messages only) or Route Indicator (AI messages only) */}
                  {msg.role === "user" ? (
                    <div className="flex justify-end mb-1 px-1 w-full">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ) : (
                    msg.route && (
                      <div className="flex justify-start mb-1 px-1 w-full" style={{ marginTop: '0.375em' }}>
                        <RouteIndicator route={msg.route} />
                      </div>
                    )
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn(
                      "relative p-3 rounded-lg max-w-[85%]",
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-white/60 dark:bg-slate-800/80 text-gray-900 dark:text-gray-100 border border-white/40 dark:border-slate-700 backdrop-blur-sm"
                    )}
                  >
                    <div className="text-[15px] leading-[1.45]">
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_p_strong:first-child]:block [&_p_strong:first-child]:-mb-1 [&_p:has(strong:first-child)]:mt-5 [&_h1]:mt-6 [&_h1]:mb-1.5 [&_h2]:mt-5 [&_h2]:mb-1 [&_h3]:mt-4 [&_h3]:mb-0.5 [&_h4]:mt-3 [&_h4]:mb-0.5">
                          <MessageContent
                            content={msg.content}
                            citations={msg.citations}
                          />
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                  </div>

                  {/* Citations Footer */}
                  {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs text-gray-600 dark:text-gray-400 space-y-1 max-w-[85%]">
                      {msg.citations.map((citation, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-blue-600 font-medium">[{citation.index || idx + 1}]</span>
                          <button
                            onClick={() => {
                              if (citation.url) {
                                window.open(citation.url, "_blank", "noopener,noreferrer")
                              }
                            }}
                            className="hover:underline truncate flex items-center gap-1 text-left flex-1"
                            title={citation.title}
                          >
                            <span className="truncate">{citation.title}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestion Pills */}
                  {msg.role === "assistant" &&
                    msg.suggestions &&
                    msg.suggestions.length > 0 &&
                    msgIndex === messages.length - 1 && (
                      <div className="max-w-[80%] mt-2">
                        <SuggestionPills
                          suggestions={msg.suggestions}
                          onSelect={handleSuggestionSelect}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                </div>
              ))}

              {/* Streaming message */}
              {isLoading && streaming.displayedText && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-white/60 dark:bg-slate-800/80 text-gray-900 dark:text-gray-100 border border-white/40 dark:border-slate-700 backdrop-blur-sm">
                    <p className="text-[14px] leading-[1.5]">
                      {streaming.displayedText}
                      {streaming.isAnimating && <TypingCursor visible />}
                    </p>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && !streaming.displayedText && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm border border-white/40 dark:border-slate-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
              <div style={{ height: "16px", flexShrink: 0 }} />
            </div>
          </div>
        </>
      )}

      {/* PERSISTENT CHAT BAR - iOS Liquid Glass style (double-layer frosted) */}
      <div
        className="flex items-center gap-3 z-[10000]"
        style={{
          position: "fixed",
          width: PANEL_WIDTH,
          maxWidth: MAX_PANEL_WIDTH,
          bottom: "10px", // 10px from bottom (matches HGC)
          left: "50%",
          transform: "translateX(-50%) scale(0.90)",
          transformOrigin: "bottom center",
          background: "rgba(255, 255, 255, 0.15)", // 15% white tint - double-layer effect (more frosted than panel)
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          borderRadius: "20px",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.15)",
          padding: "12px 16px",
          pointerEvents: isInputFocused || isPanelOpen ? "auto" : "none", // Pass through clicks when not in use
        }}
      >
        {/* Stacked Buttons */}
        <div className="flex flex-col gap-1.5" style={{ pointerEvents: "auto" }}>
          <button
            className="w-8 h-8 rounded-md border border-black/10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-black/20 hover:bg-black/5 transition-colors cursor-pointer"
            title="Chat History"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={handleUploadClick}
            disabled={uploadProgress.stage === "uploading"}
            className={cn(
              "w-8 h-8 rounded-md border flex items-center justify-center transition-colors cursor-pointer",
              uploadProgress.stage === "uploading"
                ? "border-blue-500/30 bg-blue-500/20 text-blue-500 cursor-wait"
                : "border-black/10 text-gray-500 hover:text-gray-700 hover:border-black/20 hover:bg-black/5"
            )}
            title="Upload document (PDF, TXT, DOCX, etc.)"
          >
            {uploadProgress.stage === "uploading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Textarea with drag-and-drop - extra frosted layer */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOverFile}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex-1 relative"
          style={{ pointerEvents: "auto" }}
        >
          <textarea
            ref={textareaRef}
            placeholder="Ask about clients, alerts, or anything..."
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={isLoading}
            className={cn(
              "w-full min-h-[48px] max-h-[120px] p-3 bg-white/20 dark:bg-slate-800/40 border rounded-xl text-gray-900 dark:text-gray-100 text-[14px] leading-[1.5] resize-none outline-none transition-colors placeholder:text-gray-600 dark:placeholder:text-gray-400 backdrop-blur-sm",
              isDragOver
                ? "border-blue-500 border-2 bg-blue-500/10"
                : "border-white/30 dark:border-slate-600/50 focus:border-white/40 dark:focus:border-slate-500 hover:border-white/35 dark:hover:border-slate-500/70"
            )}
          />
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/5 rounded-xl pointer-events-none">
              <div className="text-blue-600 text-sm font-medium">Drop file to upload</div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept=".pdf,.txt,.csv,.html,.json,.docx,.xlsx,.md,.png,.jpg,.jpeg,.gif,.webp"
          style={{ display: "none" }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          style={{ pointerEvents: "auto" }}
          className={cn(
            "w-12 h-12 rounded-xl border flex items-center justify-center transition-all cursor-pointer",
            isLoading || !inputValue.trim()
              ? "border-black/5 text-gray-400 cursor-not-allowed bg-transparent"
              : "border-blue-500 text-white bg-blue-500 hover:bg-blue-600 hover:border-blue-600"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Upload Progress Toast */}
      {uploadProgress.stage !== "idle" && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 10000,
            background:
              uploadProgress.stage === "error"
                ? "rgba(239, 68, 68, 0.95)"
                : uploadProgress.stage === "complete"
                  ? "rgba(34, 197, 94, 0.95)"
                  : "rgba(30, 41, 59, 0.95)",
            borderRadius: "8px",
            padding: "8px 16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: "320px",
            maxWidth: "480px",
            backdropFilter: "blur(8px)",
            lineHeight: "1.2",
          }}
        >
          {uploadProgress.stage === "uploading" && (
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          )}
          {uploadProgress.stage === "complete" && (
            <div style={{ color: "#fff", fontSize: "18px" }}>✓</div>
          )}
          {uploadProgress.stage === "error" && (
            <div style={{ color: "#fff", fontSize: "18px" }}>✕</div>
          )}
          <div style={{ flex: 1 }}>
            {uploadProgress.fileName && (
              <div
                style={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "12px",
                  marginBottom: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {uploadProgress.fileName}
              </div>
            )}
            <div
              style={{
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {uploadProgress.message}
            </div>
            {uploadProgress.stage === "uploading" && (
              <div
                style={{
                  marginTop: "8px",
                  height: "4px",
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${uploadProgress.progress}%`,
                    background: "rgba(59, 130, 246, 1)",
                    borderRadius: "2px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            )}
          </div>
          {uploadProgress.stage === "error" && (
            <button
              onClick={() =>
                setUploadProgress({ stage: "idle", progress: 0, message: "" })
              }
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.7)",
                cursor: "pointer",
                padding: "4px",
                fontSize: "16px",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </>
  )
}

/**
 * CitationBadge - Inline citation marker with tooltip portal
 * Ported from Holy Grail Chat with dark theme styling
 */
function CitationBadge({
  index,
  citation,
  onCitationClick,
}: {
  index: number
  citation?: Citation
  onCitationClick?: (citation?: Citation) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, showBelow: false })
  const buttonRef = useRef<HTMLButtonElement>(null)


  // Calculate tooltip position dynamically
  useEffect(() => {
    if (!showTooltip || !buttonRef.current) return

    const updatePosition = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const tooltipWidth = 280
      const tooltipHeight = 120 // Approximate

      // Smart positioning: above or below based on available space
      const spaceAbove = rect.top
      const showBelow = spaceAbove < tooltipHeight + 16

      // Center tooltip horizontally over the badge
      const left = Math.max(
        8, // Min margin from left edge
        Math.min(
          rect.left + rect.width / 2 - tooltipWidth / 2,
          window.innerWidth - tooltipWidth - 8 // Max margin from right edge
        )
      )

      const top = showBelow ? rect.bottom + 8 : rect.top - 8

      setTooltipPos({ top, left, showBelow })
    }

    updatePosition()
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)

    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [showTooltip])

  const handleClick = () => {
    if (onCitationClick) {
      onCitationClick(citation)
    } else if (citation?.url) {
      window.open(citation.url, "_blank", "noopener,noreferrer")
    }
  }

  const hasValidUrl = !!citation?.url

  // Render tooltip via portal (only in browser)
  const tooltip =
    showTooltip && typeof document !== "undefined" && citation
      ? ReactDOM.createPortal(
          <div
            id={`citation-tooltip-${index}`}
            role="tooltip"
            className="fixed z-[9999999] p-3 rounded-lg text-left shadow-2xl"
            style={{
              top: tooltipPos.showBelow ? `${tooltipPos.top}px` : "auto",
              bottom: tooltipPos.showBelow ? "auto" : `${window.innerHeight - tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              width: "280px",
              background: "rgba(17, 24, 39, 0.95)", // Dark theme
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
              style={{
                [tooltipPos.showBelow ? "top" : "bottom"]: "-6px",
                background: "rgba(17, 24, 39, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRight: tooltipPos.showBelow ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                borderBottom: tooltipPos.showBelow ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                borderTop: tooltipPos.showBelow ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                borderLeft: tooltipPos.showBelow ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
              }}
            />

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-blue-400 font-bold text-sm">[{index}]</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium leading-tight mb-1 line-clamp-2">
                    {citation.title}
                  </div>
                  {citation.url && (
                    <div className="text-gray-400 text-xs truncate" title={citation.url}>
                      {citation.url}
                    </div>
                  )}
                </div>
              </div>
              {citation.snippet && (
                <div className="text-gray-300 text-xs leading-relaxed line-clamp-3 mt-2">
                  {citation.snippet}
                </div>
              )}
              {hasValidUrl && (
                <button
                  onClick={handleClick}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  Open source
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        title={citation?.title || `Source ${index}`}
        className={cn(
          "inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-sm mx-0.5 align-middle transition-colors",
          hasValidUrl
            ? "text-green-400 hover:text-green-300 cursor-pointer"
            : "text-gray-400 cursor-default"
        )}
        style={{ position: "relative", top: "-1px" }}
      >
        {index}
      </button>
      {tooltip}
    </>
  )
}

/**
 * MessageContent - Renders markdown content with inline citations
 * Uses cite-marker HTML approach (HGC pattern) to preserve markdown structure
 */
function MessageContent({
  content,
  citations = [],
}: {
  content: string
  citations?: Citation[]
}) {
  const getCitation = useCallback((displayIndex: number): Citation | undefined => {
    // Try to find citation by index property
    const citation = citations.find((c) => c.index === displayIndex)
    if (citation?.url) {
      return citation
    }

    // Fallback: try array position (1-indexed)
    if (citations[displayIndex - 1]?.url) {
      return citations[displayIndex - 1]
    }

    // Last resort: wrap-around for mismatched indices
    if (citations.length > 0) {
      const wrappedIndex = (displayIndex - 1) % citations.length
      if (citations[wrappedIndex]?.url) {
        return citations[wrappedIndex]
      }
    }

    return undefined
  }, [citations])

  const onCitationClick = useCallback((citation?: Citation) => {
    if (citation?.url) {
      window.open(citation.url, "_blank", "noopener,noreferrer")
    }
  }, [])

  // Pre-process content: replace [1], [2], [1.2] with HTML cite-marker elements
  // Use sequential numbering to normalize Gemini's decimal format
  const processedContent = useMemo(() => {
    const citationRegex = /\[(\d+(?:\.\d+)?)\]/g
    let sequentialIndex = 0

    return content.replace(citationRegex, () => {
      sequentialIndex++
      return `<cite-marker data-index="${sequentialIndex}"></cite-marker>`
    })
  }, [content])

  // Custom components for ReactMarkdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: any = useMemo(
    () => ({
      // Strip paragraph wrappers to prevent extra margins in inline contexts
      p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,

      // Render cite-marker as CitationBadge
      "cite-marker": ({ "data-index": dataIndex }: { "data-index"?: string }) => {
        const index = parseInt(dataIndex || "1", 10)
        return (
          <CitationBadge
            index={index}
            citation={getCitation(index)}
            onCitationClick={onCitationClick}
          />
        )
      },
    }),
    [getCitation, onCitationClick]
  )

  return (
    <ReactMarkdown
      allowedElements={[...SAFE_MARKDOWN_ELEMENTS, "cite-marker"]}
      unwrapDisallowed
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  )
}

/**
 * SuggestionPills - Clickable suggestion buttons
 */
function SuggestionPills({
  suggestions,
  onSelect,
  disabled = false,
}: {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  disabled?: boolean
}) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className={cn(
            "px-3 py-1.5 text-xs text-blue-300 bg-blue-500/15 border border-blue-500/20 rounded-full transition-all",
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-500/25 hover:border-blue-500/30 cursor-pointer"
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}

/**
 * RouteIndicator - Shows which source was used for the response
 */
function RouteIndicator({ route }: { route?: RouteType }) {
  if (!route) return null

  const config: Record<RouteType, { icon: React.ReactNode; label: string; color: string }> = {
    web: {
      icon: <Globe className="w-3 h-3" />,
      label: "Web",
      color: "bg-blue-500/30 text-blue-400",
    },
    rag: {
      icon: <Database className="w-3 h-3" />,
      label: "Knowledge",
      color: "bg-purple-500/30 text-purple-400",
    },
    memory: {
      icon: <Sparkles className="w-3 h-3" />,
      label: "Memory",
      color: "bg-pink-500/30 text-pink-400",
    },
    casual: {
      icon: <MessageCircle className="w-3 h-3" />,
      label: "Chat",
      color: "bg-green-500/30 text-green-400",
    },
    dashboard: {
      icon: <LayoutDashboard className="w-3 h-3" />,
      label: "Dashboard",
      color: "bg-orange-500/30 text-orange-400",
    },
  }

  const { icon, label, color } = config[route]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
        color
      )}
      title={`Response from: ${label}`}
    >
      {icon}
      {label}
    </span>
  )
}
