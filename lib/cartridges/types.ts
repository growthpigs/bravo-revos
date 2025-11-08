/**
 * Cartridge System Type Definitions
 *
 * Comprehensive types for voice cartridges with 4-tier hierarchy:
 * system → agency → client → user
 */

export type CartridgeTier = 'system' | 'agency' | 'client' | 'user';

export interface ToneParams {
  formality: 'professional' | 'casual' | 'friendly';
  enthusiasm: number; // 0-10
  empathy: number; // 0-10
}

export interface StyleParams {
  sentence_length: 'short' | 'medium' | 'long';
  paragraph_structure: 'single' | 'multi';
  use_emojis: boolean;
  use_hashtags: boolean;
}

export interface PersonalityParams {
  traits: string[];
  voice_description?: string;
}

export interface VocabularyParams {
  complexity: 'simple' | 'moderate' | 'advanced';
  industry_terms?: string[];
  banned_words?: string[];
  preferred_phrases?: string[];
}

export interface ContentPreferencesParams {
  topics?: string[];
  content_types?: string[];
  call_to_action_style?: 'direct' | 'subtle' | 'question';
}

export interface VoiceParams {
  tone: ToneParams;
  style: StyleParams;
  personality: PersonalityParams;
  vocabulary: VocabularyParams;
  content_preferences?: ContentPreferencesParams;
}

export interface Cartridge {
  id: string;
  name: string;
  description?: string;
  tier: CartridgeTier;
  user_id?: string; // Owner for user tier
  client_id?: string; // Owner for client tier
  agency_id?: string; // Owner for agency tier
  parent_id?: string; // Parent in hierarchy
  voice_params: VoiceParams;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CartridgeInsertData {
  name: string;
  description?: string;
  tier: CartridgeTier;
  voice_params: VoiceParams;
  created_by: string;
  user_id?: string;
  client_id?: string;
  agency_id?: string;
  parent_id?: string;
}

export interface CartridgeUpdateData {
  name?: string;
  description?: string;
  voice_params?: Partial<VoiceParams>;
  is_active?: boolean;
}

export interface CartridgeCreateRequest {
  name: string;
  description?: string;
  tier: CartridgeTier;
  voice_params: VoiceParams;
  parent_id?: string;
  agency_id?: string;
  client_id?: string;
}

export interface CartridgeUpdateRequest {
  name?: string;
  description?: string;
  voice_params?: Partial<VoiceParams>;
  is_active?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface CartridgeResponse extends ApiResponse<Cartridge> {
  cartridge?: Cartridge;
  resolved_voice_params?: VoiceParams;
  hierarchy?: Array<{
    id: string;
    name: string;
    tier: CartridgeTier;
    level: number;
  }>;
}
