/**
 * Pod Amplification Queue (Lazy Initialization)
 *
 * Manages background jobs for LinkedIn post amplification via engagement pods.
 * Uses BullMQ for reliable job processing with retries and monitoring.
 *
 * IMPORTANT: Queues are created lazily to prevent build-time execution.
 */

import { Queue } from 'bullmq';
import { getRedis } from '@/lib/clients';

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

// Singleton instances (created lazily)
let _podAmplificationQueue: Queue<PodAmplificationJob> | null = null;
let _podRepostQueue: Queue<PodRepostJob> | null = null;

/**
 * Get Pod Amplification Queue (lazy initialization)
 */
export function getPodAmplificationQueue(): Queue<PodAmplificationJob> {
  if (!_podAmplificationQueue) {
    const connection = getRedis();
    _podAmplificationQueue = new Queue<PodAmplificationJob>('pod-amplification', {
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
  }
  return _podAmplificationQueue;
}

/**
 * Get Pod Repost Queue (lazy initialization)
 */
export function getPodRepostQueue(): Queue<PodRepostJob> {
  if (!_podRepostQueue) {
    const connection = getRedis();
    _podRepostQueue = new Queue<PodRepostJob>('pod-repost', {
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
  }
  return _podRepostQueue;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (_podAmplificationQueue) await _podAmplificationQueue.close();
  if (_podRepostQueue) await _podRepostQueue.close();
});
