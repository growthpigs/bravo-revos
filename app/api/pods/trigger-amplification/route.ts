import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queuePodRepost } from '@/lib/queue/pod-amplification-queue';
import { z } from 'zod';

const LOG_PREFIX = '[POD_TRIGGER]';

// Validation schema
const triggerAmplificationSchema = z.object({
  postId: z.string().uuid('Invalid post ID format'),
});

/**
 * POST /api/pods/trigger-amplification
 * Trigger pod amplification after post publishes
 *
 * Body: { postId: string }
 *
 * Process:
 * 1. Get post details with campaign/client info
 * 2. Load all active pod members for the client
 * 3. Calculate randomized delays (2-15 minutes) for each member
 * 4. Create pending activities in database
 * 5. Queue BullMQ jobs with calculated delays
 * 6. Return success with activity count
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error(`${LOG_PREFIX} Unauthorized request`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = triggerAmplificationSchema.safeParse(body);

    if (!validation.success) {
      console.error(`${LOG_PREFIX} Validation error:`, validation.error.errors);
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { postId } = validation.data;

    console.log(`${LOG_PREFIX} Triggering amplification for post ${postId}`);

    // 1. Get post details with campaign and client info
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(
        `
        id,
        post_url,
        campaign_id,
        campaigns!inner (
          id,
          client_id
        )
      `
      )
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error(`${LOG_PREFIX} Post not found:`, postError);
      return NextResponse.json(
        { error: 'Post not found', details: postError?.message },
        { status: 404 }
      );
    }

    // Type assertion for nested campaign data
    const campaign = (post.campaigns as any) as { id: string; client_id: string } | null;

    if (!campaign || !campaign.client_id) {
      console.error(`${LOG_PREFIX} Post has no associated campaign/client`);
      return NextResponse.json(
        { error: 'Post must be associated with a campaign' },
        { status: 400 }
      );
    }

    const clientId = campaign.client_id;

    console.log(`${LOG_PREFIX} Post belongs to client ${clientId}`);

    // 2. Get active pod members for the client
    const { data: podMembers, error: membersError } = await supabase
      .from('pod_members')
      .select('id, name, linkedin_url, unipile_account_id')
      .eq('client_id', clientId)
      .eq('is_active', true);

    if (membersError) {
      console.error(`${LOG_PREFIX} Error fetching pod members:`, membersError);
      return NextResponse.json(
        { error: 'Failed to fetch pod members', details: membersError.message },
        { status: 500 }
      );
    }

    if (!podMembers || podMembers.length === 0) {
      console.warn(`${LOG_PREFIX} No active pod members for client ${clientId}`);
      return NextResponse.json(
        { error: 'No active pod members found for this client' },
        { status: 400 }
      );
    }

    console.log(`${LOG_PREFIX} Found ${podMembers.length} active pod members`);

    // 3. Calculate randomized delays (2-15 minutes) for each member
    const now = Date.now();
    const MIN_DELAY_MS = 2 * 60 * 1000; // 2 minutes
    const MAX_DELAY_MS = 15 * 60 * 1000; // 15 minutes

    const activities = podMembers.map((member) => {
      // Random delay between 2-15 minutes
      const delayMs = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
      const scheduledFor = new Date(now + delayMs);

      return {
        post_id: postId,
        pod_member_id: member.id,
        action: 'repost',
        status: 'pending',
        scheduled_for: scheduledFor.toISOString(),
        attempt_number: 1,
        max_attempts: 3,
      };
    });

    console.log(`${LOG_PREFIX} Calculated delays for ${activities.length} activities`);

    // 4. Insert activities into database
    const { data: insertedActivities, error: insertError } = await supabase
      .from('pod_activities')
      .insert(activities)
      .select('id, pod_member_id, scheduled_for');

    if (insertError || !insertedActivities) {
      console.error(`${LOG_PREFIX} Error inserting activities:`, insertError);
      return NextResponse.json(
        { error: 'Failed to create pod activities', details: insertError?.message },
        { status: 500 }
      );
    }

    console.log(`${LOG_PREFIX} Inserted ${insertedActivities.length} activities into database`);

    // 5. Queue BullMQ jobs with calculated delays
    const queuedJobs = [];
    for (const activity of insertedActivities) {
      const scheduledTime = new Date(activity.scheduled_for).getTime();
      const delay = Math.max(0, scheduledTime - Date.now()); // Ensure non-negative delay

      try {
        const job = await queuePodRepost(activity.id, delay);
        queuedJobs.push({
          activityId: activity.id,
          jobId: job.id,
          delay,
          scheduledFor: activity.scheduled_for,
        });
      } catch (error: any) {
        console.error(
          `${LOG_PREFIX} Error queuing job for activity ${activity.id}:`,
          error.message
        );
        // Continue queuing other jobs even if one fails
      }
    }

    console.log(`${LOG_PREFIX} Queued ${queuedJobs.length} BullMQ jobs`);

    // 6. Return success with activity count
    return NextResponse.json(
      {
        success: true,
        message: `Pod amplification triggered for ${queuedJobs.length} members`,
        postId,
        clientId,
        activitiesScheduled: queuedJobs.length,
        activities: queuedJobs,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Unexpected error:`, error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
