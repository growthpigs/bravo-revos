import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { podAmplificationQueue } from '@/lib/queues/pod-amplification-queue';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  const supabase = createClient(); // Use appropriate client for API routes

  try {
    const { postId } = await req.json();

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    // 1. Get the original post and the user who created it
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, linkedin_account_id, campaign_id, post_url') // Include post_url for repost navigation
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Error fetching post:', postError);
      return NextResponse.json({ error: 'Post not found or inaccessible' }, { status: 404 });
    }

    // 2. Get the pod associated with the campaign (assuming one pod per campaign or client)
    // For simplicity, let's assume the campaign_id is linked to a pod.
    // A more robust solution might involve querying pods directly or through user's primary pod.
    const { data: podMemberData, error: podMemberError } = await supabase
      .from('pod_members')
      .select('pod_id')
      .eq('linkedin_account_id', post.linkedin_account_id)
      .single();

    if (podMemberError || !podMemberData) {
      console.error('Error fetching pod member for original poster:', podMemberError);
      return NextResponse.json({ error: 'Could not find pod for the original poster.' }, { status: 404 });
    }

    const podId = podMemberData.pod_id;

    // 3. Look up all other active members of the user's Pod
    // FIX: unipile_account_id is on linkedin_accounts table, not pod_members
    // Must join through linkedin_accounts to get the actual Unipile account ID
    const { data: podMembers, error: podMembersError } = await supabase
      .from('pod_members')
      .select(`
        id,
        linkedin_account_id,
        linkedin_accounts!inner (
          unipile_account_id
        )
      `)
      .eq('pod_id', podId)
      .neq('linkedin_account_id', post.linkedin_account_id); // Exclude the original poster

    if (podMembersError) {
      console.error('Error fetching pod members:', podMembersError);
      return NextResponse.json({ error: 'Failed to fetch pod members' }, { status: 500 });
    }

    if (!podMembers || podMembers.length === 0) {
      return NextResponse.json({ message: 'No other active pod members to amplify.' }, { status: 200 });
    }

    const podActivitiesToInsert: any[] = [];
    const jobsToAdd: any[] = [];

    for (const member of podMembers) {
      // Extract unipile_account_id from joined linkedin_accounts
      // FIX: Now correctly extracting from the JOIN result
      const linkedAccount = (member as any).linkedin_accounts;
      const memberUnipileAccountId = linkedAccount?.unipile_account_id;

      if (!memberUnipileAccountId) {
        console.warn(`Pod member ${member.id} has no linked Unipile account. Skipping.`);
        continue;
      }

      // Validate post_url exists BEFORE creating activity (post_url is NOT NULL in schema)
      if (!post.post_url) {
        console.warn(`Post ${postId} has no post_url. Skipping repost for member ${member.id}.`);
        continue;
      }

      // Calculate randomized delay (2–15 minutes)
      const delayMinutes = Math.floor(Math.random() * (15 - 2 + 1)) + 2;
      const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

      const podActivityId = uuidv4();

      podActivitiesToInsert.push({
        id: podActivityId,
        pod_id: podId,
        member_id: member.id,
        post_id: postId,
        post_url: post.post_url, // Required: NOT NULL per schema
        activity_type: 'repost', // DB column is 'activity_type' per migration 20251116
        status: 'pending',
        scheduled_for: scheduledFor,
      });

      jobsToAdd.push({
        name: `repost-${podActivityId}`,
        data: {
          podActivityId: podActivityId,
          postUrl: post.post_url, // Use actual LinkedIn URL for Playwright navigation
          memberUnipileAccountId: memberUnipileAccountId,
        },
        opts: {
          delay: delayMinutes * 60 * 1000, // BullMQ delay in milliseconds
        },
      });
    }

    // Insert pod_activities rows
    const { error: insertError } = await supabase
      .from('pod_activities')
      .insert(podActivitiesToInsert);

    if (insertError) {
      console.error('Error inserting pod activities:', insertError);
      return NextResponse.json({ error: 'Failed to queue pod activities' }, { status: 500 });
    }

    // Add jobs to BullMQ
    await podAmplificationQueue.addBulk(jobsToAdd);

    return NextResponse.json({ message: 'Pod amplification jobs queued successfully', count: jobsToAdd.length }, { status: 200 });

  } catch (error: any) {
    console.error('Unhandled error in trigger-amplification API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}