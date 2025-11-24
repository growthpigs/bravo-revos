/**
 * Publishing Chip - LinkedIn posting and scheduling capabilities
 *
 * Handles: execute_linkedin_campaign, schedule_post
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';
import { createLinkedInPost } from '@/lib/unipile-client';

export class PublishingChip extends BaseChip {
  id = 'publishing-chip';
  name = 'LinkedIn Publishing';
  description = 'Post content to LinkedIn and schedule posts';

  getTool() {
    return tool({
      name: 'publish_to_linkedin',
      description:
        'Post content to LinkedIn NOW (creates actual visible post) or schedule for later. Always call after getting content from user.',
      parameters: z.object({
        action: z.enum(['post_now', 'schedule']).describe('Publish now or schedule for later'),
        content: z.string().describe('LinkedIn post content'),
        campaign_id: z.string().optional().describe('Campaign UUID to associate with (optional)'),
        trigger_word: z
          .string()
          .optional()
          .describe('Trigger word to monitor in DMs (default: "interested")'),
        schedule_time: z
          .string()
          .optional()
          .describe('ISO timestamp for scheduled posts (required for schedule action)'),
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

    const { action, content, campaign_id, trigger_word, schedule_time } = input;

    try {
      switch (action) {
        case 'post_now':
          return await this.handleExecuteLinkedInCampaign(
            content,
            campaign_id,
            trigger_word,
            context
          );

        case 'schedule':
          if (!schedule_time) {
            return this.formatError('schedule_time required for schedule action');
          }
          return await this.handleSchedulePost(content, schedule_time, campaign_id, context);

        default:
          return this.formatError(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Post content to LinkedIn NOW
   *
   * 1. Posts to LinkedIn via Unipile
   * 2. Stores post in database
   * 3. Creates monitoring job for trigger word
   */
  private async handleExecuteLinkedInCampaign(
    content: string,
    campaign_id: string,
    trigger_word: string | undefined,
    context: AgentContext
  ) {
    try {
      console.log('[PublishingChip] Starting campaign execution:', {
        campaign_id,
        content_length: content.length,
        trigger_word: trigger_word || 'interested',
      });

      // Get user's LinkedIn account
      const { data: linkedinAccounts } = await context.supabase
        .from('linkedin_accounts')
        .select('unipile_account_id')
        .eq('user_id', context.userId)
        .eq('status', 'active')
        .limit(1);

      if (!linkedinAccounts || linkedinAccounts.length === 0) {
        return this.formatError(
          'No active LinkedIn account found. Please connect your LinkedIn account first.'
        );
      }

      const unipileAccountId = linkedinAccounts[0].unipile_account_id;

      // 1. Post to LinkedIn via Unipile
      console.log('[PublishingChip] Posting to LinkedIn...');
      const post = await createLinkedInPost(unipileAccountId, content);

      console.log('[PublishingChip] Post created:', {
        id: post.id,
        url: post.url,
      });

      // 2. Store post in database
      const { data: dbPost, error: postError } = await context.supabase
        .from('posts')
        .insert({
          campaign_id,
          unipile_post_id: post.id,
          content,
          status: 'published',
          published_at: new Date().toISOString(),
          post_url: post.url,
        })
        .select()
        .single();

      if (postError) {
        console.error('[PublishingChip] Failed to store post:', postError);
        return this.formatError(
          `Post published but failed to save to database: ${postError.message}`
        );
      }

      console.log('[PublishingChip] Post stored in database:', dbPost.id);

      // 3. Create monitoring job
      const effectiveTriggerWord = trigger_word || 'interested';
      const { data: job, error: jobError } = await context.supabase
        .from('scrape_jobs')
        .insert({
          post_id: dbPost.id,
          linkedin_post_id: post.id,
          trigger_word: effectiveTriggerWord,
          status: 'scheduled',
          next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Check in 5 minutes
        })
        .select()
        .single();

      if (jobError) {
        console.error('[PublishingChip] Failed to create monitoring job:', jobError);
      }

      console.log('[PublishingChip] Campaign execution complete');

      return this.formatSuccess({
        post: dbPost,
        job,
        message: `✅ Post published to LinkedIn!\n\n🔍 Now monitoring for trigger word: "${effectiveTriggerWord}"\n\nView post: ${post.url}`,
      });
    } catch (error) {
      console.error('[PublishingChip] Execution error:', error);
      return this.formatError(error);
    }
  }

  /**
   * Schedule post for later
   */
  private async handleSchedulePost(
    content: string,
    schedule_time: string,
    campaign_id: string | undefined,
    context: AgentContext
  ) {
    const { data, error } = await context.supabase
      .from('posts')
      .insert({
        content,
        scheduled_for: schedule_time,
        campaign_id,
        status: 'scheduled',
        user_id: context.userId,
      })
      .select()
      .single();

    if (error) {
      return this.formatError(error.message);
    }

    return this.formatSuccess({
      post: data,
      message: 'Post queued for review. Approve in dashboard to publish.',
    });
  }
}
