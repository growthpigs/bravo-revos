import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Lazy initialization - connection created on first use
let connection: Redis | null = null;
let queue: Queue<DMJobData> | null = null;

function getConnection(): Redis {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('[DM_QUEUE] Creating Redis connection:', redisUrl.substring(0, 30) + '...');
    connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null
    });
  }
  return connection;
}

function getQueue(): Queue<DMJobData> {
  if (!queue) {
    queue = new Queue<DMJobData>('dm-delivery', {
      connection: getConnection(),
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
  }
  return queue;
}

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

// Export getter instead of instance
export const dmQueue = {
  get instance() {
    return getQueue();
  }
};

export async function queueDM(data: DMJobData): Promise<string> {
  const job = await getQueue().add('send-dm', data, {
    jobId: `dm-${data.comment_id}-${Date.now()}`,
  });
  return job.id || '';
}

// Export connection getter for worker
export function getDMQueueConnection(): Redis {
  return getConnection();
}
