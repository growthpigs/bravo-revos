/**
 * DM Queue System with Rate Limiting
 * Manages LinkedIn DM delivery with 100 DMs/day per account limit
 */

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { sendDirectMessage } from '../unipile-client';

const QUEUE_NAME = 'dm-delivery';

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

// Redis connection for queue
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// DM delivery queue with retry configuration
export const dmQueue = new Queue<DMJobData>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 5, // Retry up to 5 times
    backoff: {
      type: 'exponential',
      delay: 30000, // Start with 30 seconds, doubles each retry
    },
    removeOnComplete: {
      count: 1000,
      age: 86400 * 7, // Keep completed jobs for 7 days
    },
    removeOnFail: {
      count: 500,
      age: 86400 * 30, // Keep failed jobs for 30 days
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
  const key = getDMCountKey(accountId);
  const count = await connection.get(key);
  const sentToday = count ? parseInt(count, 10) : 0;
  const limit = 100; // LinkedIn limit
  const remaining = Math.max(0, limit - sentToday);

  // Calculate reset time (midnight UTC)
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setUTCDate(resetTime.getUTCDate() + 1);
  resetTime.setUTCHours(0, 0, 0, 0);

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
  const key = getDMCountKey(accountId);

  // Increment counter
  const newCount = await connection.incr(key);

  // Set expiry to midnight UTC if this is the first DM today
  if (newCount === 1) {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCDate(midnight.getUTCDate() + 1);
    midnight.setUTCHours(0, 0, 0, 0);
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
  // Check rate limit first
  const rateLimitStatus = await checkRateLimit(data.accountId);

  if (rateLimitStatus.remaining <= 0) {
    console.log(
      `[DM_QUEUE] Rate limit reached for account ${data.accountId} (${rateLimitStatus.sentToday}/${rateLimitStatus.limit})`
    );

    // Still queue the job, but it will wait until tomorrow
    const delayUntilReset = rateLimitStatus.resetTime.getTime() - Date.now();

    const job = await dmQueue.add('send-dm', data, {
      jobId: `dm-${data.campaignId}-${data.recipientId}-${Date.now()}`,
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
    jobId: `dm-${data.campaignId}-${data.recipientId}-${Date.now()}`,
  });

  console.log(
    `[DM_QUEUE] Queued DM for ${data.recipientName} (${rateLimitStatus.sentToday + 1}/${rateLimitStatus.limit})`
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

  console.log(`[DM_QUEUE] Processing DM job ${job.id} for ${recipientName}`);

  // Double-check rate limit before sending
  const rateLimitStatus = await checkRateLimit(accountId);

  if (rateLimitStatus.remaining <= 0) {
    console.log(
      `[DM_QUEUE] Rate limit exceeded, delaying until ${rateLimitStatus.resetTime.toISOString()}`
    );

    // Reschedule for tomorrow
    const delayUntilReset = rateLimitStatus.resetTime.getTime() - Date.now();
    await job.moveToDelayed(delayUntilReset, job.token);
    return;
  }

  try {
    // Send DM via Unipile
    const result = await sendDirectMessage(accountId, recipientId, message);

    console.log(`[DM_QUEUE] ✅ DM sent successfully:`, {
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
    console.error(`[DM_QUEUE] ❌ Failed to send DM (attempt ${job.attemptsMade + 1}/${job.opts.attempts}):`, error);

    // Check if it's a rate limit error from Unipile
    if (error instanceof Error && error.message.includes('RATE_LIMIT_EXCEEDED')) {
      // If Unipile reports rate limit, respect it and delay
      const rateLimitStatus = await checkRateLimit(accountId);
      const delayUntilReset = rateLimitStatus.resetTime.getTime() - Date.now();

      console.log(`[DM_QUEUE] Unipile rate limit hit, delaying until ${rateLimitStatus.resetTime.toISOString()}`);
      await job.moveToDelayed(delayUntilReset, job.token);
      return;
    }

    // For other errors, let BullMQ handle retry with exponential backoff
    throw error;
  }
}

// Start DM delivery worker
export const dmWorker = new Worker<DMJobData>(
  QUEUE_NAME,
  processDMJob,
  {
    connection,
    concurrency: 3, // Process 3 DMs at a time (conservative)
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute (safety limit)
    },
  }
);

// Worker event handlers
dmWorker.on('completed', (job) => {
  console.log(`[DM_QUEUE] Job ${job.id} completed for ${job.data.recipientName}`);
});

dmWorker.on('failed', (job, error) => {
  console.error(`[DM_QUEUE] Job ${job?.id} failed permanently:`, error.message);
  // TODO: Mark as failed in database (Phase D)
});

dmWorker.on('error', (error) => {
  console.error('[DM_QUEUE] Worker error:', error);
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

  console.log(`[DM_QUEUE] Cancelled ${cancelledCount} jobs for campaign ${campaignId}`);
  return cancelledCount;
}

/**
 * Pause DM queue (emergency stop)
 */
export async function pauseQueue(): Promise<void> {
  await dmQueue.pause();
  console.log('[DM_QUEUE] Queue paused');
}

/**
 * Resume DM queue
 */
export async function resumeQueue(): Promise<void> {
  await dmQueue.resume();
  console.log('[DM_QUEUE] Queue resumed');
}
