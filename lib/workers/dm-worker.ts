/**
 * DM Worker
 * Processes DM jobs from dm-queue, sends initial outreach DMs via Unipile
 * Tracks activity in pod_activities table
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendDirectMessage } from '../unipile-client';
import { DMJobData } from '../queues/dm-queue';

// Lazy initialization - all created on first use AFTER env vars are loaded
let connection: Redis | null = null;
let supabase: SupabaseClient | null = null;
let worker: Worker<DMJobData> | null = null;

function getConnection(): Redis {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('[DM_WORKER] Creating Redis connection:', redisUrl.substring(0, 30) + '...');
    connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null
    });
  }
  return connection;
}

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabase;
}

// Rate limiting: LinkedIn allows ~100 DMs/day per account
const DAILY_DM_LIMIT = 100;
const DM_DELAY_MS = 30000; // 30 second delay between DMs to avoid rate limits

// Default DM template (can be overridden per campaign)
const DEFAULT_DM_TEMPLATE = `Hey {name}! Thanks for your interest in the post.

Drop your email and I'll send {lead_magnet_name} right over.

Looking forward to connecting!`;

interface CampaignConfig {
  lead_magnet_name: string;
  dm_template?: string;
  created_by: string;
}

/**
 * Get campaign configuration from database
 */
async function getCampaignConfig(campaignId: string): Promise<CampaignConfig | null> {
  const { data, error } = await getSupabase()
    .from('campaigns')
    .select(`
      dm_template_step1,
      created_by,
      lead_magnets!lead_magnet_id (name)
    `)
    .eq('id', campaignId)
    .single();

  if (error || !data) {
    console.error('[DM_WORKER] Failed to get campaign config:', error);
    return null;
  }

  // Extract lead magnet name from joined table (returns array or object)
  const leadMagnets = data.lead_magnets as { name: string } | { name: string }[] | null;
  const leadMagnet = Array.isArray(leadMagnets) ? leadMagnets[0] : leadMagnets;

  return {
    lead_magnet_name: leadMagnet?.name || 'the resource',
    dm_template: data.dm_template_step1,
    created_by: data.created_by,
  };
}

/**
 * Check daily DM count for rate limiting
 */
async function getDailyDMCount(unipileAccountId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await getSupabase()
    .from('pod_activities')
    .select('*', { count: 'exact', head: true })
    .eq('unipile_account_id', unipileAccountId)
    .eq('action', 'dm_sent')
    .gte('created_at', today.toISOString());

  if (error) {
    console.error('[DM_WORKER] Failed to get daily DM count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Build personalized DM message from template
 */
function buildDMMessage(
  template: string,
  recipientName: string,
  leadMagnetName: string
): string {
  return template
    .replace(/{name}/g, recipientName.split(' ')[0]) // Use first name only
    .replace(/{lead_magnet_name}/g, leadMagnetName);
}

/**
 * Record DM activity in pod_activities table
 */
async function recordDMActivity(
  jobData: DMJobData,
  status: 'success' | 'failed',
  messageId?: string,
  errorMessage?: string
): Promise<void> {
  const { error } = await getSupabase()
    .from('pod_activities')
    .insert({
      campaign_id: jobData.campaignId,
      unipile_account_id: jobData.accountId,
      linkedin_profile_id: jobData.recipientId,
      action: 'dm_sent',
      status,
      metadata: {
        linkedin_post_id: jobData.postId,
        comment_id: jobData.commentId,
        recipient_name: jobData.recipientName,
        message_id: messageId,
        error: errorMessage,
      },
    });

  if (error) {
    console.error('[DM_WORKER] Failed to record activity:', error);
  }
}

/**
 * Process a single DM job
 */
async function processDMJob(job: Job<DMJobData>): Promise<{ messageId: string }> {
  const data = job.data;
  console.log(`[DM_WORKER] Processing job ${job.id}:`, {
    campaign: data.campaignId,
    recipient: data.recipientName,
  });

  // Get campaign configuration
  const config = await getCampaignConfig(data.campaignId);
  if (!config) {
    throw new Error(`Campaign ${data.campaignId} not found`);
  }

  // Check rate limits
  const dailyCount = await getDailyDMCount(data.accountId);
  if (dailyCount >= DAILY_DM_LIMIT) {
    const error = `Daily DM limit reached (${dailyCount}/${DAILY_DM_LIMIT})`;
    await recordDMActivity(data, 'failed', undefined, error);
    throw new Error(error);
  }

  // Build personalized message
  const template = config.dm_template || DEFAULT_DM_TEMPLATE;
  const message = buildDMMessage(
    template,
    data.recipientName,
    config.lead_magnet_name
  );

  console.log(`[DM_WORKER] Sending DM to ${data.recipientName}:`, {
    messageLength: message.length,
    dailyCount: dailyCount + 1,
  });

  try {
    // Send DM via Unipile
    const result = await sendDirectMessage(
      data.accountId,
      data.recipientId,
      message
    );

    // Record success
    await recordDMActivity(data, 'success', result.message_id);

    console.log(`[DM_WORKER] DM sent successfully:`, {
      messageId: result.message_id,
      recipient: data.recipientName,
    });

    return { messageId: result.message_id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Record failure
    await recordDMActivity(data, 'failed', undefined, errorMessage);

    // Check if rate limited - don't retry immediately
    if (errorMessage.includes('RATE_LIMIT')) {
      console.error(`[DM_WORKER] Rate limited, will retry later`);
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    throw error;
  }
}

// Lazy worker initialization
function getWorker(): Worker<DMJobData> {
  if (!worker) {
    console.log('[DM_WORKER] Creating worker...');
    worker = new Worker<DMJobData>(
      'dm-delivery',
      async (job) => {
        return processDMJob(job);
      },
      {
        connection: getConnection(),
        concurrency: 2, // Process 2 DM jobs at a time
        limiter: {
          max: 10,
          duration: 60000, // Max 10 jobs per minute
        },
      }
    );

    // Event handlers
    worker.on('completed', (job, result) => {
      console.log(`[DM_WORKER] Job ${job.id} completed:`, result);
    });

    worker.on('failed', (job, error) => {
      console.error(`[DM_WORKER] Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
      console.error('[DM_WORKER] Worker error:', error);
    });

    console.log('[DM_WORKER] DM worker started, listening for jobs...');
  }
  return worker;
}

// Export the worker getter - creates worker on first access
export const dmWorker = {
  get instance() {
    return getWorker();
  },
  async close() {
    if (worker) {
      await worker.close();
    }
    if (connection) {
      await connection.quit();
    }
  }
};

// Initialize worker when this module is imported (after env vars loaded)
// The actual connection happens lazily on first access
getWorker();
