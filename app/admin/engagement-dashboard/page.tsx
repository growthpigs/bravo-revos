'use client';

import { useState, useEffect } from 'react';

interface WorkerHealth {
  healthy: boolean;
  status: string;
  timestamp: string;
  error?: string;
}

interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
}

interface StatusResponse {
  success: boolean;
  worker: WorkerHealth;
  queue: QueueStats;
  timestamp: string;
  error?: string;
}

export default function EngagementDashboard() {
  const [podId, setPodId] = useState('test-pod-123');
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobCreating, setJobCreating] = useState(false);
  const [jobMessage, setJobMessage] = useState<string | null>(null);

  // Fetch status
  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/pods/${encodeURIComponent(podId)}/engagement/status`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setStatus(data);
      } else {
        setError(data.error || 'Failed to fetch status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching status');
    } finally {
      setLoading(false);
    }
  };

  // Create a like job
  const createLikeJob = async () => {
    setJobCreating(true);
    setJobMessage(null);
    try {
      const url = `/api/pods/${encodeURIComponent(podId)}/engagement/jobs`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementType: 'like',
          postId: 'post-12345',
          profileId: 'profile-67890',
          scheduledFor: new Date().toISOString(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setJobMessage(`✅ Like job created (ID: ${data.jobId})`);
        // Refresh status
        setTimeout(() => fetchStatus(), 500);
      } else {
        setJobMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setJobMessage(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setJobCreating(false);
    }
  };

  // Create a comment job
  const createCommentJob = async () => {
    setJobCreating(true);
    setJobMessage(null);
    try {
      const url = `/api/pods/${encodeURIComponent(podId)}/engagement/jobs`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementType: 'comment',
          postId: 'post-12345',
          profileId: 'profile-67890',
          commentText: 'Great post! Love the insights here.',
          scheduledFor: new Date().toISOString(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setJobMessage(`✅ Comment job created (ID: ${data.jobId})`);
        // Refresh status
        setTimeout(() => fetchStatus(), 500);
      } else {
        setJobMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setJobMessage(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setJobCreating(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [podId]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h1>🚀 E-05-1 Pod Engagement Worker Dashboard</h1>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Pod ID:{' '}
          <input
            type="text"
            value={podId}
            onChange={(e) => setPodId(e.target.value)}
            style={{ padding: '5px', width: '300px' }}
          />
        </label>
        <button
          onClick={fetchStatus}
          disabled={loading}
          style={{ padding: '8px 16px', marginLeft: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Loading...' : 'Refresh Status'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
          ❌ Error: {error}
        </div>
      )}

      {status && (
        <div>
          {/* Worker Health */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
            <h2>Worker Status</h2>
            <p>
              <strong>Health:</strong>{' '}
              <span style={{ color: status.worker.healthy ? 'green' : 'red' }}>
                {status.worker.healthy ? '✅ Healthy' : '❌ Unhealthy'}
              </span>
            </p>
            <p>
              <strong>Status:</strong> {status.worker.status}
            </p>
            <p>
              <strong>Timestamp:</strong> {status.worker.timestamp}
            </p>
            {status.worker.error && (
              <p style={{ color: 'red' }}>
                <strong>Error:</strong> {status.worker.error}
              </p>
            )}
          </div>

          {/* Queue Statistics */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
            <h2>Queue Statistics</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Metric</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>Waiting</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    <strong>{status.queue.waiting}</strong>
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f9f9f9' }}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>Active</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    <strong style={{ color: status.queue.active > 0 ? 'blue' : 'gray' }}>
                      {status.queue.active}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>Delayed</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    <strong>{status.queue.delayed}</strong>
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f9f9f9' }}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>Completed</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    <strong style={{ color: 'green' }}>{status.queue.completed}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>Failed</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    <strong style={{ color: status.queue.failed > 0 ? 'red' : 'gray' }}>
                      {status.queue.failed}
                    </strong>
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>Total</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    {status.queue.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Create Jobs */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
            <h2>Create Test Jobs</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                onClick={createLikeJob}
                disabled={jobCreating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: jobCreating ? 'not-allowed' : 'pointer',
                }}
              >
                {jobCreating ? '⏳ Creating...' : '👍 Create Like Job'}
              </button>
              <button
                onClick={createCommentJob}
                disabled={jobCreating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: jobCreating ? 'not-allowed' : 'pointer',
                }}
              >
                {jobCreating ? '⏳ Creating...' : '💬 Create Comment Job'}
              </button>
            </div>
            {jobMessage && (
              <div
                style={{
                  padding: '10px',
                  backgroundColor: jobMessage.includes('✅') ? '#d4edda' : '#f8d7da',
                  color: jobMessage.includes('✅') ? 'green' : 'red',
                  borderRadius: '4px',
                }}
              >
                {jobMessage}
              </div>
            )}
          </div>

          {/* Last Updated */}
          <div style={{ fontSize: '12px', color: '#666' }}>
            Last updated: {status.timestamp} (auto-refreshes every 5 seconds)
          </div>
        </div>
      )}
    </div>
  );
}
