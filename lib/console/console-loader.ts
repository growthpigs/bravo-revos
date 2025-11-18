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
import {
  BrandCartridge,
  SwipeCartridge,
  PlatformTemplate,
} from '@/lib/cartridges/loaders';

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

// ============================================================================
// HELPER FUNCTIONS FOR PROMPT FORMATTING
// ============================================================================

/**
 * Format brand cartridge data for system prompt
 */
function formatBrandForPrompt(brand: BrandCartridge): string {
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

  if (brand.brand_personality && brand.brand_personality.length > 0) {
    parts.push(`Personality Traits: ${brand.brand_personality.join(', ')}`);
  }

  if (brand.core_values && brand.core_values.length > 0) {
    parts.push(`Core Values: ${brand.core_values.join(', ')}`);
  }

  if (brand.company_description) {
    parts.push(`\nDescription:\n${brand.company_description}`);
  }

  // Core messaging is handled separately for token truncation
  if (brand.core_messaging) {
    parts.push(`\nCore Messaging:\n${brand.core_messaging}`);
  }

  return parts.join('\n');
}

/**
 * Format swipe cartridge examples for system prompt
 */
function formatSwipesForPrompt(swipes: SwipeCartridge[]): string {
  if (swipes.length === 0) return '';

  const parts: string[] = [];

  for (const swipe of swipes) {
    parts.push(`\n${swipe.category.toUpperCase().replace('_', ' ')} EXAMPLES:`);

    if (swipe.examples && swipe.examples.length > 0) {
      for (const example of swipe.examples.slice(0, 5)) { // Limit to 5 examples per category
        parts.push(`\nAuthor: ${example.author}`);
        parts.push(`Text: ${example.text}`);
        if (example.notes) {
          parts.push(`Notes: ${example.notes}`);
        }
        if (example.performance) {
          parts.push(`Performance: ${example.performance}`);
        }
        parts.push('---');
      }
    }
  }

  return parts.join('\n');
}

/**
 * Format platform template for system prompt
 */
function formatPlatformForPrompt(platform: PlatformTemplate): string {
  const parts: string[] = [];

  parts.push(`Platform: ${platform.platform.toUpperCase()}`);
  parts.push(`Max Length: ${platform.max_length} characters`);
  parts.push(`Tone: ${platform.tone.join(', ')}`);

  if (platform.structure) {
    parts.push(`\nStructure:`);
    for (const [key, value] of Object.entries(platform.structure)) {
      parts.push(`- ${key}: ${value}`);
    }
  }

  if (platform.formatting) {
    parts.push(`\nFormatting:`);
    for (const [key, value] of Object.entries(platform.formatting)) {
      parts.push(`- ${key}: ${value}`);
    }
  }

  if (platform.best_practices && platform.best_practices.length > 0) {
    parts.push(`\nBest Practices:`);
    platform.best_practices.forEach(practice => {
      parts.push(`- ${practice}`);
    });
  }

  if (platform.example_structure) {
    parts.push(`\nExample Structure:\n${platform.example_structure}`);
  }

  return parts.join('\n');
}

/**
 * Proportionally truncate core messaging and swipe examples to fit token budget
 */
function truncateProportionally(
  coreMessaging: string,
  swipeText: string,
  maxTokens: number,
  currentTokenCount: number
): { coreMessaging: string; swipeText: string } {
  const excessTokens = currentTokenCount - maxTokens;

  if (excessTokens <= 0) {
    return { coreMessaging, swipeText };
  }

  // Count tokens in each section
  const coreTokens = encode(coreMessaging).length;
  const swipeTokens = encode(swipeText).length;
  const totalTruncatableTokens = coreTokens + swipeTokens;

  if (totalTruncatableTokens === 0) {
    return { coreMessaging, swipeText };
  }

  // Calculate proportional reduction
  const coreReduction = Math.floor((coreTokens / totalTruncatableTokens) * excessTokens);
  const swipeReduction = excessTokens - coreReduction;

  // Truncate core messaging
  const coreTargetTokens = Math.max(0, coreTokens - coreReduction);
  let truncatedCore = coreMessaging;
  if (coreTargetTokens < coreTokens) {
    const coreChars = Math.floor((coreTargetTokens / coreTokens) * coreMessaging.length);
    truncatedCore = coreMessaging.substring(0, coreChars) + '\n\n[...truncated for token limit]';
  }

  // Truncate swipe examples
  const swipeTargetTokens = Math.max(0, swipeTokens - swipeReduction);
  let truncatedSwipe = swipeText;
  if (swipeTargetTokens < swipeTokens) {
    const swipeChars = Math.floor((swipeTargetTokens / swipeTokens) * swipeText.length);
    truncatedSwipe = swipeText.substring(0, swipeChars) + '\n\n[...truncated for token limit]';
  }

  return {
    coreMessaging: truncatedCore,
    swipeText: truncatedSwipe
  };
}

/**
 * Assemble comprehensive system prompt from all cartridge sources
 *
 * Combines console cartridges + client cartridges + platform rules into structured prompt.
 *
 * **Cartridge Precedence & Purpose:**
 * 1. System: Base prompt, role, behavioral rules (foundation)
 * 2. Context: Domain knowledge, app features, structure (environment)
 * 3. Brand: Company identity, core messaging, target audience
 * 4. Style (from Mem0 + DB): User's writing style preferences
 * 5. Instructions (from Mem0 + DB): Content generation rules
 * 6. Swipe: External copywriting examples (Gary Halbert, Jon Benson)
 * 7. Platform: LinkedIn/Facebook/WhatsApp formatting rules
 * 8. Skills: Available capabilities/chips
 * 9. Plugins: MCP server requirements
 * 10. Knowledge: Docs, examples, best practices
 * 11. Memory: Mem0 scoping guidelines
 * 12. UI: Inline buttons, fullscreen triggers
 *
 * **Token Management:**
 * - Target: 8,000 tokens max (50% of GPT-4 16K context)
 * - Proportional truncation if exceeded (core_messaging + swipe examples)
 * - Warns if exceeds limit after truncation
 *
 * @param config - Console configuration with 8 cartridges
 * @param cartridgeMemories - Style/Instructions from Mem0
 * @param brandCartridge - User's brand identity (optional)
 * @param swipeCartridges - External copywriting examples (optional)
 * @param platformTemplate - Platform-specific rules (optional)
 * @returns Comprehensive system prompt string
 */
export function assembleSystemPrompt(
  config: ConsoleConfig,
  cartridgeMemories?: CartridgeMemories,
  brandCartridge?: any,
  swipeCartridges?: any[],
  platformTemplate?: any
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

  // 4. BRAND CONTEXT (from brand_cartridges table) - User's company/industry
  if (brandCartridge) {
    const brandPrompt = formatBrandForPrompt(brandCartridge);
    if (brandPrompt) {
      sections.push(`\nBRAND CONTEXT:\n${brandPrompt}`);
      if (process.env.NODE_ENV === 'development') {
        console.log('[CONSOLE_LOADER] Injected Brand cartridge into system prompt');
      }
    }
  }

  // 5. WRITING STYLE (from Mem0 Style cartridge) - User's personal style
  if (cartridgeMemories?.style) {
    const stylePrompt = formatStyleForPrompt(cartridgeMemories.style);
    if (stylePrompt) {
      sections.push(`\nWRITING STYLE:\n${stylePrompt}`);
      if (process.env.NODE_ENV === 'development') {
        console.log('[CONSOLE_LOADER] Injected Style cartridge into system prompt');
      }
    }
  }

  // 6. CONTENT INSTRUCTIONS (from Mem0 Instructions cartridge) - Content generation rules
  if (cartridgeMemories?.instructions) {
    const instructionsPrompt = formatInstructionsForPrompt(cartridgeMemories.instructions);
    if (instructionsPrompt) {
      sections.push(`\nCONTENT INSTRUCTIONS:\n${instructionsPrompt}`);
      if (process.env.NODE_ENV === 'development') {
        console.log('[CONSOLE_LOADER] Injected Instructions cartridge into system prompt');
      }
    }
  }

  // 7. SWIPE FILES (from swipe_cartridges table) - External copywriting examples
  if (swipeCartridges && swipeCartridges.length > 0) {
    const swipePrompt = formatSwipesForPrompt(swipeCartridges);
    if (swipePrompt) {
      sections.push(`\nSWIPE FILES (External Examples):${swipePrompt}`);
      if (process.env.NODE_ENV === 'development') {
        console.log('[CONSOLE_LOADER] Injected Swipe cartridges into system prompt');
      }
    }
  }

  // 8. PLATFORM GUIDELINES (from JSON templates) - LinkedIn/Facebook/WhatsApp rules
  if (platformTemplate) {
    const platformPrompt = formatPlatformForPrompt(platformTemplate);
    if (platformPrompt) {
      sections.push(`\nPLATFORM GUIDELINES:\n${platformPrompt}`);
      if (process.env.NODE_ENV === 'development') {
        console.log('[CONSOLE_LOADER] Injected Platform template into system prompt');
      }
    }
  }

  // 9. Available capabilities
  sections.push(`\nAVAILABLE CAPABILITIES:\n${
    skillsCartridge?.chips && skillsCartridge.chips.length > 0
      ? skillsCartridge.chips.map(c => `- ${c.name}: ${c.description}`).join('\n')
      : 'No specific capabilities defined'
  }`);

  // 10. UI guidelines
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

  // 11. Memory guidelines
  sections.push(`\nMEMORY GUIDELINES:
Scoping: ${memoryCartridge?.scoping || 'User-specific'}${
    memoryCartridge?.whatToRemember && memoryCartridge.whatToRemember.length > 0
      ? `\nRemember:\n${memoryCartridge.whatToRemember.map(item => `- ${item}`).join('\n')}`
      : ''
  }
Context Injection: ${memoryCartridge?.contextInjection || 'Retrieve relevant memories before each request'}`);

  // 12. Plugins
  sections.push(`\nPLUGINS REQUIRED:
${
  pluginsCartridge?.required && pluginsCartridge.required.length > 0
    ? pluginsCartridge.required.join(', ')
    : 'None'
} - ${pluginsCartridge?.description || 'Must be configured'}`);

  // 13. Best practices
  sections.push(`\nBEST PRACTICES:\n${knowledgeCartridge?.bestPractices || 'Follow standard best practices for user assistance.'}`);

  let prompt = sections.join('\n').trim();

  // Token counting and truncation
  let tokens = encode(prompt);
  let tokenCount = tokens.length;

  // If prompt exceeds 8,000 tokens, apply proportional truncation
  if (tokenCount > 8000) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[CONSOLE_LOADER] Prompt oversized: ${tokenCount} tokens (exceeds 8,000 limit). ` +
        `Applying proportional truncation to core messaging and swipe examples...`
      );
    }

    // Extract core messaging and swipe text for truncation
    const coreMessaging = brandCartridge?.core_messaging || '';
    const swipeText = swipeCartridges ? formatSwipesForPrompt(swipeCartridges) : '';

    // Apply proportional truncation
    const truncated = truncateProportionally(coreMessaging, swipeText, 8000, tokenCount);

    // Rebuild brand section with truncated core messaging
    if (brandCartridge && truncated.coreMessaging !== coreMessaging) {
      const truncatedBrand = { ...brandCartridge, core_messaging: truncated.coreMessaging };
      const newBrandPrompt = formatBrandForPrompt(truncatedBrand);

      // Replace old brand section with truncated version
      const oldBrandPrompt = formatBrandForPrompt(brandCartridge);
      prompt = prompt.replace(oldBrandPrompt, newBrandPrompt);
    }

    // Rebuild swipe section with truncated examples
    if (swipeCartridges && truncated.swipeText !== swipeText) {
      prompt = prompt.replace(swipeText, truncated.swipeText);
    }

    // Recount tokens after truncation
    tokens = encode(prompt);
    tokenCount = tokens.length;

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[CONSOLE_LOADER] After truncation: ${tokenCount} tokens ` +
        `(${Math.round((tokenCount / 8000) * 100)}% of 8K limit)`
      );
    }

    // Final warning if still over limit
    if (tokenCount > 8000) {
      console.warn(
        `[CONSOLE_LOADER] Prompt still oversized after truncation: ${tokenCount} tokens. ` +
        `Consider reducing other cartridge content.`
      );
    }
  } else if (tokenCount > 4000 && process.env.NODE_ENV === 'development') {
    // Info logs only in development
    console.info(
      `[CONSOLE_LOADER] Prompt size: ${tokenCount} tokens ` +
      `(~${Math.round((tokenCount / 8000) * 100)}% of 8K limit)`
    );
  }

  return prompt;
}
