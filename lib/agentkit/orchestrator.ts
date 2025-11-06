/**
 * Campaign Orchestrator
 *
 * Uses AgentKit to make strategic decisions, then calls E-04 to schedule execution
 */

import { campaignAgent } from './client';
import { createClient } from '@/lib/supabase/server';

interface Campaign {
  id: string;
  name: string;
  trigger_words: string;
  lead_magnet_id: string;
  client_id: string;
  status: string;
}

interface Pod {
  id: string;
  name: string;
  member_count: number;
  voice_cartridge_id?: string;
}

interface Post {
  id: string;
  campaign_id: string;
  linkedin_post_id: string;
  published_at: string;
}

/**
 * Campaign Orchestrator
 * Makes AI-driven decisions about campaign execution
 */
export class CampaignOrchestrator {
  /**
   * Orchestrate engagement for a new post
   * This is called when a post is published to decide engagement strategy
   */
  async orchestratePostEngagement(params: {
    postId: string;
    campaignId: string;
    podId: string;
  }): Promise<{
    success: boolean;
    activitiesScheduled: number;
    strategy: any;
    error?: string;
  }> {
    try {
      // 1. Gather context
      const [campaign, pod, post, pastPerformance] = await Promise.all([
        this.getCampaign(params.campaignId),
        this.getPod(params.podId),
        this.getPost(params.postId),
        this.getPastPerformance(params.campaignId),
      ]);

      if (!campaign || !pod || !post) {
        return {
          success: false,
          activitiesScheduled: 0,
          strategy: null,
          error: 'Missing required data',
        };
      }

      // 2. Ask AgentKit for strategy
      const strategy = await campaignAgent.analyzeAndSchedule({
        campaignId: campaign.id,
        postId: post.linkedin_post_id,
        podId: pod.id,
        memberCount: pod.member_count,
        pastPerformance,
      });

      console.log(`[AgentKit] Strategy for post ${post.id}:`, strategy);

      if (!strategy.shouldSchedule) {
        return {
          success: true,
          activitiesScheduled: 0,
          strategy,
          error: 'Agent decided not to schedule',
        };
      }

      // 3. Schedule activities via E-04
      const activitiesScheduled = await this.scheduleEngagementActivities({
        postId: post.id,
        podId: pod.id,
        strategy: strategy.engagementStrategy,
      });

      // 4. Log orchestration decision
      await this.logOrchestrationDecision({
        campaignId: campaign.id,
        postId: post.id,
        strategy,
        activitiesScheduled,
      });

      return {
        success: true,
        activitiesScheduled,
        strategy,
      };
    } catch (error) {
      console.error('[AgentKit] Orchestration error:', error);
      return {
        success: false,
        activitiesScheduled: 0,
        strategy: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Optimize campaign message using AgentKit
   */
  async optimizeCampaignMessage(params: {
    campaignId: string;
    messageType: 'post' | 'dm_initial' | 'dm_confirmation';
    originalMessage: string;
    goal: 'engagement' | 'conversion' | 'awareness';
  }): Promise<{
    success: boolean;
    optimizedMessage?: string;
    variants?: string[];
    confidence?: number;
    error?: string;
  }> {
    try {
      const campaign = await this.getCampaign(params.campaignId);
      if (!campaign) {
        return {
          success: false,
          error: 'Campaign not found',
        };
      }

      const result = await campaignAgent.optimizeMessage({
        originalMessage: params.originalMessage,
        goal: params.goal,
        audience: 'LinkedIn professionals',
      });

      // Store optimization result
      await this.storeOptimizationResult({
        campaignId: campaign.id,
        messageType: params.messageType,
        original: params.originalMessage,
        optimized: result.optimizedMessage,
        confidence: result.confidence,
        variants: result.variants,
      });

      return {
        success: true,
        optimizedMessage: result.optimizedMessage,
        variants: result.variants,
        confidence: result.confidence,
      };
    } catch (error) {
      console.error('[AgentKit] Message optimization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze campaign performance and get AI recommendations
   */
  async analyzeCampaignPerformance(
    campaignId: string,
    timeRange: string = '7d'
  ): Promise<{
    success: boolean;
    analysis?: any;
    error?: string;
  }> {
    try {
      const metrics = await this.getCampaignMetrics(campaignId, timeRange);

      const analysis = await campaignAgent.analyzePerformance({
        campaignId,
        metrics,
        timeRange,
      });

      // Store analysis
      await this.storePerformanceAnalysis({
        campaignId,
        timeRange,
        analysis,
      });

      return {
        success: true,
        analysis,
      };
    } catch (error) {
      console.error('[AgentKit] Performance analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate post content using AgentKit
   */
  async generatePostContent(params: {
    campaignId: string;
    topic: string;
  }): Promise<{
    success: boolean;
    postContent?: any;
    error?: string;
  }> {
    try {
      const campaign = await this.getCampaign(params.campaignId);
      if (!campaign) {
        return {
          success: false,
          error: 'Campaign not found',
        };
      }

      // Get lead magnet details
      const supabase = await createClient();
      const { data: leadMagnet } = await supabase
        .from('lead_magnets')
        .select('title')
        .eq('id', campaign.lead_magnet_id)
        .single();

      const postContent = await campaignAgent.generatePostContent({
        topic: params.topic,
        triggerWord: campaign.trigger_words,
        leadMagnetName: leadMagnet?.title || 'Lead Magnet',
      });

      return {
        success: true,
        postContent,
      };
    } catch (error) {
      console.error('[AgentKit] Post generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ========== Private Helper Methods ==========

  private async getCampaign(campaignId: string): Promise<Campaign | null> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    return data;
  }

  private async getPod(podId: string): Promise<Pod | null> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('pods')
      .select('*, pod_members(count)')
      .eq('id', podId)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      member_count: data.pod_members?.[0]?.count || 0,
      voice_cartridge_id: data.voice_cartridge_id,
    };
  }

  private async getPost(postId: string): Promise<Post | null> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    return data;
  }

  private async getPastPerformance(campaignId: string): Promise<any> {
    // Get metrics from past posts in this campaign
    const supabase = await createClient();
    const { data: posts } = await supabase
      .from('posts')
      .select('*, comments(count), leads(count)')
      .eq('campaign_id', campaignId)
      .order('published_at', { ascending: false })
      .limit(10);

    if (!posts || posts.length === 0) {
      return null;
    }

    // Calculate averages
    const avgComments =
      posts.reduce((sum: number, p: any) => sum + (p.comments?.[0]?.count || 0), 0) /
      posts.length;
    const avgLeads =
      posts.reduce((sum: number, p: any) => sum + (p.leads?.[0]?.count || 0), 0) /
      posts.length;

    return {
      postCount: posts.length,
      avgComments,
      avgLeads,
      conversionRate: avgLeads / avgComments || 0,
    };
  }

  private async scheduleEngagementActivities(params: {
    postId: string;
    podId: string;
    strategy: any;
  }): Promise<number> {
    // Get all pod members with their profiles to find post URL
    const supabase = await createClient();
    const { data: members } = await supabase
      .from('pod_members')
      .select('id, profile_id')
      .eq('pod_id', params.podId);

    // Get post with URL
    const { data: post } = await supabase
      .from('posts')
      .select('linkedin_post_url')
      .eq('id', params.postId)
      .single();

    if (!members || members.length === 0 || !post) {
      return 0;
    }

    const now = new Date();
    const activities: any[] = [];
    const postUrl = post.linkedin_post_url || `https://linkedin.com/feed/update/${params.postId}`;

    // Schedule likes for all members
    const [likeMinDelay, likeMaxDelay] = params.strategy.likeWindow || [1, 30];
    for (const member of members) {
      const likeDelay = Math.random() * (likeMaxDelay - likeMinDelay) + likeMinDelay;
      const scheduledFor = new Date(now.getTime() + likeDelay * 60 * 1000);

      activities.push({
        pod_id: params.podId,
        post_id: params.postId,
        post_url: postUrl,
        member_id: member.id,
        engagement_type: 'like',
        status: 'pending',
        scheduled_for: scheduledFor.toISOString(),
        created_at: now.toISOString(),
      });
    }

    // Schedule comments for all members
    const [commentMinDelay, commentMaxDelay] = params.strategy.commentWindow || [
      30, 180,
    ];
    for (const member of members) {
      const commentDelay =
        Math.random() * (commentMaxDelay - commentMinDelay) + commentMinDelay;
      const scheduledFor = new Date(now.getTime() + commentDelay * 60 * 1000);

      activities.push({
        pod_id: params.podId,
        post_id: params.postId,
        post_url: postUrl,
        member_id: member.id,
        engagement_type: 'comment',
        status: 'pending',
        scheduled_for: scheduledFor.toISOString(),
        created_at: now.toISOString(),
      });
    }

    // Insert all activities
    const { error } = await supabase
      .from('pod_activities')
      .insert(activities);

    if (error) {
      console.error('[AgentKit] Error scheduling activities:', error);
      return 0;
    }

    console.log(
      `[AgentKit] Scheduled ${activities.length} activities for post ${params.postId}`
    );
    return activities.length;
  }

  private async logOrchestrationDecision(params: {
    campaignId: string;
    postId: string;
    strategy: any;
    activitiesScheduled: number;
  }): Promise<void> {
    const supabase = await createClient();
    await supabase.from('agentkit_decisions').insert({
      campaign_id: params.campaignId,
      post_id: params.postId,
      decision_type: 'engagement_strategy',
      strategy: params.strategy,
      activities_scheduled: params.activitiesScheduled,
      created_at: new Date().toISOString(),
    });
  }

  private async storeOptimizationResult(params: {
    campaignId: string;
    messageType: string;
    original: string;
    optimized: string;
    confidence: number;
    variants: string[];
  }): Promise<void> {
    const supabase = await createClient();
    await supabase.from('agentkit_optimizations').insert({
      campaign_id: params.campaignId,
      message_type: params.messageType,
      original_message: params.original,
      optimized_message: params.optimized,
      confidence_score: params.confidence,
      variants: params.variants,
      created_at: new Date().toISOString(),
    });
  }

  private async storePerformanceAnalysis(params: {
    campaignId: string;
    timeRange: string;
    analysis: any;
  }): Promise<void> {
    const supabase = await createClient();
    await supabase.from('agentkit_analyses').insert({
      campaign_id: params.campaignId,
      time_range: params.timeRange,
      analysis: params.analysis,
      created_at: new Date().toISOString(),
    });
  }

  private async getCampaignMetrics(
    campaignId: string,
    timeRange: string
  ): Promise<any> {
    // Calculate time range in days
    const days = parseInt(timeRange.replace('d', ''));
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get posts in time range
    const supabase = await createClient();
    const { data: posts } = await supabase
      .from('posts')
      .select(
        `
        *,
        comments(count),
        dm_sequences(count),
        leads(count)
      `
      )
      .eq('campaign_id', campaignId)
      .gte('published_at', since.toISOString());

    if (!posts || posts.length === 0) {
      return {
        posts: 0,
        impressions: 0,
        comments: 0,
        triggerRate: 0,
        dmsDelivered: 0,
        leadsConverted: 0,
      };
    }

    const comments = posts.reduce(
      (sum: number, p: any) => sum + (p.comments?.[0]?.count || 0),
      0
    );
    const dms = posts.reduce((sum: number, p: any) => sum + (p.dm_sequences?.[0]?.count || 0), 0);
    const leads = posts.reduce((sum: number, p: any) => sum + (p.leads?.[0]?.count || 0), 0);

    return {
      posts: posts.length,
      impressions: posts.reduce((sum: number, p: any) => sum + (p.impressions || 0), 0),
      comments,
      triggerRate: comments > 0 ? (comments / posts.length) * 100 : 0,
      dmsDelivered: dms,
      leadsConverted: leads,
    };
  }
}

// Export singleton instance
export const campaignOrchestrator = new CampaignOrchestrator();
