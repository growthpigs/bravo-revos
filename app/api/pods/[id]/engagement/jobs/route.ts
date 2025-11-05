/**
 * Pod Engagement Job Creation API
 * POST endpoint for adding jobs to E-05-1 queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { addEngagementJob, initializeEngagementWorker } from '@/lib/queue/pod-engagement-worker';
import type { EngagementJobData } from '@/lib/queue/pod-engagement-worker';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const podId = params.id;
    const body = await request.json();

    // Initialize worker if not already running
    await initializeEngagementWorker();

    // Validate request body
    if (!body.engagementType || !['like', 'comment'].includes(body.engagementType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing engagementType (must be "like" or "comment")',
        },
        { status: 400 }
      );
    }

    if (!body.postId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: postId',
        },
        { status: 400 }
      );
    }

    if (!body.profileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: profileId',
        },
        { status: 400 }
      );
    }

    if (body.engagementType === 'comment' && !body.commentText) {
      return NextResponse.json(
        {
          success: false,
          error: 'Comment engagement requires commentText field',
        },
        { status: 400 }
      );
    }

    // Create job data
    const jobData: EngagementJobData = {
      podId,
      activityId: body.activityId || `test-activity-${Date.now()}`,
      engagementType: body.engagementType,
      postId: body.postId,
      profileId: body.profileId,
      commentText: body.commentText,
      scheduledFor: body.scheduledFor || new Date().toISOString(),
    };

    // Add job to queue
    const job = await addEngagementJob(jobData);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      activityId: jobData.activityId,
      engagementType: jobData.engagementType,
      postId: jobData.postId,
      priority: job.priority,
      message: `Job added to engagement queue (ID: ${job.id})`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[POD_ENGAGEMENT_API] Error adding job:', error);

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
