import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, TrendingUp, Users2, FileText } from 'lucide-react';
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="hover:shadow-lg transition-shadow flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Megaphone className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <CardTitle className="text-lg line-clamp-1">{campaign.name}</CardTitle>
              </div>
              <Badge className={statusColors[campaign.status]} variant="secondary">
                {campaign.status}
              </Badge>
            </div>
            {campaign.description && (
              <CardDescription className="line-clamp-2">
                {campaign.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <Users2 className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">
                  {campaign.total_leads || 0}
                </p>
                <p className="text-xs text-gray-600">Leads</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">
                  {campaign.total_conversions || 0}
                </p>
                <p className="text-xs text-gray-600">Conv.</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-900">
                  {campaign.document_count || 0}
                </p>
                <p className="text-xs text-blue-600">Docs</p>
              </div>
            </div>
            <Link href={`/dashboard/campaigns/${campaign.id}`} className="mt-auto">
              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
