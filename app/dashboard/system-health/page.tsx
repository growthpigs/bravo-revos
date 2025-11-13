'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHealthStatus } from '@/hooks/use-health-status';
import { RefreshCw } from 'lucide-react';

export default function SystemHealthPage() {
  const { data, isLoading, refresh } = useHealthStatus();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600 mt-2">
            Real-time monitoring of system services
          </p>
        </div>
        <Button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overall System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className={`text-4xl ${getStatusColor(data?.status || 'unknown')}`}>
              ●
            </span>
            <div>
              <div className="text-2xl font-bold uppercase">
                {data?.status || 'UNKNOWN'}
              </div>
              <div className="text-sm text-gray-500">
                Last checked: {data ? new Date(data.checks.timestamp).toLocaleString() : 'Never'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ServiceCard
          name="Database"
          status={data?.checks.database.status || 'unknown'}
          latency={data?.checks.database.latency}
        />
        <ServiceCard
          name="Supabase"
          status={data?.checks.supabase.status || 'unknown'}
        />
        <ServiceCard
          name="API"
          status={data?.checks.api.status || 'unknown'}
        />
      </div>

      {/* Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Health status is currently displayed in the top banner of all dashboard pages.
            This feature is temporary for development monitoring.
          </p>
          <Button variant="outline" disabled>
            Toggle Top Banner (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface ServiceCardProps {
  name: string;
  status: string;
  latency?: number;
}

function ServiceCard({ name, status, latency }: ServiceCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getStatusBgColor(status)}`}>
            <span className={`text-lg ${getStatusColor(status)}`}>●</span>
            <span className={`text-sm font-mono font-semibold uppercase ${getStatusColor(status)}`}>
              {status}
            </span>
          </div>
        </div>

        {latency !== undefined && (
          <div className="mt-3 text-xs text-gray-500">
            Response time: {latency}ms
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600';
    case 'degraded':
      return 'text-orange-600';
    case 'unhealthy':
      return 'text-red-600';
    default:
      return 'text-gray-500';
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-50';
    case 'degraded':
      return 'bg-orange-50';
    case 'unhealthy':
      return 'bg-red-50';
    default:
      return 'bg-gray-50';
  }
}
