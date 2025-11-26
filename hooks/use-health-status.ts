'use client';

import { useEffect, useState } from 'react';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disabled' | 'unknown';
  latency?: number;
  message?: string;
  error?: string;
}

interface HealthData {
  status: string;
  checks: {
    // Critical
    database: HealthCheck;
    supabase: HealthCheck;
    // API & AI
    api: HealthCheck;
    agentkit: HealthCheck;
    // Memory & Integrations
    mem0: HealthCheck;
    unipile: HealthCheck;
    // Console & Cache
    console: HealthCheck;
    cache: HealthCheck;
    // Queue & Cron
    queue: HealthCheck;
    cron: HealthCheck;
    // External
    webhooks: HealthCheck;
    email: HealthCheck;
    // Meta
    timestamp: string;
  };
}

// Default state when health API hasn't responded yet
const DEFAULT_HEALTH_DATA: HealthData = {
  status: 'unknown',
  checks: {
    database: { status: 'unknown' },
    supabase: { status: 'unknown' },
    api: { status: 'unknown' },
    agentkit: { status: 'unknown' },
    mem0: { status: 'unknown' },
    unipile: { status: 'unknown' },
    console: { status: 'unknown' },
    cache: { status: 'unknown' },
    queue: { status: 'unknown' },
    cron: { status: 'unknown' },
    webhooks: { status: 'unknown' },
    email: { status: 'unknown' },
    timestamp: new Date().toISOString(),
  },
};

export function useHealthStatus(refreshInterval = 30000) {
  // Initialize with default data so indicators always show
  const [data, setData] = useState<HealthData>(DEFAULT_HEALTH_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch('/api/health', {
        signal: controller.signal,
        credentials: 'include', // Include cookies for Vercel auth
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        setData(result);
        setError(null);
      } else {
        console.warn('[Health] API returned non-OK status:', response.status);
        setError(`HTTP ${response.status}`);
        // Keep showing last known data or defaults
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Health] Failed to fetch:', message);
      setError(message);
      // Keep showing last known data or defaults
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { data, isLoading, error, refresh: fetchHealth };
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
