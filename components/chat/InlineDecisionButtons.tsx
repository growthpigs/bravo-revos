'use client';

import React from 'react';
import { PlusCircle, List, RefreshCw } from 'lucide-react';

interface DecisionOption {
  label: string;
  value: string;
  description?: string; // WHY this option was suggested (rationale)
  icon?: 'plus' | 'list';
  variant?: 'primary' | 'secondary';
}

interface InlineDecisionButtonsProps {
  workflowId?: string;
  options: DecisionOption[];
  onSelect: (value: string, workflowId?: string) => void;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}

export function InlineDecisionButtons({
  workflowId,
  options,
  onSelect,
  onRegenerate,
  showRegenerate = true,
}: InlineDecisionButtonsProps) {
  const handleClick = (value: string) => {
    onSelect(value, workflowId);
  };

  const getIcon = (iconType?: 'plus' | 'list') => {
    switch (iconType) {
      case 'plus':
        return <PlusCircle className="h-3.5 w-3.5" />;
      case 'list':
        return <List className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-2 items-start">
      {options.map((option) => (
        <div key={option.value} className="flex flex-col gap-0.5">
          <button
            onClick={() => handleClick(option.value)}
            className="flex items-center justify-start gap-1.5 px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-900 bg-white hover:border-gray-900 hover:bg-gray-50 transition-colors text-left"
          >
            {getIcon(option.icon)}
            {option.label}
          </button>
          {option.description && (
            <span className="text-[10px] text-gray-500 ml-3 italic">
              {option.description}
            </span>
          )}
        </div>
      ))}
      {showRegenerate && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center justify-start gap-1.5 px-3 py-1.5 mt-2 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </button>
      )}
    </div>
  );
}
