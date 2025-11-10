import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  total_leads: number;
  total_conversions: number;
  created_at: string;
  document_count?: number;
}

interface CampaignTableViewProps {
  campaigns: Campaign[];
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};

export function CampaignTableView({ campaigns }: CampaignTableViewProps) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Campaign</TableHead>
            <TableHead className="w-16">Status</TableHead>
            <TableHead className="w-16 text-center">Leads</TableHead>
            <TableHead className="w-16 text-center">Conversions</TableHead>
            <TableHead className="w-16 text-center">Documents</TableHead>
            <TableHead className="w-24 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => {
            const createdDate = new Date(campaign.created_at).toLocaleDateString(
              'en-US',
              { month: 'short', day: 'numeric', year: 'numeric' }
            );

            return (
              <TableRow key={campaign.id} className="hover:bg-gray-50">
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{campaign.name}</p>
                    {campaign.description && (
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {campaign.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{createdDate}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[campaign.status]} variant="secondary">
                    {campaign.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <p className="font-semibold text-gray-900">{campaign.total_leads || 0}</p>
                </TableCell>
                <TableCell className="text-center">
                  <p className="font-semibold text-gray-900">
                    {campaign.total_conversions || 0}
                  </p>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={
                      campaign.document_count && campaign.document_count > 0
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : ''
                    }
                  >
                    {campaign.document_count || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Link href={`/dashboard/campaigns/${campaign.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
