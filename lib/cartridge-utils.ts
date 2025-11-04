/**
 * Cartridge Utilities
 *
 * Helper functions for working with voice parameter cartridges
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type CartridgeTier = 'system' | 'agency' | 'client' | 'user';

export interface VoiceParams {
  tone: {
    formality: 'professional' | 'casual' | 'friendly';
    enthusiasm: number; // 0-10
    empathy: number; // 0-10
  };
  style: {
    sentence_length: 'short' | 'medium' | 'long';
    paragraph_structure: 'single' | 'multi';
    use_emojis: boolean;
    use_hashtags: boolean;
  };
  personality: {
    traits: string[];
    voice_description: string;
  };
  vocabulary: {
    complexity: 'simple' | 'moderate' | 'advanced';
    industry_terms: string[];
    banned_words: string[];
    preferred_phrases: string[];
  };
  content_preferences?: {
    topics: string[];
    content_types: string[];
    call_to_action_style: 'direct' | 'subtle' | 'question';
  };
}

export interface Cartridge {
  id: string;
  parent_id: string | null;
  agency_id: string | null;
  client_id: string | null;
  user_id: string | null;
  name: string;
  description: string | null;
  tier: CartridgeTier;
  voice_params: VoiceParams;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Get default voice parameters template
 */
export function getDefaultVoiceParams(): VoiceParams {
  return {
    tone: {
      formality: 'professional',
      enthusiasm: 7,
      empathy: 8,
    },
    style: {
      sentence_length: 'medium',
      paragraph_structure: 'multi',
      use_emojis: false,
      use_hashtags: false,
    },
    personality: {
      traits: ['authoritative', 'helpful', 'clear'],
      voice_description: 'Professional and approachable expert',
    },
    vocabulary: {
      complexity: 'moderate',
      industry_terms: [],
      banned_words: [],
      preferred_phrases: [],
    },
    content_preferences: {
      topics: [],
      content_types: ['how-to', 'insights', 'tips'],
      call_to_action_style: 'direct',
    },
  };
}

/**
 * Validate voice parameters structure
 */
export function validateVoiceParams(params: any): {
  valid: boolean;
  error?: string;
} {
  if (!params || typeof params !== 'object') {
    return { valid: false, error: 'Voice parameters must be an object' };
  }

  // Check required top-level keys
  const requiredKeys = ['tone', 'style', 'personality', 'vocabulary'];
  for (const key of requiredKeys) {
    if (!params[key]) {
      return { valid: false, error: `Missing required key: ${key}` };
    }
  }

  // Validate tone
  if (!params.tone.formality || !['professional', 'casual', 'friendly'].includes(params.tone.formality)) {
    return { valid: false, error: 'tone.formality must be: professional, casual, or friendly' };
  }
  if (typeof params.tone.enthusiasm !== 'number' || params.tone.enthusiasm < 0 || params.tone.enthusiasm > 10) {
    return { valid: false, error: 'tone.enthusiasm must be a number between 0-10' };
  }
  if (typeof params.tone.empathy !== 'number' || params.tone.empathy < 0 || params.tone.empathy > 10) {
    return { valid: false, error: 'tone.empathy must be a number between 0-10' };
  }

  // Validate style
  if (!params.style.sentence_length || !['short', 'medium', 'long'].includes(params.style.sentence_length)) {
    return { valid: false, error: 'style.sentence_length must be: short, medium, or long' };
  }
  if (!params.style.paragraph_structure || !['single', 'multi'].includes(params.style.paragraph_structure)) {
    return { valid: false, error: 'style.paragraph_structure must be: single or multi' };
  }

  // Validate personality
  if (!Array.isArray(params.personality.traits)) {
    return { valid: false, error: 'personality.traits must be an array' };
  }
  if (typeof params.personality.voice_description !== 'string') {
    return { valid: false, error: 'personality.voice_description must be a string' };
  }

  // Validate vocabulary
  if (!params.vocabulary.complexity || !['simple', 'moderate', 'advanced'].includes(params.vocabulary.complexity)) {
    return { valid: false, error: 'vocabulary.complexity must be: simple, moderate, or advanced' };
  }

  return { valid: true };
}

/**
 * Get cartridge with resolved parameters
 */
export async function getCartridgeWithResolved(
  supabase: SupabaseClient,
  cartridgeId: string
): Promise<{
  success: boolean;
  cartridge?: Cartridge;
  resolved_params?: VoiceParams;
  hierarchy?: Array<{ id: string; name: string; tier: string; level: number }>;
  error?: string;
}> {
  try {
    // Get cartridge
    const { data: cartridge, error: cartridgeError } = await supabase
      .from('cartridges')
      .select('*')
      .eq('id', cartridgeId)
      .single();

    if (cartridgeError || !cartridge) {
      return { success: false, error: 'Cartridge not found' };
    }

    // Get resolved parameters
    const { data: resolvedParams, error: resolveError } = await supabase
      .rpc('get_resolved_voice_params', { cartridge_uuid: cartridgeId });

    // Get hierarchy
    const { data: hierarchy, error: hierarchyError } = await supabase
      .rpc('get_cartridge_hierarchy', { cartridge_uuid: cartridgeId });

    return {
      success: true,
      cartridge,
      resolved_params: resolvedParams || cartridge.voice_params,
      hierarchy: hierarchy || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create cartridge with validation
 */
export async function createCartridge(
  supabase: SupabaseClient,
  data: {
    name: string;
    description?: string;
    tier: CartridgeTier;
    parent_id?: string;
    agency_id?: string;
    client_id?: string;
    user_id?: string;
    voice_params?: Partial<VoiceParams>;
  }
): Promise<{ success: boolean; cartridge?: Cartridge; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Merge with defaults
    const voiceParams = {
      ...getDefaultVoiceParams(),
      ...data.voice_params,
    };

    // Validate voice parameters
    const validation = validateVoiceParams(voiceParams);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Create cartridge
    const { data: cartridge, error } = await supabase
      .from('cartridges')
      .insert({
        name: data.name,
        description: data.description,
        tier: data.tier,
        parent_id: data.parent_id,
        agency_id: data.agency_id,
        client_id: data.client_id,
        user_id: data.user_id,
        voice_params: voiceParams,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, cartridge };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update cartridge with validation
 */
export async function updateCartridge(
  supabase: SupabaseClient,
  cartridgeId: string,
  updates: {
    name?: string;
    description?: string;
    voice_params?: Partial<VoiceParams>;
    is_active?: boolean;
  }
): Promise<{ success: boolean; cartridge?: Cartridge; error?: string }> {
  try {
    // If updating voice_params, validate them
    if (updates.voice_params) {
      // Get current cartridge to merge params
      const { data: current } = await supabase
        .from('cartridges')
        .select('voice_params')
        .eq('id', cartridgeId)
        .single();

      if (current) {
        const mergedParams = {
          ...current.voice_params,
          ...updates.voice_params,
        };

        const validation = validateVoiceParams(mergedParams);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        updates.voice_params = mergedParams;
      }
    }

    // Update cartridge
    const { data: cartridge, error } = await supabase
      .from('cartridges')
      .update(updates)
      .eq('id', cartridgeId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, cartridge };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Merge voice parameters (child overrides parent)
 */
export function mergeVoiceParams(
  parent: VoiceParams,
  child: Partial<VoiceParams>
): VoiceParams {
  return {
    tone: { ...parent.tone, ...child.tone },
    style: { ...parent.style, ...child.style },
    personality: { ...parent.personality, ...child.personality },
    vocabulary: { ...parent.vocabulary, ...child.vocabulary },
    content_preferences: parent.content_preferences || child.content_preferences
      ? {
          ...(parent.content_preferences || {}),
          ...(child.content_preferences || {}),
        } as NonNullable<VoiceParams['content_preferences']>
      : undefined,
  };
}
