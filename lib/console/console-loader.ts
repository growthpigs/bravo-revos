/**
 * Console Loader - Loads console configuration from database
 *
 * Loads system instructions and behavior rules for agents from the
 * console_prompts table instead of hardcoding them in routes.
 *
 * CACHING: Uses React's cache() to memoize results within request scope,
 * preventing duplicate database queries when multiple parts of the same
 * request load the same console configuration.
 */

import { cache } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { encode } from 'gpt-3-encoder';
import {
  ConsoleConfig,
  safeParseConsoleConfig,
  validateCartridgeSize,
} from '@/lib/validation/console-validation';
import {
  CartridgeMemories,
  formatStyleForPrompt,
  formatInstructionsForPrompt,
} from '@/lib/cartridges/retrieval';

/**
 * Load console configuration from database by name
 *
 * CACHED: Results are memoized within the request scope. Multiple calls with the
 * same consoleName in a single request will return the cached result.
 *
 * @param consoleName - Name of console to load (e.g., 'marketing-console-v1')
 * @param supabase - Supabase client instance
 * @returns ConsoleConfig object with all 8 cartridges
 * @throws Error if console not found or database error
 */
export const loadConsolePrompt = cache(async function loadConsolePrompt(
  consoleName: string,
  supabase: SupabaseClient
): Promise<ConsoleConfig> {
  if (!consoleName) {
    throw new Error('Console name is required');
  }

  if (!supabase) {
    throw new Error('Supabase client is required');
  }

  try {
    const { data, error } = await supabase
      .from('console_prompts')
      .select(`
        id, name, display_name, version,
        system_instructions, behavior_rules,
        operations_cartridge, system_cartridge, context_cartridge,
        skills_cartridge, plugins_cartridge, knowledge_cartridge,
        memory_cartridge, ui_cartridge
      `)
      .eq('name', consoleName)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.message.includes('Could not find the table')) {
        throw new Error(
          `[loadConsolePrompt] Database error: console_prompts table not found. ` +
            `Please apply migration 036_console_cartridges_8_system.sql. ` +
            `Error: ${error.message}`
        );
      }

      throw new Error(
        `[loadConsolePrompt] Failed to load console '${consoleName}': ${error.message}`
      );
    }

    if (!data) {
      throw new Error(
        `[loadConsolePrompt] Console '${consoleName}' not found or not active`
      );
    }

    // Convert snake_case to camelCase and provide defaults
    const config = {
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      version: data.version,
      systemInstructions: data.system_instructions,
      behaviorRules: data.behavior_rules || [],

      operationsCartridge: data.operations_cartridge || {},
      systemCartridge: data.system_cartridge || {},
      contextCartridge: data.context_cartridge || {},
      skillsCartridge: data.skills_cartridge || { chips: [] },
      pluginsCartridge: data.plugins_cartridge || { enabled: [], config: {}, required: [], description: '' },
      knowledgeCartridge: data.knowledge_cartridge || {},
      memoryCartridge: data.memory_cartridge || {},
      uiCartridge: data.ui_cartridge || { inlineButtons: {}, buttonActions: {}, fullscreenTriggers: {}, principle: '' },
    };

    // Validate with Zod
    const validation = safeParseConsoleConfig(config);
    if (!validation.success) {
      console.error('[loadConsolePrompt] Validation failed:', validation.error.format());
      throw new Error(
        `[loadConsolePrompt] Invalid console configuration: ${validation.error.issues[0]?.message}`
      );
    }

    return validation.data;
  } catch (error: any) {
    if (error.message?.startsWith('[loadConsolePrompt]')) {
      throw error;
    }

    throw new Error(
      `[loadConsolePrompt] Unexpected error loading console '${consoleName}': ${error.message}`
    );
  }
});

/**
 * Load all active consoles from database
 *
 * CACHED: Results are memoized within the request scope. Multiple calls
 * in a single request will return the cached result.
 *
 * @param supabase - Supabase client instance
 * @returns Array of ConsoleConfig objects with all 8 cartridges
 */
export const loadAllConsoles = cache(async function loadAllConsoles(
  supabase: SupabaseClient
): Promise<ConsoleConfig[]> {
  if (!supabase) {
    throw new Error('Supabase client is required');
  }

  try {
    const { data, error } = await supabase
      .from('console_prompts')
      .select(`
        id, name, display_name, version,
        system_instructions, behavior_rules,
        operations_cartridge, system_cartridge, context_cartridge,
        skills_cartridge, plugins_cartridge, knowledge_cartridge,
        memory_cartridge, ui_cartridge
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('Could not find the table')) {
        throw new Error(
          `[loadAllConsoles] Database error: console_prompts table not found. ` +
            `Please apply migration 036_console_cartridges_8_system.sql. ` +
            `Error: ${error.message}`
        );
      }

      throw new Error(`[loadAllConsoles] Failed to load consoles: ${error.message}`);
    }

    return (data || []).map((row: any) => {
      const config = {
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        version: row.version,
        systemInstructions: row.system_instructions,
        behaviorRules: row.behavior_rules || [],

        operationsCartridge: row.operations_cartridge || {},
        systemCartridge: row.system_cartridge || {},
        contextCartridge: row.context_cartridge || {},
        skillsCartridge: row.skills_cartridge || { chips: [] },
        pluginsCartridge: row.plugins_cartridge || { enabled: [], config: {}, required: [], description: '' },
        knowledgeCartridge: row.knowledge_cartridge || {},
        memoryCartridge: row.memory_cartridge || {},
        uiCartridge: row.ui_cartridge || { inlineButtons: {}, buttonActions: {}, fullscreenTriggers: {}, principle: '' },
      };

      // Validate each console (but don't throw, just log and skip invalid ones)
      const validation = safeParseConsoleConfig(config);
      if (!validation.success) {
        console.error(`[loadAllConsoles] Skipping invalid console '${row.name}':`, validation.error.format());
        return null;
      }

      return validation.data;
    }).filter((c): c is ConsoleConfig => c !== null);
  } catch (error: any) {
    if (error.message?.startsWith('[loadAllConsoles]')) {
      throw error;
    }

    throw new Error(`[loadAllConsoles] Unexpected error: ${error.message}`);
  }
});

/**
 * Assemble comprehensive system prompt from all 8 cartridges
 *
 * Combines all cartridges into a structured prompt for AI orchestration with AgentKit.
 *
 * **Cartridge Precedence & Purpose:**
 * 1. System: Base prompt, role, behavioral rules (foundation)
 * 2. Context: Domain knowledge, app features, structure (environment)
 * 3. Style (from Mem0): User's writing style preferences (if available)
 * 4. Instructions (from Mem0): User's content generation rules (if available)
 * 5. Skills: Available capabilities/chips (what AI can do)
 * 6. Plugins: MCP server requirements (external integrations)
 * 7. Knowledge: Docs, examples, best practices (reference material)
 * 8. Memory: Mem0 scoping and guidelines (what to remember)
 * 9. UI: Inline buttons, fullscreen triggers (interaction patterns)
 *
 * **Fallback Logic:**
 * - If systemCartridge.systemPrompt is empty, uses legacy `system_instructions` field
 * - Each section provides safe defaults (e.g., "Assistant" for missing role)
 * - Empty arrays render as "No specific capabilities defined"
 * - cartridgeMemories parameter is optional (graceful if not provided)
 *
 * **Token Management:**
 * - Uses gpt-3-encoder to count tokens in final prompt
 * - Warns if >8000 tokens (>50% of GPT-4 8K context)
 * - Info log if >4000 tokens (helps track prompt growth)
 *
 * @param config - Console configuration with all 8 cartridges loaded from database
 * @param cartridgeMemories - Optional Style and Instructions cartridges from Mem0
 * @returns Comprehensive system prompt string (never undefined, always returns valid prompt)
 *
 * @example
 * ```typescript
 * const config = await loadConsolePrompt('marketing-console-v1', supabase);
 * const cartridges = await retrieveAllCartridges(userId);
 * const prompt = assembleSystemPrompt(config, cartridges);
 * // Returns: "You are RevOS Intelligence...\n\nWRITING STYLE\nTone: Professional..."
 * ```
 */
export function assembleSystemPrompt(
  config: ConsoleConfig,
  cartridgeMemories?: CartridgeMemories
): string {
  const { systemCartridge, contextCartridge, skillsCartridge, pluginsCartridge,
          knowledgeCartridge, memoryCartridge, uiCartridge, systemInstructions } = config;

  // Backward compatibility: If cartridges empty, fall back to legacy field
  if (!systemCartridge?.systemPrompt && systemInstructions) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[CONSOLE_LOADER] Using legacy system_instructions field (cartridges empty)');
    }
    return systemInstructions;
  }

  // Build base prompt sections
  const sections: string[] = [];

  // 1. System prompt and role
  sections.push(systemCartridge?.systemPrompt || 'You are a helpful AI assistant.');
  sections.push(`\nROLE: ${systemCartridge?.role || 'Assistant'}`);

  // 2. Behavioral rules
  sections.push(`\nBEHAVIORAL RULES:\n${systemCartridge?.rules || 'Be helpful and professional.'}`);

  // 3. Context
  sections.push(`\nCONTEXT:\nDomain: ${contextCartridge?.domain || 'General assistance'}`);
  sections.push(`Structure: ${contextCartridge?.structure || 'Standard application'}`);

  if (contextCartridge?.appFeatures && contextCartridge.appFeatures.length > 0) {
    sections.push(`\nAPP FEATURES:\n${contextCartridge.appFeatures.map(f => `- ${f}`).join('\n')}`);
  }

  // 4. WRITING STYLE (from Mem0 Style cartridge) - INJECTED HERE
  if (cartridgeMemories?.style) {
    const stylePrompt = formatStyleForPrompt(cartridgeMemories.style);
    if (stylePrompt) {
      sections.push(`\nWRITING STYLE:\n${stylePrompt}`);
      if (process.env.NODE_ENV === 'development') {
        console.log('[CONSOLE_LOADER] Injected Style cartridge into system prompt');
      }
    }
  }

  // 5. Available capabilities
  sections.push(`\nAVAILABLE CAPABILITIES:\n${
    skillsCartridge?.chips && skillsCartridge.chips.length > 0
      ? skillsCartridge.chips.map(c => `- ${c.name}: ${c.description}`).join('\n')
      : 'No specific capabilities defined'
  }`);

  // 6. CONTENT INSTRUCTIONS (from Mem0 Instructions cartridge) - INJECTED HERE
  if (cartridgeMemories?.instructions) {
    const instructionsPrompt = formatInstructionsForPrompt(cartridgeMemories.instructions);
    if (instructionsPrompt) {
      sections.push(`\nCONTENT INSTRUCTIONS:\n${instructionsPrompt}`);
      if (process.env.NODE_ENV === 'development') {
        console.log('[CONSOLE_LOADER] Injected Instructions cartridge into system prompt');
      }
    }
  }

  // 7. UI guidelines
  sections.push(`\nUI GUIDELINES - INLINE BUTTONS (CRITICAL):
- Frequency: ${uiCartridge?.inlineButtons?.frequency || '80% of responses'}
- Style: ${uiCartridge?.inlineButtons?.style || 'Standard button styling'}
- Placement: ${uiCartridge?.inlineButtons?.placement || 'Below message'}${
    uiCartridge?.inlineButtons?.examples && uiCartridge.inlineButtons.examples.length > 0
      ? `\n- Examples:\n${uiCartridge.inlineButtons.examples.map(ex => `  ${ex}`).join('\n')}`
      : ''
  }
- Button Actions: ${uiCartridge?.buttonActions?.navigation || 'Navigate to relevant pages'}
- Philosophy: ${uiCartridge?.buttonActions?.philosophy || 'Buttons are helpful shortcuts'}

UI PRINCIPLE:
${uiCartridge?.principle || 'Conversational by default. Use inline buttons to guide user actions.'}`);

  // 8. Memory guidelines
  sections.push(`\nMEMORY GUIDELINES:
Scoping: ${memoryCartridge?.scoping || 'User-specific'}${
    memoryCartridge?.whatToRemember && memoryCartridge.whatToRemember.length > 0
      ? `\nRemember:\n${memoryCartridge.whatToRemember.map(item => `- ${item}`).join('\n')}`
      : ''
  }
Context Injection: ${memoryCartridge?.contextInjection || 'Retrieve relevant memories before each request'}`);

  // 9. Plugins
  sections.push(`\nPLUGINS REQUIRED:
${
  pluginsCartridge?.required && pluginsCartridge.required.length > 0
    ? pluginsCartridge.required.join(', ')
    : 'None'
} - ${pluginsCartridge?.description || 'Must be configured'}`);

  // 10. Best practices
  sections.push(`\nBEST PRACTICES:\n${knowledgeCartridge?.bestPractices || 'Follow standard best practices for user assistance.'}`);

  const prompt = sections.join('\n').trim();

  // Token counting and warning
  const tokens = encode(prompt);
  const tokenCount = tokens.length;

  if (tokenCount > 8000) {
    // Always warn about oversized prompts (even in production)
    console.warn(
      `[CONSOLE_LOADER] Prompt very large: ${tokenCount} tokens ` +
      `(>50% of GPT-4 8K context). Consider shortening cartridges.`
    );
  } else if (tokenCount > 4000 && process.env.NODE_ENV === 'development') {
    // Info logs only in development
    console.info(
      `[CONSOLE_LOADER] Prompt size: ${tokenCount} tokens ` +
      `(~${Math.round(tokenCount / 8192 * 100)}% of GPT-4 8K context)`
    );
  }

  return prompt;
}
