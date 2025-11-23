/**
 * Reply Monitor
 * Polls DM inbox for email replies from leads, extracts emails,
 * sends to ESP webhook, and delivers lead magnet
 */

import * as dotenv from 'dotenv';
dotenv.config(); // Loads .env from cwd, or uses system env vars on Render

import { createClient } from '@supabase/supabase-js';
import { getDirectMessages, sendDirectMessage } from '../unipile-client';
import * as crypto from 'crypto';
import { OPENAI_MODELS } from '@/lib/config/openai-models';

// Supabase client (service role for worker operations)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Email extraction regex patterns
const EMAIL_PATTERNS = [
  // Standard email pattern
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // With surrounding text like "my email is..."
  /(?:email|e-mail|mail)(?:\s+is)?[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
];

interface PendingLead {
  id: string;
  campaign_id: string;
  recipient_linkedin_id: string;
  recipient_name: string;
  unipile_account_id: string;
  dm_sent_at: string;
  metadata: {
    post_id?: string;
    comment_id?: string;
    message_id?: string;
  };
}

interface CampaignWebhook {
  campaign_id: string;
  webhook_url: string;
  webhook_secret: string;
  lead_magnet_file_path: string;
  lead_magnet_name: string;
  created_by: string;
}

/**
 * Extract email from message text using regex
 */
function extractEmailRegex(text: string): string | null {
  for (const pattern of EMAIL_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Clean up the match - extract just the email part
      const email = matches[0].toLowerCase().trim();
      // Validate it looks like an email
      if (email.includes('@') && email.includes('.')) {
        return email;
      }
    }
  }
  return null;
}

/**
 * Extract email using GPT-4 for edge cases
 */
async function extractEmailGPT(text: string): Promise<string | null> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.warn('[REPLY_MONITOR] No OpenAI key, skipping GPT extraction');
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODELS.FAST,
        messages: [
          {
            role: 'system',
            content: 'Extract the email address from this message. Return ONLY the email address, nothing else. If no valid email is found, return "NONE".',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error('[REPLY_MONITOR] GPT extraction failed:', response.status);
      return null;
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim();

    if (result && result !== 'NONE' && result.includes('@')) {
      return result.toLowerCase();
    }

    return null;
  } catch (error) {
    console.error('[REPLY_MONITOR] GPT extraction error:', error);
    return null;
  }
}

/**
 * Generate signed URL for lead magnet with 24hr expiry
 */
function generateSignedURL(baseUrl: string, leadId: string): string {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const secret = process.env.URL_SIGNING_SECRET || 'default-secret';

  const payload = `${leadId}:${expiry}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 16);

  const url = new URL(baseUrl);
  url.searchParams.set('lead', leadId);
  url.searchParams.set('exp', expiry.toString());
  url.searchParams.set('sig', signature);

  return url.toString();
}

/**
 * Send lead data to ESP webhook with HMAC signing
 */
async function sendToESPWebhook(
  webhookUrl: string,
  webhookSecret: string,
  payload: {
    email: string;
    name: string;
    linkedin_id: string;
    campaign_id: string;
    lead_magnet_url: string;
  }
): Promise<boolean> {
  try {
    const body = JSON.stringify(payload);
    const timestamp = Date.now().toString();

    // Generate HMAC signature
    const signaturePayload = `${timestamp}.${body}`;
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signaturePayload)
      .digest('hex');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Signature': signature,
      },
      body,
    });

    if (!response.ok) {
      console.error('[REPLY_MONITOR] ESP webhook failed:', response.status);
      return false;
    }

    console.log('[REPLY_MONITOR] ESP webhook delivered successfully');
    return true;
  } catch (error) {
    console.error('[REPLY_MONITOR] ESP webhook error:', error);
    return false;
  }
}

/**
 * Get pending leads (DMs sent but no email captured yet)
 */
async function getPendingLeads(): Promise<PendingLead[]> {
  // Find DM activities that haven't had email captured
  const { data, error } = await supabase
    .from('pod_activities')
    .select('id, campaign_id, unipile_account_id, metadata, created_at')
    .eq('action', 'dm_sent')
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) {
    console.error('[REPLY_MONITOR] Failed to get pending leads:', error);
    return [];
  }

  // Filter out leads that already have email captured
  const leadIds = data.map(d => d.id);

  const { data: captured } = await supabase
    .from('pod_activities')
    .select('metadata->parent_activity_id')
    .eq('action', 'email_captured')
    .in('metadata->parent_activity_id', leadIds);

  const capturedIds = new Set(
    (captured || []).map((c: any) => c['metadata->parent_activity_id'])
  );

  return data
    .filter(d => !capturedIds.has(d.id))
    .map(d => ({
      id: d.id,
      campaign_id: d.campaign_id,
      recipient_linkedin_id: d.metadata?.recipient_linkedin_id,
      recipient_name: d.metadata?.recipient_name || 'there',
      unipile_account_id: d.unipile_account_id,
      dm_sent_at: d.created_at,
      metadata: d.metadata || {},
    }));
}

/**
 * Get campaign webhook configuration
 */
async function getCampaignWebhook(campaignId: string): Promise<CampaignWebhook | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id,
      created_by,
      webhook_configs!webhook_config_id (url, secret),
      lead_magnets!lead_magnet_id (name, file_path)
    `)
    .eq('id', campaignId)
    .single();

  if (error || !data) {
    console.error('[REPLY_MONITOR] Failed to get campaign webhook:', error);
    return null;
  }

  // Extract from joined tables (can return array or object)
  const webhooks = data.webhook_configs as { url: string; secret: string } | { url: string; secret: string }[] | null;
  const leadMagnets = data.lead_magnets as { name: string; file_path: string } | { name: string; file_path: string }[] | null;

  const webhook = Array.isArray(webhooks) ? webhooks[0] : webhooks;
  const leadMagnet = Array.isArray(leadMagnets) ? leadMagnets[0] : leadMagnets;

  return {
    campaign_id: data.id,
    webhook_url: webhook?.url || '',
    webhook_secret: webhook?.secret || '',
    lead_magnet_file_path: leadMagnet?.file_path || '',
    lead_magnet_name: leadMagnet?.name || 'your resource',
    created_by: data.created_by,
  };
}

/**
 * Check if message was already processed
 */
async function isMessageProcessed(messageId: string): Promise<boolean> {
  const { count } = await supabase
    .from('processed_messages')
    .select('*', { count: 'exact', head: true })
    .eq('message_id', messageId);

  return (count || 0) > 0;
}

/**
 * Mark message as processed
 */
async function markMessageProcessed(
  messageId: string,
  leadId: string,
  emailExtracted: string | null
): Promise<void> {
  await supabase.from('processed_messages').insert({
    message_id: messageId,
    lead_id: leadId,
    email_extracted: emailExtracted,
    processed_at: new Date().toISOString(),
  });
}

/**
 * Record email capture activity
 */
async function recordEmailCapture(
  lead: PendingLead,
  email: string,
  webhookDelivered: boolean
): Promise<void> {
  await supabase.from('pod_activities').insert({
    campaign_id: lead.campaign_id,
    unipile_account_id: lead.unipile_account_id,
    action: 'email_captured',
    status: 'success',
    metadata: {
      parent_activity_id: lead.id,
      email,
      recipient_linkedin_id: lead.recipient_linkedin_id,
      recipient_name: lead.recipient_name,
      webhook_delivered: webhookDelivered,
    },
  });
}

/**
 * Process a single lead's DM replies
 */
async function processLeadReplies(lead: PendingLead): Promise<{
  email_found: boolean;
  email?: string;
}> {
  console.log(`[REPLY_MONITOR] Checking replies for ${lead.recipient_name}`);

  // Get DM messages since we sent our initial DM
  const sinceDate = new Date(lead.dm_sent_at);
  const messages = await getDirectMessages(
    lead.unipile_account_id,
    lead.recipient_linkedin_id,
    sinceDate
  );

  if (!messages || messages.length === 0) {
    return { email_found: false };
  }

  // Process each message
  for (const message of messages) {
    // Skip if already processed
    if (await isMessageProcessed(message.id)) {
      continue;
    }

    console.log(`[REPLY_MONITOR] Processing message: "${message.text.substring(0, 50)}..."`);

    // Try regex extraction first
    let email = extractEmailRegex(message.text);

    // Fall back to GPT for edge cases
    if (!email) {
      email = await extractEmailGPT(message.text);
    }

    // Mark message as processed
    await markMessageProcessed(message.id, lead.id, email);

    if (!email) {
      continue;
    }

    console.log(`[REPLY_MONITOR] Email extracted: ${email}`);

    // Get campaign webhook config
    const config = await getCampaignWebhook(lead.campaign_id);
    if (!config) {
      console.error(`[REPLY_MONITOR] No campaign config for ${lead.campaign_id}`);
      continue;
    }

    // Generate signed lead magnet URL from file path
    // File path is stored in Supabase storage, construct full URL
    const baseUrl = config.lead_magnet_file_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lead-magnets/${config.lead_magnet_file_path}`
      : '';
    const signedUrl = baseUrl ? generateSignedURL(baseUrl, lead.id) : '';

    // Send to ESP webhook
    let webhookDelivered = false;
    if (config.webhook_url) {
      webhookDelivered = await sendToESPWebhook(
        config.webhook_url,
        config.webhook_secret,
        {
          email,
          name: lead.recipient_name,
          linkedin_id: lead.recipient_linkedin_id,
          campaign_id: lead.campaign_id,
          lead_magnet_url: signedUrl,
        }
      );
    }

    // Send backup DM with download link
    if (signedUrl) {
      const backupMessage = `Thanks ${lead.recipient_name.split(' ')[0]}! Here's your direct link to ${config.lead_magnet_name}:\n\n${signedUrl}\n\nI've also sent it to ${email}. Let me know if you have any questions!`;

      try {
        await sendDirectMessage(
          lead.unipile_account_id,
          lead.recipient_linkedin_id,
          backupMessage
        );
        console.log(`[REPLY_MONITOR] Backup DM sent to ${lead.recipient_name}`);
      } catch (error) {
        console.error(`[REPLY_MONITOR] Failed to send backup DM:`, error);
      }
    }

    // Record email capture
    await recordEmailCapture(lead, email, webhookDelivered);

    return { email_found: true, email };
  }

  return { email_found: false };
}

/**
 * Main polling function - process all pending leads
 */
export async function pollAllReplies(): Promise<{
  leads_checked: number;
  emails_captured: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let emailsCaptured = 0;

  // Get all pending leads
  const leads = await getPendingLeads();
  console.log(`[REPLY_MONITOR] Checking ${leads.length} pending leads`);

  // Process each lead
  for (const lead of leads) {
    try {
      const result = await processLeadReplies(lead);
      if (result.email_found) {
        emailsCaptured++;
        console.log(`[REPLY_MONITOR] Captured email for ${lead.recipient_name}: ${result.email}`);
      }
    } catch (error) {
      const errorMsg = `Error processing ${lead.recipient_name}: ${error instanceof Error ? error.message : 'Unknown'}`;
      errors.push(errorMsg);
      console.error(`[REPLY_MONITOR] ${errorMsg}`);
    }

    // Small delay between leads to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    leads_checked: leads.length,
    emails_captured: emailsCaptured,
    errors,
  };
}
