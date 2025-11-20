import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

export interface AmplificationJobData {
  post_url: string;
  pod_id: string;
  author_user_id: string;
  timing_strategy: 'immediate' | 'staggered' | 'delayed';
  delay_minutes_min: number;
  delay_minutes_max: number;
}

export interface RepostJobData {
  member_id: string;
  post_url: string;
  unipile_account_id: string;
  pod_id: string;
}

export const amplificationQueue = new Queue<AmplificationJobData>('pod-amplification-orchestrator', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const repostQueue = new Queue<RepostJobData>('pod-amplification', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function queueAmplification(data: AmplificationJobData): Promise<string> {
  const job = await amplificationQueue.add('amplify-post', data, {
    jobId: `amp-${data.pod_id}-${Date.now()}`,
  });
  return job.id || '';
}

export async function queueRepost(data: RepostJobData, delayMs: number): Promise<string> {
  const job = await repostQueue.add('repost', data, {
    jobId: `repost-${data.member_id}-${Date.now()}`,
    delay: delayMs,
  });
  return job.id || '';
}
