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
    <div className="flex flex-col gap-3 w-full">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => handleClick(option.value)}
          className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg font-medium transition-all ${
            option.variant === 'primary'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : option.value === 'continue'
              ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              : option.value === 'just_write'
              ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              : 'border border-gray-300 text-gray-900 hover:border-blue-500 hover:bg-blue-50'
          }`}
        >
          {getIcon(option.icon)}
          {option.label}
        </button>
      ))}
    </div>
  );
}
