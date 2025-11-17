'use client';

import React from 'react';
import { PlusCircle, List } from 'lucide-react';

interface DecisionOption {
  label: string;
  value: string;
  icon?: 'plus' | 'list';
  variant?: 'primary' | 'secondary';
}

interface InlineDecisionButtonsProps {
  workflowId?: string;
  options: DecisionOption[];
  onSelect: (value: string, workflowId?: string) => void;
}

export function InlineDecisionButtons({
  workflowId,
  options,
  onSelect,
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
    <div className="flex flex-col gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => handleClick(option.value)}
          className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-900 bg-white hover:border-gray-900 hover:bg-gray-50 transition-colors"
        >
          {getIcon(option.icon)}
          {option.label}
        </button>
      ))}
    </div>
  );
}
