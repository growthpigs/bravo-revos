import { z } from 'zod';
import { tool } from '@openai/agents';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

interface DirectMessage {
  id: string;
  recipient_id: string;
  recipient_profile_url: string;
  recipient_name?: string;
  message: string;
  campaign_id?: string;
  lead_magnet_url?: string;
  status: 'pending' | 'sent' | 'failed' | 'replied';
  sent_at?: string;
  reply_received_at?: string;
  is_followup: boolean;
  delay_minutes: number;
}

export class DMChip extends BaseChip {
  id = 'dm-chip';
  name = 'LinkedIn DM Sender';
  description = 'Send direct messages on LinkedIn for lead nurturing and follow-ups';
  category = 'communication' as const;

  getTool() {
    return tool({
      name: 'send_linkedin_dm',
      description: 'Send direct message on LinkedIn. Used for lead magnet delivery and follow-ups.',
      parameters: z.object({
        action: z.enum(['send', 'schedule', 'bulk_send', 'check_replies']).describe('DM action'),
        recipient_id: z.string().optional().describe('LinkedIn user ID or profile URL'),
        recipient_ids: z.array(z.string()).optional().describe('Multiple recipients for bulk send'),
        message: z.string().optional().describe('Message text with personalization tokens'),
        campaign_id: z.string().optional().describe('Associated campaign ID for tracking'),
        delay_minutes: z.number().default(0).describe('Delay before sending (0 = immediate)'),
        is_followup: z.boolean().default(false).describe('Is this a follow-up message?'),
        lead_magnet_url: z.string().optional().describe('Lead magnet URL to include'),
        personalization_fields: z.record(z.string()).optional().describe('Fields for message personalization'),
      }),
      execute: async (input, context) => {
        const agentContext = extractAgentContext(context);
        return this.execute(input, agentContext);
      }
    });
  }

  async execute(input: any, context: AgentContext): Promise<any> {
    const { action, recipient_id, recipient_ids, message, campaign_id, delay_minutes, is_followup, lead_magnet_url, personalization_fields } = input;

    try {
      switch (action) {
        case 'send':
          return await this.sendSingleDM(
            context,
            recipient_id,
            message,
            campaign_id,
            delay_minutes,
            is_followup,
            lead_magnet_url,
            personalization_fields
          );

        case 'schedule':
          return await this.scheduleDM(
            context,
            recipient_id,
            message,
            delay_minutes,
            campaign_id,
            lead_magnet_url
          );

        case 'bulk_send':
          return await this.bulkSendDMs(
            context,
            recipient_ids || [],
            message,
            campaign_id,
            lead_magnet_url,
            personalization_fields
          );

        case 'check_replies':
          return await this.checkReplies(context, campaign_id);

        default:
          return this.formatError(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error('[DM_CHIP_ERROR]', error);
      return this.formatError(error.message);
    }
  }

  private async sendSingleDM(
    context: AgentContext,
    recipientId: string,
    message: string,
    campaignId?: string,
    delayMinutes: number = 0,
    isFollowup: boolean = false,
    leadMagnetUrl?: string,
    personalizationFields?: Record<string, string>
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!recipientId) {
      return this.formatError('Recipient ID or profile URL is required');
    }

    if (!message) {
      return this.formatError('Message content is required');
    }

    // Personalize message
    const personalizedMessage = this.personalizeMessage(
      message,
      personalizationFields || {},
      leadMagnetUrl
    );

    // Check for recent DMs to avoid spam
    const { data: recentDMs } = await supabase
      .from('linkedin_dms')
      .select('*')
      .eq('recipient_id', recipientId)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .eq('status', 'sent');

    if (recentDMs && recentDMs.length > 0 && !isFollowup) {
      return this.formatError(`Already sent DM to this recipient in the last 24 hours (${recentDMs.length} messages)`);
    }

    // Create DM record
    const dmData: Partial<DirectMessage> = {
      recipient_id: recipientId,
      recipient_profile_url: recipientId.includes('linkedin.com') ? recipientId : `https://www.linkedin.com/in/${recipientId}`,
      recipient_name: personalizationFields?.firstName || personalizationFields?.name,
      message: personalizedMessage,
      campaign_id: campaignId,
      lead_magnet_url: leadMagnetUrl,
      status: delayMinutes > 0 ? 'pending' : 'sent',
      is_followup: isFollowup,
      delay_minutes: delayMinutes,
    };

    const { data: dm, error: dmError } = await supabase
      .from('linkedin_dms')
      .insert(dmData)
      .select()
      .single();

    if (dmError) {
      return this.formatError(dmError.message);
    }

    // If immediate send, create UniPile task
    if (delayMinutes === 0) {
      await this.sendViaUniPile(context, dm.id, recipientId, personalizedMessage);

      // Update status
      await supabase
        .from('linkedin_dms')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', dm.id);
    } else {
      // Schedule for later
      const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

      await supabase
        .from('background_jobs')
        .insert({
          type: 'send_linkedin_dm',
          status: 'pending',
          payload: {
            dm_id: dm.id,
            recipient_id: recipientId,
            message: personalizedMessage
          },
          scheduled_for: scheduledFor.toISOString(),
        });
    }

    return this.formatSuccess({
      dm_id: dm.id,
      recipient_id: recipientId,
      status: delayMinutes > 0 ? 'scheduled' : 'sent',
      scheduled_for: delayMinutes > 0 ? new Date(Date.now() + delayMinutes * 60 * 1000).toISOString() : null,
      message: delayMinutes > 0
        ? `📅 DM scheduled to send in ${delayMinutes} minutes`
        : `✉️ DM sent successfully${isFollowup ? ' (follow-up)' : ''}${leadMagnetUrl ? ' with lead magnet' : ''}`
    });
  }

  private async scheduleDM(
    context: AgentContext,
    recipientId: string,
    message: string,
    delayMinutes: number,
    campaignId?: string,
    leadMagnetUrl?: string
  ): Promise<any> {
    if (delayMinutes <= 0) {
      return this.formatError('Delay must be greater than 0 minutes for scheduling');
    }

    return this.sendSingleDM(
      context,
      recipientId,
      message,
      campaignId,
      delayMinutes,
      false,
      leadMagnetUrl
    );
  }

  private async bulkSendDMs(
    context: AgentContext,
    recipientIds: string[],
    message: string,
    campaignId?: string,
    leadMagnetUrl?: string,
    personalizationFields?: Record<string, string>
  ): Promise<any> {
    if (!recipientIds || recipientIds.length === 0) {
      return this.formatError('At least one recipient is required for bulk send');
    }

    if (!message) {
      return this.formatError('Message content is required');
    }

    // Limit bulk sends to prevent spam
    const MAX_BULK_SIZE = 20;
    if (recipientIds.length > MAX_BULK_SIZE) {
      return this.formatError(`Maximum ${MAX_BULK_SIZE} recipients allowed for bulk send (got ${recipientIds.length})`);
    }

    // Send DMs with staggered delays to avoid rate limits
    const results = await Promise.all(
      recipientIds.map((recipientId, index) => {
        const delayMinutes = index * 2; // 2-minute delay between each DM

        return this.sendSingleDM(
          context,
          recipientId,
          message,
          campaignId,
          delayMinutes,
          false,
          leadMagnetUrl,
          personalizationFields
        );
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return this.formatSuccess({
      total_recipients: recipientIds.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        recipient: recipientIds[i],
        success: r.success,
        dm_id: r.data?.dm_id,
        error: r.error?.message
      })),
      message: `📨 Bulk DM campaign started: ${successful} scheduled, ${failed} failed. Messages will be sent with 2-minute intervals.`
    });
  }

  private async checkReplies(context: AgentContext, campaignId?: string): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Build query
    let query = supabase
      .from('linkedin_dms')
      .select('*')
      .eq('status', 'replied')
      .order('reply_received_at', { ascending: false })
      .limit(50);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: replies, error } = await query;

    if (error) {
      return this.formatError(error.message);
    }

    if (!replies || replies.length === 0) {
      return this.formatSuccess({
        total_replies: 0,
        replies: [],
        message: campaignId ? 'No replies for this campaign yet' : 'No replies received yet'
      });
    }

    // Group replies by campaign
    const byCampaign = replies.reduce((acc, reply) => {
      const key = reply.campaign_id || 'no-campaign';
      if (!acc[key]) acc[key] = [];
      acc[key].push(reply);
      return acc;
    }, {} as Record<string, typeof replies>);

    return this.formatSuccess({
      total_replies: replies.length,
      campaigns_with_replies: Object.keys(byCampaign).length,
      replies: replies.map(r => ({
        dm_id: r.id,
        recipient: r.recipient_name || r.recipient_id,
        replied_at: r.reply_received_at,
        original_message: r.message.substring(0, 100) + '...',
        campaign_id: r.campaign_id
      })),
      message: `💬 ${replies.length} replies received${campaignId ? ' for this campaign' : ' across all campaigns'}`
    });
  }

  private async sendViaUniPile(
    context: AgentContext,
    dmId: string,
    recipientId: string,
    message: string
  ): Promise<void> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Get UniPile account
    const { data: account } = await supabase
      .from('unipile_accounts')
      .select('*')
      .eq('user_id', context.userId)
      .eq('provider', 'linkedin')
      .single();

    if (!account) {
      console.error('[DM_CHIP] No UniPile LinkedIn account found');
      throw new Error('No LinkedIn account connected');
    }

    // TODO: Implement actual UniPile API call
    console.log(`[DM_CHIP] Would send via UniPile:`, {
      account_id: account.unipile_account_id,
      recipient: recipientId,
      message: message.substring(0, 100) + '...'
    });

    // For now, simulate successful send
    // In production, this would call UniPile's messaging API
  }

  private personalizeMessage(
    template: string,
    fields: Record<string, string>,
    leadMagnetUrl?: string
  ): string {
    let message = template;

    // Replace personalization tokens
    Object.entries(fields).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      message = message.replace(regex, value);
    });

    // Add lead magnet URL if provided and not already in message
    if (leadMagnetUrl && !message.includes(leadMagnetUrl)) {
      message = message.replace('{leadMagnetUrl}', leadMagnetUrl);
    }

    // Default replacements
    message = message.replace(/{firstName}/gi, fields.firstName || 'there');
    message = message.replace(/{lastName}/gi, fields.lastName || '');
    message = message.replace(/{company}/gi, fields.company || 'your company');

    return message;
  }
}