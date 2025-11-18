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
// REMOVED: import OpenAI from 'openai'; - moved to type-only to prevent build-time tiktoken execution
import { MarketingConsole } from './marketing-console';
import {
  WorkflowDefinition,
  getWorkflowPrompt,
  interpolatePrompt,
} from './workflow-loader';
import type { CartridgeSnapshot } from '@/lib/cartridges/snapshot';

export interface WorkflowExecutionContext {
  supabase: SupabaseClient;
  openai: any; // OpenAI instance passed via dependency injection
  user: any;
  session: any;
  message: string;
  cartridges: CartridgeSnapshot; // Added: Immutable snapshot of all cartridge data
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
  document?: {
    content: string;
    title: string;
  };
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

  const { message } = context;

  // NOTE: Cartridges are now loaded upfront in V2 route and included in system prompt
  // No need to load brand/style cartridges here - AI already has full context
  console.log('[WorkflowExecutor] Using cartridges from system prompt (loaded upfront)');

  // Step 1: Check if this is topic generation or topic selection
  const isTopicSelection = message.startsWith('topic:');

  if (isTopicSelection) {
    // User selected a topic - generate content
    return await executePostGeneration(workflow, context);
  }

  // Step 2: Generate topics using AI
  return await executeTopicGeneration(workflow, context);
}

/**
 * Generate personalized topic suggestions using AI
 *
 * NOTE: Brand, style, and platform context are now in the system prompt.
 * No need to interpolate variables - AI already has full cartridge context.
 */
async function executeTopicGeneration(
  workflow: WorkflowDefinition,
  context: WorkflowExecutionContext
): Promise<WorkflowExecutionResult> {
  const { supabase, user, session, message } = context;

  // Get the topic_generation prompt from workflow
  const promptTemplate = getWorkflowPrompt(workflow, 'topic_generation');

  if (!promptTemplate) {
    throw new Error('topic_generation prompt not found in workflow');
  }

  // NOTE: No variable interpolation needed - brand context is in system prompt
  // The workflow prompt just provides the task structure
  const workflowPrompt = promptTemplate;

  console.log('[WorkflowExecutor] Generating topics with AI (using cartridges from system prompt)');

  // Use MarketingConsole to generate topics
  // NOTE: Brand/style/platform context already in system prompt from V2 route
  const marketingConsole = new MarketingConsole({
    baseInstructions: workflowPrompt,
    model: 'gpt-4o-mini',
    temperature: 0.8,
    openai: context.openai,
    supabase: supabase,
  });

  try {
    const result = await marketingConsole.execute(
      user.id,
      session.id,
      [{ role: 'user', content: 'Generate 4 LinkedIn post topic headlines.' }]
    );

    console.log('[WorkflowExecutor] AI response received:', result.response.substring(0, 200));

    // Parse AI response as JSON array
    let topicHeadlines: string[] = [];
    try {
      const parsed = JSON.parse(result.response);
      if (Array.isArray(parsed)) {
        topicHeadlines = parsed;
      } else {
        console.warn('[WorkflowExecutor] Parsed JSON is not an array:', typeof parsed);
        topicHeadlines = [String(parsed)];
      }
    } catch (e) {
      console.log('[WorkflowExecutor] JSON parse failed, extracting from text');
      // If not JSON, try to extract topics from text
      const lines = result.response.split('\n').filter((l) => l.trim());
      topicHeadlines = lines.slice(0, 4);
    }

    console.log('[WorkflowExecutor] Parsed topics:', topicHeadlines);

    // Ensure we have at least one topic
    if (!Array.isArray(topicHeadlines) || topicHeadlines.length === 0) {
      topicHeadlines = [
        'How AI is transforming your industry',
        'Building trust with your audience',
        'Overcoming common challenges in 2024',
        'The future of your business strategy',
      ];
      console.warn('[WorkflowExecutor] Using fallback topics');
    }

    // Convert to decision options
    const topicOptions = topicHeadlines.map((headline, index) => ({
      label: String(headline).trim(),
      value: `topic:${index}:${String(headline).toLowerCase().replace(/\s+/g, '_')}`,
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

    // DIAGNOSTIC: Check brand cartridge data
    console.log('[WorkflowExecutor] 🔍 Brand cartridge diagnostic:', {
      has_cartridges_obj: !!context.cartridges,
      has_brand: !!context.cartridges?.brand,
      brand_data: context.cartridges?.brand ? {
        industry: context.cartridges.brand.industry,
        target_audience: context.cartridges.brand.target_audience,
        has_core_messaging: !!context.cartridges.brand.core_messaging,
        has_brand_voice: !!context.cartridges.brand.brand_voice
      } : null
    });

    // Format brand context for display - use double newlines for markdown paragraph breaks
    const brandContextMessage = [
      '**Brand Context Loaded**',
      `**Industry:** ${context.cartridges.brand?.industry || 'N/A'}`,
      `**Target Audience:** ${context.cartridges.brand?.target_audience || 'N/A'}`,
      '**Ideal Customer Profile (ICP DNA)**',
      '**Burning Question:**',
      context.cartridges.brand?.core_messaging
        ? `"${context.cartridges.brand.core_messaging.slice(0, 200)}${context.cartridges.brand.core_messaging.length > 200 ? '...' : ''}"`
        : '',
      'Select a topic to write about:',
    ].filter(Boolean).join('\n\n');

    return {
      success: true,
      response: brandContextMessage,
      sessionId: session.id,
      interactive: {
        type: 'decision',
        workflow_id: workflowId,
        decision_options: topicOptions,
      },
      document: {
        title: 'LinkedIn Post',
        content: '_(Awaiting topic selection...)_',
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
 *
 * NOTE: Brand, style, and platform context are now in the system prompt.
 * No need to build context manually - AI already has full cartridge data.
 */
async function executePostGeneration(
  workflow: WorkflowDefinition,
  context: WorkflowExecutionContext
): Promise<WorkflowExecutionResult> {
  const { supabase, user, session, message } = context;

  // Extract topic from message (format: "topic:0:headline_slug")
  const topicMatch = message.match(/^topic:\d+:(.+)$/);
  const topicSlug = topicMatch ? topicMatch[1].replace(/_/g, ' ') : 'general topic';

  console.log('[WorkflowExecutor] Generating post for topic:', topicSlug, '(using cartridges from system prompt)');

  // Get post_generation prompt from workflow
  const promptTemplate = getWorkflowPrompt(workflow, 'post_generation');

  if (!promptTemplate) {
    throw new Error('post_generation prompt not found in workflow');
  }

  // Build brand context from cartridge snapshot for prompt interpolation
  const brandContext = buildBrandContext(context.cartridges.brand);
  const styleContext = buildStyleContext(context.cartridges.platformTemplate);

  // Interpolate workflow prompt with cartridge data
  const variables = {
    topic: topicSlug,
    brand_context: brandContext,
    style_context: styleContext,
  };

  const workflowPrompt = interpolatePrompt(promptTemplate, variables);

  // Use MarketingConsole to generate post
  // NOTE: Brand/style/platform context already in system prompt from V2 route
  const marketingConsole = new MarketingConsole({
    baseInstructions: workflowPrompt,
    model: 'gpt-4o',
    temperature: 0.7,
    openai: context.openai,
    supabase: supabase,
  });

  try {
    const result = await marketingConsole.execute(
      user.id,
      session.id,
      [{ role: 'user', content: `Write a LinkedIn post about: ${topicSlug}` }]
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
      document: {
        content: result.response,
        title: 'LinkedIn Post Draft'
      },
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

/**
 * Build brand context string from brand cartridge for prompt interpolation
 *
 * @param brand - Brand cartridge data (or null)
 * @returns Formatted brand context string
 */
function buildBrandContext(brand: CartridgeSnapshot['brand']): string {
  if (!brand) {
    return 'No brand context available';
  }

  const parts: string[] = [];

  if (brand.company_name) {
    parts.push(`Company: ${brand.company_name}`);
  }

  if (brand.industry) {
    parts.push(`Industry: ${brand.industry}`);
  }

  if (brand.target_audience) {
    parts.push(`Target Audience: ${brand.target_audience}`);
  }

  if (brand.brand_voice) {
    parts.push(`Brand Voice: ${brand.brand_voice}`);
  }

  if (brand.core_values && brand.core_values.length > 0) {
    parts.push(`Core Values: ${brand.core_values.join(', ')}`);
  }

  if (brand.core_messaging) {
    parts.push(`Core Messaging: ${brand.core_messaging.slice(0, 300)}${brand.core_messaging.length > 300 ? '...' : ''}`);
  }

  return parts.join('\n');
}

/**
 * Build style context string from platform template for prompt interpolation
 *
 * @param platformTemplate - Platform template data (or null)
 * @returns Formatted style context string
 */
function buildStyleContext(platformTemplate: CartridgeSnapshot['platformTemplate']): string {
  if (!platformTemplate) {
    return 'No style preferences available';
  }

  const parts: string[] = [];

  parts.push(`Platform: ${platformTemplate.platform}`);
  parts.push(`Max Length: ${platformTemplate.max_length} characters`);

  if (platformTemplate.tone && platformTemplate.tone.length > 0) {
    parts.push(`Tone: ${platformTemplate.tone.join(', ')}`);
  }

  if (platformTemplate.best_practices && platformTemplate.best_practices.length > 0) {
    parts.push(`Best Practices:\n${platformTemplate.best_practices.map(p => `- ${p}`).join('\n')}`);
  }

  return parts.join('\n');
}
