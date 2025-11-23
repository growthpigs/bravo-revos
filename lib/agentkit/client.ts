/**
 * OpenAI AgentKit Client
 *
 * Orchestrates campaign management using OpenAI's Agents SDK
 */

import OpenAI from 'openai';
import { OPENAI_MODELS } from '@/lib/config/openai-models';

// Lazy-initialize OpenAI client to avoid build-time execution
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface AgentKitConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_CONFIG: Required<AgentKitConfig> = {
  model: OPENAI_MODELS.LATEST,
  temperature: 0.7,
  maxTokens: 4096,
};

/**
 * Campaign Orchestration Agent
 * Makes strategic decisions about campaign execution
 */
export class CampaignAgent {
  private config: Required<AgentKitConfig>;

  constructor(config: AgentKitConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze campaign and decide scheduling strategy
   */
  async analyzeAndSchedule(campaignData: {
    campaignId: string;
    postId: string;
    podId: string;
    memberCount: number;
    pastPerformance?: any;
  }): Promise<{
    shouldSchedule: boolean;
    timing: 'immediate' | 'optimal' | 'delayed';
    engagementStrategy: {
      likeWindow: [number, number]; // minutes
      commentWindow: [number, number]; // minutes
      memberSelection: 'all' | 'partial';
      memberCount?: number;
    };
    reasoning: string;
  }> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are a LinkedIn engagement optimization agent. You analyze campaigns and decide the optimal engagement strategy.

Key rules:
- LinkedIn algorithm prioritizes first 30 minutes for likes
- Comments should come 30-180 minutes after post
- All pod members must engage (no partial selection)
- Consider past performance metrics if available

Return JSON with:
{
  "shouldSchedule": boolean,
  "timing": "immediate" | "optimal" | "delayed",
  "engagementStrategy": {
    "likeWindow": [min, max] in minutes,
    "commentWindow": [min, max] in minutes,
    "memberSelection": "all" | "partial",
    "memberCount": number (if partial)
  },
  "reasoning": "explanation"
}`,
      },
      {
        role: 'user' as const,
        content: `Analyze this campaign and recommend engagement strategy:

Campaign ID: ${campaignData.campaignId}
Post ID: ${campaignData.postId}
Pod ID: ${campaignData.podId}
Pod Member Count: ${campaignData.memberCount}
${campaignData.pastPerformance ? `Past Performance: ${JSON.stringify(campaignData.pastPerformance)}` : 'No past performance data'}

What's the optimal engagement strategy?`,
      },
    ];

    const response = await getOpenAIClient().chat.completions.create({
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  }

  /**
   * Optimize message content using AI
   */
  async optimizeMessage(params: {
    originalMessage: string;
    goal: 'engagement' | 'conversion' | 'awareness';
    audience?: string;
    voiceCartridgeId?: string;
  }): Promise<{
    optimizedMessage: string;
    confidence: number;
    variants: string[];
    reasoning: string;
  }> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are a LinkedIn content optimization agent. Optimize messages for maximum ${params.goal}.

Return JSON with:
{
  "optimizedMessage": "improved version",
  "confidence": 0.0-1.0 score,
  "variants": ["variant1", "variant2"],
  "reasoning": "why these changes work"
}`,
      },
      {
        role: 'user' as const,
        content: `Optimize this message:

Original: "${params.originalMessage}"
Goal: ${params.goal}
${params.audience ? `Audience: ${params.audience}` : ''}

Provide optimized version with A/B variants.`,
      },
    ];

    const response = await getOpenAIClient().chat.completions.create({
      model: this.config.model,
      messages,
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  }

  /**
   * Analyze campaign performance and provide recommendations
   */
  async analyzePerformance(params: {
    campaignId: string;
    metrics: {
      posts: number;
      impressions: number;
      comments: number;
      triggerRate: number;
      dmsDelivered: number;
      leadsConverted: number;
    };
    timeRange: string;
  }): Promise<{
    overallScore: number;
    insights: string[];
    recommendations: string[];
    nextActions: {
      action: string;
      priority: 'high' | 'medium' | 'low';
      reason: string;
    }[];
  }> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are a campaign analytics agent. Analyze performance data and provide actionable insights.

Return JSON with:
{
  "overallScore": 0-100 performance score,
  "insights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"],
  "nextActions": [
    {
      "action": "specific action",
      "priority": "high" | "medium" | "low",
      "reason": "why this matters"
    }
  ]
}`,
      },
      {
        role: 'user' as const,
        content: `Analyze this campaign performance:

Campaign ID: ${params.campaignId}
Time Range: ${params.timeRange}

Metrics:
- Posts: ${params.metrics.posts}
- Impressions: ${params.metrics.impressions}
- Comments: ${params.metrics.comments}
- Trigger Rate: ${params.metrics.triggerRate}%
- DMs Delivered: ${params.metrics.dmsDelivered}
- Leads Converted: ${params.metrics.leadsConverted}

Conversion funnel:
- Impressions → Comments: ${((params.metrics.comments / params.metrics.impressions) * 100).toFixed(2)}%
- Comments → DMs: ${((params.metrics.dmsDelivered / params.metrics.comments) * 100).toFixed(2)}%
- DMs → Leads: ${((params.metrics.leadsConverted / params.metrics.dmsDelivered) * 100).toFixed(2)}%

Provide analysis and recommendations.`,
      },
    ];

    const response = await getOpenAIClient().chat.completions.create({
      model: this.config.model,
      messages,
      temperature: 0.6,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  }

  /**
   * Generate post content with optimal trigger word placement
   */
  async generatePostContent(params: {
    topic: string;
    triggerWord: string;
    leadMagnetName: string;
    voiceCartridgeId?: string;
  }): Promise<{
    postText: string;
    hashtags: string[];
    bestPostingTime: string;
    expectedEngagement: 'low' | 'medium' | 'high';
    reasoning: string;
  }> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are a LinkedIn content generation agent. Create high-converting posts with trigger words.

Best practices:
- Hook in first 2 lines
- Value-driven content
- Clear CTA with trigger word
- 3-5 relevant hashtags
- 150-300 words optimal

Return JSON with:
{
  "postText": "complete post",
  "hashtags": ["tag1", "tag2"],
  "bestPostingTime": "day and time suggestion",
  "expectedEngagement": "low" | "medium" | "high",
  "reasoning": "why this will perform well"
}`,
      },
      {
        role: 'user' as const,
        content: `Generate LinkedIn post:

Topic: ${params.topic}
Trigger Word: ${params.triggerWord}
Lead Magnet: ${params.leadMagnetName}

Create engaging post that drives comments with "${params.triggerWord}".`,
      },
    ];

    const response = await getOpenAIClient().chat.completions.create({
      model: this.config.model,
      messages,
      temperature: 0.9,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  }
}

// Export singleton instance
export const campaignAgent = new CampaignAgent();
