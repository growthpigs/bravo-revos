import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

export interface DMJobData {
  campaign_id: string;
  post_id: string;
  comment_id: string;
  recipient_linkedin_id: string;
  recipient_name: string;
  unipile_account_id: string;
  trigger_word: string;
  comment_text: string;
}

export const dmQueue = new Queue<DMJobData>('dm-delivery', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function queueDM(data: DMJobData): Promise<string> {
  const job = await dmQueue.add('send-dm', data, {
    jobId: `dm-${data.comment_id}-${Date.now()}`,
  });
  return job.id || '';
}
