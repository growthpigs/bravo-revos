/**
 * Health Status Banner - Dense Information Display
 *
 * 3 rows x multiple columns, right-justified, tight padding, 8pt font
 * Shows real-time health status for all services with git info
 */

'use client';

import { useEffect, useState } from 'react';
import { SystemHealthSnapshot, HealthStatus } from '@/lib/health-checks/types';
import { formatDeployTime } from '@/lib/health-checks/client-utils';

interface HealthStatusBannerProps {
  showLogo?: boolean;
  version?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  onStatusClick?: (serviceName: string) => void;
}

export function HealthStatusBanner({
  showLogo = true,
  version = '1.0.0',
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  onStatusClick,
}: HealthStatusBannerProps) {
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch health status
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data: SystemHealthSnapshot = await response.json();
        setSnapshot(data);
        setLastCheckTime(new Date());
      }
    } catch (error) {
      console.error('[Health Banner] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchHealthStatus();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHealthStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Time since last check
  const timeSinceCheck = formatDeployTime(lastCheckTime.toISOString());

  if (isLoading || !snapshot) {
    return (
      <div className="w-full bg-gray-50 border-b border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between">
          {showLogo && (
            <div>
              <div className="text-sm font-semibold">Bravo revOS</div>
              <div className="text-[6pt] text-gray-500">Loading...</div>
            </div>
          )}
          <div className="text-xs text-gray-400">Loading health status...</div>
        </div>
      </div>
    );
  }

  const { services, gitInfo } = snapshot;

  // Get status for a service
  const getService = (name: keyof typeof services) => services[name];

  return (
    <div className="w-full bg-gray-50 border-b border-gray-200 px-6 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Logo + Version */}
        {showLogo && (
          <div>
            <div className="text-sm font-semibold">Bravo revOS</div>
            <div className="text-[6pt] text-gray-500 space-x-2">
              <span>v{version}</span>
              <span>•</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Right: 3-row health status grid */}
        <div className="text-[8pt] space-y-0.5">
          {/* Row 1: Core Services */}
          <div className="flex items-center gap-3">
            <ServiceStatus
              label="Supabase"
              status={getService('supabase').status}
              responseTime={getService('supabase').responseTimeMs}
              onClick={() => onStatusClick?.('supabase')}
            />
            <ServiceStatus
              label="Redis"
              status={getService('redis').status}
              responseTime={getService('redis').responseTimeMs}
              onClick={() => onStatusClick?.('redis')}
            />
            <ServiceStatus
              label="Webhook Worker"
              status={getService('webhookWorker').status}
              responseTime={getService('webhookWorker').responseTimeMs}
              onClick={() => onStatusClick?.('webhook_worker')}
            />
            <ServiceStatus
              label="Engagement Worker"
              status={getService('engagementWorker').status}
              responseTime={getService('engagementWorker').responseTimeMs}
              onClick={() => onStatusClick?.('engagement_worker')}
            />
          </div>

          {/* Row 2: External Services */}
          <div className="flex items-center gap-3">
            <ServiceStatus
              label="UniPile"
              status={getService('unipile').status}
              responseTime={getService('unipile').responseTimeMs}
              onClick={() => onStatusClick?.('unipile')}
            />
            <ServiceStatus
              label="OpenAI"
              status={getService('openai').status}
              responseTime={getService('openai').responseTimeMs}
              onClick={() => onStatusClick?.('openai')}
            />
            <ServiceStatus
              label="Resend"
              status={getService('resend').status}
              responseTime={getService('resend').responseTimeMs}
              onClick={() => onStatusClick?.('resend')}
            />
            <div className="flex items-center gap-1 px-2">
              <span className="text-gray-600">Git:</span>
              <span
                className={`font-mono ${
                  gitInfo.isDirty ? 'text-amber-600' : 'text-gray-900'
                }`}
              >
                {gitInfo.branch}@{gitInfo.commit}
                {gitInfo.isDirty && '*'}
              </span>
            </div>
          </div>

          {/* Row 3: Summary Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2">
              <span className="text-gray-600">Env Vars:</span>
              <span className="text-gray-900">
                {services.environment.diagnostics.totalPresent}/
                {services.environment.diagnostics.totalRequired}
              </span>
            </div>
            <div className="flex items-center gap-1 px-2">
              <span className="text-gray-600">Deploy:</span>
              <span className="text-gray-900">
                {formatDeployTime(gitInfo.deployTimestamp)}
              </span>
            </div>
            <div className="flex items-center gap-1 px-2">
              <span className="text-gray-600">Last Check:</span>
              <span className="text-gray-900">{timeSinceCheck}</span>
            </div>
            <button
              onClick={() => onStatusClick?.('__all__')}
              className="text-blue-600 hover:text-blue-800 underline px-2"
            >
              View Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Single service status indicator
 */
interface ServiceStatusProps {
  label: string;
  status: HealthStatus;
  responseTime: number | null;
  onClick?: () => void;
}

function ServiceStatus({ label, status, responseTime, onClick }: ServiceStatusProps) {
  // Status indicator color
  const getStatusColor = (status: HealthStatus): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-amber-600';
      case 'unhealthy':
        return 'text-red-600';
      case 'unknown':
      default:
        return 'text-gray-400';
    }
  };

  const statusColor = getStatusColor(status);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-0.5 hover:bg-gray-100 rounded cursor-pointer transition-colors"
      title={`${label}: ${status}${responseTime ? ` (${responseTime}ms)` : ''}`}
    >
      <span className={`${statusColor} text-lg leading-none`}>●</span>
      <span className="text-gray-700">{label}:</span>
      <span className={statusColor}>{status}</span>
      {responseTime !== null && (
        <span className="text-gray-400">({responseTime}ms)</span>
      )}
    </button>
  );
}
