'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHealthStatus } from '@/hooks/use-health-status';
import { RefreshCw } from 'lucide-react';

export default function SystemHealthPage() {
  const { status, lastCheck, isLoading, refresh } = useHealthStatus();

  const services = [
    { key: 'agentkit' as const, name: 'AgentKit', description: 'AI orchestration engine' },
    { key: 'mem0' as const, name: 'Mem0', description: 'Persistent memory system' },
    { key: 'console' as const, name: 'Console', description: 'Database-driven console' },
    { key: 'database' as const, name: 'Database', description: 'Primary database connection' },
    { key: 'supabase' as const, name: 'Supabase', description: 'Backend infrastructure' },
    { key: 'unipile' as const, name: 'UniPile', description: 'LinkedIn integration' },
    { key: 'cache' as const, name: 'Cache', description: 'Redis cache layer' },
    { key: 'api' as const, name: 'API', description: 'REST API endpoints' },
    { key: 'system' as const, name: 'System', description: 'Overall system health' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600 mt-2">
            Real-time monitoring of all system services
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

      {/* Last Check Time */}
      <div className="mb-6 text-sm text-gray-500">
        Last checked: {lastCheck.toLocaleTimeString()}
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {services.map((service) => (
          <ServiceCard
            key={service.key}
            name={service.name}
            description={service.description}
            status={status[service.key]}
          />
        ))}
      </div>

      {/* Detailed Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Health Check Configuration</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Polling interval: 30 seconds</li>
                <li>• Cache TTL: 5 minutes</li>
                <li>• Rate limit: 30 req/min (public), 60 req/min (auth)</li>
                <li>• Verification sources: env vars, endpoints, code checks</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">System Status</h3>
              <p className="text-sm text-gray-600">
                All services are being monitored in real-time. Click the refresh button
                to trigger a fresh health check (bypasses cache).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ServiceCardProps {
  name: string;
  description: string;
  status: {
    state: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    label: string;
    latency?: number;
    error?: string;
  };
}

function ServiceCard({ name, description, status }: ServiceCardProps) {
  const color = getStatusColor(status.state);
  const bgColor = getStatusBgColor(status.state);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor}`}>
            <span className={`text-lg ${color}`}>●</span>
            <span className={`text-sm font-mono font-semibold uppercase ${color}`}>
              {status.label}
            </span>
          </div>
        </div>

        {status.latency !== undefined && status.latency !== null && (
          <div className="mt-3 text-xs text-gray-500">
            Response time: {status.latency}ms
          </div>
        )}

        {status.error && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
            {status.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getStatusColor(state: string): string {
  switch (state) {
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

function getStatusBgColor(state: string): string {
  switch (state) {
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
