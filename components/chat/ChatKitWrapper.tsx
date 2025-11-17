'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';

export interface ChatKitWrapperProps {
  workflowId: string;
  onMessage?: (message: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  className?: string;
}

/**
 * ChatKitWrapper - React wrapper for OpenAI ChatKit
 *
 * Handles:
 * - Session creation via /api/chatkit/session
 * - Automatic token refresh
 * - Event delegation to parent components
 */
export function ChatKitWrapper({
  workflowId,
  onMessage,
  onComplete,
  onError,
  className
}: ChatKitWrapperProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  /**
   * getClientSecret - Called by ChatKit to get authentication token
   *
   * Flow:
   * 1. Called on mount with null (initial session creation)
   * 2. Called automatically before token expiry with current token (refresh)
   */
  const getClientSecret = async (currentToken: string | null): Promise<string> => {
    try {
      console.log('[ChatKitWrapper] Fetching client secret...', {
        isRefresh: !!currentToken,
        workflowId
      });

      const response = await fetch('/api/chatkit/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId,
          // Pass current token for refresh requests
          ...(currentToken && { previousToken: currentToken })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.client_secret) {
        throw new Error('No client_secret in response');
      }

      console.log('[ChatKitWrapper] Client secret obtained successfully');
      setIsInitializing(false);
      setError(null);

      return data.client_secret;

    } catch (err) {
      console.error('[ChatKitWrapper] Failed to get client secret:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate';
      setError(errorMessage);
      setIsInitializing(false);
      throw err;
    }
  };

  // Initialize ChatKit hook
  const { control } = useChatKit({
    api: {
      getClientSecret: async (existing: string | null) => {
        return getClientSecret(existing);
      }
    }
  });

  // Initialize on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    console.log('[ChatKitWrapper] Initializing with workflow:', workflowId);

    // TODO: Add event listeners when ChatKit API documentation is available
    // The control object should provide methods to listen for:
    // - onMessage: When assistant sends a message
    // - onComplete: When workflow completes
    // - onError: When an error occurs

  }, [workflowId]);

  // Error state
  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className || ''}`}>
        <p className="text-sm text-red-600 font-medium">ChatKit Error</p>
        <p className="text-xs text-red-500 mt-1">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsInitializing(true);
            initRef.current = false;
          }}
          className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading state
  if (isInitializing) {
    return (
      <div className={`p-4 flex items-center justify-center ${className || ''}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Initializing ChatKit...</p>
        </div>
      </div>
    );
  }

  // Render ChatKit component
  return (
    <div className={className}>
      <ChatKit control={control} />
    </div>
  );
}

/**
 * Example usage:
 *
 * ```tsx
 * <ChatKitWrapper
 *   workflowId={process.env.NEXT_PUBLIC_TOPIC_GENERATION_WORKFLOW_ID}
 *   onMessage={(msg) => console.log('New message:', msg)}
 *   onComplete={(result) => console.log('Complete:', result)}
 *   onError={(err) => console.error('Error:', err)}
 *   className="h-full w-full"
 * />
 * ```
 */
