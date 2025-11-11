'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SlashCommand, searchCommands } from '@/lib/slash-commands';
import { Command } from 'lucide-react';

interface SlashCommandAutocompleteProps {
  visible: boolean;
  query: string; // Text after "/" (e.g., "write", "pod")
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export function SlashCommandAutocomplete({
  visible,
  query,
  onSelect,
  onClose,
  position,
}: SlashCommandAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredCommands = searchCommands(query);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, selectedIndex, filteredCommands, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current && visible) {
      const selectedElement = containerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex, visible]);

  if (!visible || filteredCommands.length === 0) {
    return null;
  }

  // Group commands by category
  const groupedCommands: Record<string, SlashCommand[]> = {};
  filteredCommands.forEach((cmd) => {
    if (!groupedCommands[cmd.category]) {
      groupedCommands[cmd.category] = [];
    }
    groupedCommands[cmd.category].push(cmd);
  });

  const categoryLabels = {
    content: '📝 Content',
    campaign: '🎯 Campaign',
    pod: '👥 Pod',
    utility: '⚙️ Utility',
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-[60] bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-96 max-h-80 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-3 py-2 flex items-center gap-2">
        <Command className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500">
          {filteredCommands.length === 0
            ? 'No commands found'
            : `${filteredCommands.length} command${filteredCommands.length === 1 ? '' : 's'}`}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          ↑↓ Navigate · Enter Select · Esc Close
        </span>
      </div>

      {/* Command List - Grouped by Category */}
      <div className="p-2">
        {Object.entries(groupedCommands).map(([category, commands]) => (
          <div key={category} className="mb-3 last:mb-0">
            {/* Category Label */}
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </div>

            {/* Commands in this category */}
            {commands.map((command) => {
              const globalIndex = filteredCommands.indexOf(command);
              const isSelected = globalIndex === selectedIndex;

              return (
                <button
                  key={command.name}
                  data-index={globalIndex}
                  onClick={() => onSelect(command)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {command.icon}
                    </span>

                    {/* Command Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`font-mono font-semibold text-sm ${
                            isSelected ? 'text-blue-700' : 'text-gray-900'
                          }`}
                        >
                          /{command.name}
                        </span>
                        {command.args && (
                          <span className="text-xs text-gray-500 font-mono">
                            {command.args}
                          </span>
                        )}
                        {command.aliases && command.aliases.length > 0 && (
                          <span className="text-xs text-gray-400">
                            ({command.aliases.join(', ')})
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs mt-0.5 ${
                          isSelected ? 'text-blue-600' : 'text-gray-500'
                        }`}
                      >
                        {command.description}
                      </p>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0 text-blue-500">
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Hint */}
      {query === '' && (
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-3 py-2">
          <p className="text-xs text-gray-500">
            💡 <strong>Tip:</strong> Type to filter commands, or use arrow keys
            to navigate.
          </p>
        </div>
      )}
    </div>
  );
}
