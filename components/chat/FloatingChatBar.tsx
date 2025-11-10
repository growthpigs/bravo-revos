'use client';

import React from 'react';
import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from 'react';
import { ArrowUp, Paperclip, Mic, Maximize2, Minimize2, X, MessageSquare, Menu, Trash2, Plus, Lock, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from './ChatMessage';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
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

  // Conversation management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesPanelRef = useRef<HTMLDivElement>(null);
  const floatingBarRef = useRef<HTMLFormElement>(null);
  const floatingChatContainerRef = useRef<HTMLDivElement>(null);
  const [showMessages, setShowMessages] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Draggable sidebar resizers
  const [sidebarWidth, setSidebarWidth] = useState(600); // Total sidebar width
  const [chatWidth, setChatWidth] = useState(408); // Default chat width in pixels
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(0);
  const resizerTypeRef = useRef<'left' | 'middle' | null>(null);

  // Document viewer state
  const [documentContent, setDocumentContent] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState<string>('Working Document');
  const [isDocumentMaximized, setIsDocumentMaximized] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Handle clicks outside the floating chat to close message panel
  useEffect(() => {
    if (!showMessages) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is inside the floating chat container
      if (floatingChatContainerRef.current && floatingChatContainerRef.current.contains(target)) {
        // Click is inside chat - keep panel open
        return;
      }

      // Click is outside chat - close the panel
      setShowMessages(false);
    };

    // Attach listener to document using capture phase for reliability
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [showMessages]);

  // Initialize conversations and sidebar widths from localStorage
  useEffect(() => {
    setIsMounted(true);

    // Load saved sidebar widths
    const savedSidebarWidth = localStorage.getItem('chat_sidebar_width_total');
    if (savedSidebarWidth) {
      setSidebarWidth(parseInt(savedSidebarWidth, 10));
    }

    const savedChatWidth = localStorage.getItem('chat_sidebar_width_chat');
    if (savedChatWidth) {
      setChatWidth(parseInt(savedChatWidth, 10));
    }

    // Load conversations
    const stored = localStorage.getItem('chat_conversations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const restored = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt),
          })),
        }));
        setConversations(restored);
        if (restored.length > 0 && !currentConversationId) {
          setCurrentConversationId(restored[0].id);
          setMessages(restored[0].messages);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    }
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (isMounted && conversations.length > 0) {
      localStorage.setItem('chat_conversations', JSON.stringify(conversations));
    }
  }, [conversations, isMounted]);

  // Handle resizer drag events (both left and middle resizers)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !resizerTypeRef.current) {
        return;
      }

      const delta = e.clientX - dragStartXRef.current;

      if (resizerTypeRef.current === 'left') {
        // Left resizer: expand/shrink entire sidebar, chat grows, history stays fixed at 192px
        const newSidebarWidth = dragStartWidthRef.current + delta;

        // Constraints: Min 343px (150 chat min + 192 history + 1px divider), Max 800px
        const constrainedWidth = Math.max(343, Math.min(800, newSidebarWidth));
        setSidebarWidth(constrainedWidth);
        localStorage.setItem('chat_sidebar_width_total', constrainedWidth.toString());
      } else if (resizerTypeRef.current === 'middle') {
        // Middle resizer: redistribute fixed total width between chat and history
        const newChatWidth = dragStartWidthRef.current + delta;

        // Constraints:
        // - Chat history minimum: 150px
        // - Chat minimum: 150px
        // - Calculate max chat based on sidebar width: (sidebar - 150 history - 8px divider)
        const minChatWidth = 150;
        const minHistoryWidth = 150;
        const maxChatWidth = sidebarWidth - minHistoryWidth - 8; // 8px for divider

        const constrainedWidth = Math.max(minChatWidth, Math.min(maxChatWidth, newChatWidth));
        setChatWidth(constrainedWidth);
        localStorage.setItem('chat_sidebar_width_chat', constrainedWidth.toString());
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      resizerTypeRef.current = null;
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [input]);

  // Scroll to bottom when messages update or panel opens
  useEffect(() => {
    // Scroll to bottom when panel opens (showMessages changes)
    if (messagesPanelRef.current && showMessages && !isExpanded) {
      setTimeout(() => {
        if (messagesPanelRef.current) {
          messagesPanelRef.current.scrollTop = messagesPanelRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [showMessages, isExpanded]);

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

  // Save current conversation when messages change
  useEffect(() => {
    if (isMounted && currentConversationId) {
      saveCurrentConversation();
    }
  }, [messages]);

  // Helper: Generate conversation title from first message
  const generateTitle = (content: string) => {
    return content.substring(0, 30) + (content.length > 30 ? '...' : '');
  };

  // Helper: Create new conversation
  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    setMessages([]);
    setInput('');
    // Clear document state for new conversation
    setDocumentContent('');
    setDocumentTitle('Working Document');
  };

  // Helper: Save current messages to conversation
  const saveCurrentConversation = () => {
    if (currentConversationId && messages.length > 0) {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === currentConversationId
            ? {
                ...conv,
                messages,
                title: conv.title === 'New Chat' && messages.length > 0
                  ? generateTitle(messages[0].content)
                  : conv.title,
                updatedAt: new Date(),
              }
            : conv
        )
      );
    }
  };

  // Helper: Load conversation
  const loadConversation = (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
      setCurrentConversationId(conversationId);
      setMessages(conv.messages);
      setInput('');
      // Clear document state when switching conversations
      setDocumentContent('');
      setDocumentTitle('Working Document');
    }
  };

  // Helper: Delete conversation
  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (currentConversationId === conversationId) {
      if (conversations.length > 1) {
        const nextConv = conversations.find(c => c.id !== conversationId);
        if (nextConv) {
          loadConversation(nextConv.id);
        }
      } else {
        setCurrentConversationId(null);
        setMessages([]);
      }
    }
  };

  // Helper: Get conversations grouped by time
  const getGroupedConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, Conversation[]> = {
      'Today': [],
      'Yesterday': [],
      'Last 7 days': [],
      'Older': [],
    };

    conversations.forEach(conv => {
      const convDate = new Date(conv.updatedAt);
      const convDateOnly = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

      if (convDateOnly.getTime() === today.getTime()) {
        groups['Today'].push(conv);
      } else if (convDateOnly.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(conv);
      } else if (convDateOnly.getTime() >= weekAgo.getTime()) {
        groups['Last 7 days'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    });

    return groups;
  };

  // Extract document title from markdown content
  const extractDocumentTitle = (markdown: string) => {
    // Look for markdown heading: # Title
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    if (h1Match && h1Match[1]) {
      setDocumentTitle(h1Match[1].trim());
    }
  };

  // Strip intro explanation text before the actual content
  const stripIntroText = (content: string) => {
    // Remove common intro patterns like "Here's a...", "Sure, here's...", etc.
    // Strip everything before the first markdown heading or real content
    const cleanContent = content
      .replace(/^(Here's|Sure,\s+here's|I've\s+created|I'll\s+create)[^#\n]*[\n]+/i, '')
      .replace(/^.*?(?=^#{1,6}\s)/m, '');

    return cleanContent.trim() || content;
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

    // Create new conversation if needed
    if (!currentConversationId) {
      createNewConversation();
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

      // Detect response type by Content-Type header
      const contentType = response.headers.get('content-type') || '';
      const isJsonResponse = contentType.includes('application/json');

      console.log('[HGC_STREAM] Response Content-Type:', contentType, 'Is JSON:', isJsonResponse);

      // HANDLE JSON RESPONSES (no tool calls)
      if (isJsonResponse) {
        console.log('[HGC_STREAM] Handling JSON response');
        const data = await response.json();
        console.log('[HGC_STREAM] JSON data:', { response: data.response?.substring(0, 100), success: data.success });

        if (data.response) {
          const assistantContent = data.response;
          const cleanContent = stripIntroText(assistantContent);

          // Create assistant message with cleaned content (intro text removed)
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: cleanContent,
            createdAt: new Date(),
          };

          setMessages(prev => [...prev, assistantMessage]);
          console.log('[HGC_STREAM] JSON response added to messages. Length:', cleanContent.length);

          // Auto-fullscreen if content > 500 chars AND user triggered document creation
          if (cleanContent.length > 500 && !isFullscreen && hasDocumentCreationTrigger()) {
            console.log('[HGC_STREAM] Auto-fullscreen triggered for JSON response (trigger words matched)');
            setIsFullscreen(true);
            setDocumentContent(cleanContent);
            extractDocumentTitle(cleanContent);
          }
        }
        setIsLoading(false);
        return; // Exit early - JSON response is complete
      }

      // HANDLE STREAMING RESPONSES (with tool calls)
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

        // Auto-fullscreen when document content starts (>500 chars = actual document) AND trigger keywords matched
        if (assistantContent.length > 500 && !isFullscreen && hasDocumentCreationTrigger()) {
          setIsFullscreen(true);
          const cleanContent = stripIntroText(assistantContent);
          setDocumentContent(cleanContent);
          extractDocumentTitle(cleanContent);
        }

        // Keep document in sync if already in fullscreen
        if (isFullscreen && assistantContent.length > 500) {
          const cleanContent = stripIntroText(assistantContent);
          setDocumentContent(cleanContent);
          extractDocumentTitle(cleanContent);
        }

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
        toast.info('Request cancelled');
      } else {
        console.error('[HGC_STREAM] Error:', error);
        const errorMessage = error.message || 'An error occurred';
        setError(errorMessage);

        // Show error toast with system context
        toast.error('Chat Error', {
          description: errorMessage,
          duration: 5000,
        });

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

  // Handle expand button click - find last long message and show in fullscreen
  // Check if user's last message contains trigger keywords for document creation
  const hasDocumentCreationTrigger = () => {
    if (messages.length === 0) return false;

    // Find the last user message
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) return false;

    const text = lastUserMessage.content.toLowerCase();

    // Trigger keywords that indicate creative/document writing
    const triggerKeywords = ['write', 'compose', 'draft', 'create a post', 'create an article', 'create a document', 'post', 'article', 'blog', 'newsletter', 'email'];

    // Block keywords that should NOT trigger fullscreen
    const blockKeywords = ['create a campaign', 'create a cartridge', 'explain', 'tell me', 'analyze', 'help me', 'what is', 'how to', 'describe', 'summarize', 'list', 'show me'];

    // Check if any block keyword is present
    if (blockKeywords.some(keyword => text.includes(keyword))) {
      return false;
    }

    // Check if any trigger keyword is present
    return triggerKeywords.some(keyword => text.includes(keyword));
  };

  const handleMessageExpand = () => {
    // Find the last assistant message with content > 500 chars
    const longMessage = [...messages].reverse().find(
      msg => msg.role === 'assistant' && msg.content.length > 500
    );

    if (longMessage && hasDocumentCreationTrigger()) {
      setIsFullscreen(true);
      setDocumentContent(longMessage.content);
      extractDocumentTitle(longMessage.content);
    }
  };

  // Enter edit mode - copy current content to editor
  const handleEditClick = () => {
    setEditedContent(documentContent);
    setIsEditMode(true);
  };

  // Save edited content and exit edit mode
  const handleSaveEdit = () => {
    setDocumentContent(editedContent);
    setIsEditMode(false);
    setEditedContent('');
  };

  // Cancel edit mode without saving
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedContent('');
  };

  // Copy document content to clipboard
  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(documentContent);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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

  // Fullscreen embedded view - ChatSDK-style two-panel layout
  // Left: Chat panel | Right: Document viewer
  if (isFullscreen) {
    return (
      <div className="absolute inset-0 left-0 right-0 top-16 bottom-0 bg-white flex z-30 animate-in fade-in slide-in-from-right duration-200">

        {/* LEFT PANEL: Chat - Hidden when document is maximized */}
        {!isDocumentMaximized && (
        <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
          {/* Top Navigation Bar - Document Title & Actions */}
          <div className="h-14 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">{documentTitle}</h2>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {/* Close/Back to floating */}
              <button
                onClick={() => {
                  setIsFullscreen(false);
                  setIsExpanded(false);
                  setIsMinimized(false);
                  setIsDocumentMaximized(false);
                  setShowMessages(true);  // Auto-open message panel
                }}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                aria-label="Close fullscreen"
                title="Back to floating"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
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
                  onExpand={handleMessageExpand}
                />
              ))
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
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

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 bg-white">
            <div className="flex gap-2 items-flex-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none text-gray-700 placeholder-gray-500"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                  input.trim() && !isLoading
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-gray-200 text-gray-400"
                )}
                aria-label="Send message"
              >
                {isLoading ? (
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
        )}

        {/* RIGHT PANEL: Document Viewer - Full width when maximized */}
        <div className={cn("overflow-hidden bg-white flex flex-col", isDocumentMaximized ? "flex-1" : "flex-1")}>
          {/* Document Header */}
          <div className="h-14 px-6 bg-gray-50 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">{documentTitle}</h2>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 text-xs font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                    aria-label="Save changes"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-xs font-medium bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors"
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEditClick}
                    className="px-3 py-1 text-xs font-medium bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors"
                    aria-label="Edit document"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleCopyContent}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    aria-label={copiedFeedback ? "Copied!" : "Copy document"}
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Document Content Area */}
          <div className="flex-1 overflow-y-auto">
            {isEditMode ? (
              // Edit mode - show textarea with markdown
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-full p-6 text-sm text-gray-700 font-mono border-0 rounded-none focus:outline-none resize-none bg-white"
                placeholder="Enter your markdown content here..."
                spellCheck="false"
              />
            ) : (
              // View mode - show formatted markdown
              <div className="px-16 py-12">
                <div className="max-w-4xl mx-auto">
                  {documentContent ? (
                    <div className="prose prose-lg max-w-none">
                      <ReactMarkdown
                        components={{
                        strong: ({ children }) => (
                          <strong className="font-bold text-gray-900">{children}</strong>
                        ),
                        p: ({ children }) => (
                          <p className="mb-4 last:mb-0 text-gray-700 leading-relaxed">{children}</p>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-6xl font-bold mb-8 text-gray-900">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-5xl font-bold mb-6 mt-10 text-gray-900">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-4xl font-semibold mb-4 mt-8 text-gray-900">{children}</h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-700">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-700">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-700">{children}</li>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">{children}</blockquote>
                        ),
                        hr: () => null,
                      }}
                      >
                        {documentContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center py-12">
                      <p className="text-sm">Document content will appear here</p>
                      <p className="text-xs mt-2">Ask me to write a post, article, or document</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle left resizer mousedown (expand/shrink entire sidebar)
  // NOTE: Direction may feel backwards - user drags right to expand left side, etc
  const handleLeftResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    resizerTypeRef.current = 'left';
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = sidebarWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  // Handle middle resizer mousedown (redistribute chat/history within fixed total)
  // NOTE: Direction may feel backwards - user drags right to shrink chat area, etc
  const handleMiddleResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    resizerTypeRef.current = 'middle';
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = chatWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  // Expanded sidebar view (RIGHT side, embedded) - with ChatSDK-style history
  if (isExpanded) {
    const groupedConversations = getGroupedConversations();
    const hasAnyConversations = Object.values(groupedConversations).some(group => group.length > 0);

    const historyWidth = showChatHistory && hasAnyConversations ? 192 : 0;

    return (
      <div
        className="fixed right-0 top-16 bottom-0 flex bg-white border-l border-gray-200 animate-in slide-in-from-right duration-200"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Left resizer - expand/shrink entire sidebar */}
        <div
          onMouseDown={handleLeftResizerMouseDown}
          className="group cursor-col-resize flex items-center justify-center flex-shrink-0 hover:bg-gray-100"
          style={{
            userSelect: 'none',
            width: '8px',
            minWidth: '8px',
          }}
          title="Drag to resize sidebar"
        >
          {/* Visual drag handle */}
          <div className="w-0.5 h-6 bg-gray-400 rounded-full"></div>
        </div>

        {/* Main Chat Area */}
        <div
          className="flex flex-col bg-white relative"
          style={{ width: `${chatWidth}px` }}
        >
          {/* Minimal Top Banner with icon navigation - match history banner height */}
          <div className="h-16 px-2 border-b border-gray-200 flex items-center gap-1">
            {/* Fullscreen icon (square with rounded corners) */}
            <button
              onClick={() => {
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

            {/* Toggle chat history */}
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
                  onExpand={handleMessageExpand}
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

        {/* Middle resizer divider */}
        {showChatHistory && hasAnyConversations && (
          <div
            onMouseDown={handleMiddleResizerMouseDown}
            className="group cursor-col-resize flex-shrink-0 flex items-center justify-center hover:bg-gray-100"
            style={{
              userSelect: 'none',
              width: '8px',
              minWidth: '8px',
            }}
            title="Drag to resize chat area"
          >
            {/* Visual drag handle */}
            <div className="w-0.5 h-6 bg-gray-400 rounded-full"></div>
          </div>
        )}

        {/* Chat History Sidebar - ChatSDK Style (on the RIGHT) */}
        {showChatHistory && hasAnyConversations && (
          <div
            className="flex flex-col bg-gray-50 border-l border-gray-200"
            style={{ width: `${historyWidth}px` }}
          >
            {/* ChatSDK-style Header - same height as main banner */}
            <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Chatbot</h3>
              <div className="flex gap-2">
                  {/* New conversation button */}
                  <button
                    onClick={createNewConversation}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    aria-label="New conversation"
                    title="New conversation"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                  {/* Delete all conversations button */}
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete all conversations?')) {
                        setConversations([]);
                        setCurrentConversationId(null);
                        setMessages([]);
                      }
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    aria-label="Delete all"
                    title="Delete all conversations"
                  >
                    <Trash2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

            {/* Conversations List - Time grouped */}
            <div className="flex-1 overflow-y-auto">
              {Object.entries(groupedConversations).map(([timeGroup, convs]) =>
                convs.length > 0 ? (
                  <div key={timeGroup}>
                    {/* Time Group Label */}
                    <div className="px-4 pt-3 pb-2">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {timeGroup}
                      </h4>
                    </div>

                    {/* Conversations in this group */}
                    {convs.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm hover:bg-gray-200 transition-colors group flex items-center justify-between",
                          currentConversationId === conv.id ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-700"
                        )}
                      >
                        <span className="truncate flex-1">{conv.title}</span>
                        {/* Delete button appears on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-300 rounded ml-2"
                          aria-label="Delete conversation"
                        >
                          <X className="w-3 h-3 text-gray-600" />
                        </button>
                      </button>
                    ))}
                  </div>
                ) : null
              )}

              {/* End of history message */}
              {hasAnyConversations && (
                <div className="px-4 py-4 mt-4 text-center">
                  <p className="text-xs text-gray-500">You have reached the end of your chat history</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Floating bar view (default)
  return (
    <>
      {/* Blur overlay for canvas when chat is active - visual only, non-interactive */}
      {showMessages && (
        <div
          className="fixed inset-0 left-64 bg-black/0 backdrop-blur-lg z-40 transition-all duration-200"
          style={{
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        ref={floatingChatContainerRef}
        className={cn(
          "fixed bottom-8 left-64 right-0 mx-auto w-[calc((100vw-256px)*0.8-2rem)] max-w-5xl z-50",
          className
        )}
      >
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
                  onExpand={handleMessageExpand}
                />
              ))}
            </div>
          </div>
        )}

        {/* Input Area - Part of same container */}
        <form ref={floatingBarRef} onSubmit={handleSubmit} className="relative">
          <div
            className="px-4 py-2 cursor-text"
            onClick={() => {
              textareaRef.current?.focus();
              if (messages.length > 0) {
                setShowMessages(true);
              }
            }}
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
                onFocus={() => {
                  if (messages.length > 0) {
                    setShowMessages(true);
                  }
                }}
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
    </>
  );
}