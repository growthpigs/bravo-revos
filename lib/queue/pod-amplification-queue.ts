/**
 * Pod Amplification Queue System
 * Manages automated reposting via pod members with retry logic
 */

import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection } from '../redis';

const QUEUE_NAME = 'pod-repost';
const LOG_PREFIX = '[POD_QUEUE]';

export interface PodRepostJobData {
  activityId: string;
}

/**
 * Create pod repost queue
 */
export function createPodRepostQueue(): Queue<PodRepostJobData> {
  const connection = getRedisConnection();

  const queue = new Queue<PodRepostJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3, // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 60000, // Start with 1 minute, doubles each retry
      },
      removeOnComplete: {
        age: 7 * 24 * 60 * 60, // Keep completed jobs for 7 days
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: false, // Keep failed jobs for debugging
    },
  });

  return queue;
}

/**
 * Add pod repost job to queue
 */
export async function queuePodRepost(
  activityId: string,
  delay: number = 0
): Promise<Job<PodRepostJobData>> {
  const queue = createPodRepostQueue();

  const job = await queue.add(
    'repost',
    { activityId },
    {
      jobId: `pod-repost-${activityId}`,
      delay,
    }
  );

  console.log(
    `${LOG_PREFIX} Queued repost for activity ${activityId} with ${delay}ms delay`
  );

  return job;
}

/**
 * Get pod repost queue status
 */
export async function getPodRepostQueueStatus() {
  const queue = createPodRepostQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

/**
 * Get pending reposts for an activity
 */
export async function getPendingRepostsForActivity(
  activityId: string
): Promise<Job<PodRepostJobData> | null> {
  const queue = createPodRepostQueue();

  const [waiting, active, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getDelayed(),
  ]);

  const allJobs = [...waiting, ...active, ...delayed];

  return allJobs.find((job) => job.data.activityId === activityId) || null;
}

/**
 * Cancel pod repost
 */
export async function cancelPodRepost(activityId: string): Promise<boolean> {
  const queue = createPodRepostQueue();

  // Find job by activity ID
  const [waiting, active, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getDelayed(),
  ]);

  const allJobs = [...waiting, ...active, ...delayed];
  const job = allJobs.find((j) => j.data.activityId === activityId);

  if (job) {
    await job.remove();
    console.log(`${LOG_PREFIX} Cancelled repost for activity ${activityId}`);
    return true;
  }

  return false;
}

/**
 * Create pod repost worker
 *
 * NOTE: The worker will be initialized separately to avoid circular dependencies.
 * This function is exported for use in worker initialization scripts.
 */
export function createPodRepostWorker(
  executeRepost: (activityId: string) => Promise<void>
): Worker<PodRepostJobData> {
  const connection = getRedisConnection();

  const worker = new Worker<PodRepostJobData>(
    QUEUE_NAME,
    async (job: Job<PodRepostJobData>) => {
      const { activityId } = job.data;

      console.log(`${LOG_PREFIX} Processing repost for activity ${activityId}`);

      // Execute the repost via Playwright
      await executeRepost(activityId);

      console.log(`${LOG_PREFIX} Completed repost for activity ${activityId}`);
    },
    {
      connection,
      concurrency: 5, // Max 5 concurrent reposts
      limiter: {
        max: 5, // Max 5 jobs
        duration: 60000, // Per minute (60000ms)
      },
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`${LOG_PREFIX} Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `${LOG_PREFIX} Job ${job?.id} failed for activity ${job?.data.activityId}:`,
      error.message
    );
  });

  worker.on('error', (error) => {
    console.error(`${LOG_PREFIX} Worker error:`, error);
  });

  return worker;
}
