'use client';

import { useEffect, useState } from 'react';

interface RateLimitStatus {
  posts: { current: number; max: number; allowed: boolean; percentUsed: number };
  dms: { current: number; max: number; allowed: boolean; percentUsed: number };
}

export function RateLimitStatus() {
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const response = await fetch('/api/rate-limit/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch rate limit status:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !status) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-blue-200 rounded w-32 mb-4"></div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-900 mb-4">Activity Limits</h3>

      <div className="space-y-4">
        {/* Posts Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-800">Posts this week</span>
            <span className="text-sm font-bold text-blue-900">
              {status.posts.current}/{status.posts.max}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                status.posts.allowed ? 'bg-blue-600' : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(status.posts.percentUsed, 100)}%` }}
            />
          </div>
          {!status.posts.allowed && (
            <p className="text-xs text-red-600 mt-1 font-semibold">
              ⚠️ Limit reached. Resets Monday.
            </p>
          )}
        </div>

        {/* DMs Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-800">DMs today</span>
            <span className="text-sm font-bold text-blue-900">
              {status.dms.current}/{status.dms.max}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                status.dms.allowed ? 'bg-blue-600' : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(status.dms.percentUsed, 100)}%` }}
            />
          </div>
          {!status.dms.allowed && (
            <p className="text-xs text-red-600 mt-1 font-semibold">
              ⚠️ Limit reached. Resets tomorrow.
            </p>
          )}
        </div>
      </div>

      {!status.posts.allowed || !status.dms.allowed ? (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          💡 To maintain LinkedIn account health, we enforce safe activity limits.
          Resume activity tomorrow.
        </div>
      ) : null}
    </div>
  );
}
