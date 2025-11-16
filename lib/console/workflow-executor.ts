/**
 * Workflow Executor - Execute Database-Driven Workflows
 *
 * Executes workflow steps loaded from console_workflows table.
 * Works with AgentKit for AI operations and MarketingConsole for cartridge integration.
 *
 * Architecture Compliance: NON-NEGOTIABLE #4
 * "Workflow JSON - load from console_workflows table - NO hardcoded workflow logic"
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { MarketingConsole } from './marketing-console';
import {
  WorkflowDefinition,
  getWorkflowPrompt,
  interpolatePrompt,
} from './workflow-loader';

export interface WorkflowExecutionContext {
  supabase: SupabaseClient;
  user: any;
  session: any;
  message: string;
  agencyId?: string;
  clientId?: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  response?: string;
  sessionId?: string;
  interactive?: {
    type: 'decision' | 'confirmation';
    workflow_id: string;
    decision_options?: any[];
  };
  workingDocument?: string;
  meta?: any;
}

/**
 * Execute a content generation workflow (like "write")
 *
 * @param workflow - Workflow definition from database
 * @param context - Execution context (user, session, supabase)
 * @returns Workflow execution result
 */
export async function executeContentGenerationWorkflow(
  workflow: WorkflowDefinition,
  context: WorkflowExecutionContext
): Promise<WorkflowExecutionResult> {
  console.log('[WorkflowExecutor] Executing workflow:', workflow.name);

  const { supabase, user, session, message } = context;

  // Step 1: Load brand cartridge
  const { data: brandData } = await supabase
    .from('brand_cartridges')
    .select('core_messaging, target_audience, industry, core_values, brand_voice')
    .eq('user_id', user.id)
    .single();

  const { data: styleData } = await supabase
    .from('style_cartridges')
    .select('tone_of_voice, writing_style, personality_traits')
    .eq('user_id', user.id)
    .single();

  console.log('[WorkflowExecutor] Cartridges loaded:', {
    hasBrand: !!brandData,
    hasStyle: !!styleData,
  });

  // Step 2: Check if this is topic generation or topic selection
  const isTopicSelection = message.startsWith('topic:');

  if (isTopicSelection) {
    // User selected a topic - generate content
    return await executePostGeneration(workflow, context, brandData, styleData);
  }

  // Step 3: Generate topics using AI
  return await executeTopicGeneration(workflow, context, brandData, styleData);
}

/**
 * Generate personalized topic suggestions using AI
 */
async function executeTopicGeneration(
  workflow: WorkflowDefinition,
  context: WorkflowExecutionContext,
  brandData: any,
  styleData: any
): Promise<WorkflowExecutionResult> {
  const { supabase, user, session, message } = context;

  // Get the topic_generation prompt from workflow
  const promptTemplate = getWorkflowPrompt(workflow, 'topic_generation');

  if (!promptTemplate) {
    throw new Error('topic_generation prompt not found in workflow');
  }

  // Interpolate variables
  const variables = {
    industry: brandData?.industry || 'business',
    target_audience: brandData?.target_audience || 'professionals',
    brand_voice: brandData?.brand_voice || 'professional',
    core_messaging: brandData?.core_messaging
      ? `Core Messaging:\n${brandData.core_messaging}`
      : '',
  };

  const interpolatedPrompt = interpolatePrompt(promptTemplate, variables);

  console.log('[WorkflowExecutor] Generating topics with AI');

  // Use MarketingConsole to generate topics
  const marketingConsole = new MarketingConsole({
    baseInstructions: interpolatedPrompt,
    model: 'gpt-4o-mini',
    temperature: 0.8,
  });

  try {
    const result = await marketingConsole.execute(
      [{ role: 'user', content: 'Generate 4 LinkedIn post topic headlines.' }],
      {
        agencyId: context.agencyId,
        clientId: context.clientId,
        userId: user.id,
      }
    );

    // Parse AI response as JSON array
    let topicHeadlines: string[];
    try {
      topicHeadlines = JSON.parse(result.response);
    } catch (e) {
      // If not JSON, try to extract topics from text
      const lines = result.response.split('\n').filter((l) => l.trim());
      topicHeadlines = lines.slice(0, 4);
    }

    // Convert to decision options
    const topicOptions = topicHeadlines.map((headline, index) => ({
      label: headline,
      value: `topic:${index}:${headline.toLowerCase().replace(/\s+/g, '_')}`,
      icon: index === 0 ? 'brain' : 'star',
      variant: index === 0 ? 'primary' : 'secondary',
    }));

    const workflowId = `${workflow.name}-${Date.now()}`;

    // Save message
    await supabase.from('hgc_messages').insert({
      session_id: session.id,
      role: 'user',
      content: message,
    });

    console.log('[WorkflowExecutor] Topics generated:', topicOptions.length);

    return {
      success: true,
      response: '📋 **Brand Context Loaded** - What topic would you like to write about?',
      sessionId: session.id,
      interactive: {
        type: 'decision',
        workflow_id: workflowId,
        decision_options: topicOptions,
      },
      meta: {
        workflowName: workflow.name,
        cartridgesLoaded: true,
        topicsGenerated: topicOptions.length,
      },
    };
  } catch (error: any) {
    console.error('[WorkflowExecutor] Topic generation failed:', error);
    throw new Error(`Failed to generate topics: ${error.message}`);
  }
}

/**
 * Generate LinkedIn post content after topic selection
 */
async function executePostGeneration(
  workflow: WorkflowDefinition,
  context: WorkflowExecutionContext,
  brandData: any,
  styleData: any
): Promise<WorkflowExecutionResult> {
  const { supabase, user, session, message } = context;

  // Extract topic from message (format: "topic:0:headline_slug")
  const topicMatch = message.match(/^topic:\d+:(.+)$/);
  const topicSlug = topicMatch ? topicMatch[1].replace(/_/g, ' ') : 'general topic';

  console.log('[WorkflowExecutor] Generating post for topic:', topicSlug);

  // Get post_generation prompt from workflow
  const promptTemplate = getWorkflowPrompt(workflow, 'post_generation');

  if (!promptTemplate) {
    throw new Error('post_generation prompt not found in workflow');
  }

  // Build brand context
  const brandContext = `
BRAND CONTEXT:
- Industry: ${brandData?.industry || 'business'}
- Target Audience: ${brandData?.target_audience || 'professionals'}
- Brand Voice: ${brandData?.brand_voice || 'professional'}
- Core Values: ${brandData?.core_values || 'integrity, innovation'}

${brandData?.core_messaging ? `Core Messaging:\n${brandData.core_messaging}` : ''}
`.trim();

  // Build style context
  const styleContext = `
STYLE CONTEXT:
- Tone: ${styleData?.tone_of_voice || 'professional'}
- Writing Style: ${styleData?.writing_style || 'clear and engaging'}
- Personality: ${styleData?.personality_traits || 'authentic, knowledgeable'}
`.trim();

  const variables = {
    brand_context: brandContext,
    style_context: styleContext,
    topic: topicSlug,
  };

  const interpolatedPrompt = interpolatePrompt(promptTemplate, variables);

  // Use MarketingConsole to generate post
  const marketingConsole = new MarketingConsole({
    baseInstructions: interpolatedPrompt,
    model: 'gpt-4o',
    temperature: 0.7,
  });

  try {
    const result = await marketingConsole.execute(
      [{ role: 'user', content: `Write a LinkedIn post about: ${topicSlug}` }],
      {
        agencyId: context.agencyId,
        clientId: context.clientId,
        userId: user.id,
      }
    );

    // Save messages
    await supabase.from('hgc_messages').insert([
      { session_id: session.id, role: 'user', content: message },
      {
        session_id: session.id,
        role: 'assistant',
        content: '✅ LinkedIn post generated in working document',
      },
    ]);

    console.log('[WorkflowExecutor] Post generated successfully');

    return {
      success: true,
      response: '✅ LinkedIn post generated in working document',
      sessionId: session.id,
      workingDocument: result.response,
      meta: {
        workflowName: workflow.name,
        topic: topicSlug,
        cartridgesUsed: true,
      },
    };
  } catch (error: any) {
    console.error('[WorkflowExecutor] Post generation failed:', error);
    throw new Error(`Failed to generate post: ${error.message}`);
  }
}

/**
 * Execute a navigation workflow (like "campaign")
 *
 * @param workflow - Workflow definition from database
 * @param context - Execution context
 * @returns Navigation result
 */
export async function executeNavigationWorkflow(
  workflow: WorkflowDefinition,
  context: WorkflowExecutionContext
): Promise<WorkflowExecutionResult> {
  console.log('[WorkflowExecutor] Executing navigation workflow:', workflow.name);

  const targetPath = workflow.output_config.target || '/dashboard';

  return {
    success: true,
    response: `Navigating to ${targetPath}`,
    meta: {
      workflowName: workflow.name,
      navigation: targetPath,
    },
  };
}
