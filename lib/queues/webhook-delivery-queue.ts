/**
 * Webhook Delivery Queue System
 * Manages webhook delivery with retry logic and exponential backoff
 */

import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnectionSync } from '../redis';
import { createClient } from '@supabase/supabase-js';
import {
  sendWebhook,
  shouldRetry,
  calculateRetryDelay,
  WebhookPayload,
  generateWebhookSignature,
} from '../webhook-delivery';

const QUEUE_NAME = 'webhook-delivery';
const LOG_PREFIX = '[WEBHOOK_QUEUE]';

export interface WebhookJobData {
  deliveryId: string;
  leadId: string;
  webhookUrl: string;
  webhookSecret: string;
  payload: WebhookPayload;
  attempt: number;
  maxAttempts: number;
}

/**
 * Create webhook delivery queue
 */
export function createWebhookQueue(): Queue<WebhookJobData> {
  const connection = getRedisConnectionSync();

  const queue = new Queue<WebhookJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 4, // Will be handled manually with exponential backoff
      removeOnComplete: {
        age: 7 * 24 * 60 * 60, // Keep completed jobs for 7 days
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 30 * 24 * 60 * 60, // Keep failed jobs for 30 days
        count: 5000, // Keep last 5000 failed jobs
      },
    },
  });

  return queue;
}

/**
 * Add webhook delivery job to queue
 */
export async function queueWebhookDelivery(data: WebhookJobData): Promise<Job<WebhookJobData>> {
  const queue = createWebhookQueue();

  // Calculate delay for retry attempts
  const delay = data.attempt > 1 ? calculateRetryDelay(data.attempt) : 0;

  const job = await queue.add(
    'deliver-webhook',
    data,
    {
      jobId: `webhook-${data.deliveryId}-attempt-${data.attempt}`,
      delay,
      priority: data.attempt === 1 ? 10 : 5, // First attempts get priority
    }
  );

  console.log(
    `${LOG_PREFIX} Queued webhook delivery ${data.deliveryId} (attempt ${data.attempt}/${data.maxAttempts}) with ${delay}ms delay`
  );

  return job;
}

/**
 * Get webhook delivery queue status
 */
export async function getWebhookQueueStatus() {
  const queue = createWebhookQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

/**
 * Get pending webhook deliveries for a lead
 */
export async function getPendingWebhooksForLead(leadId: string): Promise<Job<WebhookJobData>[]> {
  const queue = createWebhookQueue();

  const [waiting, active, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getDelayed(),
  ]);

  const allJobs = [...waiting, ...active, ...delayed];

  return allJobs.filter((job) => job.data.leadId === leadId);
}

/**
 * Cancel webhook delivery
 */
export async function cancelWebhookDelivery(deliveryId: string): Promise<boolean> {
  const queue = createWebhookQueue();

  // Find job by delivery ID
  const [waiting, active, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getDelayed(),
  ]);

  const allJobs = [...waiting, ...active, ...delayed];
  const job = allJobs.find((j) => j.data.deliveryId === deliveryId);

  if (job) {
    await job.remove();
    console.log(`${LOG_PREFIX} Cancelled webhook delivery ${deliveryId}`);
    return true;
  }

  return false;
}

/**
 * Create webhook delivery worker
 */
export function createWebhookWorker(): Worker<WebhookJobData> {
  const connection = getRedisConnectionSync();

  const worker = new Worker<WebhookJobData>(
    QUEUE_NAME,
    async (job: Job<WebhookJobData>) => {
      const { deliveryId, leadId, webhookUrl, webhookSecret, payload, attempt, maxAttempts } =
        job.data;

      console.log(
        `${LOG_PREFIX} Processing delivery ${deliveryId} (attempt ${attempt}/${maxAttempts})`
      );

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Generate signature
      const signature = generateWebhookSignature(payload, webhookSecret);

      // Send webhook
      const result = await sendWebhook({
        id: deliveryId,
        webhookUrl,
        payload,
        signature,
        attempt,
        maxAttempts,
        status: 'pending',
      });

      // Update delivery record
      const MAX_RESPONSE_LENGTH = 1000;
      const updateData: any = {
        status: result.success ? 'success' : attempt >= maxAttempts ? 'failed' : 'sent',
        attempt,
        response_status: result.status,
        response_body:
          result.body.length > MAX_RESPONSE_LENGTH
            ? result.body.substring(0, MAX_RESPONSE_LENGTH) + ' [TRUNCATED]'
            : result.body,
        last_error: result.error,
        sent_at: new Date().toISOString(),
      };

      // Create WebhookDelivery object for shouldRetry check
      const deliveryForRetry = {
        id: deliveryId,
        webhookUrl,
        payload,
        signature,
        attempt,
        maxAttempts,
        status: 'sent' as const,
      };

      // If failed and should retry, calculate next retry time
      if (!result.success && shouldRetry(deliveryForRetry, result)) {
        const nextDelay = calculateRetryDelay(attempt + 1);
        updateData.next_retry_at = new Date(Date.now() + nextDelay).toISOString();

        // Queue next attempt
        await queueWebhookDelivery({
          ...job.data,
          attempt: attempt + 1,
        });

        console.log(
          `${LOG_PREFIX} Delivery ${deliveryId} failed, retry ${attempt + 1} scheduled in ${nextDelay}ms`
        );
      } else if (result.success) {
        console.log(`${LOG_PREFIX} Delivery ${deliveryId} succeeded`);

        // Update lead status to webhook_sent
        await supabase.from('lead').update({ status: 'webhook_sent' }).eq('id', leadId);
      } else {
        console.log(
          `${LOG_PREFIX} Delivery ${deliveryId} permanently failed after ${attempt} attempts`
        );
      }

      // Update webhook_deliveries table
      await supabase.from('webhook_delivery').update(updateData).eq('id', deliveryId);

      // Log delivery attempt
      await supabase.from('webhook_delivery_logs').insert({
        delivery_id: deliveryId,
        attempt_number: attempt,
        attempted_at: new Date().toISOString(),
        response_status: result.status,
        response_body:
          result.body.length > MAX_RESPONSE_LENGTH
            ? result.body.substring(0, MAX_RESPONSE_LENGTH) + ' [TRUNCATED]'
            : result.body,
        error: result.error,
        error_type: result.error ? (result.status === 0 ? 'network' : 'http') : null,
        will_retry: !result.success && shouldRetry(deliveryForRetry, result),
        retry_at: updateData.next_retry_at,
      });

      return result;
    },
    {
      connection,
      concurrency: 5, // Process 5 webhooks concurrently
      limiter: {
        max: 50, // Max 50 jobs per duration
        duration: 1000, // Per second
      },
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`${LOG_PREFIX} Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`${LOG_PREFIX} Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error(`${LOG_PREFIX} Worker error:`, error);
  });

  return worker;
}
