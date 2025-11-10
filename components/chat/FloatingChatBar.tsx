'use client';

import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from 'react';
import { ArrowUp, Paperclip, Mic, Maximize2, Minimize2, X, MessageSquare, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface FloatingChatBarProps {
  className?: string;
}

export function FloatingChatBar({ className }: FloatingChatBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesPanelRef = useRef<HTMLDivElement>(null);
  const floatingBarRef = useRef<HTMLFormElement>(null);
  const [showMessages, setShowMessages] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [input]);

  // Scroll to bottom when messages update
  useEffect(() => {
    // Scroll sidebar when expanded
    if (scrollAreaRef.current && isExpanded) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
    // Scroll floating messages panel when NOT expanded
    if (messagesPanelRef.current && !isExpanded && messages.length > 0) {
      messagesPanelRef.current.scrollTop = messagesPanelRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  // Click outside to close message panel in floating bar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle if in floating bar mode (not expanded or minimized) and messages are showing
      if (!isExpanded && !isMinimized && showMessages && floatingBarRef.current) {
        if (!floatingBarRef.current.contains(event.target as Node)) {
          setShowMessages(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, isMinimized, showMessages]);

  // Auto-fullscreen detection
  const shouldGoFullscreen = (message: string) => {
    const keywords = [
      'write a post',
      'write a linkedin post',
      'create a post',
      'draft a post',
      'write an article',
      'write an essay',
      'create a document',
      'draft',
    ];
    return keywords.some(k => message.toLowerCase().includes(k));
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    console.log('[HGC_STREAM] ========================================');
    console.log('[HGC_STREAM] SUBMIT BUTTON CLICKED - handleSubmit called');
    console.log('[HGC_STREAM] ========================================');

    e.preventDefault();
    if (!input.trim() || isLoading) {
      console.log('[HGC_STREAM] Early return - input empty or already loading');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    console.log('[HGC_STREAM] User message created:', userMessage.content);

    setMessages(prev => [...prev, userMessage]);
    setShowMessages(true); // Show message panel when user sends a message

    // Check if should auto-expand to fullscreen
    if (shouldGoFullscreen(userMessage.content)) {
      console.log('[AUTO-FULLSCREEN] Triggered by keywords in:', userMessage.content);
      setIsFullscreen(true);
    }

    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('[HGC_STREAM] Starting fetch request to /api/hgc');
      const response = await fetch('/api/hgc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      console.log('[HGC_STREAM] Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to use the chat');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      console.log('[HGC_STREAM] Starting to read stream chunks');

      // Read the streaming response - HGC sends plain text chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[HGC_STREAM] Stream complete. Total chunks:', chunkCount, 'Total content length:', assistantContent.length);
          break;
        }

        // Decode chunk as plain text (HGC streams word-by-word)
        const chunk = decoder.decode(value, { stream: true });
        chunkCount++;

        console.log('[HGC_STREAM] Chunk', chunkCount, '- Length:', chunk.length, 'Raw:', JSON.stringify(chunk));

        assistantContent += chunk;

        // Update the assistant message in place
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = assistantContent;
          }
          return newMessages;
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[HGC_STREAM] Request was aborted');
      } else {
        console.error('[HGC_STREAM] Error:', error);
        setError(error.message || 'An error occurred');
        // Remove the empty assistant message if there was an error
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.content) {
            newMessages.pop();
          }
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Handle Enter key (send) and Shift+Enter (new line)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as any);
      }
    }
  };

  // Stop generating
  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Convert Message to UIMessage format for ChatMessage component
  const convertToUIMessage = (msg: Message) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
  });

  // Don't render if minimized
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors"
        aria-label="Open chat"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
    );
  }

  // Fullscreen embedded view (takes full width, overlays content)
  if (isFullscreen) {
    console.log('[FloatingChatBar] FULLSCREEN VIEW RENDERING!');
    return (
      <div className="absolute inset-0 left-0 right-0 top-16 bottom-0 bg-white border-l border-gray-200 flex z-30 animate-in fade-in slide-in-from-right duration-200">
          {/* Chat History Sidebar */}
          {showChatHistory && (
            <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
              {/* History Header */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Chat History</h3>
              </div>

              {/* New Conversation Button */}
              <div className="p-3">
                <button className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">
                  + New Conversation
                </button>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Placeholder conversations */}
                <div className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
                  <p className="text-sm text-gray-900 font-medium truncate">Current conversation</p>
                  <p className="text-xs text-gray-500 mt-1">Just now</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
                  <p className="text-sm text-gray-700 truncate">LinkedIn campaign help</p>
                  <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
                  <p className="text-sm text-gray-700 truncate">Pod engagement analysis</p>
                  <p className="text-xs text-gray-500 mt-1">Yesterday</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Minimal Top Banner with icon navigation */}
            <div className="px-2 py-1.5 border-b border-gray-200 flex items-center gap-1">
              {/* Sidebar icon (vertical rectangle) */}
              <button
                onClick={() => {
                  console.log('[FULLSCREEN->SIDEBAR] Clicked!');
                  setIsFullscreen(false);
                  setIsExpanded(true);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-all duration-200"
                aria-label="Sidebar view"
                title="Switch to sidebar"
              >
                <div className="w-2 h-4 border-2 border-gray-400 rounded-sm"></div>
              </button>

              {/* Floating bar icon (horizontal rectangle) */}
              <button
                onClick={() => {
                  console.log('[FULLSCREEN->FLOATING] Clicked!');
                  setIsFullscreen(false);
                  setIsExpanded(false);
                  setIsMinimized(false);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-all duration-200"
                aria-label="Floating bar"
                title="Switch to floating bar"
              >
                <div className="w-4 h-2 border-2 border-gray-400 rounded-sm"></div>
              </button>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Chat history toggle */}
              <button
                onClick={() => setShowChatHistory(!showChatHistory)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Toggle chat history"
                title="Toggle chat history"
              >
                <Menu className="w-4 h-4 text-gray-400" />
              </button>
            </div>

          {/* Messages */}
          <div
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-sm">Start a conversation with your AI assistant</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={convertToUIMessage(message)}
                  isLoading={isLoading && message.role === 'assistant' && index === messages.length - 1}
                />
              ))
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
                <button
                  onClick={clearError}
                  className="ml-2 text-xs underline hover:no-underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="bg-white border border-gray-200 rounded-xl">
              {isLoading ? (
                <div className="flex items-center gap-1.5 px-4 py-3 h-[38px]">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Revy wants to help! Type..."
                  className="w-full px-4 py-3 text-gray-700 text-sm outline-none resize-none rounded-t-xl"
                  rows={1}
                  disabled={isLoading}
                />
              )}
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Attach file"
                    disabled
                  >
                    <Paperclip className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Voice input"
                    disabled
                  >
                    <Mic className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    input.trim() && !isLoading
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "bg-gray-200 text-gray-400"
                  )}
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
          </div>
      </div>
    );
  }

  // Expanded sidebar view (RIGHT side, embedded)
  if (isExpanded) {
    console.log('[FloatingChatBar] EXPANDED VIEW RENDERING - Banner should be visible!');
    return (
      <div className="h-full w-96 bg-white border-l border-gray-200 flex flex-col pt-16 animate-in slide-in-from-right duration-200">
        {/* Minimal Top Banner with icon navigation */}
        <div className="px-2 py-1.5 border-b border-gray-200 flex items-center gap-1">
          {/* Fullscreen icon (square with rounded corners) */}
          <button
            onClick={() => {
              console.log('[SIDEBAR->FULLSCREEN] Clicked!');
              setIsFullscreen(true);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-all duration-200"
            aria-label="Fullscreen"
            title="Switch to fullscreen"
          >
            <div className="w-3 h-3 border-2 border-gray-400 rounded"></div>
          </button>

          {/* Floating bar icon (horizontal rectangle) */}
          <button
            onClick={() => {
              console.log('[SIDEBAR->FLOATING] Clicked!');
              setIsExpanded(false);
              setIsMinimized(false);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-all duration-200"
            aria-label="Floating bar"
            title="Switch to floating bar"
          >
            <div className="w-4 h-2 border-2 border-gray-400 rounded-sm"></div>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-sm">Start a conversation with your AI assistant</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={convertToUIMessage(message)}
                isLoading={isLoading && message.role === 'assistant' && index === messages.length - 1}
              />
            ))
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
              <button
                onClick={clearError}
                className="ml-2 text-xs underline hover:no-underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="bg-white border border-gray-200 rounded-xl">
            {isLoading ? (
              <div className="flex items-center gap-1.5 px-4 py-3 h-[38px]">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Revy wants to help! Type..."
                className="w-full px-4 py-3 text-gray-700 text-sm outline-none resize-none rounded-t-xl"
                rows={1}
                disabled={isLoading}
              />
            )}
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
              <div className="flex gap-1">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Attach file"
                  disabled
                >
                  <Paperclip className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Voice input"
                  disabled
                >
                  <Mic className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  input.trim() && !isLoading
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-gray-200 text-gray-400"
                )}
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // Floating bar view (default)
  return (
    <div className={cn(
      "fixed bottom-8 left-64 right-0 mx-auto w-[calc((100vw-256px)*0.8-2rem)] max-w-5xl z-50",
      className
    )}>
      {/* Single cohesive container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
        {/* Messages Panel - Slides up from behind input */}
        {messages.length > 0 && showMessages && (
          <div
            ref={messagesPanelRef}
            className="max-h-[480px] overflow-y-auto border-b border-gray-200 animate-in fade-in slide-in-from-bottom duration-200"
          >
            <div className="p-4 space-y-3">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={convertToUIMessage(message)}
                  isLoading={isLoading && message.role === 'assistant' && index === messages.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Input Area - Part of same container */}
        <form ref={floatingBarRef} onSubmit={handleSubmit} className="relative">
          <div
            className="px-4 py-2 cursor-text"
            onClick={() => textareaRef.current?.focus()}
          >
            {isLoading ? (
              <div className="flex items-center gap-1 h-6">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={messages.length === 0 ? "Revvy wants to help! Type..." : ""}
                className="w-full bg-white text-gray-700 text-base outline-none resize-none placeholder-gray-500"
                rows={1}
                disabled={isLoading}
              />
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 pb-2 pt-1">
            <div className="flex gap-1">
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Attach file"
                disabled
              >
                <Paperclip className="w-4 h-4 text-gray-400" />
              </button>

              {/* Sidebar icon (vertical rectangle) */}
              <button
                type="button"
                onClick={() => {
                  console.log('[SIDEBAR BUTTON] Clicked! Setting isExpanded to true');
                  setIsExpanded(true);
                }}
                className="p-1.5 hover:bg-gray-100 rounded transition-all duration-200"
                aria-label="Sidebar view"
                title="Switch to sidebar"
              >
                <div className="w-2 h-4 border-2 border-gray-400 rounded-sm"></div>
              </button>

              {/* Fullscreen icon (square with rounded corners) */}
              <button
                type="button"
                onClick={() => {
                  console.log('[FULLSCREEN BUTTON] Clicked! Setting isFullscreen to true');
                  setIsFullscreen(true);
                }}
                className="p-1.5 hover:bg-gray-100 rounded transition-all duration-200"
                aria-label="Fullscreen"
                title="Switch to fullscreen"
              >
                <div className="w-3 h-3 border-2 border-gray-400 rounded"></div>
              </button>

              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Voice input"
                disabled
              >
                <Mic className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isLoading && (
                <button
                  type="button"
                  onClick={stop}
                  className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 hover:bg-gray-100 rounded"
                >
                  Stop
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  input.trim() && !isLoading
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-gray-200 text-gray-400"
                )}
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
          <button
            onClick={clearError}
            className="ml-2 text-xs underline hover:no-underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}