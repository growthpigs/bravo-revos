/**
 * Pod Post Detection Queue
 * Polls for new posts from engagement pod members every 30 minutes
 */

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { getUserLatestPosts } from '../unipile-client';

const QUEUE_NAME = 'pod-post-detection';

export interface PodPostJobData {
  podId: string;
  accountId: string;
  podMemberIds: string[]; // LinkedIn user IDs of pod members
  campaignId: string;
  userId: string;
}

// Redis connection for queue
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Pod post detection queue with 30-minute polling
export const podPostQueue = new Queue<PodPostJobData>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: {
      count: 100,
      age: 86400 * 7, // 7 days
    },
    removeOnFail: {
      count: 50,
      age: 86400 * 30, // 30 days
    },
  },
});

/**
 * Get the Redis key for tracking seen posts per pod
 */
function getSeenPostsKey(podId: string): string {
  return `pod-posts-seen:${podId}`;
}

/**
 * Check if post was already detected
 */
async function isPostSeen(podId: string, postId: string): Promise<boolean> {
  const key = getSeenPostsKey(podId);
  return await connection.sismember(key, postId) > 0;
}

/**
 * Mark post as seen
 */
async function markPostSeen(podId: string, postId: string): Promise<void> {
  const key = getSeenPostsKey(podId);
  await connection.sadd(key, postId);
  // Keep for 7 days then auto-expire
  await connection.expire(key, 86400 * 7);
}

/**
 * Start pod post detection
 */
export async function startPodPostDetection(data: PodPostJobData): Promise<{
  jobId: string;
  message: string;
}> {
  const job = await podPostQueue.add('detect-posts', data, {
    jobId: `pod-${data.podId}-initial`,
    repeat: {
      every: 30 * 60 * 1000, // 30 minutes
    },
  });

  console.log(
    `[POD_POST_QUEUE] Started post detection for pod ${data.podId} (Job ID: ${job.id})`
  );

  return {
    jobId: job.id!,
    message: `Pod post detection started for ${data.podMemberIds.length} members`,
  };
}

/**
 * Stop pod post detection
 */
export async function stopPodPostDetection(podId: string): Promise<number> {
  const jobs = await podPostQueue.getJobs(['waiting', 'delayed', 'active']);
  let removedCount = 0;

  for (const job of jobs) {
    if (job.data.podId === podId) {
      await job.remove();
      removedCount++;
    }
  }

  console.log(`[POD_POST_QUEUE] Stopped detection for pod ${podId} (removed ${removedCount} jobs)`);
  return removedCount;
}

/**
 * Process pod post detection job
 */
async function processPodPostJob(job: Job<PodPostJobData>): Promise<void> {
  const { podId, accountId, podMemberIds } = job.data;

  console.log(
    `[POD_POST_QUEUE] Detecting new posts from ${podMemberIds.length} pod members`
  );

  const newPostsDetected: Array<{ memberId: string; postId: string; text: string }> = [];

  for (const memberId of podMemberIds) {
    try {
      const posts = await getUserLatestPosts(accountId, memberId, 5);

      for (const post of posts) {
        const alreadySeen = await isPostSeen(podId, post.id);

        if (!alreadySeen) {
          console.log(`[POD_POST_QUEUE] ✅ New post detected from ${post.author.name}`);
          console.log(`   Text: ${post.text.substring(0, 100)}...`);

          await markPostSeen(podId, post.id);
          newPostsDetected.push({
            memberId,
            postId: post.id,
            text: post.text,
          });

          // TODO: Queue reshare job (E-04 integration)
          // await podReshareQueue.add('reshare-post', {
          //   podId,
          //   postId: post.id,
          //   postUrl: post.url,
          //   authorId: memberId,
          //   ...
          // });
        }
      }
    } catch (error) {
      console.error(`[POD_POST_QUEUE] Error fetching posts from ${memberId}:`, error);
      // Continue with other members
    }
  }

  console.log(
    `[POD_POST_QUEUE] Detection complete: Found ${newPostsDetected.length} new posts`
  );
}

// Start pod post detection worker
export const podPostWorker = new Worker<PodPostJobData>(
  QUEUE_NAME,
  processPodPostJob,
  {
    connection,
    concurrency: 3, // Process 3 pods concurrently
  }
);

// Worker event handlers
podPostWorker.on('completed', (job) => {
  console.log(`[POD_POST_QUEUE] Job ${job.id} completed`);
});

podPostWorker.on('failed', (job, error) => {
  console.error(`[POD_POST_QUEUE] Job ${job?.id} failed:`, error.message);
});

/**
 * Get queue status
 */
export async function getQueueStatus(): Promise<{
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const [waiting, active, delayed, completed, failed] = await Promise.all([
    podPostQueue.getWaitingCount(),
    podPostQueue.getActiveCount(),
    podPostQueue.getDelayedCount(),
    podPostQueue.getCompletedCount(),
    podPostQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    delayed,
    completed,
    failed,
    total: waiting + active + delayed,
  };
}
