/**
 * Pod Automation Actions API
 * Triggers scheduling operations for pod automation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  scheduleLikeJobs,
  scheduleCommentJobs,
  getAutomationQueueStatus,
} from '@/lib/queues/pod-automation-queue';
import { getPodEngagementStats } from '@/lib/pods/engagement-scheduler';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const podId = params.id;
    const body = await request.json();
    const action = body.action as string;

    if (!podId) {
      return NextResponse.json(
        { error: 'Pod ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required (schedule-likes or schedule-comments)' },
        { status: 400 }
      );
    }

    console.log(`[AUTOMATION_ACTION] Executing ${action} for pod ${podId}`);

    let result;
    const startTime = Date.now();

    switch (action) {
      case 'schedule-likes':
        result = await scheduleLikeJobs(podId);
        break;

      case 'schedule-comments':
        result = await scheduleCommentJobs(podId);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;

    // Get updated queue status
    const queueStatus = await getAutomationQueueStatus();
    const podStats = await getPodEngagementStats(podId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      action,
      result: {
        jobId: result.jobId,
        scheduledCount: result.scheduledCount,
        message: result.message,
      },
      duration: `${duration}ms`,
      queue: queueStatus,
      stats: podStats,
    });
  } catch (error) {
    console.error('[AUTOMATION_ACTION] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
