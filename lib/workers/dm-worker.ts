/**
 * DM Worker
 * Processes DM jobs from dm-queue, sends initial outreach DMs via Unipile
 * Tracks activity in pod_activities table
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { sendDirectMessage } from '../unipile-client';
import { DMJobData } from '../queues/dm-queue';

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Supabase client (service role for worker operations)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  const { data, error } = await supabase
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

  const { count, error } = await supabase
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
  const { error } = await supabase
    .from('pod_activities')
    .insert({
      campaign_id: jobData.campaign_id,
      unipile_account_id: jobData.unipile_account_id,
      linkedin_profile_id: jobData.recipient_linkedin_id,
      action: 'dm_sent',
      status,
      metadata: {
        linkedin_post_id: jobData.post_id,
        comment_id: jobData.comment_id,
        recipient_name: jobData.recipient_name,
        trigger_word: jobData.trigger_word,
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
    campaign: data.campaign_id,
    recipient: data.recipient_name,
    trigger: data.trigger_word,
  });

  // Get campaign configuration
  const config = await getCampaignConfig(data.campaign_id);
  if (!config) {
    throw new Error(`Campaign ${data.campaign_id} not found`);
  }

  // Check rate limits
  const dailyCount = await getDailyDMCount(data.unipile_account_id);
  if (dailyCount >= DAILY_DM_LIMIT) {
    const error = `Daily DM limit reached (${dailyCount}/${DAILY_DM_LIMIT})`;
    await recordDMActivity(data, 'failed', undefined, error);
    throw new Error(error);
  }

  // Build personalized message
  const template = config.dm_template || DEFAULT_DM_TEMPLATE;
  const message = buildDMMessage(
    template,
    data.recipient_name,
    config.lead_magnet_name
  );

  console.log(`[DM_WORKER] Sending DM to ${data.recipient_name}:`, {
    messageLength: message.length,
    dailyCount: dailyCount + 1,
  });

  try {
    // Send DM via Unipile
    const result = await sendDirectMessage(
      data.unipile_account_id,
      data.recipient_linkedin_id,
      message
    );

    // Record success
    await recordDMActivity(data, 'success', result.message_id);

    console.log(`[DM_WORKER] DM sent successfully:`, {
      messageId: result.message_id,
      recipient: data.recipient_name,
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

// Create the worker
export const dmWorker = new Worker<DMJobData>(
  'dm-delivery',
  async (job) => {
    return processDMJob(job);
  },
  {
    connection,
    concurrency: 2, // Process 2 DM jobs at a time
    limiter: {
      max: 10,
      duration: 60000, // Max 10 jobs per minute
    },
  }
);

// Event handlers
dmWorker.on('completed', (job, result) => {
  console.log(`[DM_WORKER] Job ${job.id} completed:`, result);
});

dmWorker.on('failed', (job, error) => {
  console.error(`[DM_WORKER] Job ${job?.id} failed:`, error.message);
});

dmWorker.on('error', (error) => {
  console.error('[DM_WORKER] Worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[DM_WORKER] Shutting down...');
  await dmWorker.close();
  await connection.quit();
  process.exit(0);
});

console.log('[DM_WORKER] DM worker started, listening for jobs...');
