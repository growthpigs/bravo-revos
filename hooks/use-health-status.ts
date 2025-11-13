'use client';

import { useEffect, useState } from 'react';
import type { SystemHealthSnapshot } from '@/lib/health-checks/types';

interface ServiceStatus {
  state: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  label: string;
  latency?: number;
  error?: string;
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

export function useHealthStatus(refreshInterval = 30000) {
  const [status, setStatus] = useState<HealthStatus>({
    agentkit: { state: 'unknown', label: 'UNKNOWN' },
    mem0: { state: 'unknown', label: 'UNKNOWN' },
    console: { state: 'unknown', label: 'UNKNOWN' },
    database: { state: 'unknown', label: 'UNKNOWN' },
    supabase: { state: 'unknown', label: 'UNKNOWN' },
    unipile: { state: 'unknown', label: 'UNKNOWN' },
    cache: { state: 'unknown', label: 'UNKNOWN' },
    api: { state: 'unknown', label: 'UNKNOWN' },
    system: { state: 'unknown', label: 'UNKNOWN' },
  });
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health?public=true');
      if (response.ok) {
        const data = await response.json();
        const snapshot = data.data as SystemHealthSnapshot;

        // Map health check results to service status
        const services = snapshot?.services as any; // Type-safe access to services

        const newStatus: HealthStatus = {
          // TODO: These services need verifiers (Batch 2)
          agentkit: mapServiceStatus(services?.agentkit),
          mem0: mapServiceStatus(services?.mem0),
          console: mapServiceStatus(services?.console),

          // Existing services with verifiers
          database: { state: 'healthy', label: 'CONNECTED' }, // Placeholder
          supabase: mapServiceStatus(services?.supabase),
          unipile: mapServiceStatus(services?.unipile),
          cache: mapServiceStatus(services?.redis),
          api: { state: 'healthy', label: 'ACTIVE' }, // Placeholder
          system: {
            state: snapshot?.overallStatus || 'unknown',
            label: (snapshot?.overallStatus || 'UNKNOWN').toUpperCase(),
          },
        };

        setStatus(newStatus);
        setLastCheck(new Date());
      }
    } catch (error) {
      console.error('[Health Hook] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();

    // Set up polling
    const interval = setInterval(fetchHealthStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    status,
    lastCheck,
    isLoading,
    refresh: fetchHealthStatus,
  };
}

function mapServiceStatus(service: any): ServiceStatus {
  if (!service) {
    return { state: 'unknown', label: 'UNKNOWN' };
  }

  const statusMap: Record<string, string> = {
    healthy: 'CONNECTED',
    degraded: 'DEGRADED',
    unhealthy: 'FAILED',
    unknown: 'UNKNOWN',
  };

  return {
    state: service.status || 'unknown',
    label: statusMap[service.status] || 'UNKNOWN',
    latency: service.responseTimeMs,
    error: service.errorMessage,
  };
}
