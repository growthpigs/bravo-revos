/**
 * Pod Post Detection Queue
 * Polls for new posts from engagement pod members every 30 minutes
 */

import { Queue, Worker, Job } from 'bullmq';
import { getUserLatestPosts } from '../unipile-client';
import { getRedisConnection } from '../redis';
import { POD_POST_CONFIG, LOGGING_CONFIG } from '../config';
import { validatePodPostJobData } from '../validation';

const QUEUE_NAME = 'pod-post-detection';
const LOG_PREFIX = LOGGING_CONFIG.PREFIX_POD_POST;

export interface PodPostJobData {
  podId: string;
  accountId: string;
  podMemberIds: string[]; // LinkedIn user IDs of pod members
  campaignId: string;
  userId: string;
}

// Pod post detection queue with 30-minute polling
export const podPostQueue = new Queue<PodPostJobData>(QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: POD_POST_CONFIG.QUEUE_ATTEMPTS,
    backoff: {
      type: POD_POST_CONFIG.BACKOFF_TYPE as any,
      delay: POD_POST_CONFIG.BACKOFF_INITIAL_DELAY_MS,
    },
    removeOnComplete: {
      count: POD_POST_CONFIG.COMPLETED_JOB_KEEP_COUNT,
      age: POD_POST_CONFIG.COMPLETED_JOB_AGE_DAYS * POD_POST_CONFIG.SECONDS_PER_DAY || 86400,
    },
    removeOnFail: {
      count: POD_POST_CONFIG.FAILED_JOB_KEEP_COUNT,
      age: POD_POST_CONFIG.FAILED_JOB_AGE_DAYS * POD_POST_CONFIG.SECONDS_PER_DAY || 2592000,
    },
  },
});

/**
 * Get the Redis key for tracking seen posts per pod
 */
function getSeenPostsKey(podId: string): string {
  return `${POD_POST_CONFIG.POSTS_SEEN_KEY_PREFIX}:${podId}`;
}

/**
 * Check if post was already detected
 */
async function isPostSeen(podId: string, postId: string): Promise<boolean> {
  const connection = getRedisConnection();
  const key = getSeenPostsKey(podId);
  return (await connection.sismember(key, postId)) === 1;
}

/**
 * Mark post as seen
 */
async function markPostSeen(podId: string, postId: string): Promise<void> {
  const connection = getRedisConnection();
  const key = getSeenPostsKey(podId);
  await connection.sadd(key, postId);
  // Keep for configured days then auto-expire
  await connection.expire(key, POD_POST_CONFIG.POSTS_RETENTION_DAYS * 86400);
}

/**
 * Start pod post detection
 */
export async function startPodPostDetection(data: PodPostJobData): Promise<{
  jobId: string;
  message: string;
}> {
  validatePodPostJobData(data);

  const job = await podPostQueue.add('detect-posts', data, {
    jobId: `pod-${data.podId}-initial`,
    repeat: {
      every: POD_POST_CONFIG.POLLING_INTERVAL_MS,
    },
  });

  console.log(`${LOG_PREFIX} Started post detection for pod ${data.podId} (Job ID: ${job.id})`);

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

  console.log(`${LOG_PREFIX} Stopped detection for pod ${podId} (removed ${removedCount} jobs)`);
  return removedCount;
}

/**
 * Process pod post detection job
 */
async function processPodPostJob(job: Job<PodPostJobData>): Promise<void> {
  const { podId, accountId, podMemberIds } = job.data;

  console.log(`${LOG_PREFIX} Detecting new posts from ${podMemberIds.length} pod members`);

  const newPostsDetected: Array<{ memberId: string; postId: string; text: string }> = [];

  for (const memberId of podMemberIds) {
    try {
      const posts = await getUserLatestPosts(
        accountId,
        memberId,
        POD_POST_CONFIG.POSTS_TO_CHECK_PER_POLL
      );

      for (const post of posts) {
        const alreadySeen = await isPostSeen(podId, post.id);

        if (!alreadySeen) {
          console.log(`${LOG_PREFIX} ✅ New post detected from ${post.author.name}`);
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
      console.error(`${LOG_PREFIX} Error fetching posts from ${memberId}:`, error);
      // Continue with other members
    }
  }

  console.log(`${LOG_PREFIX} Detection complete: Found ${newPostsDetected.length} new posts`);
}

// Start pod post detection worker
export const podPostWorker = new Worker<PodPostJobData>(QUEUE_NAME, processPodPostJob, {
  connection: getRedisConnection(),
  concurrency: POD_POST_CONFIG.QUEUE_CONCURRENCY,
});

// Worker event handlers
podPostWorker.on('completed', (job) => {
  console.log(`${LOG_PREFIX} Job ${job.id} completed`);
});

podPostWorker.on('failed', (job, error) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} failed:`, error.message);
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
