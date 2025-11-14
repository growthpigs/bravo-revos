import { z } from 'zod';
import { tool } from '@openai/agents';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

interface MonitoringJob {
  id: string;
  post_id: string;
  post_url: string;
  trigger_word: string;
  campaign_id?: string;
  lead_magnet_url?: string;
  status: 'active' | 'paused' | 'completed' | 'expired';
  duration_hours: number;
  comments_checked: number;
  dms_sent: number;
  created_at: string;
  expires_at: string;
}

export class MonitorChip extends BaseChip {
  id = 'monitor-chip';
  name = 'Comment Monitor';
  description = 'Monitor LinkedIn post comments for trigger words and auto-DM responders';
  category = 'automation' as const;

  getTool() {
    return tool({
      name: 'start_comment_monitor',
      description: 'Monitor LinkedIn post comments for trigger word. Automatically DMs responders with lead magnet.',
      parameters: z.object({
        action: z.enum(['start', 'stop', 'pause', 'resume', 'status']).describe('Monitoring action'),
        post_id: z.string().optional().describe('LinkedIn post ID to monitor'),
        post_url: z.string().optional().describe('LinkedIn post URL to monitor'),
        trigger_word: z.string().default('guide').describe('Word that triggers DM automation'),
        duration_hours: z.number().default(24).describe('How long to monitor (hours)'),
        lead_magnet_url: z.string().optional().describe('URL to send in DM'),
        campaign_id: z.string().optional().describe('Associated campaign ID'),
        dm_template: z.string().optional().describe('Custom DM message template'),
      }),
      execute: async (input, context) => {
        const agentContext = extractAgentContext(context);
        return this.execute(input, agentContext);
      }
    });
  }

  async execute(input: any, context: AgentContext): Promise<any> {
    const { action, post_id, post_url, trigger_word, duration_hours, lead_magnet_url, campaign_id, dm_template } = input;

    try {
      switch (action) {
        case 'start':
          return await this.startMonitoring(
            context,
            post_id || post_url,
            trigger_word,
            duration_hours,
            lead_magnet_url,
            campaign_id,
            dm_template
          );

        case 'stop':
          return await this.stopMonitoring(context, post_id || post_url);

        case 'pause':
          return await this.pauseMonitoring(context, post_id || post_url);

        case 'resume':
          return await this.resumeMonitoring(context, post_id || post_url);

        case 'status':
          return await this.checkStatus(context, post_id || post_url);

        default:
          return this.formatError(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error('[MONITOR_CHIP_ERROR]', error);
      return this.formatError(error.message);
    }
  }

  private async startMonitoring(
    context: AgentContext,
    postIdentifier: string,
    triggerWord: string,
    durationHours: number,
    leadMagnetUrl?: string,
    campaignId?: string,
    dmTemplate?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!postIdentifier) {
      return this.formatError('Post ID or URL is required to start monitoring');
    }

    // Check for existing active monitoring on this post
    const { data: existing } = await supabase
      .from('monitoring_jobs')
      .select('*')
      .or(`post_id.eq.${postIdentifier},post_url.eq.${postIdentifier}`)
      .eq('status', 'active')
      .single();

    if (existing) {
      return this.formatError(`Post is already being monitored (Job ID: ${existing.id})`);
    }

    // Extract post ID from URL if needed
    const postId = this.extractPostId(postIdentifier);

    // Create monitoring job
    const jobData: Partial<MonitoringJob> = {
      post_id: postId,
      post_url: postIdentifier.includes('linkedin.com') ? postIdentifier : '',
      trigger_word: triggerWord.toLowerCase(),
      campaign_id: campaignId,
      lead_magnet_url: leadMagnetUrl,
      status: 'active',
      duration_hours: durationHours,
      comments_checked: 0,
      dms_sent: 0,
      expires_at: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
    };

    const { data: job, error: jobError } = await supabase
      .from('monitoring_jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      return this.formatError(jobError.message);
    }

    // Create background job for processing
    const backgroundJobData = {
      type: 'comment_monitor' as const,
      status: 'pending' as const,
      payload: {
        job_id: job.id,
        trigger_word: triggerWord,
        dm_template: dmTemplate || this.getDefaultDMTemplate(leadMagnetUrl),
        lead_magnet_url: leadMagnetUrl,
        check_interval: 300, // Check every 5 minutes
      },
      scheduled_for: new Date().toISOString(),
      expires_at: job.expires_at,
    };

    const { error: bgError } = await supabase
      .from('background_jobs')
      .insert(backgroundJobData);

    if (bgError) {
      console.error('[MONITOR_CHIP] Failed to create background job:', bgError);
      // Don't fail completely - monitoring job was created
    }

    return this.formatSuccess({
      job_id: job.id,
      post_id: job.post_id,
      monitoring_until: job.expires_at,
      trigger_word: triggerWord,
      duration_hours: durationHours,
      lead_magnet_url: leadMagnetUrl,
      message: `🔍 Comment monitoring started! Watching for "${triggerWord}" for ${durationHours} hours. Will auto-DM responders${leadMagnetUrl ? ' with lead magnet' : ''}.`
    });
  }

  private async stopMonitoring(context: AgentContext, postIdentifier: string): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!postIdentifier) {
      return this.formatError('Post ID or URL is required');
    }

    // Find active job
    const { data: job, error: findError } = await supabase
      .from('monitoring_jobs')
      .select('*')
      .or(`post_id.eq.${postIdentifier},post_url.eq.${postIdentifier}`)
      .in('status', ['active', 'paused'])
      .single();

    if (findError || !job) {
      return this.formatError('No active monitoring job found for this post');
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('monitoring_jobs')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      return this.formatError(updateError.message);
    }

    // Cancel related background jobs
    await supabase
      .from('background_jobs')
      .update({ status: 'cancelled' })
      .eq('type', 'comment_monitor')
      .eq('payload->job_id', job.id)
      .eq('status', 'pending');

    return this.formatSuccess({
      job_id: job.id,
      comments_checked: job.comments_checked,
      dms_sent: job.dms_sent,
      message: `⏹️ Monitoring stopped. Checked ${job.comments_checked} comments, sent ${job.dms_sent} DMs.`
    });
  }

  private async pauseMonitoring(context: AgentContext, postIdentifier: string): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    const { data: job, error } = await supabase
      .from('monitoring_jobs')
      .update({ status: 'paused' })
      .or(`post_id.eq.${postIdentifier},post_url.eq.${postIdentifier}`)
      .eq('status', 'active')
      .select()
      .single();

    if (error || !job) {
      return this.formatError('No active monitoring job found to pause');
    }

    return this.formatSuccess({
      job_id: job.id,
      message: '⏸️ Monitoring paused. Use resume action to continue.'
    });
  }

  private async resumeMonitoring(context: AgentContext, postIdentifier: string): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    const { data: job, error } = await supabase
      .from('monitoring_jobs')
      .update({ status: 'active' })
      .or(`post_id.eq.${postIdentifier},post_url.eq.${postIdentifier}`)
      .eq('status', 'paused')
      .select()
      .single();

    if (error || !job) {
      return this.formatError('No paused monitoring job found to resume');
    }

    // Reschedule background job
    await supabase
      .from('background_jobs')
      .insert({
        type: 'comment_monitor',
        status: 'pending',
        payload: {
          job_id: job.id,
          trigger_word: job.trigger_word,
          check_interval: 300,
        },
        scheduled_for: new Date().toISOString(),
        expires_at: job.expires_at,
      });

    return this.formatSuccess({
      job_id: job.id,
      message: '▶️ Monitoring resumed.'
    });
  }

  private async checkStatus(context: AgentContext, postIdentifier?: string): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    // Build query
    let query = supabase
      .from('monitoring_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (postIdentifier) {
      query = query.or(`post_id.eq.${postIdentifier},post_url.eq.${postIdentifier}`);
    } else {
      query = query.limit(10); // Get last 10 jobs if no specific post
    }

    const { data: jobs, error } = await query;

    if (error) {
      return this.formatError(error.message);
    }

    if (!jobs || jobs.length === 0) {
      return this.formatSuccess({
        message: 'No monitoring jobs found',
        jobs: []
      });
    }

    const formattedJobs = jobs.map(job => ({
      job_id: job.id,
      post_id: job.post_id,
      status: job.status,
      trigger_word: job.trigger_word,
      comments_checked: job.comments_checked,
      dms_sent: job.dms_sent,
      started: job.created_at,
      expires: job.expires_at,
      time_remaining: this.calculateTimeRemaining(job.expires_at),
    }));

    const activeCount = jobs.filter(j => j.status === 'active').length;

    return this.formatSuccess({
      total_jobs: jobs.length,
      active_jobs: activeCount,
      jobs: formattedJobs,
      message: `📊 ${activeCount} active monitoring job${activeCount !== 1 ? 's' : ''}${postIdentifier ? ' for this post' : ''}`
    });
  }

  private extractPostId(identifier: string): string {
    // Extract LinkedIn post ID from URL
    // Example: https://www.linkedin.com/posts/username_activity-7123456789/
    const match = identifier.match(/activity-(\d+)/);
    if (match) return match[1];

    // If no match, assume it's already an ID
    return identifier;
  }

  private getDefaultDMTemplate(leadMagnetUrl?: string): string {
    if (leadMagnetUrl) {
      return `Hi {firstName}! 👋

Thanks for your interest in the guide! As promised, here's your free resource:
{leadMagnetUrl}

Let me know if you have any questions or if there's anything else I can help you with!

Best regards`;
    }

    return `Hi {firstName}! 👋

Thanks for engaging with my post! I noticed you mentioned the keyword.

Let me know if you'd like more information or if there's anything I can help you with!

Best regards`;
  }

  private calculateTimeRemaining(expiresAt: string): string {
    const now = Date.now();
    const expiry = new Date(expiresAt).getTime();
    const remaining = expiry - now;

    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  }
}