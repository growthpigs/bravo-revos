'use client';

// @refresh reset
// ^ This disables Fast Refresh for this component to prevent build cache corruption
// due to the component's size and complexity. Use full page reload instead.

import React from 'react';
import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from 'react';
import { ArrowUp, Paperclip, Mic, Maximize2, Minimize2, X, MessageSquare, Menu, Trash2, Plus, Lock, Copy, Save, Sparkles } from 'lucide-react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { ChatMessage } from './ChatMessage';
import { SaveToCampaignModal } from '../SaveToCampaignModal';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { InlineDecisionButtons } from './InlineDecisionButtons';
import { InlineCampaignSelector } from './InlineCampaignSelector';
import { InlineDateTimePicker } from './InlineDateTimePicker';
import { SlashCommandAutocomplete } from './SlashCommandAutocomplete';
import { getCommand, type SlashCommand, type SlashCommandContext } from '@/lib/slash-commands';
import { sandboxFetch } from '@/lib/sandbox/sandbox-wrapper';
import { SandboxIndicator } from './SandboxIndicator';

// Feature Flag: HGC API Version Selection
// v3 = Pragmatic implementation (raw OpenAI, bypasses MarketingConsole complexity)
// v2 = Full AgentKit + Cartridge architecture (when stable)
// legacy = Original implementation
const HGC_VERSION = process.env.NEXT_PUBLIC_HGC_VERSION || 'v3';
const HGC_API_ENDPOINT = `/api/hgc${HGC_VERSION === 'legacy' ? '' : `-${HGC_VERSION}`}`;

console.log('[FloatingChatBar] Using API endpoint:', HGC_API_ENDPOINT, `(${HGC_VERSION})`);

// Unique ID generator using crypto.randomUUID for truly unique IDs
const generateUniqueId = () => {
  // Use crypto.randomUUID() for guaranteed uniqueness
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers: timestamp + random + counter
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
};

interface DecisionOption {
  label: string;
  value: string;
  icon?: 'plus' | 'list';
  variant?: 'primary' | 'secondary';
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
}

interface InteractiveData {
  type: 'decision' | 'campaign_select' | 'datetime_select' | 'confirm';
  workflow_id?: string;
  campaigns?: Campaign[];
  decision_options?: DecisionOption[];
  initial_datetime?: string;
  initial_content?: string;
  campaign_id?: string;
  content?: string;
}

interface ActionButton {
  id: string;
  label: string;
  action: 'post_linkedin' | 'regenerate' | 'change_voice' | 'try_copywriting' | 'save' | 'schedule';
  primary?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  interactive?: InteractiveData;
  actions?: ActionButton[];
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [input, setInput] = useState('');
  // Safe message setter that automatically deduplicates
  const [messagesInternal, setMessagesInternal] = useState<Message[]>([]);

  // Wrapper that deduplicates messages before setting state
  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setMessagesInternal((prev) => {
      const updated = typeof newMessages === 'function' ? newMessages(prev) : newMessages;

      // Deduplicate by ID, keeping the LAST occurrence (most recent)
      const seen = new Map<string, Message>();
      updated.forEach(msg => {
        seen.set(msg.id, msg);
      });
      const deduplicated = Array.from(seen.values());

      // Log if we found duplicates
      if (deduplicated.length !== updated.length) {
        console.warn(`[DEDUP] Removed ${updated.length - deduplicated.length} duplicate messages`);
      }

      return deduplicated;
    });
  };

  // Use deduplicated messages
  const messages = messagesInternal;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slash command state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });

  // Conversation management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesPanelRef = useRef<HTMLDivElement>(null);
  const floatingBarRef = useRef<HTMLFormElement>(null);
  const floatingChatContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingConversation = useRef(false);
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
  const [documentSourceMessageId, setDocumentSourceMessageId] = useState<string | null>(null); // Track which message is in document
  const [editedContent, setEditedContent] = useState<string>('');
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [showSaveToCampaignModal, setShowSaveToCampaignModal] = useState(false);

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
        // Ensure all messages have unique IDs (generate if missing from old data)
        const restored = parsed.map((conv: any) => {
          // Deduplicate messages in this conversation
          const messageMap = new Map();
          conv.messages.forEach((msg: any) => {
            const id = msg.id || generateUniqueId();
            messageMap.set(id, {
              ...msg,
              id,
              createdAt: new Date(msg.createdAt),
            });
          });

          const deduplicatedMessages = Array.from(messageMap.values());

          if (deduplicatedMessages.length !== conv.messages.length) {
            console.warn(`[STORAGE_CLEANUP] Removed ${conv.messages.length - deduplicatedMessages.length} duplicate messages from conversation "${conv.title || 'Untitled'}"`);
          }

          return {
            ...conv,
            id: conv.id || generateUniqueId(), // Ensure conversation has ID
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            messages: deduplicatedMessages,
          };
        });
        setConversations(restored);
        if (restored.length > 0 && !currentConversationId) {
          setCurrentConversationId(restored[0].id);
          setMessages(restored[0].messages); // setMessages will auto-deduplicate
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

  // Unified scroll handler for all chat panels
  useEffect(() => {
    // Scroll fullscreen/expanded left panel to bottom
    if (scrollAreaRef.current && (isExpanded || isFullscreen)) {
      // Use longer delay to ensure DOM fully rendered + animation complete
      const timeout = setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current;
          scrollElement.scrollTop = scrollElement.scrollHeight;
          console.log('[FCB_SCROLL] Fullscreen panel scrolled to:', scrollElement.scrollHeight);
        }
      }, 200); // 200ms accounts for fullscreen animation duration

      return () => clearTimeout(timeout);
    }

    // Scroll floating message panel to bottom
    if (messagesPanelRef.current && !isExpanded && !isFullscreen && messages.length > 0) {
      const timeout = setTimeout(() => {
        if (messagesPanelRef.current) {
          const scrollElement = messagesPanelRef.current;
          scrollElement.scrollTop = scrollElement.scrollHeight;
          console.log('[FCB_SCROLL] Floating panel scrolled to:', scrollElement.scrollHeight);
        }
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [messages, isExpanded, isFullscreen, showMessages]);

  // Special handler: When fullscreen opens, scroll after animation completes
  useEffect(() => {
    if (isFullscreen && scrollAreaRef.current && messages.length > 0) {
      // Wait for fullscreen animation to complete (200ms CSS transition)
      const timeout = setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current;
          scrollElement.scrollTop = scrollElement.scrollHeight;
          console.log('[FCB_SCROLL] Fullscreen opened, scrolled to:', scrollElement.scrollHeight);
        }
      }, 250); // 250ms = 200ms animation + 50ms buffer

      return () => clearTimeout(timeout);
    }
  }, [isFullscreen]); // Only re-run when isFullscreen changes (not on every message)

  // Save current conversation when messages change (but not while loading a conversation)
  useEffect(() => {
    if (isMounted && currentConversationId && !isLoadingConversation.current) {
      saveCurrentConversation();
    }
  }, [messages]);

  // Maintain focus in textarea after sending message (all states)
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      // Small timeout to ensure DOM has updated after state changes
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [isLoading]);

  // Auto-focus chat input when chat opens in any mode
  useEffect(() => {
    // Chat is visible when: showMessages OR isExpanded OR isFullscreen
    const chatIsVisible = showMessages || isExpanded || isFullscreen;
    const chatIsNotCollapsed = !isCollapsed;

    if (chatIsVisible && chatIsNotCollapsed && textareaRef.current) {
      // Longer timeout to ensure DOM has fully rendered in all modes (sidebar/fullscreen)
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [showMessages, isExpanded, isFullscreen, isCollapsed]);

  // ESC key hierarchy: Fullscreen → Floating → Collapsed Button
  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          // From fullscreen: go to floating chat
          console.log('[FCB] ESC pressed - exiting fullscreen to floating chat');
          setIsFullscreen(false);
          setIsExpanded(false);
          setShowMessages(true);
          setIsCollapsed(false);
        } else if (isExpanded) {
          // From expanded/sidebar: go to floating chat (stay open, just collapse sidebar)
          console.log('[FCB] ESC pressed - exiting sidebar to floating chat');
          setIsExpanded(false);
          setShowMessages(true);
          setIsCollapsed(false);
        } else if (showMessages && !isCollapsed) {
          // From floating chat: collapse to button
          console.log('[FCB] ESC pressed - collapsing floating chat to button');
          setIsCollapsed(true);
          setShowMessages(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen, isExpanded, showMessages, isCollapsed]);

  // Auto-sync document content when fullscreen opens (if no content loaded yet)
  useEffect(() => {
    if (isFullscreen && !documentContent && messages.length > 0) {
      // Find the most recent assistant message with substantial content (> 500 chars)
      const latestContent = [...messages].reverse().find(
        msg => msg.role === 'assistant' && msg.content.length > 500
      );

      if (latestContent) {
        console.log('[FCB] Auto-syncing latest content to document area on fullscreen open');
        setDocumentContent(latestContent.content);
        setDocumentSourceMessageId(latestContent.id);
        extractDocumentTitle(latestContent.content);
      }
    }
  }, [isFullscreen, documentContent, messages]);

  // Helper: Generate conversation title from first message
  const generateTitle = (content: string) => {
    return content.substring(0, 30) + (content.length > 30 ? '...' : '');
  };

  // Helper: Create new conversation
  const createNewConversation = () => {
    const newConv: Conversation = {
      id: generateUniqueId(),
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
      // Flag that we're loading a conversation to prevent auto-save race condition
      isLoadingConversation.current = true;

      setCurrentConversationId(conversationId);
      setMessages(conv.messages);
      setInput('');
      // Clear document state when switching conversations
      setDocumentContent('');
      setDocumentTitle('Working Document');

      // Clear the flag after state updates complete
      setTimeout(() => {
        isLoadingConversation.current = false;
      }, 100);
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

  // Helper: Deduplicate consecutive identical lines (prevents "selected campaign" 3x)
  const deduplicateLines = (text: string): string => {
    const lines = text.split('\n');
    return lines.filter((line, i) => {
      if (i === 0) return true; // Always keep first line
      const trimmedCurrent = line.trim();
      const trimmedPrevious = lines[i - 1].trim();
      // Remove line if it's identical to previous line (consecutive duplicates)
      return trimmedCurrent !== trimmedPrevious;
    }).join('\n');
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

  // Fixed buttons - always present at bottom of chat when there's document content
  const getFixedBarButtons = (): ActionButton[] => {
    return [
      { id: 'post_linkedin', label: 'POST TO LINKEDIN', action: 'post_linkedin', primary: true },
      { id: 'save', label: 'SAVE', action: 'save' },
      { id: 'schedule', label: 'SCHEDULE POST', action: 'schedule' },
    ];
  };

  // Content-specific buttons - only under messages that synced to document area
  const getContentButtons = (): ActionButton[] => {
    return [
      { id: 'try_new_style', label: 'TRY NEW STYLE', action: 'regenerate' },
      { id: 'change_voice', label: 'DIFFERENT VOICE', action: 'change_voice' },
    ];
  };

  // Get background color for action button (consistent gray shades)
  const getButtonColor = (isPrimary?: boolean): string => {
    if (isPrimary) return 'bg-gray-800 text-white hover:bg-gray-900';
    return 'bg-gray-400 text-gray-800 hover:bg-gray-500';
  };

  // Handle action button clicks
  const handleActionClick = async (action: string, messageId?: string) => {
    console.log('[FCB] Action clicked:', action, 'messageId:', messageId);

    switch (action) {
      case 'post_linkedin':
        // TODO: Implement post to LinkedIn
        toast.success('Post to LinkedIn - Coming soon!');
        break;
      case 'regenerate':
        // Send "try a new style" to HGC
        setInput('Try a new style for this content');
        handleSubmit(new Event('submit') as any);
        break;
      case 'change_voice':
        // TODO: Show voice cartridge selector
        toast.info('Voice cartridge selector - Coming soon!');
        break;
      case 'try_copywriting':
        // TODO: Show copywriting cartridge selector (future feature)
        toast.info('Copywriting cartridge - Coming soon!');
        break;
      case 'save':
        // Open save to campaign modal
        setShowSaveToCampaignModal(true);
        break;
      case 'schedule':
        // TODO: Implement schedule post
        toast.info('Schedule post - Coming soon!');
        break;
      default:
        console.warn('[FCB] Unknown action:', action);
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
      id: generateUniqueId(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    console.log('[HGC_STREAM] User message created:', userMessage.content);

    setMessages(prev => [...prev, userMessage]);
    setShowMessages(true); // Show message panel when user sends a message

    // Check if user's message contains trigger keywords
    // Open fullscreen immediately BEFORE waiting for assistant response
    // Pass the current input since it hasn't been added to messages array yet
    const shouldTriggerFullscreen = hasDocumentCreationTrigger(input.trim());
    if (shouldTriggerFullscreen && !isFullscreen) {
      console.log('[FCB] User message triggered fullscreen mode:', input.trim());
      setIsFullscreen(true);
      // Document area stays blank until real content arrives
    }

    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const requestPayload = {
        messages: [...messages, userMessage]
          .slice(-40) // Keep only last 40 messages to stay under 50-message API limit
          .map(m => {
            let cleanContent = m.content;

            // Sanitize: If content is a JSON string (from old broken responses), extract the actual text
            if (typeof cleanContent === 'string' && cleanContent.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(cleanContent);
                if (parsed.response) {
                  cleanContent = parsed.response;
                  console.log('[HGC_STREAM] Sanitized JSON message, extracted response text');
                }
              } catch (e) {
                // Not valid JSON, keep content as-is
              }
            }

            return {
              role: m.role,
              content: cleanContent,
            };
          }),
      };

      console.log(`[HGC_STREAM] Starting fetch request to ${HGC_API_ENDPOINT}`);
      console.log('[HGC_STREAM] Request payload:', JSON.stringify(requestPayload, null, 2));

      const response = await sandboxFetch(HGC_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
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

        // Try to get detailed error message from response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error || errorData.message || errorData.detail) {
            errorMessage = errorData.error || errorData.message || errorData.detail;
          }
        } catch (e) {
          // If response isn't JSON, try text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText.substring(0, 200); // Limit length
            }
          } catch (e2) {
            // Keep default error message
          }
        }

        throw new Error(errorMessage);
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
          const cleanContent = deduplicateLines(
            stripIntroText(assistantContent)
              .replace(/<!--[\s\S]*?-->/g, '') // Strip HTML comments (safety net for backend leakage)
          );

          // Create assistant message with cleaned content (intro text removed)
          const assistantMessage: Message = {
            id: generateUniqueId(),
            role: 'assistant',
            content: cleanContent,
            interactive: data.interactive, // CRITICAL: Attach interactive field for inline forms
            createdAt: new Date(),
          };

          // Deduplicate: Only add if message with this ID doesn't already exist
          setMessages(prev => {
            const exists = prev.some(m => m.id === assistantMessage.id);
            if (exists) {
              console.log('[HGC_STREAM] ⚠️  Message with ID', assistantMessage.id, 'already exists, skipping duplicate');
              return prev;
            }
            return [...prev, assistantMessage];
          });
          console.log('[HGC_STREAM] JSON response added to messages. Length:', cleanContent.length);

          if (data.interactive) {
            console.log('[HGC_STREAM] 🎯 INTERACTIVE response detected:', data.interactive.type);
          }

          // Handle clearDocument flag - clear working document on "write" command
          if (data.meta?.clearDocument) {
            console.log('[FCB] 🗑️ Clearing working document');
            setDocumentContent('');
            setDocumentTitle('Working Document');
            setDocumentSourceMessageId(null);
          }

          // Handle document field - send content to working document area
          if (data.document && data.document.content) {
            console.log('[FCB] 📄 Document field detected - sending to working document area');
            setIsFullscreen(true);
            setDocumentContent(data.document.content);
            setDocumentTitle(data.document.title || 'Working Document');
            setDocumentSourceMessageId(assistantMessage.id);
          } else {
            // Auto-fullscreen if content > 500 chars AND user triggered document creation
            console.log('[FCB] JSON response - content length:', cleanContent.length, 'isFullscreen:', isFullscreen);
            if (cleanContent.length > 500 && !isFullscreen) {
              const shouldTrigger = hasDocumentCreationTrigger();
              console.log('[FCB] Checking trigger for JSON response, result:', shouldTrigger);
              if (shouldTrigger) {
                console.log('[FCB] Assistant response triggered fullscreen (JSON mode)');
                setIsFullscreen(true);
                setDocumentContent(cleanContent);
                setDocumentSourceMessageId(assistantMessage.id); // Track which message is in document
                extractDocumentTitle(cleanContent);
              }
            }
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
        id: generateUniqueId(),
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
        if (assistantContent.length > 500 && !isFullscreen) {
          const shouldTrigger = hasDocumentCreationTrigger();
          console.log('[FCB] Streaming - content length:', assistantContent.length, 'shouldTrigger:', shouldTrigger);
          if (shouldTrigger) {
            console.log('[FCB] Assistant response triggered fullscreen (streaming mode)');
            setIsFullscreen(true);
            const cleanContent = deduplicateLines(
              stripIntroText(assistantContent)
                .replace(/<!--[\s\S]*?-->/g, '') // Strip HTML comments
            );
            setDocumentContent(cleanContent);
            setDocumentSourceMessageId(assistantMessage.id); // Track which message is in document
            extractDocumentTitle(cleanContent);
          }
        }

        // Keep document in sync if already in fullscreen
        if (isFullscreen && assistantContent.length > 500) {
          const cleanContent = deduplicateLines(
            stripIntroText(assistantContent)
              .replace(/<!--[\s\S]*?-->/g, '') // Strip HTML comments
          );
          setDocumentContent(cleanContent);
          setDocumentSourceMessageId(assistantMessage.id); // Keep tracking the same message
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

  // ========================================
  // SLASH COMMAND HANDLERS
  // ========================================

  // Handle input change - detect slash commands
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Detect "/" at start of input
    if (value.startsWith('/') && !showSlashMenu) {
      // Calculate dropdown position above textarea
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setSlashMenuPosition({
          top: rect.top - 10, // Position above textarea
          left: rect.left,
        });
      }
      setShowSlashMenu(true);
      setSlashQuery(value.slice(1)); // Remove "/" for query
    } else if (value.startsWith('/') && showSlashMenu) {
      // Update query as user types
      setSlashQuery(value.slice(1));
    } else if (!value.startsWith('/') && showSlashMenu) {
      // Hide menu if "/" is removed
      setShowSlashMenu(false);
      setSlashQuery('');
    }
  };

  // Handle slash command selection
  const handleSlashCommandSelect = async (command: SlashCommand) => {
    console.log('[SLASH_CMD] Executing command:', command.name);

    // Close menu
    setShowSlashMenu(false);
    setSlashQuery('');

    // Extract args (text after command name)
    const commandText = `/${command.name}`;
    const args = input.slice(commandText.length).trim();

    // Clear input immediately
    setInput('');

    // Create command context
    const context: SlashCommandContext = {
      sendMessage: async (message: string) => {
        // Create user message directly (bypass input state timing issue)
        const userMessage: Message = {
          id: generateUniqueId(),
          role: 'user',
          content: message.trim(),
          createdAt: new Date(),
        };

        console.log('[SLASH_CMD] Sending message as user:', userMessage.content);

        // Add to messages and show panel
        setMessages(prev => [...prev, userMessage]);
        setShowMessages(true);

        // Check if should trigger fullscreen
        const lowerContent = message.toLowerCase();
        const shouldTriggerFullscreen =
          lowerContent.includes('write') ||
          lowerContent.includes('draft') ||
          lowerContent.includes('compose') ||
          lowerContent.startsWith('/write') ||
          lowerContent.startsWith('/generate');

        if (shouldTriggerFullscreen && !isFullscreen) {
          console.log('[SLASH_CMD] Triggering fullscreen for:', message);
          setIsFullscreen(true);
        }

        // Start loading and call API
        setIsLoading(true);
        setError(null);

        try {
          const response = await fetch(HGC_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...messages, userMessage].slice(-40).map(m => ({
                role: m.role,
                content: m.content,
              })),
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          // Add assistant response
          const assistantMessage: Message = {
            id: generateUniqueId(),
            role: 'assistant',
            content: data.response,
            createdAt: new Date(),
            interactive: data.interactive,
          };

          setMessages(prev => [...prev, assistantMessage]);

        } catch (error) {
          console.error('[SLASH_CMD] API error:', error);
          setError('Failed to send message');
          toast.error('Failed to send message');
        } finally {
          setIsLoading(false);
        }
      },
      clearInput: () => {
        setInput('');
      },
      setFullscreen: (enabled: boolean) => {
        setIsFullscreen(enabled);
      },
      clearMessages: () => {
        setMessages([]);
        setCurrentConversationId(null);
        toast.success('Conversation cleared');
      },
      clearDocument: () => {
        setDocumentContent('');
        setDocumentTitle('Working Document');
      },
    };

    // Execute command handler
    try {
      await command.handler(args, context);
    } catch (error) {
      console.error('[SLASH_CMD] Error executing command:', error);
      toast.error(`Failed to execute /${command.name}`);
    }
  };

  // Handle Enter key (send) and Shift+Enter (new line)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // If slash menu is open, don't handle Enter (let autocomplete handle it)
    if (showSlashMenu && e.key === 'Enter') {
      return; // Let SlashCommandAutocomplete handle Enter
    }

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
  const hasDocumentCreationTrigger = (includeCurrentInput?: string) => {
    console.log('[FULLSCREEN_DEBUG] hasDocumentCreationTrigger called, messages.length:', messages.length, 'currentInput:', includeCurrentInput);

    // Build array of recent messages to check
    const messagesToCheck: string[] = [];

    // Add current input if provided (for checking BEFORE message is added to state)
    if (includeCurrentInput) {
      messagesToCheck.push(includeCurrentInput.toLowerCase());
    }

    // Add last 2 user messages from state (we check 3 total)
    const recentUserMessages = [...messages]
      .reverse()
      .filter(msg => msg.role === 'user')
      .slice(0, includeCurrentInput ? 2 : 3); // If we have current input, only get 2 more

    messagesToCheck.push(...recentUserMessages.map(msg => msg.content.toLowerCase()));

    if (messagesToCheck.length === 0) {
      console.log('[FULLSCREEN_DEBUG] No messages to check, returning false');
      return false;
    }

    const recentText = messagesToCheck.join(' ');
    console.log('[FULLSCREEN_DEBUG] Recent user messages (last 3):', recentText);

    // Trigger keywords that indicate creative/document writing
    const triggerKeywords = [
      'write', 'compose', 'draft', 'generate', 'create a post', 'create an article',
      'create a document', 'post', 'article', 'blog', 'newsletter', 'email',
      'finished', 'go ahead', 'do it', 'let\'s go'
    ];

    // Block keywords that should NOT trigger fullscreen
    const blockKeywords = ['create a campaign', 'create a cartridge', 'explain', 'tell me', 'analyze', 'help me', 'what is', 'how to', 'describe', 'summarize', 'list', 'show me'];

    // Check if any block keyword is present
    const hasBlockKeyword = blockKeywords.some(keyword => recentText.includes(keyword));
    if (hasBlockKeyword) {
      console.log('[FULLSCREEN_DEBUG] Block keyword found, returning false');
      return false;
    }

    // Check if any trigger keyword is present
    const hasTriggerKeyword = triggerKeywords.some(keyword => recentText.includes(keyword));
    console.log('[FULLSCREEN_DEBUG] Trigger keyword found:', hasTriggerKeyword);

    return hasTriggerKeyword;
  };

  const handleMessageExpand = () => {
    // Find the last assistant message with content > 500 chars
    const longMessage = [...messages].reverse().find(
      msg => msg.role === 'assistant' && msg.content.length > 500
    );

    // User explicitly clicked expand - open regardless of trigger keywords
    if (longMessage) {
      setIsFullscreen(true);
      setDocumentContent(longMessage.content);
      setDocumentSourceMessageId(longMessage.id); // Track which message is in document
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

  // ========================================
  // INLINE WORKFLOW HANDLERS
  // ========================================

  // Handle user selecting a decision (e.g., "Create New Campaign" vs "Select Existing")
  const handleDecisionSelect = async (decision: string, workflowId?: string) => {
    console.log('[INLINE_FORM] Decision selected:', decision, 'workflow:', workflowId);

    // Special handling for "continue" - close workflow and continue chat
    if (decision === 'continue') {
      // Remove the decision buttons
      setMessages(prev => {
        const newMessages = [...prev];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].interactive?.type === 'decision') {
            newMessages.splice(i, 1);
            break;
          }
        }
        return newMessages;
      });

      // Add user's choice
      const userMessage: Message = {
        id: generateUniqueId(),
        role: 'user',
        content: 'Continue writing',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Get backend response to continue the flow
      try {
        const response = await sandboxFetch(HGC_API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              ...messages.filter(m => !m.interactive),
              userMessage,
            ].slice(-40), // Keep last 40 messages to stay under API limit
            decision: 'continue',
            workflow_id: workflowId,
          }),
        });

        const data = await response.json();
        if (data.response) {
          const assistantMessage: Message = {
            id: generateUniqueId(),
            role: 'assistant',
            content: data.response,
            createdAt: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } catch (error) {
        console.error('Error continuing chat:', error);
      }
      return;
    }

    // Special handling for "just write first" - close workflow and let user write
    if (decision === 'just_write') {
      // Clear the interactive form by removing the last message with decision buttons
      setMessages(prev => {
        const newMessages = [...prev];
        // Find and remove the last message with interactive elements
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].interactive?.type === 'decision') {
            newMessages.splice(i, 1);
            break;
          }
        }
        return newMessages;
      });

      // Add a friendly message
      const userMessage: Message = {
        id: generateUniqueId(),
        role: 'user',
        content: 'Just write',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      const assistantMessage: Message = {
        id: generateUniqueId(),
        role: 'assistant',
        content: 'Got it! Go ahead and write your post. You can save it and link it to a campaign anytime.',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      return; // Don't call backend
    }

    // Add user message showing their choice
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: decision === 'create_new' ? 'Create a new campaign' : 'Select from existing campaigns',
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Send decision to backend with workflow context
      const response = await sandboxFetch(HGC_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage.content }].slice(-40), // Keep last 40 messages
          workflow_id: workflowId,
          decision: decision,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Add assistant response (may contain next step of workflow)
      const assistantMessage: Message = {
        id: generateUniqueId(),
        role: 'assistant',
        content: data.response || 'Got it!',
        interactive: data.interactive, // Next step (e.g., campaign selector)
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.interactive) {
        console.log('[INLINE_FORM] 🎯 Next step:', data.interactive.type);
      }
    } catch (err) {
      console.error('[INLINE_FORM] Error handling decision:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to process your selection';
      toast.error(errorMsg);
    }
  };

  // Handle user selecting a campaign
  const handleCampaignSelect = async (campaignId: string, workflowId?: string) => {
    console.log('[INLINE_FORM] Campaign selected:', campaignId, 'workflow:', workflowId);

    // Add user message
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: `Selected campaign: ${campaignId}`,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Send campaign selection to backend
      const response = await sandboxFetch(HGC_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage.content }].slice(-40), // Keep last 40 messages
          workflow_id: workflowId,
          campaign_id: campaignId,
        }),
      });

      const data = await response.json();

      // Add assistant response (may contain datetime picker)
      const assistantMessage: Message = {
        id: generateUniqueId(),
        role: 'assistant',
        content: data.response || 'Great choice!',
        interactive: data.interactive, // Next step (e.g., datetime picker)
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.interactive) {
        console.log('[INLINE_FORM] 🎯 Next step:', data.interactive.type);
      }
    } catch (err) {
      console.error('[INLINE_FORM] Error handling campaign selection:', err);
      toast.error('Failed to process campaign selection');
    }
  };

  // Handle user selecting a datetime
  const handleDateTimeSelect = async (datetime: string, workflowId?: string, campaignId?: string, content?: string) => {
    console.log('[INLINE_FORM] DateTime selected:', datetime, 'workflow:', workflowId, 'campaign:', campaignId, 'content:', content);

    // Add user message
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: `Schedule for: ${new Date(datetime).toLocaleString()}`,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Send datetime selection to backend (final step - should execute schedule)
      const response = await sandboxFetch(HGC_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage.content }].slice(-40), // Keep last 40 messages
          workflow_id: workflowId,
          schedule_time: datetime,
          campaign_id: campaignId,
          content: content,
        }),
      });

      const data = await response.json();

      // Add assistant response (should be success message)
      const assistantMessage: Message = {
        id: generateUniqueId(),
        role: 'assistant',
        content: data.response || 'Post scheduled successfully!',
        interactive: data.interactive,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.success) {
        toast.success('Post scheduled successfully!');
      }
    } catch (err) {
      console.error('[INLINE_FORM] Error handling datetime selection:', err);
      toast.error('Failed to schedule post');
    }
  };

  // ========================================
  // MESSAGE RENDERING WITH INLINE COMPONENTS
  // ========================================

  const renderMessage = (message: Message, index: number) => {
    // Validate message has ID (should always have one with our safeguards)
    if (process.env.NODE_ENV === 'development' && !message.id) {
      console.error('[FloatingChatBar] CRITICAL: Message missing ID at index', index);
    }

    // Check if this message has interactive elements
    if (message.interactive && message.role === 'assistant') {
      return (
        <div key={message.id} className="space-y-3">
          {/* Show the message text */}
          <ChatMessage
            message={convertToUIMessage(message)}
            isLoading={isLoading && index === messages.length - 1}
            onExpand={handleMessageExpand}
          />

          {/* Render the appropriate inline component */}
          {message.interactive.type === 'decision' && message.interactive.decision_options && (
            <InlineDecisionButtons
              options={message.interactive.decision_options}
              workflowId={message.interactive.workflow_id}
              onSelect={handleDecisionSelect}
            />
          )}

          {message.interactive.type === 'campaign_select' && message.interactive.campaigns && (
            <InlineCampaignSelector
              campaigns={message.interactive.campaigns}
              workflowId={message.interactive.workflow_id}
              onSelect={handleCampaignSelect}
            />
          )}

          {message.interactive.type === 'datetime_select' && (
            <InlineDateTimePicker
              initialDatetime={message.interactive.initial_datetime}
              workflowId={message.interactive.workflow_id}
              campaignId={message.interactive.campaign_id}
              content={message.interactive.initial_content}
              onSelect={handleDateTimeSelect}
            />
          )}

          {/* Content-specific buttons - only show if this message is synced to document */}
          {isFullscreen && documentSourceMessageId === message.id && (
            <div className="mt-2.5">
              {/* 2px separator line */}
              <div className="h-[2px] bg-gray-300 mb-2.5 w-full" />
              <div className="flex flex-wrap gap-[7px]">
                {getContentButtons().map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action.action, message.id)}
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-wide transition-colors px-3 py-1 rounded-full whitespace-nowrap",
                      getButtonColor(action.primary)
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Regular message without interactive elements
    return (
      <div key={message.id}>
        <ChatMessage
          message={convertToUIMessage(message)}
          isLoading={isLoading && message.role === 'assistant' && index === messages.length - 1}
          onExpand={handleMessageExpand}
        />

        {/* Content-specific buttons - only show if this message is synced to document */}
        {message.role === 'assistant' && isFullscreen && documentSourceMessageId === message.id && (
          <div className="mt-2.5">
            {/* 2px separator line */}
            <div className="h-[2px] bg-gray-300 mb-2.5 w-full" />
            <div className="flex flex-wrap gap-[7px]">
              {getContentButtons().map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.action, message.id)}
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-wide transition-colors px-3 py-1 rounded-full whitespace-nowrap",
                    getButtonColor(action.primary)
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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
      <>
        {/* Slash Command Autocomplete - Fullscreen Mode */}
        <SlashCommandAutocomplete
          visible={showSlashMenu}
          query={slashQuery}
          onSelect={handleSlashCommandSelect}
          onClose={() => {
            setShowSlashMenu(false);
            setSlashQuery('');
          }}
          position={slashMenuPosition}
        />

        <div className="absolute inset-0 left-0 right-0 top-16 bottom-0 bg-white z-30 animate-in fade-in slide-in-from-left duration-200">
          <PanelGroup direction="horizontal">
            {/* LEFT PANEL: Chat - Collapsible */}
            <Panel defaultSize={40} minSize={30} maxSize={60} collapsible={true}>
              <div className="h-full border-r border-gray-200 flex flex-col bg-white">
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
                  setShowSlashMenu(false);  // Close slash menu
                  setSlashQuery('');
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
              messages.map((message, index) => renderMessage(message, index))
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

          {/* Fixed Action Button Bar - Always visible when there's document content */}
          {documentContent && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <div className="flex gap-[7px]">
                {getFixedBarButtons().map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action.action)}
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-wide transition-colors px-3 py-1 rounded-full whitespace-nowrap",
                      getButtonColor(action.primary)
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 bg-white">
            <div className="flex gap-2 items-flex-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
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
            </Panel>

            {/* RESIZE HANDLE */}
            <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-500 transition-colors cursor-col-resize active:bg-blue-600" />

            {/* RIGHT PANEL: Document Viewer */}
            <Panel defaultSize={60} minSize={30}>
              <div className="h-full overflow-hidden bg-white flex flex-col">
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
                  <button
                    onClick={() => setShowSaveToCampaignModal(true)}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    aria-label="Save document"
                    title="Save to knowledge base (optionally link to campaign)"
                  >
                    <Save className="w-4 h-4 text-gray-600" />
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
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
            </Panel>
          </PanelGroup>

        {/* Save to Campaign Modal */}
        <SaveToCampaignModal
          isOpen={showSaveToCampaignModal}
          onClose={() => setShowSaveToCampaignModal(false)}
          documentContent={documentContent}
          documentTitle={documentTitle}
        />
        </div>
      </>
    );
  }

  // Expanded sidebar view (RIGHT side, embedded) - with ChatSDK-style history
  if (isExpanded) {
    const groupedConversations = getGroupedConversations();
    const hasAnyConversations = Object.values(groupedConversations).some(group => group.length > 0);

    const historyWidth = showChatHistory && hasAnyConversations ? 192 : 0;

    return (
      <>
        {/* Slash Command Autocomplete - Expanded Sidebar Mode */}
        <SlashCommandAutocomplete
          visible={showSlashMenu}
          query={slashQuery}
          onSelect={handleSlashCommandSelect}
          onClose={() => {
            setShowSlashMenu(false);
            setSlashQuery('');
          }}
          position={slashMenuPosition}
        />

        <div className="fixed right-0 top-16 bottom-0 bg-white border-l border-gray-200 animate-in slide-in-from-right duration-200 flex">
          <PanelGroup direction="horizontal">
            {/* MAIN CHAT AREA - Flexible width */}
            <Panel defaultSize={70} minSize={50} maxSize={90}>
              <div className="h-full flex flex-col bg-white relative">
          {/* Minimal Top Banner with icon navigation - match history banner height */}
          <div className="h-16 px-2 border-b border-gray-200 flex items-center gap-1">
            {/* Fullscreen icon (square with rounded corners) */}
            <button
              onClick={() => {
                setIsFullscreen(true);
                setShowSlashMenu(false);  // Close slash menu
                setSlashQuery('');
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
                setShowSlashMenu(false);  // Close slash menu
                setSlashQuery('');
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
              messages.map((message, index) => renderMessage(message, index))
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
                  onChange={handleInputChange}
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
            </Panel>

            {/* RESIZE HANDLE - Between chat and history */}
            {showChatHistory && hasAnyConversations && (
              <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-500 transition-colors cursor-col-resize active:bg-blue-600" />
            )}

            {/* CHAT HISTORY PANEL - Always pinned to RIGHT edge */}
            {showChatHistory && hasAnyConversations && (
              <Panel defaultSize={30} minSize={12} maxSize={37} collapsible={false}>
                <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
                  {/* History Header */}
                  <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-sm font-semibold text-gray-900">History</h3>
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

                  {/* Conversations List - Time grouped */}
                  <div className="flex-1 overflow-y-auto">
                    {Object.entries(groupedConversations).map(([timeGroup, convs]) =>
                      convs.length > 0 ? (
                        <div key={timeGroup}>
                          {/* Time Group Label */}
                          <div className="px-3 pt-3 pb-2">
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
                                "w-full text-left px-3 py-2 text-xs hover:bg-gray-200 transition-colors group flex items-center justify-between",
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
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-300 rounded"
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
                      <div className="px-3 py-4 text-center">
                        <p className="text-xs text-gray-500">End of history</p>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            )}
          </PanelGroup>
        </div>
      </>
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

      {/* Slash Command Autocomplete */}
      <SlashCommandAutocomplete
        visible={showSlashMenu}
        query={slashQuery}
        onSelect={handleSlashCommandSelect}
        onClose={() => {
          setShowSlashMenu(false);
          setSlashQuery('');
        }}
        position={slashMenuPosition}
      />

      {!isCollapsed && (
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
            className="max-h-[480px] overflow-y-auto border-b border-gray-200 animate-in fade-in slide-in-from-bottom duration-200 relative"
          >
            {/* Close button - Top right corner */}
            <button
              onClick={() => {
                setIsCollapsed(true);
                setShowMessages(false);
              }}
              className="absolute top-2 right-2 z-10 p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              aria-label="Collapse chat"
              title="Collapse chat (or press ESC)"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4 space-y-3">
              <SandboxIndicator />
              {messages.map((message, index) => renderMessage(message, index))}
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
                onChange={handleInputChange}
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
                  setShowSlashMenu(false);  // Close slash menu
                  setSlashQuery('');
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
                  setShowSlashMenu(false);  // Close slash menu
                  setSlashQuery('');
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
      )}

      {/* Collapsed chat button - Minimized square with cool icon */}
      {isCollapsed && (
        <button
          onClick={() => {
            setIsCollapsed(false);
            setShowMessages(true);
          }}
          className="fixed bottom-5 right-5 z-50"
        >
          <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer group">
            <Sparkles className="w-6 h-6 text-white group-hover:text-yellow-300 transition-colors" />
          </div>
        </button>
      )}
    </>
  );
}