/**
 * G-01: Real-time Monitoring Dashboard
 * Admin view for system health and engagement metrics
 *
 * UPDATED: Integrated REAL health check system with multi-source verification
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
import { HealthStatusBanner } from '@/components/health/health-status-banner';
import { DiagnosticModal } from '@/components/health/diagnostic-modal';

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

  // Health check modal state
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0.0');

  // Get app version from API (server-side only)
  useEffect(() => {
    fetch('/api/system/version')
      .then(r => r.json())
      .then(data => setAppVersion(data.version))
      .catch(error => {
        console.error('[Monitoring] Failed to fetch version:', error);
        setAppVersion('1.0.0'); // Fallback
      });
  }, []);

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

  // Handle service status click
  const handleStatusClick = (serviceName: string) => {
    setSelectedService(serviceName);
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Health Status Banner - Top of page */}
      <HealthStatusBanner
        showLogo={true}
        version={appVersion}
        autoRefresh={true}
        refreshInterval={30000}
        onStatusClick={handleStatusClick}
      />

      {/* Diagnostic Modal */}
      <DiagnosticModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        serviceName={selectedService}
      />

      <div className="space-y-5 p-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time system and engagement metrics</p>
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date(metrics.timestamp).toLocaleString()}
            </p>
            <p className="text-base font-semibold">v{appVersion}</p>
          </div>
        </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="py-2">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-medium">Total Activities</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-xl font-bold">{metrics.engagement.totalActivities}</div>
            <p className="text-xs text-muted-foreground">Pod engagement activities</p>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-xl font-bold">{metrics.engagement.successRate}%</div>
            <p className="text-xs text-muted-foreground">Activities completed successfully</p>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-xl font-bold text-amber-600">
              {metrics.engagement.pendingActivities}
            </div>
            <p className="text-xs text-muted-foreground">Waiting for execution</p>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-xl font-bold text-red-600">
              {metrics.engagement.failedActivities}
            </div>
            <p className="text-xs text-muted-foreground">Permanent failures</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Activity Status Distribution */}
        <Card className="py-3">
          <CardHeader className="py-2 pb-2">
            <CardTitle className="text-base">Activity Status</CardTitle>
            <CardDescription className="text-xs">Current distribution of engagement activities</CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={64}
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
        <Card className="py-3">
          <CardHeader className="py-2 pb-2">
            <CardTitle className="text-base">Engagement Trend (24h)</CardTitle>
            <CardDescription className="text-xs">Completed and failed activities over time</CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <ResponsiveContainer width="100%" height={240}>
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
        <Card className="py-3">
          <CardHeader className="py-2 pb-2">
            <CardTitle className="text-base">Pod Performance</CardTitle>
            <CardDescription className="text-xs">Engagement success rate by pod</CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metrics.pods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="podName"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
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

      {/* System Health - Now handled by HealthStatusBanner at top */}
      {/* Old hardcoded health section removed - replaced with REAL multi-source verification */}
      </div>
    </>
  );
}
