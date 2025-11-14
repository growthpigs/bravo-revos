import { z } from 'zod';
import { tool } from '@openai/agents';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';
import { mockLeadResponse } from './mock-chip-responses';

/**
 * Simplified Lead Chip - Returns mock data until database tables are created
 */
export class LeadChip extends BaseChip {
  id = 'lead-chip';
  name = 'Lead Storage';
  description = 'Store, manage, and query lead information';
  category = 'data' as const;

  getTool() {
    return tool({
      name: 'manage_leads',
      description: 'Store, retrieve, update, and analyze lead information. Central lead database.',
      parameters: z.object({
        action: z.enum(['create', 'update', 'get', 'list', 'search', 'tag', 'score', 'activity']).describe('Lead management action'),
        lead_id: z.string().optional().describe('Lead ID for get/update operations'),
        lead_data: z.object({
          email: z.string().email(),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
          linkedin_url: z.string().optional(),
          company: z.string().optional(),
          job_title: z.string().optional(),
          phone: z.string().optional(),
          source: z.enum(['linkedin_dm', 'linkedin_comment', 'manual', 'import', 'landing_page', 'webhook']).optional(),
          campaign_id: z.string().optional(),
          lead_magnet_id: z.string().optional(),
          tags: z.array(z.string()).optional(),
          custom_fields: z.record(z.any()).optional(),
        }).optional().describe('Lead information to store/update'),
        filters: z.object({
          status: z.enum(['new', 'contacted', 'qualified', 'converted', 'disqualified']).optional(),
          campaign_id: z.string().optional(),
          source: z.string().optional(),
          tag: z.string().optional(),
          date_from: z.string().optional(),
          date_to: z.string().optional(),
        }).optional().describe('Filters for listing leads'),
        search_query: z.string().optional().describe('Search query for finding leads'),
        tags_to_add: z.array(z.string()).optional().describe('Tags to add to lead'),
        tags_to_remove: z.array(z.string()).optional().describe('Tags to remove from lead'),
        score_adjustment: z.number().optional().describe('Points to add/subtract from engagement score'),
        activity_type: z.string().optional().describe('Type of activity to log'),
        activity_description: z.string().optional().describe('Description of activity'),
      }),
      execute: async (input, context) => {
        const agentContext = extractAgentContext(context);
        return this.execute(input, agentContext);
      }
    });
  }

  async execute(input: any, context: AgentContext): Promise<any> {
    const { action, lead_id, lead_data, filters, search_query, tags_to_add, tags_to_remove, score_adjustment, activity_type, activity_description } = input;

    console.log('[LEAD_CHIP] Mock execution:', { action, lead_id });

    // Return mock responses for demo purposes
    switch (action) {
      case 'create':
        return this.formatSuccess({
          ...mockLeadResponse,
          email: lead_data?.email || 'test@example.com',
          name: `${lead_data?.first_name || 'Test'} ${lead_data?.last_name || 'User'}`,
          source: lead_data?.source || 'manual',
          message: `✅ Lead created: ${lead_data?.email || 'test@example.com'}`
        });

      case 'update':
        return this.formatSuccess({
          lead_id: lead_id || 'mock-lead-123',
          email: lead_data?.email || 'test@example.com',
          updated_fields: Object.keys(lead_data || {}),
          message: `✏️ Lead updated successfully`
        });

      case 'get':
        return this.formatSuccess({
          lead_id: lead_id || 'mock-lead-123',
          email: 'test@example.com',
          name: 'Test User',
          company: 'Example Corp',
          status: 'new',
          engagement_score: 75,
          tags: ['interested', 'qualified'],
          message: `📋 Lead: test@example.com (new)`
        });

      case 'list':
        return this.formatSuccess({
          total_leads: 5,
          status_breakdown: { new: 2, contacted: 2, qualified: 1 },
          leads: [
            { id: 'lead-1', email: 'john@example.com', name: 'John Doe', status: 'new' },
            { id: 'lead-2', email: 'jane@example.com', name: 'Jane Smith', status: 'contacted' }
          ],
          message: `📊 5 leads found${filters ? ' (filtered)' : ''}`
        });

      case 'search':
        return this.formatSuccess({
          total_results: 2,
          query: search_query,
          leads: [
            { id: 'lead-1', email: 'match@example.com', name: 'Matching Lead', relevance: 100 }
          ],
          message: `🔍 2 leads found matching "${search_query}"`
        });

      case 'tag':
        return this.formatSuccess({
          lead_id: lead_id || 'mock-lead-123',
          tags: ['interested', 'qualified'].concat(tags_to_add || []),
          message: `🏷️ Tags updated: ${2 + (tags_to_add?.length || 0)} total tags`
        });

      case 'score':
        const newScore = 75 + (score_adjustment || 0);
        return this.formatSuccess({
          lead_id: lead_id || 'mock-lead-123',
          previous_score: 75,
          adjustment: score_adjustment || 0,
          new_score: newScore,
          message: `📈 Engagement score updated: ${newScore} (${score_adjustment > 0 ? '+' : ''}${score_adjustment})`
        });

      case 'activity':
        return this.formatSuccess({
          lead_id: lead_id || 'mock-lead-123',
          activity_logged: true,
          type: activity_type,
          message: `Activity logged: ${activity_description}`
        });

      default:
        return this.formatError(`Unknown action: ${action}`);
    }
  }
}