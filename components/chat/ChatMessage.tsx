'use client';

import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: UIMessage;
  isLoading?: boolean;
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Extract text from message parts
  const getMessageText = () => {
    if (!message.parts || message.parts.length === 0) return '';

    return message.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n');
  };

  const messageText = getMessageText();

  // Debug logging
  if (!isUser && isLoading) {
    console.log('[ChatMessage] Loading state:', { isLoading, messageText: messageText.substring(0, 50), hasText: !!messageText });
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'px-4 py-2.5 rounded-xl text-sm',
          isUser
            ? 'bg-gray-900 text-white max-w-[90%]'
            : 'bg-gray-100 text-gray-900 max-w-[80%]'
        )}
      >
        {isLoading && !messageText ? (
          // Three thinking dots animation
          <div className="flex gap-1.5 py-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
          </div>
        ) : (
          messageText && (
            <ReactMarkdown
              components={{
                // Bold text - inherits color
                strong: ({ children }) => (
                  <strong className="font-bold text-inherit">{children}</strong>
                ),
                // Paragraphs - proper spacing, inherits color
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 text-inherit">{children}</p>
                ),
                // Unordered lists - inherits color
                ul: ({ children }) => (
                  <ul className="list-disc ml-4 my-2 space-y-1 text-inherit">{children}</ul>
                ),
                // Ordered lists - inherits color
                ol: ({ children }) => (
                  <ol className="list-decimal ml-4 my-2 space-y-1 text-inherit">{children}</ol>
                ),
                // List items - inherits color
                li: ({ children }) => (
                  <li className="mb-0.5 text-inherit">{children}</li>
                ),
                // Links - inherits color with underline
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline text-inherit"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {messageText}
            </ReactMarkdown>
          )
        )}
      </div>
    </div>
  );
}