import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '@/env';

// Use a shared Redis connection for both the queue and workers
const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const podAmplificationQueue = new Queue('podAmplification', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60 * 1000, // 1 minute
    },
  },
});

export interface PodAmplificationJob {
  podActivityId: string;
  postUrl: string;
  memberUnipileAccountId: string;
}

// Worker will be defined in lib/workers/repost-executor.ts
// We export the queue here for use in the trigger API
