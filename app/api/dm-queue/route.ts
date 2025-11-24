/**
 * POST/GET /api/dm-queue
 * Manage DM queue: send DM, check status, get rate limits
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  queueDM,
  getQueueStatus,
  checkRateLimit,
  getCampaignJobs,
  cancelCampaignJobs,
  pauseQueue,
  resumeQueue,
  DMJobData,
  generateJobId,
} from '@/lib/queues/dm-queue';

// POST - Queue a DM or perform action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Action: Queue a DM
    if (action === 'queue' || !action) {
      const { accountId, recipientId, recipientName, message, campaignId, userId, commentId, postId } =
        data as DMJobData;

      // Validate required fields
      if (!accountId || !recipientId || !recipientName || !message || !campaignId || !userId) {
        return NextResponse.json(
          {
            error:
              'Missing required fields: accountId, recipientId, recipientName, message, campaignId, userId',
          },
          { status: 400 }
        );
      }

      const result = await queueDM({
        accountId,
        recipientId,
        recipientName,
        message,
        campaignId,
        userId,
        commentId,
        postId,
      });

      return NextResponse.json({
        status: 'success',
        message: 'DM queued for delivery',
        jobId: result.jobId,
        rateLimitStatus: result.rateLimitStatus,
      });
    }

    // Action: Check rate limit
    if (action === 'check-rate-limit') {
      const { accountId } = data;
      if (!accountId) {
        return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
      }

      const rateLimitStatus = await checkRateLimit(accountId);
      return NextResponse.json({
        status: 'success',
        rateLimit: rateLimitStatus,
      });
    }

    // Action: Get campaign jobs
    if (action === 'get-campaign-jobs') {
      const { campaignId } = data;
      if (!campaignId) {
        return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
      }

      const jobs = await getCampaignJobs(campaignId);
      const jobsSummary = await Promise.all(
        jobs.map(async (job) => ({
          id: job.id,
          state: await job.getState(),
          data: job.data,
          attemptsMade: job.attemptsMade,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
        }))
      );

      return NextResponse.json({
        status: 'success',
        jobs: jobsSummary,
        total: jobs.length,
      });
    }

    // Action: Cancel campaign jobs
    if (action === 'cancel-campaign') {
      const { campaignId } = data;
      if (!campaignId) {
        return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
      }

      const cancelledCount = await cancelCampaignJobs(campaignId);
      return NextResponse.json({
        status: 'success',
        message: `Cancelled ${cancelledCount} jobs`,
        cancelledCount,
      });
    }

    // Action: Pause queue
    if (action === 'pause') {
      await pauseQueue();
      return NextResponse.json({
        status: 'success',
        message: 'Queue paused',
      });
    }

    // Action: Resume queue
    if (action === 'resume') {
      await resumeQueue();
      return NextResponse.json({
        status: 'success',
        message: 'Queue resumed',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('DM queue API error:', error);
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
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const status = await getQueueStatus();

    // Optionally include rate limit status for specific account
    if (accountId) {
      const rateLimit = await checkRateLimit(accountId);
      return NextResponse.json({
        status: 'success',
        queue: status,
        rateLimit,
      });
    }

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
