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
        return <PlusCircle className="h-5 w-5 mr-2" />;
      case 'list':
        return <List className="h-5 w-5 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2 max-w-md">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => handleClick(option.value)}
          className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm transition-all ${
            option.variant === 'primary'
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
              : 'bg-white border-2 border-gray-300 text-gray-900 hover:border-blue-500 hover:bg-gray-50'
          }`}
        >
          {getIcon(option.icon)}
          {option.label}
        </button>
      ))}
    </div>
  );
}
