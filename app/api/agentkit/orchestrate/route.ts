/**
 * AgentKit Orchestration API
 *
 * POST /api/agentkit/orchestrate
 * Trigger AI-driven orchestration for post engagement
 */

import { NextRequest, NextResponse } from 'next/server';
import { campaignOrchestrator } from '@/lib/agentkit/orchestrator';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'orchestrate_post':
        return await orchestratePost(params);

      case 'optimize_message':
        return await optimizeMessage(params);

      case 'analyze_performance':
        return await analyzePerformance(params);

      case 'generate_post':
        return await generatePost(params);

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[AgentKit API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

async function orchestratePost(params: {
  postId: string;
  campaignId: string;
  podId: string;
}) {
  const { postId, campaignId, podId } = params;

  if (!postId || !campaignId || !podId) {
    return NextResponse.json(
      { error: 'Missing required fields: postId, campaignId, podId' },
      { status: 400 }
    );
  }

  const result = await campaignOrchestrator.orchestratePostEngagement({
    postId,
    campaignId,
    podId,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Orchestration failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    activitiesScheduled: result.activitiesScheduled,
    strategy: result.strategy,
  });
}

async function optimizeMessage(params: {
  campaignId: string;
  messageType: 'post' | 'dm_initial' | 'dm_confirmation';
  originalMessage: string;
  goal: 'engagement' | 'conversion' | 'awareness';
}) {
  const { campaignId, messageType, originalMessage, goal } = params;

  if (!campaignId || !messageType || !originalMessage || !goal) {
    return NextResponse.json(
      {
        error:
          'Missing required fields: campaignId, messageType, originalMessage, goal',
      },
      { status: 400 }
    );
  }

  const result = await campaignOrchestrator.optimizeCampaignMessage({
    campaignId,
    messageType,
    originalMessage,
    goal,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Optimization failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    optimizedMessage: result.optimizedMessage,
    variants: result.variants,
    confidence: result.confidence,
  });
}

async function analyzePerformance(params: {
  campaignId: string;
  timeRange?: string;
}) {
  const { campaignId, timeRange = '7d' } = params;

  if (!campaignId) {
    return NextResponse.json(
      { error: 'Missing required field: campaignId' },
      { status: 400 }
    );
  }

  const result = await campaignOrchestrator.analyzeCampaignPerformance(
    campaignId,
    timeRange
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Analysis failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    analysis: result.analysis,
  });
}

async function generatePost(params: { campaignId: string; topic: string }) {
  const { campaignId, topic } = params;

  if (!campaignId || !topic) {
    return NextResponse.json(
      { error: 'Missing required fields: campaignId, topic' },
      { status: 400 }
    );
  }

  const result = await campaignOrchestrator.generatePostContent({
    campaignId,
    topic,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Post generation failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    postContent: result.postContent,
  });
}
