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

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] px-4 py-2.5 rounded-xl text-sm',
          isUser
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-900'
        )}
      >
        {messageText && (
          <div className="whitespace-pre-wrap break-words">
            {messageText}
          </div>
        )}
      </div>
    </div>
  );
}