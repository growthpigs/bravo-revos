/**
 * Pod Amplification Queue
 *
 * Manages background jobs for LinkedIn post amplification via engagement pods.
 * Uses BullMQ for reliable job processing with retries and monitoring.
 */

import { config } from 'dotenv';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Load environment variables
config({ path: '.env.local' });

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Pod Amplification Job Data
export interface PodAmplificationJob {
  postId: string;
  postUrl: string;
  podId: string;
  authorUserId: string;
  createdAt: string;
}

// Pod Repost Job Data (individual member repost)
export interface PodRepostJob {
  podActivityId: string;
  podMemberId: string;
  postUrl: string;
  memberLinkedInUrl: string;
  unipileAccountId: string;
}

// Queue Definitions
export const podAmplificationQueue = new Queue<PodAmplificationJob>('pod-amplification', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5s, then 25s, then 125s
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
    },
  },
});

export const podRepostQueue = new Queue<PodRepostJob>('pod-repost', {
  connection,
  defaultJobOptions: {
    attempts: 2, // Only retry once for reposts
    backoff: {
      type: 'exponential',
      delay: 10000, // 10s first retry, 100s second
    },
    removeOnComplete: {
      count: 1000,
      age: 7 * 24 * 3600, // Keep for 7 days
    },
    removeOnFail: {
      count: 1000,
    },
  },
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await podAmplificationQueue.close();
  await podRepostQueue.close();
  await connection.quit();
});
