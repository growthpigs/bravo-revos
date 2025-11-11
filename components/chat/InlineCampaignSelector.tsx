'use client';

import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
}

interface InlineCampaignSelectorProps {
  campaigns: Campaign[];
  workflowId?: string;
  onSelect: (campaignId: string, workflowId?: string) => void;
}

export function InlineCampaignSelector({
  campaigns,
  workflowId,
  onSelect,
}: InlineCampaignSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>('');

  const handleSelect = (campaignId: string) => {
    setSelectedId(campaignId);
    // Small delay for visual feedback before auto-submit
    setTimeout(() => {
      onSelect(campaignId, workflowId);
    }, 300);
  };

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2 max-w-md">
      <RadioGroup value={selectedId} onValueChange={handleSelect}>
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
              selectedId === campaign.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => handleSelect(campaign.id)}
          >
            <RadioGroupItem value={campaign.id} id={campaign.id} className="mt-0.5" />
            <div className="flex-1">
              <Label
                htmlFor={campaign.id}
                className="flex items-center gap-2 cursor-pointer font-medium text-gray-900"
              >
                {campaign.name}
                {selectedId === campaign.id && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </Label>
              {campaign.description && (
                <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
