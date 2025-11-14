import { z } from 'zod';
import { tool } from '@openai/agents';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import crypto from 'crypto';

interface WebhookDelivery {
  id: string;
  webhook_url: string;
  payload: any;
  headers: Record<string, string>;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  response_code?: number;
  response_body?: string;
  error_message?: string;
  created_at: string;
  delivered_at?: string;
}

interface LeadData {
  email: string;
  first_name?: string;
  last_name?: string;
  linkedin_url?: string;
  campaign_id?: string;
  lead_magnet?: string;
  source: 'linkedin_dm' | 'linkedin_comment' | 'manual' | 'import';
  custom_fields?: Record<string, any>;
}

export class WebhookChip extends BaseChip {
  id = 'webhook-chip';
  name = 'Webhook Trigger';
  description = 'Send lead data to Email Service Providers via webhooks';
  category = 'integration' as const;

  getTool() {
    return tool({
      name: 'trigger_webhook',
      description: 'Send lead data to user\'s Email Service Provider (ConvertKit, Mailchimp, etc) via webhook.',
      parameters: z.object({
        action: z.enum(['send', 'bulk_send', 'test', 'check_status']).describe('Webhook action'),
        webhook_url: z.string().optional().describe('ESP webhook endpoint URL'),
        lead_data: z.object({
          email: z.string().email(),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
          linkedin_url: z.string().optional(),
          campaign_id: z.string().optional(),
          lead_magnet: z.string().optional(),
          source: z.enum(['linkedin_dm', 'linkedin_comment', 'manual', 'import']).default('linkedin_dm'),
          custom_fields: z.record(z.any()).optional()
        }).optional().describe('Lead information to send'),
        leads: z.array(z.object({
          email: z.string().email(),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
        })).optional().describe('Multiple leads for bulk send'),
        retry_on_failure: z.boolean().default(true).describe('Retry with exponential backoff if webhook fails'),
        webhook_secret: z.string().optional().describe('Secret for HMAC signature'),
        delivery_id: z.string().optional().describe('Check status of specific delivery'),
      }),
      execute: async (input, context) => {
        const agentContext = extractAgentContext(context);
        return this.execute(input, agentContext);
      }
    });
  }

  async execute(input: any, context: AgentContext): Promise<any> {
    const { action, webhook_url, lead_data, leads, retry_on_failure, webhook_secret, delivery_id } = input;

    try {
      switch (action) {
        case 'send':
          return await this.sendWebhook(
            context,
            webhook_url,
            lead_data,
            retry_on_failure,
            webhook_secret
          );

        case 'bulk_send':
          return await this.bulkSendWebhooks(
            context,
            webhook_url,
            leads || [],
            retry_on_failure,
            webhook_secret
          );

        case 'test':
          return await this.testWebhook(context, webhook_url, webhook_secret);

        case 'check_status':
          return await this.checkDeliveryStatus(context, delivery_id);

        default:
          return this.formatError(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error('[WEBHOOK_CHIP_ERROR]', error);
      return this.formatError(error.message);
    }
  }

  private async sendWebhook(
    context: AgentContext,
    webhookUrl: string,
    leadData: LeadData,
    retryOnFailure: boolean,
    webhookSecret?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!webhookUrl) {
      // Try to get default webhook from user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('esp_webhook_url, esp_webhook_secret')
        .eq('user_id', context.userId)
        .single();

      if (!settings?.esp_webhook_url) {
        return this.formatError('No webhook URL provided or configured');
      }

      webhookUrl = settings.esp_webhook_url;
      webhookSecret = webhookSecret || settings.esp_webhook_secret;
    }

    if (!leadData) {
      return this.formatError('Lead data is required');
    }

    // Format payload for common ESPs
    const payload = this.formatPayloadForESP(webhookUrl, leadData);

    // Generate headers with HMAC signature if secret provided
    const headers = this.generateHeaders(payload, webhookSecret);

    // Create delivery record
    const deliveryData: Partial<WebhookDelivery> = {
      webhook_url: webhookUrl,
      payload,
      headers,
      status: 'pending',
      attempts: 0,
    };

    const { data: delivery, error: deliveryError } = await supabase
      .from('webhook_deliveries')
      .insert(deliveryData)
      .select()
      .single();

    if (deliveryError) {
      return this.formatError(deliveryError.message);
    }

    // Attempt delivery
    const result = await this.attemptDelivery(delivery.id, webhookUrl, payload, headers);

    // Update delivery record
    await supabase
      .from('webhook_deliveries')
      .update({
        status: result.success ? 'success' : 'failed',
        attempts: 1,
        response_code: result.statusCode,
        response_body: result.body,
        error_message: result.error,
        delivered_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', delivery.id);

    if (!result.success && retryOnFailure) {
      // Schedule retry with exponential backoff
      await this.scheduleRetry(context, delivery.id, 1);
    }

    return this.formatSuccess({
      delivery_id: delivery.id,
      status: result.success ? 'delivered' : 'failed',
      status_code: result.statusCode,
      esp_response: result.body,
      retry_scheduled: !result.success && retryOnFailure,
      message: result.success
        ? `✅ Lead sent to ESP successfully (${leadData.email})`
        : `❌ Webhook delivery failed (${result.statusCode || 'no response'}). ${retryOnFailure ? 'Retry scheduled.' : ''}`
    });
  }

  private async bulkSendWebhooks(
    context: AgentContext,
    webhookUrl: string,
    leads: Partial<LeadData>[],
    retryOnFailure: boolean,
    webhookSecret?: string
  ): Promise<any> {
    if (!leads || leads.length === 0) {
      return this.formatError('At least one lead is required for bulk send');
    }

    // Limit bulk sends
    const MAX_BULK_SIZE = 100;
    if (leads.length > MAX_BULK_SIZE) {
      return this.formatError(`Maximum ${MAX_BULK_SIZE} leads allowed for bulk send (got ${leads.length})`);
    }

    // Send webhooks with slight delays
    const results = await Promise.all(
      leads.map((lead, index) => {
        // Add small delay between webhooks to avoid rate limits
        return new Promise(resolve => {
          setTimeout(async () => {
            const result = await this.sendWebhook(
              context,
              webhookUrl,
              lead as LeadData,
              retryOnFailure,
              webhookSecret
            );
            resolve(result);
          }, index * 100); // 100ms between each webhook
        });
      })
    );

    const successful = results.filter((r: any) => r.success).length;
    const failed = results.filter((r: any) => !r.success).length;

    return this.formatSuccess({
      total_leads: leads.length,
      successful,
      failed,
      results: results.map((r: any, i) => ({
        email: leads[i].email,
        success: r.success,
        delivery_id: r.data?.delivery_id,
        error: r.error?.message
      })),
      message: `📤 Bulk webhook campaign: ${successful} delivered, ${failed} failed`
    });
  }

  private async testWebhook(
    context: AgentContext,
    webhookUrl: string,
    webhookSecret?: string
  ): Promise<any> {
    const testData: LeadData = {
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      linkedin_url: 'https://linkedin.com/in/test',
      campaign_id: 'test-campaign',
      lead_magnet: 'Test Lead Magnet',
      source: 'manual',
      custom_fields: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };

    const payload = this.formatPayloadForESP(webhookUrl, testData);
    const headers = this.generateHeaders(payload, webhookSecret);

    const result = await this.attemptDelivery('test', webhookUrl, payload, headers);

    return this.formatSuccess({
      webhook_url: webhookUrl,
      status: result.success ? 'working' : 'failed',
      status_code: result.statusCode,
      response: result.body,
      error: result.error,
      message: result.success
        ? `✅ Webhook test successful! ESP responded with ${result.statusCode}`
        : `❌ Webhook test failed: ${result.error || `HTTP ${result.statusCode}`}`
    });
  }

  private async checkDeliveryStatus(
    context: AgentContext,
    deliveryId?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!deliveryId) {
      // Get recent deliveries
      const { data: recent, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        return this.formatError(error.message);
      }

      return this.formatSuccess({
        total_deliveries: recent?.length || 0,
        deliveries: recent?.map(d => ({
          delivery_id: d.id,
          status: d.status,
          webhook_url: d.webhook_url,
          attempts: d.attempts,
          created: d.created_at,
          delivered: d.delivered_at
        })) || [],
        message: `📊 ${recent?.length || 0} recent webhook deliveries`
      });
    }

    const { data: delivery, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (error || !delivery) {
      return this.formatError(`Delivery ${deliveryId} not found`);
    }

    return this.formatSuccess({
      delivery_id: delivery.id,
      status: delivery.status,
      webhook_url: delivery.webhook_url,
      attempts: delivery.attempts,
      response_code: delivery.response_code,
      error_message: delivery.error_message,
      created_at: delivery.created_at,
      delivered_at: delivery.delivered_at,
      message: `📬 Delivery ${delivery.status}: ${delivery.attempts} attempt${delivery.attempts !== 1 ? 's' : ''}`
    });
  }

  private formatPayloadForESP(webhookUrl: string, leadData: LeadData): any {
    // Detect ESP type from URL
    if (webhookUrl.includes('convertkit')) {
      return this.formatConvertKitPayload(leadData);
    } else if (webhookUrl.includes('mailchimp')) {
      return this.formatMailchimpPayload(leadData);
    } else if (webhookUrl.includes('activecampaign')) {
      return this.formatActiveCampaignPayload(leadData);
    } else if (webhookUrl.includes('zapier') || webhookUrl.includes('hooks.zapier')) {
      return this.formatZapierPayload(leadData);
    }

    // Default format
    return {
      email: leadData.email,
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      fields: {
        linkedin_url: leadData.linkedin_url,
        campaign_id: leadData.campaign_id,
        lead_magnet: leadData.lead_magnet,
        source: leadData.source,
        ...leadData.custom_fields
      },
      created_at: new Date().toISOString()
    };
  }

  private formatConvertKitPayload(leadData: LeadData): any {
    return {
      api_key: '{{API_KEY}}', // User should replace
      email: leadData.email,
      first_name: leadData.first_name,
      fields: {
        last_name: leadData.last_name,
        linkedin: leadData.linkedin_url,
        lead_magnet: leadData.lead_magnet,
        ...leadData.custom_fields
      },
      tags: [`source:${leadData.source}`, `campaign:${leadData.campaign_id}`]
    };
  }

  private formatMailchimpPayload(leadData: LeadData): any {
    return {
      email_address: leadData.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: leadData.first_name,
        LNAME: leadData.last_name,
        LINKEDIN: leadData.linkedin_url,
        SOURCE: leadData.source,
        ...leadData.custom_fields
      }
    };
  }

  private formatActiveCampaignPayload(leadData: LeadData): any {
    return {
      contact: {
        email: leadData.email,
        firstName: leadData.first_name,
        lastName: leadData.last_name,
        fieldValues: [
          { field: 'linkedin', value: leadData.linkedin_url },
          { field: 'lead_source', value: leadData.source },
          { field: 'lead_magnet', value: leadData.lead_magnet }
        ]
      }
    };
  }

  private formatZapierPayload(leadData: LeadData): any {
    // Zapier webhooks accept any format
    return leadData;
  }

  private generateHeaders(payload: any, secret?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'RevOS-Webhook/1.0',
      'X-Webhook-Source': 'RevOS',
      'X-Webhook-Timestamp': Date.now().toString(),
    };

    if (secret) {
      // Generate HMAC signature
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      headers['X-Webhook-Signature'] = signature;
      headers['X-Hub-Signature-256'] = `sha256=${signature}`; // GitHub/Stripe format
    }

    return headers;
  }

  private async attemptDelivery(
    deliveryId: string,
    url: string,
    payload: any,
    headers: Record<string, string>
  ): Promise<{ success: boolean; statusCode?: number; body?: string; error?: string }> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const body = await response.text();

      return {
        success: response.ok,
        statusCode: response.status,
        body: body.substring(0, 1000), // Limit stored response
      };
    } catch (error: any) {
      console.error(`[WEBHOOK_CHIP] Delivery ${deliveryId} failed:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async scheduleRetry(
    context: AgentContext,
    deliveryId: string,
    attemptNumber: number
  ): Promise<void> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Exponential backoff: 1min, 5min, 15min, 1hr, 6hr
    const delays = [60, 300, 900, 3600, 21600];
    const delaySeconds = delays[Math.min(attemptNumber - 1, delays.length - 1)];

    await supabase
      .from('background_jobs')
      .insert({
        type: 'webhook_retry',
        status: 'pending',
        payload: { delivery_id: deliveryId },
        scheduled_for: new Date(Date.now() + delaySeconds * 1000).toISOString(),
      });
  }
}