'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface QueueStatus {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
}

interface PodStats {
  totalActivities: number;
  pendingActivities: number;
  scheduledActivities: number;
  executedActivities: number;
  failedActivities: number;
}

interface DashboardData {
  success: boolean;
  timestamp: string;
  pod: {
    id: string;
    name: string;
    status: string;
  };
  queue: QueueStatus;
  stats: PodStats;
  pending: {
    activities: number;
    likeCount: number;
    commentCount: number;
  };
}

interface ActionResult {
  success: boolean;
  timestamp: string;
  action: string;
  result: {
    jobId: string;
    scheduledCount: number;
    message: string;
  };
  duration: string;
  queue: QueueStatus;
  stats: PodStats;
}

export default function AutomationDashboard() {
  const searchParams = useSearchParams();
  const podId = searchParams.get('podId') || 'test-pod-123';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastAction, setLastAction] = useState<ActionResult | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/pods/${podId}/automation/status`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch status');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const triggerAction = async (action: 'schedule-likes' | 'schedule-comments') => {
    try {
      setActionLoading(true);
      setError(null);
      const response = await fetch(`/api/pods/${podId}/automation/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Action failed');
      }

      setLastAction(result);
      setData(prev => prev ? { ...prev, queue: result.queue, stats: result.stats } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, [podId]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pod Automation Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time monitoring and control of E-04 pod automation</p>
        </div>

        {/* Pod Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pod Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Pod ID</p>
              <p className="font-mono text-lg text-gray-900">{podId}</p>
            </div>
            {data && (
              <>
                <div>
                  <p className="text-sm text-gray-600">Pod Name</p>
                  <p className="font-lg text-gray-900">{data.pod.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pod Status</p>
                  <p className="font-lg text-gray-900 capitalize">{data.pod.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-mono text-sm text-gray-900">
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pending Activities */}
        {data && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Activities</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-2xl font-bold text-blue-600">{data.pending.activities}</p>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <p className="text-sm text-gray-600">Pending Likes</p>
                <p className="text-2xl font-bold text-green-600">{data.pending.likeCount}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <p className="text-sm text-gray-600">Pending Comments</p>
                <p className="text-2xl font-bold text-purple-600">{data.pending.commentCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Queue Status */}
        {data && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Queue Status</h2>
            <div className="grid grid-cols-5 gap-4">
              <div className="border-l-4 border-yellow-400 pl-4">
                <p className="text-sm text-gray-600">Waiting</p>
                <p className="text-xl font-bold text-gray-900">{data.queue.waiting}</p>
              </div>
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-bold text-gray-900">{data.queue.active}</p>
              </div>
              <div className="border-l-4 border-orange-400 pl-4">
                <p className="text-sm text-gray-600">Delayed</p>
                <p className="text-xl font-bold text-gray-900">{data.queue.delayed}</p>
              </div>
              <div className="border-l-4 border-green-400 pl-4">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xl font-bold text-gray-900">{data.queue.completed}</p>
              </div>
              <div className="border-l-4 border-red-400 pl-4">
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-xl font-bold text-gray-900">{data.queue.failed}</p>
              </div>
            </div>
          </div>
        )}

        {/* Activity Statistics */}
        {data && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Statistics</h2>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{data.stats.totalActivities}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{data.stats.pendingActivities}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{data.stats.scheduledActivities}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Executed</p>
                <p className="text-2xl font-bold text-green-600">{data.stats.executedActivities}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{data.stats.failedActivities}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={() => triggerAction('schedule-likes')}
              disabled={actionLoading}
              className="px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Schedule Likes'}
            </button>
            <button
              onClick={() => triggerAction('schedule-comments')}
              disabled={actionLoading}
              className="px-6 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Schedule Comments'}
            </button>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
        </div>

        {/* Last Action Result */}
        {lastAction && (
          <div className={`rounded-lg shadow p-6 mb-6 ${lastAction.success ? 'bg-green-50 border-l-4 border-green-600' : 'bg-red-50 border-l-4 border-red-600'}`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Last Action Result</h2>
            <div className="space-y-2">
              <p>
                <span className="text-sm text-gray-600">Action:</span>
                <span className="ml-2 font-mono text-gray-900">{lastAction.action}</span>
              </p>
              <p>
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`ml-2 font-semibold ${lastAction.success ? 'text-green-600' : 'text-red-600'}`}>
                  {lastAction.success ? 'SUCCESS' : 'FAILED'}
                </span>
              </p>
              {lastAction.success && (
                <>
                  <p>
                    <span className="text-sm text-gray-600">Job ID:</span>
                    <span className="ml-2 font-mono text-gray-900">{lastAction.result.jobId}</span>
                  </p>
                  <p>
                    <span className="text-sm text-gray-600">Scheduled Count:</span>
                    <span className="ml-2 font-bold text-gray-900">{lastAction.result.scheduledCount}</span>
                  </p>
                  <p>
                    <span className="text-sm text-gray-600">Message:</span>
                    <span className="ml-2 text-gray-900">{lastAction.result.message}</span>
                  </p>
                  <p>
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="ml-2 font-mono text-gray-900">{lastAction.duration}</span>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700 font-mono text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
