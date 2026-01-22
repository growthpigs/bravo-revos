/**
 * Campaign Chip - Campaign management capabilities
 *
 * Handles: get_all_campaigns, create_campaign, get_campaign_by_id
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';

export class CampaignChip extends BaseChip {
  id = 'campaign-chip';
  name = 'Campaign Management';
  description = 'Create, retrieve, and manage campaigns';

  getTool() {
    return tool({
      name: 'manage_campaigns',
      description: 'Manage campaigns: list all, get specific campaign, or create new campaign',
      parameters: z.object({
        action: z.enum(['list', 'get', 'create']).describe('Action to perform'),
        campaign_id: z.string().optional().describe('Campaign UUID (for get action)'),
        name: z.string().optional().describe('Campaign name (for create action)'),
        description: z.string().optional().describe('Campaign description (for create action)'),
        voice_id: z.string().optional().describe('Voice cartridge ID (for create action)'),
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

    const { action, campaign_id, name, description, voice_id } = input;

    try {
      switch (action) {
        case 'list':
          return await this.handleGetAllCampaigns(context);

        case 'get':
          if (!campaign_id) {
            return this.formatError('campaign_id required for get action');
          }
          return await this.handleGetCampaignById(campaign_id, context);

        case 'create':
          if (!name) {
            return this.formatError('name required for create action');
          }
          return await this.handleCreateCampaign(name, voice_id, description, context);

        default:
          return this.formatError(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Get all campaigns for authenticated user
   * SECURITY: Only returns campaigns for user's client
   */
  private async handleGetAllCampaigns(context: AgentContext) {
    // SECURITY: Get user's client_id for tenant isolation
    const { data: userData } = await context.supabase
      .from('user')
      .select('client_id')
      .eq('id', context.userId)
      .single();

    if (!userData?.client_id) {
      return this.formatError('User has no client association');
    }

    const { data, error } = await context.supabase
      .from('campaign')
      .select('id, name, status, created_at, lead_magnet_source')
      .eq('client_id', userData.client_id) // TENANT ISOLATION
      .order('created_at', { ascending: false });

    if (error) {
      return this.formatError(error.message);
    }

    return this.formatSuccess({
      campaigns: data || [],
      count: data?.length || 0,
    });
  }

  /**
   * Get specific campaign by ID
   * SECURITY: Validates campaign belongs to user's client
   */
  private async handleGetCampaignById(campaign_id: string, context: AgentContext) {
    // SECURITY: Get user's client_id for tenant isolation
    const { data: userData } = await context.supabase
      .from('user')
      .select('client_id')
      .eq('id', context.userId)
      .single();

    if (!userData?.client_id) {
      return this.formatError('User has no client association');
    }

    const { data, error } = await context.supabase
      .from('campaign')
      .select('*')
      .eq('id', campaign_id)
      .eq('client_id', userData.client_id) // TENANT ISOLATION
      .single();

    if (error || !data) {
      return this.formatError('Campaign not found or access denied');
    }

    // Get lead count (campaign already validated above)
    const { count: leadsCount } = await context.supabase
      .from('lead')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id);

    // Get posts count (campaign already validated above)
    const { count: postsCount } = await context.supabase
      .from('post')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id);

    return this.formatSuccess({
      campaign: {
        ...data,
        metrics: {
          leads_generated: leadsCount || 0,
          posts_created: postsCount || 0,
        },
      },
    });
  }

  /**
   * Create new campaign
   */
  private async handleCreateCampaign(
    name: string,
    voice_id: string | undefined,
    description: string | undefined,
    context: AgentContext
  ) {
    // Get user's client_id
    const { data: userData, error: userError } = await context.supabase
      .from('user')
      .select('client_id')
      .eq('id', context.userId)
      .single();

    if (userError || !userData?.client_id) {
      console.error('[CampaignChip] User client_id not found:', userError?.message);
      return this.formatError(
        'User client not found. Please ensure your account is properly configured.'
      );
    }

    const { data, error } = await context.supabase
      .from('campaign')
      .insert({
        name,
        voice_id: voice_id || null,
        description,
        status: 'draft',
        client_id: userData.client_id,
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) {
      return this.formatError(error.message);
    }

    // Warning if no voice cartridge
    let message = 'Campaign created in DRAFT status. Review in dashboard to activate.';
    if (!voice_id) {
      message +=
        '\n\n⚠️ WARNING: This campaign is not using a voice cartridge. We recommend adding one for better content generation quality.';
    }

    return this.formatSuccess({
      campaign: data,
      message,
    });
  }
}
