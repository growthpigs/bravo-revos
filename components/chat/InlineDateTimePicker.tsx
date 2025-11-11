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
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3 max-w-md">
      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
        <Calendar className="h-4 w-4" />
        <span className="font-medium">Select date and time</span>
      </div>

      <input
        type="datetime-local"
        value={selectedDatetime}
        onChange={(e) => setSelectedDatetime(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {selectedDatetime && (
        <div className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
          <span className="font-medium">Selected:</span> {formatDatetime(selectedDatetime)}
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!selectedDatetime}
        className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          selectedDatetime
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        Confirm Schedule
      </button>
    </div>
  );
}
