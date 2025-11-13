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

export interface ConsoleConfig {
  id: string;
  name: string;
  displayName: string;
  systemInstructions: string;
  behaviorRules: any[];
  version: number;
}

/**
 * Load console configuration from database by name
 *
 * CACHED: Results are memoized within the request scope. Multiple calls with the
 * same consoleName in a single request will return the cached result.
 *
 * @param consoleName - Name of console to load (e.g., 'marketing-console-v1')
 * @param supabase - Supabase client instance
 * @returns ConsoleConfig object
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
      .select('id, name, display_name, system_instructions, behavior_rules, version')
      .eq('name', consoleName)
      .eq('is_active', true)
      .single();

    if (error) {
      // Check if this is a missing table error
      if (error.message.includes('Could not find the table')) {
        throw new Error(
          `[loadConsolePrompt] Database error: console_prompts table not found. ` +
            `Please apply migration 033_console_prompts.sql. ` +
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

    // Convert snake_case from database to camelCase
    return {
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      systemInstructions: data.system_instructions,
      behaviorRules: data.behavior_rules || [],
      version: data.version,
    };
  } catch (error: any) {
    // Re-throw our custom errors
    if (error.message?.startsWith('[loadConsolePrompt]')) {
      throw error;
    }

    // Wrap unexpected errors
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
 * @returns Array of ConsoleConfig objects
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
      .select('id, name, display_name, system_instructions, behavior_rules, version')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('Could not find the table')) {
        throw new Error(
          `[loadAllConsoles] Database error: console_prompts table not found. ` +
            `Please apply migration 033_console_prompts.sql. ` +
            `Error: ${error.message}`
        );
      }

      throw new Error(`[loadAllConsoles] Failed to load consoles: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      systemInstructions: row.system_instructions,
      behaviorRules: row.behavior_rules || [],
      version: row.version,
    }));
  } catch (error: any) {
    if (error.message?.startsWith('[loadAllConsoles]')) {
      throw error;
    }

    throw new Error(`[loadAllConsoles] Unexpected error: ${error.message}`);
  }
});
