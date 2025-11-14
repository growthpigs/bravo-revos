import { z } from 'zod';
import { tool } from '@openai/agents';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

interface Lead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  linkedin_url?: string;
  company?: string;
  job_title?: string;
  phone?: string;
  source: 'linkedin_dm' | 'linkedin_comment' | 'manual' | 'import' | 'landing_page' | 'webhook';
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'disqualified';
  campaign_id?: string;
  lead_magnet_id?: string;
  tags: string[];
  custom_fields: Record<string, any>;
  engagement_score: number;
  last_contact_at?: string;
  created_at: string;
  updated_at?: string;
}

interface LeadActivity {
  id: string;
  lead_id: string;
  type: 'dm_sent' | 'email_sent' | 'magnet_downloaded' | 'link_clicked' | 'reply_received' | 'webhook_sent';
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

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

    try {
      switch (action) {
        case 'create':
          return await this.createLead(context, lead_data);

        case 'update':
          return await this.updateLead(context, lead_id, lead_data);

        case 'get':
          return await this.getLead(context, lead_id);

        case 'list':
          return await this.listLeads(context, filters);

        case 'search':
          return await this.searchLeads(context, search_query);

        case 'tag':
          return await this.manageTags(context, lead_id, tags_to_add, tags_to_remove);

        case 'score':
          return await this.adjustScore(context, lead_id, score_adjustment);

        case 'activity':
          return await this.logActivity(context, lead_id, activity_type, activity_description);

        default:
          return this.formatError(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error('[LEAD_CHIP_ERROR]', error);
      return this.formatError(error.message);
    }
  }

  private async createLead(context: AgentContext, leadData: any): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!leadData || !leadData.email) {
      return this.formatError('Email is required to create a lead');
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('leads')
      .select('id, email')
      .eq('email', leadData.email.toLowerCase())
      .single();

    if (existing) {
      return this.formatError(`Lead with email ${leadData.email} already exists (ID: ${existing.id})`);
    }

    // Create lead record
    const newLead: Partial<Lead> = {
      email: leadData.email.toLowerCase(),
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      linkedin_url: leadData.linkedin_url,
      company: leadData.company,
      job_title: leadData.job_title,
      phone: leadData.phone,
      source: leadData.source || 'manual',
      status: 'new',
      campaign_id: leadData.campaign_id,
      lead_magnet_id: leadData.lead_magnet_id,
      tags: leadData.tags || [],
      custom_fields: leadData.custom_fields || {},
      engagement_score: 0,
    };

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert(newLead)
      .select()
      .single();

    if (leadError) {
      return this.formatError(leadError.message);
    }

    // Log creation activity
    await this.logActivity(
      context,
      lead.id,
      'created',
      `Lead created from source: ${lead.source}`
    );

    return this.formatSuccess({
      lead_id: lead.id,
      email: lead.email,
      name: this.getFullName(lead),
      source: lead.source,
      status: lead.status,
      message: `✅ Lead created: ${lead.email}${lead.campaign_id ? ' (assigned to campaign)' : ''}`
    });
  }

  private async updateLead(context: AgentContext, leadId?: string, updates?: any): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!leadId) {
      return this.formatError('Lead ID is required for updates');
    }

    if (!updates || Object.keys(updates).length === 0) {
      return this.formatError('No updates provided');
    }

    // Clean and prepare updates
    const cleanUpdates: Partial<Lead> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Don't allow email changes through update
    delete (cleanUpdates as any).email;

    const { data: updated, error } = await supabase
      .from('leads')
      .update(cleanUpdates)
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      return this.formatError(error.message);
    }

    // Log update activity
    const changes = Object.keys(updates).join(', ');
    await this.logActivity(
      context,
      leadId,
      'updated',
      `Updated fields: ${changes}`
    );

    return this.formatSuccess({
      lead_id: updated.id,
      email: updated.email,
      name: this.getFullName(updated),
      updated_fields: Object.keys(updates),
      message: `✏️ Lead updated successfully`
    });
  }

  private async getLead(context: AgentContext, leadId?: string): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!leadId) {
      return this.formatError('Lead ID is required');
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        lead_activities (
          type,
          description,
          created_at
        )
      `)
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return this.formatError(`Lead ${leadId} not found`);
    }

    return this.formatSuccess({
      lead_id: lead.id,
      email: lead.email,
      name: this.getFullName(lead),
      company: lead.company,
      job_title: lead.job_title,
      linkedin_url: lead.linkedin_url,
      source: lead.source,
      status: lead.status,
      tags: lead.tags,
      engagement_score: lead.engagement_score,
      campaign_id: lead.campaign_id,
      custom_fields: lead.custom_fields,
      activities: lead.lead_activities || [],
      created_at: lead.created_at,
      last_contact_at: lead.last_contact_at,
      message: `📋 Lead: ${lead.email} (${lead.status})`
    });
  }

  private async listLeads(context: AgentContext, filters?: any): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Build query
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Apply filters
    if (filters) {
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.campaign_id) query = query.eq('campaign_id', filters.campaign_id);
      if (filters.source) query = query.eq('source', filters.source);
      if (filters.tag) query = query.contains('tags', [filters.tag]);
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);
    }

    const { data: leads, error } = await query;

    if (error) {
      return this.formatError(error.message);
    }

    if (!leads || leads.length === 0) {
      return this.formatSuccess({
        total_leads: 0,
        leads: [],
        filters_applied: filters ? Object.keys(filters) : [],
        message: 'No leads found with the specified filters'
      });
    }

    // Group by status for summary
    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return this.formatSuccess({
      total_leads: leads.length,
      status_breakdown: statusCounts,
      filters_applied: filters ? Object.keys(filters) : [],
      leads: leads.map(l => ({
        id: l.id,
        email: l.email,
        name: this.getFullName(l),
        company: l.company,
        source: l.source,
        status: l.status,
        engagement_score: l.engagement_score,
        created_at: l.created_at,
      })),
      message: `📊 ${leads.length} leads found${filters ? ' (filtered)' : ''}`
    });
  }

  private async searchLeads(context: AgentContext, searchQuery?: string): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return this.formatError('Search query must be at least 2 characters');
    }

    // Search across multiple fields
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%`)
      .limit(20);

    if (error) {
      return this.formatError(error.message);
    }

    if (!leads || leads.length === 0) {
      return this.formatSuccess({
        total_results: 0,
        leads: [],
        query: searchQuery,
        message: `No leads found matching "${searchQuery}"`
      });
    }

    return this.formatSuccess({
      total_results: leads.length,
      query: searchQuery,
      leads: leads.map(l => ({
        id: l.id,
        email: l.email,
        name: this.getFullName(l),
        company: l.company,
        status: l.status,
        relevance: this.calculateRelevance(l, searchQuery),
      })).sort((a, b) => b.relevance - a.relevance),
      message: `🔍 ${leads.length} leads found matching "${searchQuery}"`
    });
  }

  private async manageTags(
    context: AgentContext,
    leadId?: string,
    tagsToAdd?: string[],
    tagsToRemove?: string[]
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!leadId) {
      return this.formatError('Lead ID is required for tag management');
    }

    // Get current lead
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('tags')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      return this.formatError(`Lead ${leadId} not found`);
    }

    let updatedTags = lead.tags || [];

    // Add new tags
    if (tagsToAdd && tagsToAdd.length > 0) {
      const newTags = tagsToAdd.filter(t => !updatedTags.includes(t));
      updatedTags = [...updatedTags, ...newTags];
    }

    // Remove tags
    if (tagsToRemove && tagsToRemove.length > 0) {
      updatedTags = updatedTags.filter(t => !tagsToRemove.includes(t));
    }

    // Update lead
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        tags: updatedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      return this.formatError(updateError.message);
    }

    return this.formatSuccess({
      lead_id: leadId,
      tags: updatedTags,
      added: tagsToAdd || [],
      removed: tagsToRemove || [],
      message: `🏷️ Tags updated: ${updatedTags.length} total tags`
    });
  }

  private async adjustScore(
    context: AgentContext,
    leadId?: string,
    adjustment?: number
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!leadId) {
      return this.formatError('Lead ID is required for score adjustment');
    }

    if (adjustment === undefined || adjustment === 0) {
      return this.formatError('Score adjustment value is required');
    }

    // Get current score
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('engagement_score')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      return this.formatError(`Lead ${leadId} not found`);
    }

    const newScore = Math.max(0, (lead.engagement_score || 0) + adjustment);

    // Update score
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        engagement_score: newScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      return this.formatError(updateError.message);
    }

    // Log activity
    await this.logActivity(
      context,
      leadId,
      'score_changed',
      `Engagement score ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)} points`
    );

    return this.formatSuccess({
      lead_id: leadId,
      previous_score: lead.engagement_score || 0,
      adjustment,
      new_score: newScore,
      message: `📈 Engagement score updated: ${newScore} (${adjustment > 0 ? '+' : ''}${adjustment})`
    });
  }

  private async logActivity(
    context: AgentContext,
    leadId: string,
    activityType: string,
    description: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    const activityData: Partial<LeadActivity> = {
      lead_id: leadId,
      type: activityType as any,
      description,
      metadata: {},
    };

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert(activityData)
      .select()
      .single();

    if (error) {
      console.error('[LEAD_CHIP] Activity logging failed:', error);
      // Don't fail the main operation if activity logging fails
      return null;
    }

    // Update last contact if it's a contact activity
    if (['dm_sent', 'email_sent', 'reply_received'].includes(activityType)) {
      await supabase
        .from('leads')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', leadId);
    }

    return activity;
  }

  private getFullName(lead: any): string {
    if (lead.first_name && lead.last_name) {
      return `${lead.first_name} ${lead.last_name}`;
    }
    return lead.first_name || lead.last_name || 'Unknown';
  }

  private calculateRelevance(lead: any, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Exact email match scores highest
    if (lead.email?.toLowerCase() === lowerQuery) score += 100;
    else if (lead.email?.toLowerCase().includes(lowerQuery)) score += 50;

    // Name matches
    if (lead.first_name?.toLowerCase().includes(lowerQuery)) score += 30;
    if (lead.last_name?.toLowerCase().includes(lowerQuery)) score += 30;

    // Company match
    if (lead.company?.toLowerCase().includes(lowerQuery)) score += 20;

    return score;
  }
}