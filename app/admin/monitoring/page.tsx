/**
 * G-01: Real-time Monitoring Dashboard
 * Admin view for system health and engagement metrics
 */

'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { subscribeToMetrics } from '@/lib/monitoring/realtime';
import type { DashboardMetrics, PodMetrics } from '@/lib/monitoring/metrics';

const COLORS = {
  completed: '#10b981',
  failed: '#ef4444',
  pending: '#f59e0b',
};

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Fetch current metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/monitoring/metrics');
        const data = await response.json();

        if (data.status === 'success') {
          setMetrics(data.metrics);
          setError(null);
        } else {
          setError('Failed to fetch metrics');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch historical data
  useEffect(() => {
    const fetchHistorical = async () => {
      try {
        const response = await fetch('/api/monitoring/metrics?action=historical&hours=24');
        const data = await response.json();

        if (data.status === 'success') {
          setHistoricalData(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch historical data:', err);
      }
    };

    fetchHistorical();

    // Refresh every 30 seconds
    const interval = setInterval(fetchHistorical, 30000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToMetrics(() => {
      // Increment counter to trigger re-fetch
      setRefreshCounter((c) => c + 1);
    });

    return () => unsubscribe();
  }, []);

  // Re-fetch metrics when realtime update received
  useEffect(() => {
    if (refreshCounter > 0) {
      const fetchMetrics = async () => {
        try {
          const response = await fetch('/api/monitoring/metrics');
          const data = await response.json();

          if (data.status === 'success') {
            setMetrics(data.metrics);
          }
        } catch (err) {
          console.error('Failed to fetch updated metrics:', err);
        }
      };

      fetchMetrics();
    }
  }, [refreshCounter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading monitoring dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const engagementData = [
    { name: 'Completed', value: metrics.engagement.completedActivities, color: COLORS.completed },
    { name: 'Failed', value: metrics.engagement.failedActivities, color: COLORS.failed },
    { name: 'Pending', value: metrics.engagement.pendingActivities, color: COLORS.pending },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time system and engagement metrics</p>
        <p className="text-xs text-muted-foreground mt-2">
          Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.engagement.totalActivities}</div>
            <p className="text-xs text-muted-foreground">Pod engagement activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.engagement.successRate}%</div>
            <p className="text-xs text-muted-foreground">Activities completed successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {metrics.engagement.pendingActivities}
            </div>
            <p className="text-xs text-muted-foreground">Waiting for execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.engagement.failedActivities}
            </div>
            <p className="text-xs text-muted-foreground">Permanent failures</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Status</CardTitle>
            <CardDescription>Current distribution of engagement activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trend (24h)</CardTitle>
            <CardDescription>Completed and failed activities over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value) => value}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke={COLORS.completed}
                  dot={false}
                  name="Completed"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke={COLORS.failed}
                  dot={false}
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pod Performance */}
      {metrics.pods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pod Performance</CardTitle>
            <CardDescription>Engagement success rate by pod</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.pods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="podName"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
                <Bar dataKey="successRate" fill={COLORS.completed} name="Success Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Status of core system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div>
                <p className="text-sm font-medium">Redis</p>
                <p className="text-xs text-muted-foreground">{metrics.systemHealth.redisStatus}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div>
                <p className="text-sm font-medium">Webhook Worker</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.systemHealth.webhookWorkerStatus}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div>
                <p className="text-sm font-medium">Engagement Worker</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.systemHealth.engagementWorkerStatus}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
