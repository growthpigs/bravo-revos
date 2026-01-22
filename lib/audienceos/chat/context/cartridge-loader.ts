/**
 * Cartridge Context Loader
 *
 * Loads and formats training cartridges (brand, style, instructions)
 * for injection into the chat system prompt.
 *
 * This enables the chat to:
 * - Know agency's brand identity
 * - Match writing style
 * - Follow custom instructions
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Brand cartridge data structure
 */
export interface BrandCartridge {
  id: string;
  agency_id: string;
  name: string;
  company_name?: string;
  company_description?: string;
  company_tagline?: string;
  industry?: string;
  target_audience?: string;
  core_values?: string[];
  brand_voice?: string;
  brand_personality?: string[];
  brand_colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  core_messaging?: string;
}

/**
 * Style cartridge data structure
 */
export interface StyleCartridge {
  id: string;
  agency_id: string;
  learned_style?: string;
  analysis_status?: string;
  source_files?: Array<{
    name?: string;
    file_path?: string;
  }>;
}

/**
 * Instruction cartridge data structure
 */
export interface InstructionCartridge {
  id: string;
  agency_id: string;
  name: string;
  description?: string;
  instructions?: string;
  is_active?: boolean;
}

/**
 * All cartridges combined for context injection
 */
export interface CartridgeContext {
  brand?: BrandCartridge;
  style?: StyleCartridge;
  instructions?: InstructionCartridge[];
}

/**
 * Simple in-memory cache for cartridge context
 * TTL: 5 minutes to balance freshness with performance
 */
const cartridgeCache = new Map<string, { context: CartridgeContext; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load cartridges for an agency from Supabase
 */
export async function loadCartridgeContext(
  supabase: SupabaseClient,
  agencyId: string
): Promise<CartridgeContext> {
  // Check cache first
  const cached = cartridgeCache.get(agencyId);
  if (cached && cached.expires > Date.now()) {
    return cached.context;
  }

  const context: CartridgeContext = {};

  try {
    // Fetch all cartridges in parallel
    const [brandResult, styleResult, instructionsResult] = await Promise.all([
      supabase
        .from('brand_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .single(),
      supabase
        .from('style_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .single(),
      supabase
        .from('instruction_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true),
    ]);

    // Handle brand cartridge
    if (brandResult.data && !brandResult.error) {
      context.brand = brandResult.data as BrandCartridge;
    }

    // Handle style cartridge
    if (styleResult.data && !styleResult.error) {
      context.style = styleResult.data as StyleCartridge;
    }

    // Handle instruction cartridges
    if (instructionsResult.data && !instructionsResult.error) {
      context.instructions = instructionsResult.data as InstructionCartridge[];
    }

    // Cache the result
    cartridgeCache.set(agencyId, {
      context,
      expires: Date.now() + CACHE_TTL_MS,
    });
  } catch (error) {
    console.warn('[CartridgeLoader] Failed to load cartridges:', error);
    // Return empty context on error
  }

  return context;
}

/**
 * Generate system prompt injection for cartridge context
 */
export function generateCartridgeContextPrompt(context: CartridgeContext): string {
  const parts: string[] = [];

  // Brand context
  if (context.brand) {
    const brand = context.brand;
    parts.push(`## Brand Identity

${brand.company_name ? `Company: ${brand.company_name}` : ''}
${brand.company_description ? `Description: ${brand.company_description}` : ''}
${brand.company_tagline ? `Tagline: "${brand.company_tagline}"` : ''}
${brand.industry ? `Industry: ${brand.industry}` : ''}
${brand.target_audience ? `Target Audience: ${brand.target_audience}` : ''}
${brand.brand_voice ? `Voice: ${brand.brand_voice}` : ''}
${brand.core_values?.length ? `Core Values: ${brand.core_values.join(', ')}` : ''}
${brand.brand_personality?.length ? `Personality: ${brand.brand_personality.join(', ')}` : ''}
${brand.core_messaging ? `\nKey Messaging:\n${brand.core_messaging}` : ''}

Use this brand context to match the agency's voice and values in your responses.`);
  }

  // Style context
  if (context.style?.learned_style && context.style.analysis_status === 'complete') {
    parts.push(`## Writing Style

The agency has the following learned writing style:
${context.style.learned_style}

Match this style in your responses to maintain consistency with the agency's communications.`);
  }

  // Instructions context
  if (context.instructions && context.instructions.length > 0) {
    const activeInstructions = context.instructions.filter(i => i.is_active !== false);
    if (activeInstructions.length > 0) {
      const instructionsList = activeInstructions
        .map(i => `### ${i.name}${i.description ? ` - ${i.description}` : ''}\n${i.instructions || 'No specific instructions.'}`)
        .join('\n\n');

      parts.push(`## Custom Instructions

The agency has configured the following custom instructions:

${instructionsList}

Follow these instructions when generating responses.`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Check if cartridges are configured for an agency
 */
export function hasCartridgeContext(context: CartridgeContext): boolean {
  return !!(
    context.brand?.company_name ||
    context.style?.learned_style ||
    (context.instructions && context.instructions.length > 0)
  );
}

/**
 * Invalidate cartridge cache for an agency
 * Call this when cartridges are updated
 */
export function invalidateCartridgeCache(agencyId: string): void {
  cartridgeCache.delete(agencyId);
}

/**
 * Clear entire cartridge cache (for testing)
 */
export function clearCartridgeCache(): void {
  cartridgeCache.clear();
}
