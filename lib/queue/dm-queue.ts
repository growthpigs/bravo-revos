/**
 * DM Queue System with Rate Limiting
 * Manages LinkedIn DM delivery with 100 DMs/day per account limit
 */

import { Queue, Worker, Job } from 'bullmq';
import { sendDirectMessage } from '../unipile-client';
import { getRedisConnection } from '../redis';
import { DM_QUEUE_CONFIG, LOGGING_CONFIG } from '../config';
import { validateDMJobData, validateAccountId } from '../validation';

const QUEUE_NAME = 'dm-delivery';
const LOG_PREFIX = LOGGING_CONFIG.PREFIX_DM_QUEUE;

/**
 * Generate unique job ID for DM queue
 * Format: dm-{campaignId}-{recipientId}-{timestamp}
 */
export function generateJobId(campaignId: string, recipientId: string): string {
  return `dm-${campaignId}-${recipientId}-${Date.now()}`;
}

/**
 * Calculate next midnight UTC from given date
 * Used for daily DM limit reset
 */
function getNextMidnightUTC(date: Date): Date {
  const midnight = new Date(date);
  midnight.setUTCDate(midnight.getUTCDate() + 1);
  midnight.setUTCHours(0, 0, 0, 0);
  return midnight;
}

export interface DMJobData {
  accountId: string;
  recipientId: string;
  recipientName: string;
  message: string;
  campaignId: string;
  userId: string;
  commentId?: string; // Optional: Link to original comment
  postId?: string; // Optional: Link to original post
}

export interface RateLimitStatus {
  accountId: string;
  sentToday: number;
  limit: number;
  remaining: number;
  resetTime: Date;
}

// DM delivery queue with retry configuration
export const dmQueue = new Queue<DMJobData>(QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: DM_QUEUE_CONFIG.QUEUE_ATTEMPTS,
    backoff: {
      type: DM_QUEUE_CONFIG.BACKOFF_TYPE as 'exponential' | 'fixed',
      delay: DM_QUEUE_CONFIG.BACKOFF_INITIAL_DELAY_MS,
    },
    removeOnComplete: {
      count: DM_QUEUE_CONFIG.COMPLETED_JOB_KEEP_COUNT,
      age: DM_QUEUE_CONFIG.COMPLETED_JOB_AGE_DAYS * DM_QUEUE_CONFIG.SECONDS_PER_DAY,
    },
    removeOnFail: {
      count: DM_QUEUE_CONFIG.FAILED_JOB_KEEP_COUNT,
      age: DM_QUEUE_CONFIG.FAILED_JOB_AGE_DAYS * DM_QUEUE_CONFIG.SECONDS_PER_DAY,
    },
  },
});

/**
 * Get the Redis key for tracking DM count per account per day
 */
function getDMCountKey(accountId: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `dm-count:${accountId}:${today}`;
}

/**
 * Check if account has reached daily DM limit
 * @returns RateLimitStatus with current usage
 */
export async function checkRateLimit(accountId: string): Promise<RateLimitStatus> {
  validateAccountId(accountId);

  const connection = getRedisConnection();
  const key = getDMCountKey(accountId);
  const count = await connection.get(key);
  const sentToday = count ? parseInt(count, 10) : 0;
  const limit = DM_QUEUE_CONFIG.DM_DAILY_LIMIT;
  const remaining = Math.max(0, limit - sentToday);

  // Calculate reset time (midnight UTC)
  const now = new Date();
  const resetTime = getNextMidnightUTC(now);

  return {
    accountId,
    sentToday,
    limit,
    remaining,
    resetTime,
  };
}

/**
 * Increment DM count for account
 * Sets expiry to midnight UTC (24 hours + remaining seconds to midnight)
 */
async function incrementDMCount(accountId: string): Promise<number> {
  const connection = getRedisConnection();
  const key = getDMCountKey(accountId);

  // Increment counter
  const newCount = await connection.incr(key);

  // Set expiry to midnight UTC if this is the first DM today
  if (newCount === 1) {
    const now = new Date();
    const midnight = getNextMidnightUTC(now);
    const secondsUntilMidnight = Math.floor((midnight.getTime() - now.getTime()) / 1000);

    await connection.expire(key, secondsUntilMidnight);
  }

  return newCount;
}

/**
 * Queue a DM for delivery
 * Checks rate limit before queueing
 */
export async function queueDM(data: DMJobData): Promise<{
  jobId: string;
  rateLimitStatus: RateLimitStatus;
  queued: boolean;
}> {
  // Validate input
  validateDMJobData(data);

  // Check rate limit first
  const rateLimitStatus = await checkRateLimit(data.accountId);

  if (rateLimitStatus.remaining <= 0) {
    console.log(
      `${LOG_PREFIX} Rate limit reached for account ${data.accountId} (${rateLimitStatus.sentToday}/${rateLimitStatus.limit})`
    );

    // Still queue the job, but it will wait until tomorrow
    const delayUntilReset = rateLimitStatus.resetTime.getTime() - Date.now();

    const job = await dmQueue.add('send-dm', data, {
      jobId: generateJobId(data.campaignId, data.recipientId),
      delay: delayUntilReset,
    });

    return {
      jobId: job.id!,
      rateLimitStatus,
      queued: true,
    };
  }

  // Queue immediately
  const job = await dmQueue.add('send-dm', data, {
    jobId: generateJobId(data.campaignId, data.recipientId),
  });

  console.log(
    `${LOG_PREFIX} Queued DM for ${data.recipientName} (${rateLimitStatus.sentToday + 1}/${rateLimitStatus.limit})`
  );

  return {
    jobId: job.id!,
    rateLimitStatus,
    queued: true,
  };
}

/**
 * Process DM delivery job
 * Sends DM via Unipile and handles rate limits
 */
async function processDMJob(job: Job<DMJobData>): Promise<void> {
  const { accountId, recipientId, recipientName, message, campaignId } = job.data;

  console.log(`${LOG_PREFIX} Processing DM job ${job.id} for ${recipientName}`);

  // Double-check rate limit before sending
  const rateLimitStatus = await checkRateLimit(accountId);

  if (rateLimitStatus.remaining <= 0) {
    console.log(
      `${LOG_PREFIX} Rate limit exceeded, delaying until ${rateLimitStatus.resetTime.toISOString()}`
    );

    // Reschedule for tomorrow
    const delayUntilReset = rateLimitStatus.resetTime.getTime() - Date.now();
    await job.moveToDelayed(delayUntilReset, job.token);
    return;
  }

  try {
    // Send DM via Unipile
    const result = await sendDirectMessage(accountId, recipientId, message);

    console.log(`${LOG_PREFIX} ✅ DM sent successfully:`, {
      jobId: job.id,
      messageId: result.message_id,
      recipient: recipientName,
      campaignId,
    });

    // Increment counter after successful send
    await incrementDMCount(accountId);

    // TODO: Update dm_sequences table with success status (Phase D)
    // await supabase.from('dm_sequences').update({ status: 'sent', sent_at: new Date() })

    return;
  } catch (error) {
    console.error(
      `${LOG_PREFIX} ❌ Failed to send DM (attempt ${job.attemptsMade + 1}/${job.opts.attempts}):`,
      error
    );

    // Check if it's a rate limit error from Unipile
    if (error instanceof Error && error.message.includes('RATE_LIMIT_EXCEEDED')) {
      // If Unipile reports rate limit, respect it and delay
      const rateLimitStatus = await checkRateLimit(accountId);
      const delayUntilReset = rateLimitStatus.resetTime.getTime() - Date.now();

      console.log(
        `${LOG_PREFIX} Unipile rate limit hit, delaying until ${rateLimitStatus.resetTime.toISOString()}`
      );
      await job.moveToDelayed(delayUntilReset, job.token);
      return;
    }

    // For other errors, let BullMQ handle retry with exponential backoff
    throw error;
  }
}

// Start DM delivery worker
export const dmWorker = new Worker<DMJobData>(QUEUE_NAME, processDMJob, {
  connection: getRedisConnection(),
  concurrency: DM_QUEUE_CONFIG.QUEUE_CONCURRENCY,
  limiter: {
    max: DM_QUEUE_CONFIG.RATE_LIMITER_MAX_JOBS,
    duration: DM_QUEUE_CONFIG.RATE_LIMITER_DURATION_MS,
  },
});

// Worker event handlers
dmWorker.on('completed', (job) => {
  console.log(`${LOG_PREFIX} Job ${job.id} completed for ${job.data.recipientName}`);
});

dmWorker.on('failed', (job, error) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} failed permanently:`, error.message);
  // TODO: Mark as failed in database (Phase D)
});

dmWorker.on('error', (error) => {
  console.error(`${LOG_PREFIX} Worker error:`, error);
});

/**
 * Get queue statistics
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
    dmQueue.getWaitingCount(),
    dmQueue.getActiveCount(),
    dmQueue.getDelayedCount(),
    dmQueue.getCompletedCount(),
    dmQueue.getFailedCount(),
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

/**
 * Get all jobs for a campaign
 */
export async function getCampaignJobs(campaignId: string): Promise<Job<DMJobData>[]> {
  const jobs = await dmQueue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);

  return jobs.filter((job) => job.data.campaignId === campaignId);
}

/**
 * Cancel all jobs for a campaign
 */
export async function cancelCampaignJobs(campaignId: string): Promise<number> {
  const jobs = await getCampaignJobs(campaignId);
  let cancelledCount = 0;

  for (const job of jobs) {
    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      cancelledCount++;
    }
  }

  console.log(`${LOG_PREFIX} Cancelled ${cancelledCount} jobs for campaign ${campaignId}`);
  return cancelledCount;
}

/**
 * Pause DM queue (emergency stop)
 */
export async function pauseQueue(): Promise<void> {
  await dmQueue.pause();
  console.log(`${LOG_PREFIX} Queue paused`);
}

/**
 * Resume DM queue
 */
export async function resumeQueue(): Promise<void> {
  await dmQueue.resume();
  console.log(`${LOG_PREFIX} Queue resumed`);
}
