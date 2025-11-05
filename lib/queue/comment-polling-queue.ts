/**
 * Comment Polling Queue
 * BullMQ queue for LinkedIn comment monitoring with anti-pattern detection
 */

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { getAllPostComments } from '../unipile-client';
import { processComments } from '../comment-processor';

/**
 * Job data structure
 */
export interface CommentPollingJobData {
  accountId: string;
  postId: string;
  triggerWords: string[];
  campaignId: string;
  userId: string;
  timezone?: string; // User's timezone for working hours check
}

/**
 * Queue configuration
 */
const QUEUE_NAME = 'comment-polling';

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Create queue
export const commentPollingQueue = new Queue<CommentPollingJobData>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // Start at 1 minute
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 86400, // Keep for 24 hours
    },
    removeOnFail: {
      count: 50, // Keep last 50 failed jobs
      age: 86400 * 7, // Keep for 7 days
    },
  },
});

/**
 * Calculate next polling delay with randomization and jitter
 * Returns delay in milliseconds
 */
function calculateNextDelay(): number {
  // Base: Random between 15-45 minutes
  const baseMinutes = 15 + Math.random() * 30; // 15-45 minutes

  // Jitter: ±5 minutes
  const jitterMinutes = (Math.random() - 0.5) * 10; // -5 to +5 minutes

  // Convert to milliseconds
  const totalMinutes = baseMinutes + jitterMinutes;
  return Math.floor(totalMinutes * 60 * 1000);
}

/**
 * Check if current time is within working hours (9am-5pm)
 * Returns true if within working hours, false otherwise
 */
function isWithinWorkingHours(timezone?: string): boolean {
  const now = new Date();

  // TODO: Implement timezone conversion when timezone provided
  // For now, use local time
  const hour = now.getHours();

  return hour >= 9 && hour < 17; // 9am to 5pm
}

/**
 * Determine if this poll should be skipped (10% chance)
 */
function shouldSkipPoll(): boolean {
  return Math.random() < 0.1; // 10% chance to skip
}

/**
 * Schedule next polling job with randomized delay
 */
async function scheduleNextPoll(jobData: CommentPollingJobData): Promise<void> {
  const delay = calculateNextDelay();
  const delayMinutes = (delay / 60000).toFixed(1);

  console.log(`[COMMENT_POLLING] Scheduling next poll in ${delayMinutes} minutes`);

  await commentPollingQueue.add(
    'poll-comments',
    jobData,
    {
      delay,
      jobId: `poll-${jobData.campaignId}-${Date.now()}`, // Unique job ID
    }
  );
}

/**
 * Process comment polling job
 */
async function processCommentPollingJob(job: Job<CommentPollingJobData>): Promise<void> {
  const { accountId, postId, triggerWords, campaignId, userId, timezone } = job.data;

  console.log(`[COMMENT_POLLING] Processing job for campaign ${campaignId}, post ${postId}`);

  // Check if within working hours
  if (!isWithinWorkingHours(timezone)) {
    console.log(`[COMMENT_POLLING] Outside working hours, skipping and rescheduling`);
    await scheduleNextPoll(job.data);
    return;
  }

  // Random skip chance (10%)
  if (shouldSkipPoll()) {
    console.log(`[COMMENT_POLLING] Random skip triggered, rescheduling`);
    await scheduleNextPoll(job.data);
    return;
  }

  try {
    // Fetch comments from Unipile
    const comments = await getAllPostComments(accountId, postId);
    console.log(`[COMMENT_POLLING] Fetched ${comments.length} comments`);

    // Process comments (bot filtering + trigger word detection)
    const validComments = processComments(comments, triggerWords);
    console.log(`[COMMENT_POLLING] ${validComments.length} valid comments with trigger words`);

    // TODO: Queue DMs for valid comments
    // This will be implemented in C-03
    for (const processed of validComments) {
      console.log(`[COMMENT_POLLING] Would queue DM for: ${processed.comment.author.name}`);
      console.log(`  - Matched words: ${processed.matchedTriggerWords.join(', ')}`);
      console.log(`  - Bot score: ${processed.botScore}`);
    }

    // Schedule next poll
    await scheduleNextPoll(job.data);
  } catch (error) {
    console.error(`[COMMENT_POLLING] Error polling comments:`, error);
    // Don't schedule next poll on error - BullMQ retry will handle it
    throw error;
  }
}

/**
 * Worker to process comment polling jobs
 */
export const commentPollingWorker = new Worker<CommentPollingJobData>(
  QUEUE_NAME,
  async (job) => {
    await processCommentPollingJob(job);
  },
  {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

// Worker event handlers
commentPollingWorker.on('completed', (job) => {
  console.log(`[COMMENT_POLLING] Job ${job.id} completed successfully`);
});

commentPollingWorker.on('failed', (job, err) => {
  console.error(`[COMMENT_POLLING] Job ${job?.id} failed:`, err);
});

/**
 * Start comment polling for a campaign
 * This is called when a campaign is created/activated
 */
export async function startCommentPolling(
  jobData: CommentPollingJobData
): Promise<void> {
  console.log(`[COMMENT_POLLING] Starting polling for campaign ${jobData.campaignId}`);

  // Add first job immediately
  await commentPollingQueue.add('poll-comments', jobData, {
    jobId: `poll-${jobData.campaignId}-initial`,
  });
}

/**
 * Stop comment polling for a campaign
 * This is called when a campaign is paused/deactivated
 */
export async function stopCommentPolling(campaignId: string): Promise<void> {
  console.log(`[COMMENT_POLLING] Stopping polling for campaign ${campaignId}`);

  // Remove all jobs for this campaign
  const jobs = await commentPollingQueue.getJobs(['waiting', 'delayed', 'active']);
  const campaignJobs = jobs.filter((job) => job.data.campaignId === campaignId);

  for (const job of campaignJobs) {
    await job.remove();
  }

  console.log(`[COMMENT_POLLING] Removed ${campaignJobs.length} jobs for campaign ${campaignId}`);
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
  const waiting = await commentPollingQueue.getWaitingCount();
  const active = await commentPollingQueue.getActiveCount();
  const delayed = await commentPollingQueue.getDelayedCount();
  const completed = await commentPollingQueue.getCompletedCount();
  const failed = await commentPollingQueue.getFailedCount();

  return {
    waiting,
    active,
    delayed,
    completed,
    failed,
    total: waiting + active + delayed,
  };
}
