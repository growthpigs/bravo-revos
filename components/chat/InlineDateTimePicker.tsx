'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface InlineDateTimePickerProps {
  initialDatetime?: string;
  workflowId?: string;
  campaignId?: string;
  content?: string;
  onSelect: (datetime: string, workflowId?: string, campaignId?: string, content?: string) => void;
}

export function InlineDateTimePicker({
  initialDatetime,
  workflowId,
  campaignId,
  content,
  onSelect,
}: InlineDateTimePickerProps) {
  const [selectedDatetime, setSelectedDatetime] = useState<string>(
    initialDatetime || ''
  );

  const handleConfirm = () => {
    if (selectedDatetime) {
      onSelect(selectedDatetime, workflowId, campaignId, content);
    }
  };

  // Format datetime for display
  const formatDatetime = (datetimeStr: string) => {
    if (!datetimeStr) return '';
    const date = new Date(datetimeStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-gray-700">
        <Calendar className="h-3 w-3" />
        <span className="font-medium">Select date and time</span>
      </div>

      <input
        type="datetime-local"
        value={selectedDatetime}
        onChange={(e) => setSelectedDatetime(e.target.value)}
        className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-gray-900 bg-white"
      />

      {selectedDatetime && (
        <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-300">
          <span className="font-medium">Selected:</span> {formatDatetime(selectedDatetime)}
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!selectedDatetime}
        className={`w-full px-3 py-1 border rounded text-xs font-medium transition-colors ${
          selectedDatetime
            ? 'border-gray-300 bg-white text-gray-900 hover:border-gray-900 hover:bg-gray-50'
            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        Confirm Schedule
      </button>
    </div>
  );
}
