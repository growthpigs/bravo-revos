/**
 * Comment Polling Queue
 * BullMQ queue for LinkedIn comment monitoring with anti-pattern detection
 */

import { Queue, Worker, Job } from 'bullmq';
import { getAllPostComments } from '../unipile-client';
import { processComments } from '../comment-processor';
import { getRedisConnection } from '../redis';
import { COMMENT_POLLING_CONFIG, LOGGING_CONFIG } from '../config';
import { validateCommentPollingJobData } from '../validation';

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
const LOG_PREFIX = LOGGING_CONFIG.PREFIX_COMMENT_POLLING;

// Create queue
export const commentPollingQueue = new Queue<CommentPollingJobData>(QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: COMMENT_POLLING_CONFIG.QUEUE_ATTEMPTS,
    backoff: {
      type: COMMENT_POLLING_CONFIG.BACKOFF_TYPE as any,
      delay: COMMENT_POLLING_CONFIG.BACKOFF_INITIAL_DELAY_MS,
    },
    removeOnComplete: {
      count: COMMENT_POLLING_CONFIG.COMPLETED_JOB_KEEP_COUNT,
      age: COMMENT_POLLING_CONFIG.COMPLETED_JOB_AGE_DAYS * 86400,
    },
    removeOnFail: {
      count: COMMENT_POLLING_CONFIG.FAILED_JOB_KEEP_COUNT,
      age: COMMENT_POLLING_CONFIG.FAILED_JOB_AGE_DAYS * 86400,
    },
  },
});

/**
 * Calculate next polling delay with randomization and jitter
 * Returns delay in milliseconds
 */
function calculateNextDelay(): number {
  // Base: Random between configured min-max minutes
  const baseMinutes =
    COMMENT_POLLING_CONFIG.MIN_POLL_DELAY_MIN +
    Math.random() * (COMMENT_POLLING_CONFIG.MAX_POLL_DELAY_MIN - COMMENT_POLLING_CONFIG.MIN_POLL_DELAY_MIN);

  // Jitter: ±configured minutes
  const jitterMinutes = (Math.random() - 0.5) * (COMMENT_POLLING_CONFIG.JITTER_MIN * 2);

  // Convert to milliseconds
  const totalMinutes = baseMinutes + jitterMinutes;
  return Math.floor(totalMinutes * 60 * 1000);
}

/**
 * Check if current time is within working hours
 * Returns true if within working hours, false otherwise
 */
function isWithinWorkingHours(timezone?: string): boolean {
  const now = new Date();

  // TODO: Implement timezone conversion when timezone provided
  // For now, use local time
  const hour = now.getHours();

  return (
    hour >= COMMENT_POLLING_CONFIG.WORKING_HOURS_START &&
    hour < COMMENT_POLLING_CONFIG.WORKING_HOURS_END
  );
}

/**
 * Determine if this poll should be skipped
 */
function shouldSkipPoll(): boolean {
  return Math.random() < COMMENT_POLLING_CONFIG.SKIP_POLL_PERCENTAGE;
}

/**
 * Generate personalized DM message based on trigger words
 * TODO: Replace with template system in Phase D
 */
function generateDMMessage(recipientName: string, triggerWords: string[]): string {
  const firstName = recipientName.split(' ')[0];

  // Simple template for now - will be replaced with proper template system
  const templates = [
    `Hi ${firstName}! I saw your comment about ${triggerWords[0].toLowerCase()}. I'd love to share how we help businesses with this. Can we connect?`,
    `Hey ${firstName}, thanks for engaging with my post! I noticed you mentioned ${triggerWords[0].toLowerCase()}. I have some insights that might be valuable for you. Would you like to chat?`,
    `${firstName}, great to see your interest in ${triggerWords[0].toLowerCase()}! I work with businesses on exactly this. Mind if I send you some info?`,
  ];

  // Randomly select template
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template;
}

/**
 * Schedule next polling job with randomized delay
 */
async function scheduleNextPoll(jobData: CommentPollingJobData): Promise<void> {
  const delay = calculateNextDelay();
  const delayMinutes = (delay / 60000).toFixed(1);

  console.log(`${LOG_PREFIX} Scheduling next poll in ${delayMinutes} minutes`);

  await commentPollingQueue.add('poll-comments', jobData, {
    delay,
    jobId: `poll-${jobData.campaignId}-${Date.now()}`, // Unique job ID
  });
}

/**
 * Process comment polling job
 */
async function processCommentPollingJob(job: Job<CommentPollingJobData>): Promise<void> {
  // Validate input
  validateCommentPollingJobData(job.data);

  const { accountId, postId, triggerWords, campaignId, userId, timezone } = job.data;

  console.log(`${LOG_PREFIX} Processing job for campaign ${campaignId}, post ${postId}`);

  // Check if within working hours
  if (!isWithinWorkingHours(timezone)) {
    console.log(`${LOG_PREFIX} Outside working hours, skipping and rescheduling`);
    await scheduleNextPoll(job.data);
    return;
  }

  // Random skip chance
  if (shouldSkipPoll()) {
    console.log(`${LOG_PREFIX} Random skip triggered, rescheduling`);
    await scheduleNextPoll(job.data);
    return;
  }

  try {
    // Fetch comments from Unipile
    const comments = await getAllPostComments(accountId, postId);
    console.log(`${LOG_PREFIX} Fetched ${comments.length} comments`);

    // Process comments (bot filtering + trigger word detection)
    const validComments = processComments(comments, triggerWords);
    console.log(`${LOG_PREFIX} ${validComments.length} valid comments with trigger words`);

    // Queue DMs for valid comments (C-03 integration)
    const { queueDM } = await import('./dm-queue');

    for (const processed of validComments) {
      console.log(`${LOG_PREFIX} Queueing DM for: ${processed.comment.author.name}`);
      console.log(`  - Matched words: ${processed.matchedTriggerWords.join(', ')}`);
      console.log(`  - Bot score: ${processed.botScore}`);

      try {
        // Generate personalized DM message
        const message = generateDMMessage(
          processed.comment.author.name,
          processed.matchedTriggerWords
        );

        // Queue DM for delivery
        const result = await queueDM({
          accountId,
          recipientId: processed.comment.author.id,
          recipientName: processed.comment.author.name,
          message,
          campaignId,
          userId,
          commentId: processed.comment.id,
          postId,
        });

        console.log(`${LOG_PREFIX} ✅ DM queued (Job ID: ${result.jobId})`);
        console.log(
          `  - Rate limit: ${result.rateLimitStatus.sentToday}/${result.rateLimitStatus.limit}`
        );
      } catch (error) {
        console.error(
          `${LOG_PREFIX} ❌ Failed to queue DM for ${processed.comment.author.name}:`,
          error
        );
        // Continue with other comments even if one fails
      }
    }

    // Schedule next poll
    await scheduleNextPoll(job.data);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error polling comments:`, error);
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
    connection: getRedisConnection(),
    concurrency: COMMENT_POLLING_CONFIG.QUEUE_CONCURRENCY || 3,
  }
);

// Worker event handlers
commentPollingWorker.on('completed', (job) => {
  console.log(`${LOG_PREFIX} Job ${job.id} completed successfully`);
});

commentPollingWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} failed:`, err);
});

/**
 * Start comment polling for a campaign
 * This is called when a campaign is created/activated
 */
export async function startCommentPolling(jobData: CommentPollingJobData): Promise<void> {
  validateCommentPollingJobData(jobData);

  console.log(`${LOG_PREFIX} Starting polling for campaign ${jobData.campaignId}`);

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
  console.log(`${LOG_PREFIX} Stopping polling for campaign ${campaignId}`);

  // Remove all jobs for this campaign
  const jobs = await commentPollingQueue.getJobs(['waiting', 'delayed', 'active']);
  const campaignJobs = jobs.filter((job) => job.data.campaignId === campaignId);

  for (const job of campaignJobs) {
    await job.remove();
  }

  console.log(`${LOG_PREFIX} Removed ${campaignJobs.length} jobs for campaign ${campaignId}`);
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
