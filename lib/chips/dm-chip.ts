import { z } from 'zod';
import { tool } from '@openai/agents';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';
import { mockDMResponse } from './mock-chip-responses';

/**
 * Simplified DM Chip - Returns mock data until database tables are created
 */
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

    console.log('[DM_CHIP] Mock execution:', { action, recipient_id });

    // Return mock responses for demo purposes
    switch (action) {
      case 'send':
        return this.formatSuccess({
          ...mockDMResponse,
          recipient_id: recipient_id || 'mock-recipient',
          message: delay_minutes > 0
            ? `📅 DM scheduled to send in ${delay_minutes} minutes`
            : `✉️ DM sent successfully${is_followup ? ' (follow-up)' : ''}${lead_magnet_url ? ' with lead magnet' : ''}`
        });

      case 'schedule':
        return this.formatSuccess({
          ...mockDMResponse,
          status: 'scheduled',
          scheduled_for: new Date(Date.now() + (delay_minutes || 30) * 60 * 1000).toISOString(),
          message: `📅 DM scheduled for delivery`
        });

      case 'bulk_send':
        const recipients = recipient_ids || [];
        return this.formatSuccess({
          total_recipients: recipients.length,
          successful: recipients.length,
          failed: 0,
          message: `📨 Bulk DM campaign started: ${recipients.length} scheduled with 2-minute intervals.`
        });

      case 'check_replies':
        return this.formatSuccess({
          total_replies: 3,
          campaigns_with_replies: 1,
          replies: [
            {
              dm_id: 'mock-dm-1',
              recipient: 'John Doe',
              replied_at: new Date().toISOString(),
              original_message: 'Thanks for the guide...',
              campaign_id: campaign_id || 'mock-campaign'
            }
          ],
          message: `💬 3 replies received${campaign_id ? ' for this campaign' : ' across all campaigns'}`
        });

      default:
        return this.formatError(`Unknown action: ${action}`);
    }
  }
}