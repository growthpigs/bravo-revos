/**
 * POST/GET /api/pod-automation
 * Manage pod engagement automation: schedule likes/comments, get status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  scheduleLikeJobs,
  scheduleCommentJobs,
  getAutomationQueueStatus,
  getPodAutomationStats,
} from '@/lib/queues/pod-automation-queue';

/**
 * POST - Manually trigger engagement scheduling for a pod
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, podId } = body;

    // Manually trigger like scheduling
    if (action === 'schedule-likes') {
      if (!podId) {
        return NextResponse.json({ error: 'Missing podId' }, { status: 400 });
      }

      try {
        const result = await scheduleLikeJobs(podId);
        return NextResponse.json({
          status: 'success',
          message: result.message,
          scheduledCount: result.scheduledCount,
          jobId: result.jobId,
        });
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to schedule like jobs: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Manually trigger comment scheduling
    if (action === 'schedule-comments') {
      if (!podId) {
        return NextResponse.json({ error: 'Missing podId' }, { status: 400 });
      }

      try {
        const result = await scheduleCommentJobs(podId);
        return NextResponse.json({
          status: 'success',
          message: result.message,
          scheduledCount: result.scheduledCount,
          jobId: result.jobId,
        });
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to schedule comment jobs: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "schedule-likes" or "schedule-comments"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[POD_AUTOMATION_API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get pod automation status
 * Query params: podId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const podId = searchParams.get('podId');

    // Get queue status
    const queueStatus = await getAutomationQueueStatus();

    if (podId) {
      // Get stats for specific pod
      const podStats = await getPodAutomationStats(podId);
      return NextResponse.json({
        status: 'success',
        queue: queueStatus,
        pod: podStats,
      });
    }

    // Get overall queue status only
    return NextResponse.json({
      status: 'success',
      queue: queueStatus,
    });
  } catch (error) {
    console.error('[POD_AUTOMATION_API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}
