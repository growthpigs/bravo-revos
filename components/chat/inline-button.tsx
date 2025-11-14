'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useNavigationAPI } from '@/hooks/use-navigation-api';
import { Loader2 } from 'lucide-react';

export interface InlineButtonProps {
  label: string;
  action?: string; // AgentKit tool to execute
  navigateTo?: string; // Path to navigate
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  disabled?: boolean;
  onAction?: (action: string) => Promise<void> | void; // Callback for action execution
}

export function InlineButton({
  label,
  action,
  navigateTo,
  variant = 'primary',
  disabled = false,
  onAction
}: InlineButtonProps) {
  const navigationAPI = useNavigationAPI();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Execute action if specified
      if (action && onAction) {
        await onAction(action);
      }

      // Navigate if specified
      if (navigateTo) {
        await navigationAPI.navigateTo(
          navigateTo,
          `Opening ${label.toLowerCase()}...`
        );
      }
    } catch (error) {
      console.error('[INLINE_BUTTON_ERROR]', error);
    } finally {
      // Update state after async operations complete
      setIsLoading(false);
    }
  };

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    warning: 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-md',
        'font-medium text-sm',
        'transition-all duration-200 transform',
        'hover:scale-105 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        variantStyles[variant],
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed hover:scale-100'
      )}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

// Container for multiple inline buttons
export function InlineButtonGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {children}
    </div>
  );
}
