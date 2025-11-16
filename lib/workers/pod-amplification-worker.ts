/**
 * Pod Amplification Worker
 *
 * Processes pod amplification jobs:
 * 1. Receives post amplification request
 * 2. Finds all active pod members (excluding author)
 * 3. Creates individual repost jobs for each member
 * 4. Tracks amplification status
 */

import { config } from 'dotenv';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';

// Load environment variables
config({ path: '.env.local' });
import {
  podAmplificationQueue,
  podRepostQueue,
  PodAmplificationJob,
} from '../queues/pod-queue';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker<PodAmplificationJob>(
  'pod-amplification',
  async (job: Job<PodAmplificationJob>) => {
    console.log('[POD_AMPLIFICATION_WORKER] Processing job:', job.id);

    const { postId, postUrl, podId, authorUserId, createdAt } = job.data;

    try {
      // 1. Find all active pod members in this pod (excluding author)
      const { data: podMembers, error: membersError } = await supabase
        .from('pod_members')
        .select(
          `
          id,
          user_id,
          name,
          linkedin_url,
          unipile_account_id,
          is_active,
          onboarding_status
        `
        )
        .eq('client_id', podId) // TEMPORARY: using client_id as pod_id
        .eq('is_active', true)
        .eq('onboarding_status', 'active')
        .neq('user_id', authorUserId); // Exclude post author

      if (membersError) {
        throw new Error(`Failed to fetch pod members: ${membersError.message}`);
      }

      if (!podMembers || podMembers.length === 0) {
        console.log('[POD_AMPLIFICATION_WORKER] No active pod members found');
        return {
          success: true,
          repostJobsCreated: 0,
          message: 'No active pod members to amplify',
        };
      }

      console.log(`[POD_AMPLIFICATION_WORKER] Found ${podMembers.length} pod members to amplify`);

      // 2. Create pod_activities records for each member
      const activities = podMembers.map((member) => ({
        pod_id: podId,
        post_id: postId,
        member_id: member.id,
        activity_type: 'repost',
        post_url: postUrl,
        status: 'queued',
      }));

      const { data: createdActivities, error: activitiesError } = await supabase
        .from('pod_activities')
        .insert(activities)
        .select();

      if (activitiesError) {
        throw new Error(`Failed to create pod activities: ${activitiesError.message}`);
      }

      // 3. Queue individual repost jobs for each member
      const repostJobs = createdActivities!.map((activity, index) => {
        const member = podMembers[index];
        return {
          name: `repost-${member.id}`,
          data: {
            podActivityId: activity.id,
            podMemberId: member.id,
            postUrl,
            memberLinkedInUrl: member.linkedin_url,
            unipileAccountId: member.unipile_account_id,
          },
          opts: {
            jobId: `repost-${activity.id}-${Date.now()}`,
            delay: index * 5000, // Stagger reposts by 5 seconds each
          },
        };
      });

      await podRepostQueue.addBulk(repostJobs);

      console.log(`[POD_AMPLIFICATION_WORKER] Created ${repostJobs.length} repost jobs`);

      return {
        success: true,
        repostJobsCreated: repostJobs.length,
        podMembers: podMembers.length,
      };
    } catch (error: any) {
      console.error('[POD_AMPLIFICATION_WORKER] Error:', error);
      throw error; // Will trigger retry
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 amplification jobs concurrently
  }
);

worker.on('completed', (job) => {
  console.log(`[POD_AMPLIFICATION_WORKER] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[POD_AMPLIFICATION_WORKER] Job ${job?.id} failed:`, err.message);
});

export default worker;
