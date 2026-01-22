'use client';

import * as React from 'react';
import type { StreamChunk, RouteType, Citation } from '@/lib/chat/types';

interface UseStreamingTextOptions {
  /**
   * Typing animation speed (chars per second)
   */
  charsPerSecond?: number;
  /**
   * Enable typing animation
   */
  animateTyping?: boolean;
}

interface UseStreamingTextReturn {
  /**
   * Text displayed to user (animated)
   */
  displayedText: string;
  /**
   * Full text received so far
   */
  fullText: string;
  /**
   * Current route detected
   */
  route: RouteType | null;
  /**
   * Citations collected
   */
  citations: Citation[];
  /**
   * Whether currently streaming
   */
  isStreaming: boolean;
  /**
   * Whether typing animation is active
   */
  isAnimating: boolean;
  /**
   * Error if any
   */
  error: string | null;
  /**
   * Process incoming stream chunk
   */
  processChunk: (chunk: StreamChunk) => void;
  /**
   * Reset state for new message
   */
  reset: () => void;
  /**
   * Skip animation to show full text
   */
  skipToEnd: () => void;
}

/**
 * useStreamingText - Handle streaming text with typing animation
 *
 * Processes stream chunks from ChatService and animates the output.
 * Combines streaming reception with typing animation.
 */
export function useStreamingText(
  options: UseStreamingTextOptions = {}
): UseStreamingTextReturn {
  const { charsPerSecond = 40, animateTyping = true } = options;

  const [fullText, setFullText] = React.useState('');
  const [displayedText, setDisplayedText] = React.useState('');
  const [route, setRoute] = React.useState<RouteType | null>(null);
  const [citations, setCitations] = React.useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Animation state
  const animationFrameRef = React.useRef<number | null>(null);
  const lastUpdateRef = React.useRef(0);
  const targetLengthRef = React.useRef(0);

  const msPerChar = 1000 / charsPerSecond;
  const isAnimating = displayedText.length < fullText.length;

  // Animation loop
  React.useEffect(() => {
    if (!animateTyping) {
      setDisplayedText(fullText);
      return;
    }

    if (displayedText.length >= fullText.length) {
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
      }

      const elapsed = timestamp - lastUpdateRef.current;

      if (elapsed >= msPerChar) {
        const charsToAdd = Math.max(1, Math.floor(elapsed / msPerChar));
        setDisplayedText((prev) => {
          const newLength = Math.min(prev.length + charsToAdd, fullText.length);
          return fullText.slice(0, newLength);
        });
        lastUpdateRef.current = timestamp;
      }

      if (displayedText.length < fullText.length) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fullText, displayedText.length, msPerChar, animateTyping]);

  // Process incoming chunk
  const processChunk = React.useCallback((chunk: StreamChunk) => {
    switch (chunk.type) {
      case 'content':
        if (chunk.content) {
          setFullText((prev) => prev + chunk.content);
          targetLengthRef.current += chunk.content.length;
        }
        if (!isStreaming) setIsStreaming(true);
        break;

      case 'route':
        if (chunk.route) {
          setRoute(chunk.route);
        }
        break;

      case 'citation':
        if (chunk.citation) {
          const newCitation = chunk.citation;
          setCitations((prev) => {
            // Avoid duplicates
            if (prev.find((c) => c.url === newCitation.url)) {
              return prev;
            }
            return [...prev, newCitation];
          });
        }
        break;

      case 'done':
        setIsStreaming(false);
        break;

      case 'error':
        setError(chunk.error || 'Unknown error');
        setIsStreaming(false);
        break;
    }
  }, [isStreaming]);

  // Reset state
  const reset = React.useCallback(() => {
    setFullText('');
    setDisplayedText('');
    setRoute(null);
    setCitations([]);
    setIsStreaming(false);
    setError(null);
    lastUpdateRef.current = 0;
    targetLengthRef.current = 0;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Skip to end
  const skipToEnd = React.useCallback(() => {
    setDisplayedText(fullText);
  }, [fullText]);

  return {
    displayedText,
    fullText,
    route,
    citations,
    isStreaming,
    isAnimating,
    error,
    processChunk,
    reset,
    skipToEnd,
  };
}
