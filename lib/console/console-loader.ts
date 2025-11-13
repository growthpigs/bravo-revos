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
import {
  ConsoleConfig,
  safeParseConsoleConfig,
  validateCartridgeSize,
} from '@/lib/validation/console-validation';

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
