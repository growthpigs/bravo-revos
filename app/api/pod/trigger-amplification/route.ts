/**
 * Trigger Pod Amplification API
 *
 * Called when a LinkedIn post is published to trigger automated
 * reposting by engagement pod members.
 *
 * Flow:
 * 1. Receive post details (postId, postUrl)
 * 2. Find user's active pod membership
 * 3. Create pod_activity record
 * 4. Queue amplification job
 * 5. Workers will handle automated reposts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPodAmplificationQueue } from '@/lib/queues/pod-queue';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { postId, postUrl } = body;

    if (!postId || !postUrl) {
      return NextResponse.json(
        { error: 'postId and postUrl are required' },
        { status: 400 }
      );
    }

    // 3. Find user's active pod membership
    const { data: podMembership, error: membershipError } = await supabase
      .from('pod_members')
      .select('id, pod_id:client_id, is_active') // TEMPORARY: using client_id as pod_id
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('onboarding_status', 'active')
      .single();

    if (membershipError || !podMembership) {
      return NextResponse.json(
        { error: 'User is not an active member of any pod' },
        { status: 404 }
      );
    }

    // 4. Create pod_activity record
    const { data: podActivity, error: activityError } = await supabase
      .from('pod_activities')
      .insert({
        pod_id: podMembership.pod_id,
        post_id: postId,
        member_id: podMembership.id,
        activity_type: 'repost',
        post_url: postUrl,
        status: 'queued',
      })
      .select()
      .single();

    if (activityError || !podActivity) {
      console.error('[TRIGGER_AMPLIFICATION] Failed to create pod_activity:', activityError);
      return NextResponse.json(
        { error: 'Failed to create pod activity' },
        { status: 500 }
      );
    }

    // 5. Queue amplification job
    const podAmplificationQueue = getPodAmplificationQueue();
    const job = await podAmplificationQueue.add(
      'amplify-post',
      {
        postId,
        postUrl,
        podId: podMembership.pod_id,
        authorUserId: user.id,
        createdAt: new Date().toISOString(),
      },
      {
        jobId: `amplify-${postId}-${Date.now()}`,
      }
    );

    console.log('[TRIGGER_AMPLIFICATION] Job queued:', {
      jobId: job.id,
      postId,
      podId: podMembership.pod_id,
    });

    return NextResponse.json({
      success: true,
      podActivityId: podActivity.id,
      jobId: job.id,
      message: 'Pod amplification queued successfully',
    });
  } catch (error: any) {
    console.error('[TRIGGER_AMPLIFICATION] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
