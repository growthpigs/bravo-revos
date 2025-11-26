import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  total_leads: number;
  total_conversions: number;
  document_count?: number;
}

interface CampaignCardViewProps {
  campaigns: Campaign[];
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};

export function CampaignCardView({ campaigns }: CampaignCardViewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
          <Card className="hover:shadow-md hover:border-gray-300 transition-all cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base font-semibold line-clamp-2 leading-tight">
                  {campaign.name}
                </CardTitle>
                <Badge className={`${statusColors[campaign.status]} text-xs shrink-0`} variant="secondary">
                  {campaign.status}
                </Badge>
              </div>
              {campaign.description && (
                <CardDescription className="line-clamp-2 text-sm mt-1">
                  {campaign.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span><strong className="text-gray-900">{campaign.total_leads || 0}</strong> leads</span>
                <span><strong className="text-gray-900">{campaign.total_conversions || 0}</strong> conv.</span>
                {(campaign.document_count ?? 0) > 0 && (
                  <span><strong className="text-gray-900">{campaign.document_count}</strong> docs</span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
