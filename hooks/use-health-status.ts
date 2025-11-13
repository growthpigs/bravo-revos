'use client';

import { useEffect, useState } from 'react';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latency?: number;
}

interface HealthData {
  status: string;
  checks: {
    database: HealthCheck;
    supabase: HealthCheck;
    api: HealthCheck;
    agentkit: HealthCheck;
    mem0: HealthCheck;
    unipile: HealthCheck;
    email: HealthCheck;
    console: HealthCheck;
    cache: HealthCheck;
    queue: HealthCheck;
    cron: HealthCheck;
    webhooks: HealthCheck;
    timestamp: string;
  };
}

export function useHealthStatus(refreshInterval = 30000) {
  const [data, setData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('[Health] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { data, isLoading, refresh: fetchHealth };
}

export function useHealthBannerVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('health-banner-visible');
    if (stored !== null) {
      setIsVisible(stored === 'true');
    }
  }, []);

  const toggle = () => {
    setIsVisible((prev) => {
      const newValue = !prev;
      localStorage.setItem('health-banner-visible', String(newValue));
      return newValue;
    });
  };

  return { isVisible, toggle };
}
