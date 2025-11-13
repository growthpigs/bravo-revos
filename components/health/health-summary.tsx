'use client';

import React from 'react';

interface ServiceStatus {
  state: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  label: string;
}

interface HealthStatus {
  agentkit: ServiceStatus;
  mem0: ServiceStatus;
  console: ServiceStatus;
  database: ServiceStatus;
  supabase: ServiceStatus;
  unipile: ServiceStatus;
  cache: ServiceStatus;
  api: ServiceStatus;
  system: ServiceStatus;
}

interface HealthSummaryProps {
  status: HealthStatus;
  onStatusClick?: (serviceName: string) => void;
}

export function HealthSummary({ status, onStatusClick }: HealthSummaryProps) {
  const columns: Array<Array<{ key: keyof HealthStatus; label: string }>> = [
    [
      { key: 'agentkit', label: 'AGENTKIT' },
      { key: 'mem0', label: 'MEM0' },
      { key: 'console', label: 'CONSOLE' },
    ],
    [
      { key: 'database', label: 'DATABASE' },
      { key: 'supabase', label: 'SUPABASE' },
      { key: 'unipile', label: 'UNIPILE' },
    ],
    [
      { key: 'cache', label: 'CACHE' },
      { key: 'api', label: 'API' },
      { key: 'system', label: 'SYSTEM' },
    ],
  ];

  return (
    <div className="flex items-start gap-4 font-mono text-[8pt] uppercase leading-tight">
      {columns.map((column, colIndex) => (
        <React.Fragment key={colIndex}>
          {colIndex > 0 && (
            <div className="w-px bg-gray-300 self-stretch my-1" />
          )}
          <div className="space-y-1">
            {column.map(({ key, label }) => (
              <StatusItem
                key={key}
                label={label}
                status={status[key]}
                onClick={() => onStatusClick?.(key)}
              />
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

interface StatusItemProps {
  label: string;
  status: ServiceStatus;
  onClick?: () => void;
}

function StatusItem({ label, status, onClick }: StatusItemProps) {
  const color = getStatusColor(status.state);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 hover:opacity-70 transition-opacity text-left"
      title={`Click for ${label} details`}
    >
      <span className="text-gray-400">{label}:</span>
      <span className={color}>●</span>
      <span className={color}>{status.label}</span>
    </button>
  );
}

function getStatusColor(state: string): string {
  switch (state) {
    case 'healthy':
      return 'text-green-500';
    case 'degraded':
      return 'text-orange-500';
    case 'unhealthy':
      return 'text-red-500';
    default:
      return 'text-gray-400';
  }
}
