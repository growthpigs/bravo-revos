/**
 * Cartridge System Type Definitions
 *
 * Part 1: Voice cartridges with 4-tier hierarchy (existing system)
 * Part 2: Base cartridge interfaces for Atari-style plugin system (NEW)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ===== PART 1: VOICE CARTRIDGE TYPES (EXISTING) =====

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

export interface VoiceCartridge {
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

export interface CartridgeResponse extends ApiResponse<VoiceCartridge> {
  cartridge?: VoiceCartridge;
  resolved_voice_params?: VoiceParams;
  hierarchy?: Array<{
    id: string;
    name: string;
    tier: CartridgeTier;
    level: number;
  }>;
}

// ===== PART 2: AGENTKIT CARTRIDGE SYSTEM (Chips + Cartridges) =====

import { Tool } from '@openai/agents';

/**
 * Message structure for conversation history
 */
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Agent Context - passed to all chips
 *
 * Contains authenticated user info and dependencies.
 */
export interface AgentContext {
  userId: string;
  sessionId: string;
  conversationHistory: Message[];
  supabase: SupabaseClient;
  openai: OpenAI;
  metadata: Record<string, any>;
}

/**
 * Chip Interface - Reusable skill/capability
 *
 * Chips are the atomic units of functionality.
 * They provide AgentKit Tools that can be used across cartridges.
 */
export interface Chip {
  id: string;
  name: string;
  description: string;

  /**
   * Returns AgentKit Tool for this chip
   */
  getTool(): Tool;

  /**
   * Executes the chip's functionality
   */
  execute(input: any, context: AgentContext): Promise<any>;
}

/**
 * Cartridge Interface - Container for capabilities
 *
 * Cartridges package chips together with context/instructions.
 * They define how a set of capabilities work together.
 */
export interface Cartridge {
  id: string;
  name: string;
  type: 'marketing' | 'voice' | 'utility';
  chips: Chip[];

  /**
   * Inject capabilities into MarketingConsole
   */
  inject(): {
    tools: Tool[];
    instructions: string;
    model?: string;
    temperature?: number;
  };
}

// Type aliases for loader compatibility
export type BaseCartridge = Cartridge;
export type CartridgeTool = Tool;

/**
 * Slash Command Interface - Interactive commands
 */
export interface SlashCommand {
  command: string;
  description: string;
  handler: (args: string[], context: AgentContext) => Promise<string>;
}

// ===== PART 3: TYPE SAFETY UTILITIES =====

/**
 * Type guard to validate RunContext contains our AgentContext
 *
 * This safely bridges AgentKit's RunContext to our AgentContext type.
 * Replaces the unsafe double-cast pattern (context as unknown as AgentContext).
 */
export function isAgentContext(context: unknown): context is AgentContext {
  if (!context || typeof context !== 'object') return false;

  const ctx = context as any;
  return (
    typeof ctx.userId === 'string' &&
    typeof ctx.sessionId === 'string' &&
    Array.isArray(ctx.conversationHistory) &&
    ctx.supabase !== undefined &&
    ctx.openai !== undefined &&
    typeof ctx.metadata === 'object'
  );
}

/**
 * Extract AgentContext from AgentKit's RunContext safely
 *
 * @throws {Error} If RunContext does not contain valid AgentContext
 * @example
 * ```ts
 * execute: async (input, context) => {
 *   const agentContext = extractAgentContext(context);
 *   return this.execute(input, agentContext);
 * }
 * ```
 */
export function extractAgentContext(runContext: unknown): AgentContext {
  if (!isAgentContext(runContext)) {
    throw new Error(
      'RunContext does not contain valid AgentContext. ' +
      'Required fields: userId, sessionId, conversationHistory, supabase, openai, metadata'
    );
  }
  return runContext;
}
