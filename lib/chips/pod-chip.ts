import { z } from 'zod';
import { tool } from '@openai/agents';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { queueAmplification, queueRepost } from '@/lib/queues/pod-queue';

interface PodSession {
  id: string;
  pod_id: string;
  post_url: string;
  status: 'active' | 'completed' | 'cancelled';
  members_alerted: number;
  engagement_count: number;
  created_at: string;
  expires_at: string;
}

interface PodMember {
  id: string;
  pod_id: string;
  user_id: string;
  linkedin_profile?: string;
  slack_handle?: string;
  discord_handle?: string;
  engagement_score: number;
  status: 'active' | 'inactive';
}

export class PodChip extends BaseChip {
  id = 'pod-chip';
  name = 'Pod Coordination';
  description = 'Coordinate engagement pods for amplifying LinkedIn posts';
  category = 'engagement' as const;

  getTool() {
    return tool({
      name: 'coordinate_pod',
      description: 'Alert pod members to engage with posts for amplification. Sends notifications via Slack/Discord.',
      parameters: z.object({
        action: z.enum(['alert_members', 'check_engagement', 'list_members', 'create_session', 'trigger_amplification', 'check_status', 'cancel_amplification']).describe('Pod coordination action'),
        post_url: z.string().optional().describe('LinkedIn post URL to amplify'),
        pod_id: z.string().optional().describe('Pod ID (defaults to user\'s primary pod)'),
        message: z.string().optional().describe('Custom message to pod members'),
        schedule_for: z.string().optional().describe('ISO datetime to schedule engagement'),
      }),
      execute: async (input, context) => {
        const agentContext = extractAgentContext(context);
        return this.execute(input, agentContext);
      }
    });
  }

  async execute(input: any, context: AgentContext): Promise<any> {
    const { action, post_url, pod_id, message, schedule_for } = input;

    try {
      switch (action) {
        case 'alert_members':
          return await this.alertPodMembers(context, pod_id, post_url, message, schedule_for);

        case 'check_engagement':
          return await this.checkEngagement(context, pod_id, post_url);

        case 'list_members':
          return await this.listPodMembers(context, pod_id);

        case 'create_session':
          return await this.createPodSession(context, pod_id, post_url);

        case 'trigger_amplification':
          return await this.triggerAmplification(context, pod_id, post_url);

        case 'check_status':
          return await this.checkAmplificationStatus(context, pod_id);

        case 'cancel_amplification':
          return await this.cancelAmplification(context, pod_id);

        default:
          return this.formatError(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error('[POD_CHIP_ERROR]', error);
      return this.formatError(error.message || 'Pod coordination failed');
    }
  }

  private async alertPodMembers(
    context: AgentContext,
    podId?: string,
    postUrl?: string,
    customMessage?: string,
    scheduleFor?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Get or create pod session
    const session = await this.createPodSession(context, podId, postUrl);
    if (!session.success) return session;

    // Get pod members
    const { data: members, error: membersError } = await supabase
      .from('pod_members')
      .select('*')
      .eq('pod_id', session.data.session.pod_id)
      .eq('status', 'active');

    if (membersError) {
      return this.formatError(`Failed to fetch members: ${membersError.message}`);
    }

    if (!members || members.length === 0) {
      return this.formatError('Pod has no active members');
    }

    // Create alerts for each member
    const alerts = await Promise.all(members.map(async (member) => {
      const alertData = {
        pod_session_id: session.data.session.id,
        member_id: member.id,
        post_url: postUrl,
        message: customMessage || this.generateAlertMessage(postUrl),
        scheduled_for: scheduleFor || new Date().toISOString(),
        status: 'pending' as const,
      };

      const { data, error } = await supabase
        .from('pod_alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) {
        console.error(`Failed to create alert for member ${member.id}:`, error);
        return null;
      }

      // Send notification (webhook to Slack/Discord)
      await this.sendNotification(member, alertData.message);

      return data;
    }));

    const successfulAlerts = alerts.filter(a => a !== null);

    // Update session with alert count
    await supabase
      .from('pod_sessions')
      .update({ members_alerted: successfulAlerts.length })
      .eq('id', session.data.session.id);

    return this.formatSuccess({
      session_id: session.data.session.id,
      pod_id: session.data.session.pod_id,
      members_alerted: successfulAlerts.length,
      post_url: postUrl,
      scheduled_for: scheduleFor,
      message: `✅ Pod coordinated! ${successfulAlerts.length} members alerted${scheduleFor ? ' for scheduled engagement' : ' for immediate engagement'}.`
    });
  }

  private async checkEngagement(
    context: AgentContext,
    podId?: string,
    postUrl?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Build query
    let query = supabase
      .from('pod_sessions')
      .select(`
        *,
        pod_alerts (
          id,
          member_id,
          engaged_at,
          engagement_type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1);

    if (podId) query = query.eq('pod_id', podId);
    if (postUrl) query = query.eq('post_url', postUrl);

    const { data: sessions, error } = await query;

    if (error) {
      return this.formatError(`Failed to check engagement: ${error.message}`);
    }

    if (!sessions || sessions.length === 0) {
      return this.formatSuccess({
        message: 'No active pod sessions found',
        engagement: []
      });
    }

    const session = sessions[0];
    const engagedCount = session.pod_alerts?.filter(a => a.engaged_at).length || 0;
    const totalAlerts = session.pod_alerts?.length || 0;

    return this.formatSuccess({
      session_id: session.id,
      post_url: session.post_url,
      members_alerted: session.members_alerted,
      engaged: engagedCount,
      pending: totalAlerts - engagedCount,
      engagement_rate: totalAlerts > 0 ? (engagedCount / totalAlerts * 100).toFixed(1) + '%' : '0%',
      status: session.status,
      message: `📊 Engagement: ${engagedCount}/${totalAlerts} members engaged (${totalAlerts > 0 ? (engagedCount / totalAlerts * 100).toFixed(1) : 0}%)`
    });
  }

  private async listPodMembers(
    context: AgentContext,
    podId?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Get user's default pod if not specified
    const finalPodId = podId || await this.getUserDefaultPod(context);
    if (!finalPodId) {
      return this.formatError('User has no associated pod');
    }

    const { data: members, error } = await supabase
      .from('pod_members')
      .select(`
        *,
        users (
          id,
          email,
          full_name
        )
      `)
      .eq('pod_id', finalPodId)
      .eq('status', 'active')
      .order('engagement_score', { ascending: false });

    if (error) {
      return this.formatError(`Failed to list members: ${error.message}`);
    }

    return this.formatSuccess({
      pod_id: finalPodId,
      total_members: members?.length || 0,
      members: members?.map(m => ({
        id: m.id,
        name: m.users?.full_name || 'Unknown',
        email: m.users?.email,
        linkedin: m.linkedin_profile,
        engagement_score: m.engagement_score,
        channels: {
          slack: !!m.slack_handle,
          discord: !!m.discord_handle
        }
      })) || [],
      message: `Pod has ${members?.length || 0} active members`
    });
  }

  private async createPodSession(
    context: AgentContext,
    podId?: string,
    postUrl?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Get user's default pod if not specified
    const finalPodId = podId || await this.getUserDefaultPod(context);
    if (!finalPodId) {
      return this.formatError('User has no associated pod');
    }

    // Check for existing active session
    if (postUrl) {
      const { data: existing } = await supabase
        .from('pod_sessions')
        .select('*')
        .eq('pod_id', finalPodId)
        .eq('post_url', postUrl)
        .eq('status', 'active')
        .single();

      if (existing) {
        return this.formatSuccess({
          session: existing,
          message: 'Using existing active session'
        });
      }
    }

    // Create new session
    const sessionData: Partial<PodSession> = {
      pod_id: finalPodId,
      post_url: postUrl || '',
      status: 'active',
      members_alerted: 0,
      engagement_count: 0,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    const { data: session, error } = await supabase
      .from('pod_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      return this.formatError(`Failed to create session: ${error.message}`);
    }

    return this.formatSuccess({
      session,
      message: 'Pod session created successfully'
    });
  }

  private async getUserDefaultPod(context: AgentContext): Promise<string | null> {
    const supabase = context.supabase as SupabaseClient<Database>;
    const userId = context.userId;

    if (!userId) return null;

    const { data } = await supabase
      .from('pod_members')
      .select('pod_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    return data?.pod_id || null;
  }

  private generateAlertMessage(postUrl?: string): string {
    if (postUrl) {
      return `🚀 New post needs engagement! Please like, comment, and repost: ${postUrl}`;
    }
    return '🚀 Pod alert! Time to engage with the latest content.';
  }

  private async triggerAmplification(
    context: AgentContext,
    podId?: string,
    postUrl?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;
    const userId = context.userId;

    if (!postUrl) {
      return this.formatError('post_url is required for amplification');
    }

    // Get user's default pod if not specified
    const finalPodId = podId || await this.getUserDefaultPod(context);
    if (!finalPodId) {
      return this.formatError('User has no associated pod');
    }

    // Get pod members (excluding the author)
    const { data: members, error: membersError } = await (supabase as any)
      .from('pod_members')
      .select('id, user_id, unipile_account_id')
      .eq('pod_id', finalPodId)
      .eq('status', 'active')
      .neq('user_id', userId);

    if (membersError) {
      return this.formatError(`Failed to fetch members: ${membersError.message}`);
    }

    if (!members || members.length === 0) {
      return this.formatError('No other pod members to amplify');
    }

    // Queue reposts with staggered timing (5-60 minutes apart)
    const queuedJobs: string[] = [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (!member.unipile_account_id) {
        console.log(`[POD_CHIP] Skipping member ${member.id} - no Unipile account`);
        continue;
      }

      const delayMs = i * 5 * 60 * 1000; // 5 minutes between each
      const jobId = await queueRepost({
        member_id: member.id,
        post_url: postUrl,
        unipile_account_id: member.unipile_account_id,
        pod_id: finalPodId,
      }, delayMs);

      queuedJobs.push(jobId);
    }

    return this.formatSuccess({
      pod_id: finalPodId,
      post_url: postUrl,
      members_queued: queuedJobs.length,
      total_members: members.length,
      job_ids: queuedJobs,
      message: `⚡ Amplification triggered! ${queuedJobs.length} reposts queued over ${(queuedJobs.length * 5)} minutes.`
    });
  }

  private async checkAmplificationStatus(
    context: AgentContext,
    podId?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Get user's default pod if not specified
    const finalPodId = podId || await this.getUserDefaultPod(context);
    if (!finalPodId) {
      return this.formatError('User has no associated pod');
    }

    // Get recent pod activities
    const { data: activities, error } = await (supabase as any)
      .from('pod_activities')
      .select('*')
      .eq('activity_type', 'repost')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return this.formatError(`Failed to fetch status: ${error.message}`);
    }

    const completed = activities?.filter((a: any) => a.status === 'completed').length || 0;
    const processing = activities?.filter((a: any) => a.status === 'processing').length || 0;
    const failed = activities?.filter((a: any) => a.status === 'failed').length || 0;
    const queued = activities?.filter((a: any) => a.status === 'queued').length || 0;

    return this.formatSuccess({
      total: activities?.length || 0,
      completed,
      processing,
      queued,
      failed,
      recent_activities: activities?.slice(0, 5).map((a: any) => ({
        id: a.id,
        status: a.status,
        post_url: a.post_url,
        completed_at: a.completed_at,
        error_message: a.error_message
      })),
      message: `📊 Amplification status: ${completed} completed, ${processing} processing, ${queued} queued, ${failed} failed`
    });
  }

  private async cancelAmplification(
    context: AgentContext,
    podId?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Get user's default pod if not specified
    const finalPodId = podId || await this.getUserDefaultPod(context);
    if (!finalPodId) {
      return this.formatError('User has no associated pod');
    }

    // Cancel pending activities
    const { data: cancelled, error } = await (supabase as any)
      .from('pod_activities')
      .update({ status: 'failed', error_message: 'Cancelled by user' })
      .eq('status', 'queued')
      .select();

    if (error) {
      return this.formatError(`Failed to cancel: ${error.message}`);
    }

    return this.formatSuccess({
      cancelled_count: cancelled?.length || 0,
      message: `🛑 Cancelled ${cancelled?.length || 0} pending amplification jobs`
    });
  }

  private async sendNotification(member: PodMember, message: string): Promise<void> {
    // TODO: Implement actual webhook calls to Slack/Discord
    // For now, just log
    console.log(`[POD_NOTIFICATION] Member ${member.id}: ${message}`);

    // Future implementation:
    // if (member.slack_handle) await sendSlackMessage(member.slack_handle, message);
    // if (member.discord_handle) await sendDiscordMessage(member.discord_handle, message);
  }
}