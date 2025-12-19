import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Use a shared Redis connection for both the queue and workers
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
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
  gologinProfileId: string;  // GoLogin profile ID for browser automation
}

// Worker will be defined in lib/workers/repost-executor.ts
// We export the queue here for use in the trigger API
