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
        target_account_id: z.string().optional().describe('Specific LinkedIn Account UUID to post to (required if user has multiple accounts)'),
        trigger_word: z
          .string()
          .optional()
          .describe('Trigger word to monitor in DMs (default: "interested")'),
        schedule_time:
          z.string()
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

    const { action, content, campaign_id, target_account_id, trigger_word, schedule_time } = input;

    try {
      switch (action) {
        case 'post_now':
          return await this.handleExecuteLinkedInCampaign(
            content,
            campaign_id,
            target_account_id,
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
   * 1. Validate Account Selection (Handle multiple accounts)
   * 2. Create DB record (Draft/Pending) to prevent zombie posts
   * 3. Post to LinkedIn via Unipile
   * 4. Update DB record to 'published'
   * 5. Create monitoring job
   */
  private async handleExecuteLinkedInCampaign(
    content: string,
    campaign_id: string,
    target_account_id: string | undefined,
    trigger_word: string | undefined,
    context: AgentContext
  ) {
    let dbPostId: string | null = null;

    try {
      console.log('[PublishingChip] Starting campaign execution:', {
        campaign_id,
        content_length: content.length,
        trigger_word: trigger_word || 'interested',
        target_account_id: target_account_id || 'auto-select'
      });

      // Get ALL user's active LinkedIn accounts
      const { data: linkedinAccounts } = await context.supabase
        .from('linkedin_accounts')
        .select('id, account_name, unipile_account_id')
        .eq('user_id', context.userId)
        .eq('status', 'active');

      if (!linkedinAccounts || linkedinAccounts.length === 0) {
        return this.formatError(
          'No active LinkedIn account found. Please connect your LinkedIn account first.'
        );
      }

      let selectedAccount;

      // Logic: Account Selection
      if (linkedinAccounts.length === 1) {
        // Case A: Only one account - auto-select
        selectedAccount = linkedinAccounts[0];
      } else {
        // Case B: Multiple accounts
        if (target_account_id) {
          // Case B1: ID provided - validate it
          selectedAccount = linkedinAccounts.find(acc => acc.id === target_account_id);
          if (!selectedAccount) {
            return this.formatError(
              `Invalid target_account_id. Account not found or not active. Available accounts: ${linkedinAccounts.map(a => `${a.account_name} (${a.id})`).join(', ')}`
            );
          }
        } else {
          // Case B2: No ID provided - Prompt user
          const accountOptions = linkedinAccounts.map(acc => `- ${acc.account_name} (ID: ${acc.id})`).join('\n');
          return this.formatError(
            `Ambiguous Account: You have multiple connected LinkedIn accounts. Please specify which one to post to:\n\n${accountOptions}\n\nPlease retry with 'target_account_id'.`
          );
        }
      }

      console.log('[PublishingChip] Selected account:', selectedAccount.account_name);
      const unipileAccountId = selectedAccount.unipile_account_id;
      const linkedinAccountId = selectedAccount.id; // Store local ID for DB relation

      // 1. Create DB record first (Draft state)
      // This ensures we have a record even if the API call succeeds but the subsequent DB update fails.
      const { data: dbPost, error: insertError } = await context.supabase
        .from('posts')
        .insert({
          campaign_id,
          linkedin_account_id: linkedinAccountId, // Link to specific account
          content,
          status: 'draft', // Start as draft (pending), update to published on success
          user_id: context.userId, // Ensure user ownership
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('[PublishingChip] Failed to create pending post record:', insertError);
        throw new Error(`Database error: Failed to initialize post record. ${insertError.message}`);
      }

      dbPostId = dbPost.id;
      console.log('[PublishingChip] Created pending post record:', dbPostId);

      // 2. Post to LinkedIn via Unipile
      console.log('[PublishingChip] Posting to LinkedIn...');
      const post = await createLinkedInPost(unipileAccountId, content);

      console.log('[PublishingChip] Post created on LinkedIn:', {
        id: post.id,
        url: post.url,
      });

      // 3. Update post status to 'published'
      const { data: updatedPost, error: updateError } = await context.supabase
        .from('posts')
        .update({
          unipile_post_id: post.id,
          status: 'published',
          published_at: new Date().toISOString(),
          post_url: post.url,
        })
        .eq('id', dbPostId)
        .select()
        .single();

      if (updateError) {
        // Critical Error: Zombie Post (Live on LinkedIn, but DB update failed)
        // Since we have the ID, we can log this explicitly or try a backup mechanism.
        // For now, we log heavily.
        console.error('[PublishingChip] CRITICAL: Failed to update post status to published:', updateError);
        console.error('[PublishingChip] Zombie Post Details:', {
          dbId: dbPostId,
          unipileId: post.id,
          url: post.url
        });
        
        // Return success with warning because the post IS live
        return this.formatSuccess({
          post: dbPost, // Return the draft record
          message: `⚠️ Post published to LinkedIn, but database update failed. 
          
Link: ${post.url}

Please check your dashboard manually.`,
        });
      }

      console.log('[PublishingChip] Post stored in database:', updatedPost.id);

      // Trigger Pod Amplification (Non-blocking)
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        const triggerUrl = `${appUrl}/api/pods/trigger-amplification`;
        console.log(`[PublishingChip] Triggering pod amplification at ${triggerUrl} for postId:`, updatedPost.id);
        
        // Fire and forget - don't await the result to keep UI responsive? 
        // The prompt says "Wrap this in a try/catch block so that if the trigger fails, the user still gets a 'Post Published' success message".
        // Use await but catch errors so it doesn't throw.
        fetch(triggerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ postId: updatedPost.id }),
        }).then(res => {
            if (!res.ok) console.error('[PublishingChip] Trigger API failed:', res.statusText);
        }).catch(err => console.error('[PublishingChip] Trigger API network error:', err));

      } catch (triggerError) {
        console.error('[PublishingChip] Error initiating trigger-amplification:', triggerError);
      }

      // 4. Create monitoring job
      const effectiveTriggerWord = trigger_word || 'interested';
      const { data: job, error: jobError } = await context.supabase
        .from('scrape_jobs')
        .insert({
          post_id: updatedPost.id,
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
        post: updatedPost,
        job,
        message: `✅ Post queued for publication!

It may take a few minutes to appear on your LinkedIn profile.

Account: ${selectedAccount.account_name}
🔍 Started monitoring for comments with trigger: "${effectiveTriggerWord}"

Link: ${post.url}`,
      });

    } catch (error: any) {
      console.error('[PublishingChip] Execution error:', error);
      
      // Attempt to mark as failed if we have a DB record
      if (dbPostId) {
        try {
          await context.supabase
            .from('posts')
            .update({
              status: 'failed',
              metrics: { error: error.message || 'Unknown error during publishing' } // Store error in JSONB
            })
            .eq('id', dbPostId);
          console.log('[PublishingChip] Marked post as failed in DB:', dbPostId);
        } catch (updateErr) {
          console.error('[PublishingChip] Failed to mark post as failed:', updateErr);
        }
      }

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
