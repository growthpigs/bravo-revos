/**
 * Pod Engagement Worker Status API
 * GET endpoint for monitoring E-05-1 job consumer health
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEngagementWorkerHealth, getEngagementQueueStats } from '@/lib/queues/pod-engagement-worker';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const podId = params.id;

    // Get worker health and queue stats
    const health = await getEngagementWorkerHealth();
    const queueStats = await getEngagementQueueStats();

    return NextResponse.json({
      success: true,
      podId,
      worker: {
        healthy: health.healthy,
        status: health.status,
        timestamp: health.timestamp,
        error: health.error,
      },
      queue: {
        waiting: queueStats.waiting,
        active: queueStats.active,
        delayed: queueStats.delayed,
        completed: queueStats.completed,
        failed: queueStats.failed,
        total: queueStats.total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[POD_ENGAGEMENT_API] Error fetching status:', error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
