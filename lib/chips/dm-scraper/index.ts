/**
 * DMScraperChip - Email Extraction from LinkedIn DMs
 *
 * Completes the missing 40% of campaign lifecycle:
 * Post → Comments → DMs → [EMAIL EXTRACTION] → Webhook → ESP
 *
 * Integrates with AgentKit as a tool for automated lead email capture.
 */

import { createClient } from '@supabase/supabase-js';
import { getDirectMessages, type UnipileMessage } from '@/lib/unipile-client';
import { EmailExtractor, type ExtractedEmail } from './email-extractor';
import * as crypto from 'crypto';

export interface DMScraperChipConfig {
  accountId: string;
  campaignId?: string;
  minConfidence?: number; // Minimum confidence to capture email (default 0.7)
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface DMScraperResult {
  success: boolean;
  emailsFound: number;
  leadsUpdated: number;
  webhooksDelivered: number;
  errors: string[];
  details: Array<{
    leadId: string;
    email: string;
    confidence: number;
    webhookDelivered: boolean;
  }>;
}

export class DMScraperChip {
  readonly id = 'dm-scraper';
  readonly name = 'DM Scraper';
  readonly description = 'Extract emails from LinkedIn DM replies and trigger webhooks';

  private supabase;
  private emailExtractor: EmailExtractor;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    this.emailExtractor = new EmailExtractor();
  }

  /**
   * Get AgentKit tool definition
   */
  getTool() {
    return {
      type: 'function' as const,
      function: {
        name: this.id,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'Unipile account ID for LinkedIn integration',
            },
            campaignId: {
              type: 'string',
              description: 'Optional campaign ID to filter leads',
            },
            minConfidence: {
              type: 'number',
              description: 'Minimum confidence score (0-1) to capture email (default 0.7)',
            },
          },
          required: ['accountId'],
        },
      },
    };
  }

  /**
   * Execute the DM scraping workflow
   */
  async execute(config: DMScraperChipConfig): Promise<DMScraperResult> {
    const result: DMScraperResult = {
      success: false,
      emailsFound: 0,
      leadsUpdated: 0,
      webhooksDelivered: 0,
      errors: [],
      details: [],
    };

    const minConfidence = config.minConfidence || 0.7;

    try {
      console.log(`[DMScraperChip] Starting email extraction for account ${config.accountId}`);

      // Step 1: Get leads waiting for email capture
      const leads = await this.getLeadsAwaitingEmail(config.campaignId);
      console.log(`[DMScraperChip] Found ${leads.length} leads waiting for email`);

      if (leads.length === 0) {
        result.success = true;
        return result;
      }

      // Step 2: For each lead, fetch DMs and extract emails
      for (const lead of leads) {
        try {
          // Fetch DM messages from Unipile
          const messages = await getDirectMessages(
            config.accountId,
            lead.linkedin_id,
            lead.updated_at ? new Date(lead.updated_at) : undefined
          );

          if (messages.length === 0) {
            continue;
          }

          console.log(`[DMScraperChip] Checking ${messages.length} messages for lead ${lead.id}`);

          // Extract emails from messages
          const extractedEmails = this.emailExtractor.extractFromMessages(
            messages.map(m => ({ text: m.text, id: m.id }))
          );

          // Filter by confidence threshold
          const qualifiedEmails = extractedEmails.filter(e => e.confidence >= minConfidence);

          if (qualifiedEmails.length > 0) {
            const bestEmail = qualifiedEmails[0]; // Highest confidence
            result.emailsFound++;

            console.log(`[DMScraperChip] Found email ${bestEmail.email} (confidence: ${bestEmail.confidence})`);

            // Update lead record with email
            const updated = await this.updateLeadWithEmail(lead.id, bestEmail);

            if (updated) {
              result.leadsUpdated++;

              // Trigger webhook if configured
              if (config.webhookUrl) {
                const webhookDelivered = await this.deliverWebhook(
                  config.webhookUrl,
                  config.webhookSecret || '',
                  {
                    leadId: lead.id,
                    campaignId: lead.campaign_id,
                    email: bestEmail.email,
                    confidence: bestEmail.confidence,
                    source: 'linkedin_dm',
                    timestamp: new Date().toISOString(),
                  }
                );

                if (webhookDelivered) {
                  result.webhooksDelivered++;
                }

                result.details.push({
                  leadId: lead.id,
                  email: bestEmail.email,
                  confidence: bestEmail.confidence,
                  webhookDelivered,
                });
              }
            }
          }

        } catch (error) {
          const errorMsg = `Failed to process lead ${lead.id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[DMScraperChip] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      result.success = true;
      console.log(`[DMScraperChip] Completed: ${result.emailsFound} emails found, ${result.leadsUpdated} leads updated`);
    } catch (error) {
      const errorMsg = `DM scraping failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[DMScraperChip] ${errorMsg}`);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Get leads waiting for email capture
   */
  private async getLeadsAwaitingEmail(campaignId?: string) {
    let query = this.supabase
      .from('lead')
      .select('id, linkedin_id, campaign_id, updated_at')
      .is('email', null) // No email captured yet
      .eq('status', 'dm_sent'); // Has been sent a DM

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update lead record with captured email
   */
  private async updateLeadWithEmail(leadId: string, extractedEmail: ExtractedEmail): Promise<boolean> {
    const { error } = await this.supabase
      .from('lead')
      .update({
        email: extractedEmail.email,
        status: 'email_captured',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      console.error(`[DMScraperChip] Failed to update lead ${leadId}:`, error);
      return false;
    }

    return true;
  }

  /**
   * Deliver webhook with HMAC-SHA256 signature
   */
  private async deliverWebhook(
    url: string,
    secret: string,
    payload: Record<string, any>
  ): Promise<boolean> {
    try {
      const payloadString = JSON.stringify(payload);

      // Generate HMAC-SHA256 signature
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': new Date().toISOString(),
        },
        body: payloadString,
      });

      if (!response.ok) {
        console.error(`[DMScraperChip] Webhook delivery failed: ${response.status}`);
        return false;
      }

      // Log webhook delivery
      await this.logWebhookDelivery(payload.leadId, url, response.status);

      return true;
    } catch (error) {
      console.error(`[DMScraperChip] Webhook delivery error:`, error);
      return false;
    }
  }

  /**
   * Log webhook delivery to database
   */
  private async logWebhookDelivery(leadId: string, url: string, status: number): Promise<void> {
    try {
      await this.supabase.from('webhook_logs').insert({
        lead_id: leadId,
        webhook_url: url,
        response_status: status,
        status: status >= 200 && status < 300 ? 'sent' : 'failed',
        last_attempt_at: new Date().toISOString(),
        retry_count: 0,
        payload: {}, // Will be populated by webhook system
      });
    } catch (error) {
      console.error(`[DMScraperChip] Failed to log webhook:`, error);
    }
  }
}

// Singleton instance
export const dmScraperChip = new DMScraperChip();
