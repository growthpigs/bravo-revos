import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { podAmplificationQueue } from '@/lib/queues/pod-amplification-queue';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/pods/trigger-amplification
 *
 * Triggers automatic reposts for all pod members when a post is published.
 *
 * Architecture:
 * - Uses GoLogin for browser automation (session management)
 * - Each pod member must have enabled repost feature (gologin_profile_id set)
 * - Members without GoLogin profiles are skipped (tracked as 'skipped' status)
 * - Members with repost_enabled=false are also skipped
 */

export async function POST(req: Request) {
  const supabase = await createClient();

  try {
    const { postId } = await req.json();

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    // 1. Get the original post and the user who created it
    const { data: post, error: postError } = await supabase
      .from('post')
      .select('id, linkedin_account_id, campaign_id, post_url')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Error fetching post:', postError);
      return NextResponse.json({ error: 'Post not found or inaccessible' }, { status: 404 });
    }

    // Validate post_url exists
    if (!post.post_url) {
      return NextResponse.json({
        error: 'Post has no LinkedIn URL. Cannot trigger repost.',
        postId
      }, { status: 400 });
    }

    // 2. Get the pod for the original poster
    // Note: User may be in multiple pods - use first match (most recent)
    const { data: podMemberData, error: podMemberError } = await supabase
      .from('pod_member')
      .select('pod_id')
      .eq('linkedin_account_id', post.linkedin_account_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (podMemberError || !podMemberData || podMemberData.length === 0) {
      console.error('Error fetching pod member for original poster:', podMemberError);
      return NextResponse.json({ error: 'Could not find pod for the original poster.' }, { status: 404 });
    }

    const podId = podMemberData[0].pod_id;

    // 3. Get all other active members with their GoLogin profile info
    // Join linkedin_accounts to get gologin_profile_id and gologin_status
    const { data: podMembers, error: podMembersError } = await supabase
      .from('pod_member')
      .select(`
        id,
        linkedin_account_id,
        repost_enabled,
        linkedin_accounts!inner (
          gologin_profile_id,
          gologin_status
        )
      `)
      .eq('pod_id', podId)
      .neq('linkedin_account_id', post.linkedin_account_id); // Exclude original poster

    if (podMembersError) {
      console.error('Error fetching pod members:', podMembersError);
      return NextResponse.json({ error: 'Failed to fetch pod members' }, { status: 500 });
    }

    if (!podMembers || podMembers.length === 0) {
      return NextResponse.json({ message: 'No other active pod members to amplify.' }, { status: 200 });
    }

    const podActivitiesToInsert: any[] = [];
    const jobsToAdd: any[] = [];
    let skippedCount = 0;
    let queuedCount = 0;

    for (const member of podMembers) {
      const linkedAccount = (member as any).linkedin_accounts;
      const gologinProfileId = linkedAccount?.gologin_profile_id;
      const gologinStatus = linkedAccount?.gologin_status;
      const repostEnabled = member.repost_enabled !== false; // Default true

      // Calculate randomized delay (2–15 minutes for natural appearance)
      const delayMinutes = Math.floor(Math.random() * (15 - 2 + 1)) + 2;
      const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
      const podActivityId = uuidv4();

      // Check if member should be skipped
      if (!repostEnabled) {
        console.log(`[TRIGGER_AMPLIFICATION] Member ${member.id} has repost disabled. Skipping.`);
        podActivitiesToInsert.push({
          id: podActivityId,
          pod_id: podId,
          member_id: member.id,
          post_id: postId,
          post_url: post.post_url,
          activity_type: 'repost',
          status: 'skipped',
          scheduled_for: scheduledFor,
        });
        skippedCount++;
        continue;
      }

      if (!gologinProfileId) {
        console.log(`[TRIGGER_AMPLIFICATION] Member ${member.id} has no GoLogin profile. Skipping.`);
        podActivitiesToInsert.push({
          id: podActivityId,
          pod_id: podId,
          member_id: member.id,
          post_id: postId,
          post_url: post.post_url,
          activity_type: 'repost',
          status: 'skipped',
          scheduled_for: scheduledFor,
        });
        skippedCount++;
        continue;
      }

      if (gologinStatus !== 'active') {
        console.log(`[TRIGGER_AMPLIFICATION] Member ${member.id} GoLogin status is '${gologinStatus}'. Skipping.`);
        podActivitiesToInsert.push({
          id: podActivityId,
          pod_id: podId,
          member_id: member.id,
          post_id: postId,
          post_url: post.post_url,
          activity_type: 'repost',
          status: 'skipped',
          scheduled_for: scheduledFor,
        });
        skippedCount++;
        continue;
      }

      // Member is ready for repost
      podActivitiesToInsert.push({
        id: podActivityId,
        pod_id: podId,
        member_id: member.id,
        post_id: postId,
        post_url: post.post_url,
        activity_type: 'repost',
        status: 'pending',
        scheduled_for: scheduledFor,
      });

      jobsToAdd.push({
        name: `repost-${podActivityId}`,
        data: {
          podActivityId: podActivityId,
          postUrl: post.post_url,
          gologinProfileId: gologinProfileId,
        },
        opts: {
          delay: delayMinutes * 60 * 1000, // BullMQ delay in milliseconds
        },
      });
      queuedCount++;
    }

    // Insert all pod_activities rows (including skipped ones for tracking)
    if (podActivitiesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('pod_activity')
        .insert(podActivitiesToInsert);

      if (insertError) {
        console.error('Error inserting pod activities:', insertError);
        return NextResponse.json({ error: 'Failed to queue pod activities' }, { status: 500 });
      }
    }

    // Add jobs to BullMQ (only for non-skipped members)
    if (jobsToAdd.length > 0) {
      await podAmplificationQueue.addBulk(jobsToAdd);
    }

    return NextResponse.json({
      message: 'Pod amplification triggered',
      queued: queuedCount,
      skipped: skippedCount,
      total: podMembers.length,
      postUrl: post.post_url
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unhandled error in trigger-amplification API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
