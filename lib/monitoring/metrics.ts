/**
 * G-01: Real-time Monitoring Metrics
 * Calculates and tracks system health and engagement metrics
 */

import { createClient } from '@/lib/supabase/server';

const LOG_PREFIX = '[MONITORING_METRICS]';

export interface EngagementMetrics {
  totalActivities: number;
  pendingActivities: number;
  completedActivities: number;
  failedActivities: number;
  successRate: number; // percentage
  averageExecutionTime: number; // milliseconds
}

export interface PodMetrics {
  podId: string;
  podName: string;
  totalMembers: number;
  activitiesScheduled: number;
  activitiesCompleted: number;
  activitiesFailed: number;
  successRate: number;
}

export interface SystemHealth {
  redisStatus: 'healthy' | 'unhealthy' | 'unknown';
  webhookWorkerStatus: 'running' | 'stopped' | 'unknown';
  engagementWorkerStatus: 'running' | 'stopped' | 'unknown';
  lastHealthCheck: string; // ISO timestamp
}

export interface DashboardMetrics {
  engagement: EngagementMetrics;
  pods: PodMetrics[];
  systemHealth: SystemHealth;
  timestamp: string;
}

/**
 * Calculate engagement metrics from database
 */
export async function getEngagementMetrics(): Promise<EngagementMetrics> {
  try {
    const supabase = await createClient();

    // Get activity counts by status
    const { data: activities, error } = await supabase
      .from('pod_activity')
      .select('id, status, executed_at, created_at');

    if (error) {
      console.error(`${LOG_PREFIX} Error fetching activities:`, error);
      throw error;
    }

    const activities_list = activities || [];
    const totalActivities = activities_list.length;
    const pendingActivities = activities_list.filter((a) => a.status === 'pending').length;
    const completedActivities = activities_list.filter((a) => a.status === 'completed').length;
    const failedActivities = activities_list.filter((a) => a.status === 'failed').length;

    const successRate =
      totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

    // Calculate average execution time
    let totalExecutionTime = 0;
    let executedCount = 0;

    for (const activity of activities_list) {
      if (activity.executed_at && activity.created_at) {
        const created = new Date(activity.created_at).getTime();
        const executed = new Date(activity.executed_at).getTime();
        totalExecutionTime += executed - created;
        executedCount++;
      }
    }

    const averageExecutionTime = executedCount > 0 ? totalExecutionTime / executedCount : 0;

    return {
      totalActivities,
      pendingActivities,
      completedActivities,
      failedActivities,
      successRate,
      averageExecutionTime,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error calculating metrics:`, error);
    return {
      totalActivities: 0,
      pendingActivities: 0,
      completedActivities: 0,
      failedActivities: 0,
      successRate: 0,
      averageExecutionTime: 0,
    };
  }
}

/**
 * Get metrics for all pods
 */
export async function getPodMetrics(): Promise<PodMetrics[]> {
  try {
    const supabase = await createClient();

    // Get all pods with member counts and activity stats
    const { data: pods, error: podsError } = await supabase
      .from('pod')
      .select(
        `
        id,
        name,
        pod_members(id),
        pod_activities(id, status)
      `
      );

    if (podsError) {
      console.error(`${LOG_PREFIX} Error fetching pods:`, podsError);
      return [];
    }

    return (pods || []).map((pod: any) => {
      const totalMembers = pod.pod_members?.length || 0;
      const activities = pod.pod_activities || [];
      const activitiesScheduled = activities.length;
      const activitiesCompleted = activities.filter((a: any) => a.status === 'completed').length;
      const activitiesFailed = activities.filter((a: any) => a.status === 'failed').length;
      const successRate =
        activitiesScheduled > 0
          ? Math.round((activitiesCompleted / activitiesScheduled) * 100)
          : 0;

      return {
        podId: pod.id,
        podName: pod.name || 'Unnamed Pod',
        totalMembers,
        activitiesScheduled,
        activitiesCompleted,
        activitiesFailed,
        successRate,
      };
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error calculating pod metrics:`, error);
    return [];
  }
}

/**
 * Get system health status
 * Note: Actual health checks would ping services
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  return {
    redisStatus: 'unknown', // Would check Redis connection
    webhookWorkerStatus: 'unknown', // Would check process
    engagementWorkerStatus: 'unknown', // Would check process
    lastHealthCheck: new Date().toISOString(),
  };
}

/**
 * Get complete dashboard metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [engagement, pods, systemHealth] = await Promise.all([
    getEngagementMetrics(),
    getPodMetrics(),
    getSystemHealth(),
  ]);

  return {
    engagement,
    pods,
    systemHealth,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get historical metrics over time (for charting)
 */
export async function getHistoricalMetrics(
  hours: number = 24
): Promise<Array<{ timestamp: string; completed: number; failed: number; pending: number }>> {
  try {
    const supabase = await createClient();

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data: activities, error } = await supabase
      .from('pod_activity')
      .select('id, status, executed_at')
      .gte('executed_at', since.toISOString());

    if (error) {
      console.error(`${LOG_PREFIX} Error fetching historical data:`, error);
      return [];
    }

    // Group by hour
    const metricsMap = new Map<string, { completed: number; failed: number; pending: number }>();

    for (const activity of activities || []) {
      if (activity.executed_at) {
        const date = new Date(activity.executed_at);
        const hour = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
        const key = hour.toISOString();

        if (!metricsMap.has(key)) {
          metricsMap.set(key, { completed: 0, failed: 0, pending: 0 });
        }

        const metrics = metricsMap.get(key)!;
        if (activity.status === 'completed') metrics.completed++;
        else if (activity.status === 'failed') metrics.failed++;
        else metrics.pending++;
      }
    }

    // Convert to sorted array
    return Array.from(metricsMap.entries())
      .map(([timestamp, metrics]) => ({
        timestamp,
        ...metrics,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting historical metrics:`, error);
    return [];
  }
}
