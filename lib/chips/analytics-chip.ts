/**
 * Analytics Chip - Campaign performance and metrics
 *
 * Handles: get_campaign_metrics, get_lead_stats
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';

export class AnalyticsChip extends BaseChip {
  id = 'analytics-chip';
  name = 'Analytics';
  description = 'Get campaign metrics and performance data';

  getTool() {
    return tool({
      name: 'get_analytics',
      description: 'Get campaign performance metrics and lead statistics',
      parameters: z.object({
        type: z
          .enum(['campaign', 'overview'])
          .describe('Type of analytics to retrieve'),
        campaign_id: z
          .string()
          .optional()
          .describe('Campaign UUID (required for type=campaign)'),
        time_range: z
          .enum(['7d', '30d', '90d', 'all'])
          .optional()
          .describe('Time range for analytics (default: 30d)'),
      }),
      execute: async (input, context) => {
        // AgentKit passes our AgentContext as the context parameter
        // Type-safe extraction with runtime validation
        const agentContext = extractAgentContext(context);
        return this.execute(input, agentContext);
      },
    });
  }

  async execute(input: any, context: AgentContext): Promise<any> {
    this.validateContext(context);

    const { type, campaign_id, time_range } = input;

    try {
      switch (type) {
        case 'campaign':
          if (!campaign_id) {
            return this.formatError('campaign_id required for type=campaign');
          }
          return await this.getCampaignMetrics(campaign_id, time_range || '30d', context);

        case 'overview':
          return await this.getOverviewMetrics(time_range || '30d', context);

        default:
          return this.formatError(`Unknown analytics type: ${type}`);
      }
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Get metrics for specific campaign
   */
  private async getCampaignMetrics(
    campaign_id: string,
    time_range: string,
    context: AgentContext
  ) {
    // Calculate date filter
    const since = this.getDateFromTimeRange(time_range);

    // Get campaign data
    const { data: campaign } = await context.supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (!campaign) {
      return this.formatError('Campaign not found');
    }

    // Get posts count
    const { count: postsCount } = await context.supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
      .gte('created_at', since);

    // Get leads count
    const { count: leadsCount } = await context.supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
      .gte('created_at', since);

    // Get webhook delivery stats
    const { count: webhooksDelivered } = await context.supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
      .eq('status', 'delivered')
      .gte('created_at', since);

    return this.formatSuccess({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      },
      metrics: {
        posts_created: postsCount || 0,
        leads_generated: leadsCount || 0,
        webhooks_delivered: webhooksDelivered || 0,
        time_range,
      },
    });
  }

  /**
   * Get overview metrics across all campaigns
   */
  private async getOverviewMetrics(time_range: string, context: AgentContext) {
    const since = this.getDateFromTimeRange(time_range);

    // Get campaigns count
    const { count: campaignsCount } = await context.supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    // Get total posts
    const { count: postsCount } = await context.supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('created_at', since);

    // Get total leads
    const { count: leadsCount } = await context.supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    return this.formatSuccess({
      overview: {
        campaigns_count: campaignsCount || 0,
        posts_count: postsCount || 0,
        leads_count: leadsCount || 0,
        time_range,
      },
    });
  }

  /**
   * Convert time range to ISO date
   */
  private getDateFromTimeRange(time_range: string): string {
    const now = new Date();

    switch (time_range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case 'all':
        return new Date(0).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }
}
