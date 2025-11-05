/**
 * POST/GET /api/pod-posts
 * Manage pod post detection: start/stop detection, get status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  startPodPostDetection,
  stopPodPostDetection,
  getQueueStatus,
  PodPostJobData,
} from '@/lib/queue/pod-post-queue';

// POST - Start or stop pod post detection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Action: Start pod post detection
    if (action === 'start' || !action) {
      const { podId, accountId, podMemberIds, campaignId, userId } = data as PodPostJobData;

      if (!podId || !accountId || !podMemberIds || !campaignId || !userId) {
        return NextResponse.json(
          {
            error: 'Missing required fields: podId, accountId, podMemberIds, campaignId, userId',
          },
          { status: 400 }
        );
      }

      if (!Array.isArray(podMemberIds) || podMemberIds.length === 0) {
        return NextResponse.json(
          { error: 'podMemberIds must be a non-empty array' },
          { status: 400 }
        );
      }

      const result = await startPodPostDetection({
        podId,
        accountId,
        podMemberIds,
        campaignId,
        userId,
      });

      return NextResponse.json({
        status: 'success',
        message: result.message,
        jobId: result.jobId,
      });
    }

    // Action: Stop pod post detection
    if (action === 'stop') {
      const { podId } = data;
      if (!podId) {
        return NextResponse.json({ error: 'Missing podId' }, { status: 400 });
      }

      const removedCount = await stopPodPostDetection(podId);
      return NextResponse.json({
        status: 'success',
        message: `Stopped detection for pod ${podId}`,
        removedCount,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "start" or "stop"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Pod post detection API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET - Get queue status
export async function GET(request: NextRequest) {
  try {
    const status = await getQueueStatus();
    return NextResponse.json({
      status: 'success',
      queue: status,
    });
  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get queue status',
      },
      { status: 500 }
    );
  }
}
