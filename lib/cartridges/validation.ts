/**
 * Cartridge Validation Schemas
 *
 * Zod schemas for runtime validation of cartridge data
 */

import { z } from 'zod';

// Tier validation
export const TierSchema = z.enum(['system', 'agency', 'client', 'user']);

// Voice Parameters validation
export const ToneParamsSchema = z.object({
  formality: z.enum(['professional', 'casual', 'friendly']),
  enthusiasm: z.number().min(0).max(10),
  empathy: z.number().min(0).max(10),
});

export const StyleParamsSchema = z.object({
  sentence_length: z.enum(['short', 'medium', 'long']),
  paragraph_structure: z.enum(['single', 'multi']),
  use_emojis: z.boolean(),
  use_hashtags: z.boolean(),
});

export const PersonalityParamsSchema = z.object({
  traits: z.array(z.string()).min(1, 'At least one trait required'),
  voice_description: z.string().optional(),
});

export const VocabularyParamsSchema = z.object({
  complexity: z.enum(['simple', 'moderate', 'advanced']),
  industry_terms: z.array(z.string()).optional().default([]),
  banned_words: z.array(z.string()).optional().default([]),
  preferred_phrases: z.array(z.string()).optional().default([]),
});

export const ContentPreferencesParamsSchema = z.object({
  topics: z.array(z.string()).optional(),
  content_types: z.array(z.string()).optional(),
  call_to_action_style: z.enum(['direct', 'subtle', 'question']).optional(),
}).optional();

export const VoiceParamsSchema = z.object({
  tone: ToneParamsSchema,
  style: StyleParamsSchema,
  personality: PersonalityParamsSchema,
  vocabulary: VocabularyParamsSchema,
  content_preferences: ContentPreferencesParamsSchema,
});

// Cartridge create/update schemas
export const CartridgeCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  tier: TierSchema,
  voice_params: VoiceParamsSchema,
  parent_id: z.string().uuid().optional(),
  agency_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  // Note: user_id should NOT be in request body - it's forced from auth
}).refine(
  (data) => {
    // Validate tier ownership requirements
    if (data.tier === 'system' && (data.agency_id || data.client_id)) {
      return false; // System cartridges can't have agency/client owners
    }
    if (data.tier === 'agency' && !data.agency_id) {
      return false; // Agency cartridges must have agency_id
    }
    if (data.tier === 'client' && !data.client_id) {
      return false; // Client cartridges must have client_id
    }
    return true;
  },
  { message: 'Invalid tier ownership configuration' }
);

export const CartridgeUpdateSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').max(255).optional(),
  description: z.string().max(1000).optional(),
  voice_params: VoiceParamsSchema.partial().optional(),
  is_active: z.boolean().optional(),
}).refine(
  (data) => {
    // Ensure at least one field is being updated
    return Object.values(data).some(v => v !== undefined);
  },
  { message: 'At least one field must be provided for update' }
);

// Export type inference
export type CartridgeCreateInput = z.infer<typeof CartridgeCreateSchema>;
export type CartridgeUpdateInput = z.infer<typeof CartridgeUpdateSchema>;
export type VoiceParamsInput = z.infer<typeof VoiceParamsSchema>;

/**
 * Validate cartridge creation request
 * Throws ZodError if validation fails
 */
export function validateCartridgeCreate(data: unknown) {
  return CartridgeCreateSchema.parse(data);
}

/**
 * Safely validate cartridge creation request
 * Returns result object with data or error
 */
export function validateCartridgeCreateSafe(data: unknown) {
  return CartridgeCreateSchema.safeParse(data);
}

/**
 * Validate cartridge update request
 * Throws ZodError if validation fails
 */
export function validateCartridgeUpdate(data: unknown) {
  return CartridgeUpdateSchema.parse(data);
}

/**
 * Safely validate cartridge update request
 * Returns result object with data or error
 */
export function validateCartridgeUpdateSafe(data: unknown) {
  return CartridgeUpdateSchema.safeParse(data);
}

/**
 * Validate voice parameters specifically
 * Useful for partial updates
 */
export function validateVoiceParams(data: unknown) {
  return VoiceParamsSchema.parse(data);
}

export function validateVoiceParamsSafe(data: unknown) {
  return VoiceParamsSchema.safeParse(data);
}
