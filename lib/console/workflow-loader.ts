/**
 * Workflow Loader - Database-Driven Workflow Execution
 *
 * Loads workflow definitions from console_workflows table to eliminate
 * hardcoded workflow logic in route handlers.
 *
 * Architecture Compliance: NON-NEGOTIABLE #4
 * "Workflow JSON - load from console_workflows table - NO hardcoded workflow logic"
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface WorkflowStep {
  step: string;
  description?: string;
  ai_prompt_key?: string;
  condition?: string;
}

export interface WorkflowTriggers {
  commands?: string[];
  patterns?: string[];
  case_insensitive?: boolean;
}

export interface WorkflowPrompts {
  [key: string]: string;
}

export interface WorkflowOutputConfig {
  target?: 'working_document' | 'chat' | 'navigation';
  clear_previous?: boolean;
  fullscreen?: boolean;
  format?: 'markdown' | 'html' | 'text';
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  workflow_type: 'command' | 'navigation' | 'content_generation' | 'orchestration';
  steps: WorkflowStep[];
  triggers: WorkflowTriggers;
  decision_options?: any[];
  prompts: WorkflowPrompts;
  output_config: WorkflowOutputConfig;
  tenant_scope: 'system' | 'agency' | 'client' | 'user';
  is_active: boolean;
  version: number;
}

/**
 * Load workflow definition by name
 *
 * @param workflowName - Name of the workflow (e.g., 'write-linkedin-post')
 * @param supabase - Supabase client
 * @param userId - Optional user ID for tenant-scoped workflows
 * @returns Workflow definition or null if not found
 */
export async function loadWorkflow(
  workflowName: string,
  supabase: SupabaseClient,
  userId?: string
): Promise<WorkflowDefinition | null> {
  console.log('[WorkflowLoader] Loading workflow:', workflowName);

  try {
    // Query workflow from database
    const { data, error } = await supabase
      .from('console_workflows')
      .select('*')
      .eq('name', workflowName)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('[WorkflowLoader] Error loading workflow:', error);
      return null;
    }

    if (!data) {
      console.warn('[WorkflowLoader] Workflow not found:', workflowName);
      return null;
    }

    console.log('[WorkflowLoader] Workflow loaded successfully:', {
      name: data.name,
      type: data.workflow_type,
      steps: data.steps.length,
    });

    return data as WorkflowDefinition;
  } catch (error) {
    console.error('[WorkflowLoader] Failed to load workflow:', error);
    return null;
  }
}

/**
 * Find workflow by trigger (command or pattern)
 *
 * @param message - User message to match against triggers
 * @param supabase - Supabase client
 * @param userId - Optional user ID for tenant-scoped workflows
 * @returns Workflow definition or null if no match
 */
export async function findWorkflowByTrigger(
  message: string,
  supabase: SupabaseClient,
  userId?: string
): Promise<WorkflowDefinition | null> {
  console.log('[WorkflowLoader] Finding workflow for message:', message);

  try {
    // Get all active workflows
    const { data: workflows, error } = await supabase
      .from('console_workflows')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('[WorkflowLoader] Error querying workflows:', error);
      return null;
    }

    if (!workflows || workflows.length === 0) {
      console.warn('[WorkflowLoader] No active workflows found');
      return null;
    }

    // Check each workflow's triggers
    for (const workflow of workflows) {
      const triggers = workflow.triggers as WorkflowTriggers;

      // Check command triggers
      if (triggers.commands && triggers.commands.length > 0) {
        const messageToCheck = triggers.case_insensitive
          ? message.toLowerCase().trim()
          : message.trim();

        for (const command of triggers.commands) {
          const commandToCheck = triggers.case_insensitive
            ? command.toLowerCase()
            : command;

          if (messageToCheck === commandToCheck) {
            console.log('[WorkflowLoader] Workflow matched by command:', workflow.name);
            return workflow as WorkflowDefinition;
          }
        }
      }

      // Check pattern triggers
      if (triggers.patterns && triggers.patterns.length > 0) {
        for (const pattern of triggers.patterns) {
          const flags = triggers.case_insensitive ? 'i' : '';
          const regex = new RegExp(pattern, flags);

          if (regex.test(message)) {
            console.log('[WorkflowLoader] Workflow matched by pattern:', workflow.name);
            return workflow as WorkflowDefinition;
          }
        }
      }
    }

    console.log('[WorkflowLoader] No workflow matched for message');
    return null;
  } catch (error) {
    console.error('[WorkflowLoader] Failed to find workflow:', error);
    return null;
  }
}

/**
 * Interpolate template variables in prompt
 *
 * @param template - Prompt template with {variables}
 * @param variables - Object with variable values
 * @returns Interpolated prompt
 */
export function interpolatePrompt(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;

  // Replace {variable} with actual values
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    const replacement = value !== null && value !== undefined ? String(value) : '';
    result = result.replace(new RegExp(placeholder, 'g'), replacement);
  }

  return result;
}

/**
 * Get workflow step by name
 *
 * @param workflow - Workflow definition
 * @param stepName - Name of the step to find
 * @returns Workflow step or undefined
 */
export function getWorkflowStep(
  workflow: WorkflowDefinition,
  stepName: string
): WorkflowStep | undefined {
  return workflow.steps.find((step) => step.step === stepName);
}

/**
 * Get prompt for workflow step
 *
 * @param workflow - Workflow definition
 * @param promptKey - Key in prompts object
 * @param variables - Optional variables to interpolate
 * @returns Prompt string or undefined
 */
export function getWorkflowPrompt(
  workflow: WorkflowDefinition,
  promptKey: string,
  variables?: Record<string, any>
): string | undefined {
  const template = workflow.prompts[promptKey];

  if (!template) {
    console.warn('[WorkflowLoader] Prompt not found:', promptKey);
    return undefined;
  }

  if (variables) {
    return interpolatePrompt(template, variables);
  }

  return template;
}
