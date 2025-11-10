'use client';

import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';

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
          'max-w-[66%] px-4 py-2.5 rounded-xl text-sm',
          isUser
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-900'
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
            <div className="whitespace-pre-wrap break-words">
              {messageText}
            </div>
          )
        )}
      </div>
    </div>
  );
}