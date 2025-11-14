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
    <div className="flex flex-col gap-1.5">
      <RadioGroup value={selectedId} onValueChange={handleSelect}>
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="flex items-start space-x-2 p-2 border border-gray-300 rounded bg-white cursor-pointer hover:border-gray-900 hover:bg-gray-50 transition-colors"
            onClick={() => handleSelect(campaign.id)}
          >
            <RadioGroupItem value={campaign.id} id={campaign.id} className="mt-0.5" />
            <div className="flex-1">
              <Label
                htmlFor={campaign.id}
                className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-900"
              >
                {campaign.name}
                {selectedId === campaign.id && (
                  <Check className="h-3 w-3 text-gray-900" />
                )}
              </Label>
              {campaign.description && (
                <p className="text-xs text-gray-600 mt-0.5">{campaign.description}</p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
