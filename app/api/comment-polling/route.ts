/**
 * Comment Polling API
 * Start/stop/status for comment polling jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  startCommentPolling,
  stopCommentPolling,
  getQueueStatus,
  CommentPollingJobData,
} from '@/lib/queue/comment-polling-queue';

// POST - Start comment polling for a campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...jobData } = body;

    if (action === 'start') {
      const { accountId, postId, triggerWords, campaignId, userId, timezone } = jobData as CommentPollingJobData;

      // Validate required fields
      if (!accountId || !postId || !triggerWords || !campaignId || !userId) {
        return NextResponse.json(
          { error: 'Missing required fields: accountId, postId, triggerWords, campaignId, userId' },
          { status: 400 }
        );
      }

      await startCommentPolling({
        accountId,
        postId,
        triggerWords,
        campaignId,
        userId,
        timezone,
      });

      return NextResponse.json({
        status: 'success',
        message: 'Comment polling started',
        campaignId,
      });
    }

    if (action === 'stop') {
      const { campaignId } = jobData;

      if (!campaignId) {
        return NextResponse.json(
          { error: 'Missing campaignId' },
          { status: 400 }
        );
      }

      await stopCommentPolling(campaignId);

      return NextResponse.json({
        status: 'success',
        message: 'Comment polling stopped',
        campaignId,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "start" or "stop"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Comment polling API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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
      { error: error instanceof Error ? error.message : 'Failed to get queue status' },
      { status: 500 }
    );
  }
}
