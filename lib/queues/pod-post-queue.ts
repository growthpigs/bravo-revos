/**
 * Pod Post Detection Queue
 * Polls for new posts from engagement pod members every 30 minutes
 */

import { Queue, Worker, Job } from 'bullmq';
import { getUserLatestPosts } from '../unipile-client';
import { saveDetectedPost, getPodMemberByLinkedInAccountId } from '../pods/post-detector';
import { getRedisConnection } from '../redis';
import { POD_POST_CONFIG, LOGGING_CONFIG } from '../config';
import { validatePodPostJobData } from '../validation';
import { scheduleLikeJobs, scheduleCommentJobs } from './pod-automation-queue';

const QUEUE_NAME = 'pod-post-detection';
const LOG_PREFIX = LOGGING_CONFIG.PREFIX_POD_POST;

export interface PodPostJobData {
  podId: string;
  accountId: string;
  podMemberIds: string[]; // LinkedIn user IDs of pod members
  campaignId: string;
  userId: string;
}

let queueInstance: Queue<PodPostJobData> | null = null;

function createQueue(): Queue<PodPostJobData> {
  return new Queue<PodPostJobData>(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: POD_POST_CONFIG.QUEUE_ATTEMPTS,
      backoff: {
        type: POD_POST_CONFIG.BACKOFF_TYPE as any,
        delay: POD_POST_CONFIG.BACKOFF_INITIAL_DELAY_MS,
      },
      removeOnComplete: {
        count: POD_POST_CONFIG.COMPLETED_JOB_KEEP_COUNT,
        age:
          POD_POST_CONFIG.COMPLETED_JOB_AGE_DAYS * POD_POST_CONFIG.SECONDS_PER_DAY || 86400,
      },
      removeOnFail: {
        count: POD_POST_CONFIG.FAILED_JOB_KEEP_COUNT,
        age:
          POD_POST_CONFIG.FAILED_JOB_AGE_DAYS * POD_POST_CONFIG.SECONDS_PER_DAY || 2592000,
      },
    },
  });
}

export function getPodPostQueue(): Queue<PodPostJobData> {
  if (!queueInstance) {
    queueInstance = createQueue();
  }

  return queueInstance;
}

export const podPostQueue: Queue<PodPostJobData> = new Proxy(
  {} as Queue<PodPostJobData>,
  {
    get(_target, prop: keyof Queue<PodPostJobData>) {
      const queue = getPodPostQueue() as any;
      const value = queue[prop];
      return typeof value === 'function' ? value.bind(queue) : value;
    },
  }
);

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

  const queue = getPodPostQueue();
  const job = await queue.add('detect-posts', data, {
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
  const queue = getPodPostQueue();
  const jobs = await queue.getJobs(['waiting', 'delayed', 'active']);
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

  const newPostsDetected: Array<{
    memberId: string;
    postId: string;
    text: string;
    activitiesCreated: number;
  }> = [];
  let totalActivitiesCreated = 0;

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

          // Get pod member ID for this LinkedIn account
          // Note: accountId is the Unipile account ID, we use it to look up the LinkedIn account
          const podMemberId = await getPodMemberByLinkedInAccountId(podId, accountId);
          if (!podMemberId) {
            console.error(
              `${LOG_PREFIX} Could not find pod member for account ${accountId}`
            );
            continue;
          }

          // Save post to database and create engagement activities
          const result = await saveDetectedPost(
            podId,
            accountId,
            accountId, // Pass accountId as the linkedin_account_id for now
            post,
            podMemberIds
          );

          if (result.error) {
            console.error(`${LOG_PREFIX} Failed to save post: ${result.error}`);
            continue;
          }

          totalActivitiesCreated += result.activitiesCreated;
          newPostsDetected.push({
            memberId,
            postId: post.id,
            text: post.text,
            activitiesCreated: result.activitiesCreated,
          });

          // E-04: Queue engagement jobs for pod members to engage with this post
          // Schedule likes with 5-30 minute delays (staggered, max 3 per hour)
          try {
            const likeJobResult = await scheduleLikeJobs(podId);
            console.log(
              `${LOG_PREFIX} ✅ Queued ${likeJobResult.scheduledCount} like jobs for pod ${podId}`
            );
          } catch (error) {
            console.error(
              `${LOG_PREFIX} Failed to queue like jobs for pod ${podId}:`,
              error
            );
          }

          // Schedule comments with 1-6 hour delays (longer spread)
          try {
            const commentJobResult = await scheduleCommentJobs(podId);
            console.log(
              `${LOG_PREFIX} ✅ Queued ${commentJobResult.scheduledCount} comment jobs for pod ${podId}`
            );
          } catch (error) {
            console.error(
              `${LOG_PREFIX} Failed to queue comment jobs for pod ${podId}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error fetching posts from ${memberId}:`, error);
      // Continue with other members
    }
  }

  console.log(`${LOG_PREFIX} Detection complete:`);
  console.log(`   Found ${newPostsDetected.length} new posts`);
  console.log(`   Created ${totalActivitiesCreated} engagement activities`);
}

// Start pod post detection worker
let workerInstance: Worker<PodPostJobData> | null = null;

function createWorker(): Worker<PodPostJobData> {
  const worker = new Worker<PodPostJobData>(QUEUE_NAME, processPodPostJob, {
    connection: getRedisConnection(),
    concurrency: POD_POST_CONFIG.QUEUE_CONCURRENCY,
  });

  worker.on('completed', (job) => {
    console.log(`${LOG_PREFIX} Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`${LOG_PREFIX} Job ${job?.id} failed:`, error.message);
  });

  return worker;
}

export function getPodPostWorker(): Worker<PodPostJobData> {
  if (!workerInstance) {
    workerInstance = createWorker();
  }

  return workerInstance;
}

export async function closePodPostWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
}

export async function closePodPostQueue(): Promise<void> {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
  }
}

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
  const queue = getPodPostQueue();
  const [waiting, active, delayed, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
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
