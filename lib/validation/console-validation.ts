import { z } from 'zod';

// Size limits (characters)
const MAX_TEXT_FIELD = 10_000; // 10KB
const MAX_ARRAY_LENGTH = 50;
const MAX_CARTRIDGE_SIZE = 50_000; // 50KB JSON stringified

// Operations Cartridge
export const OperationsCartridgeSchema = z.object({
  prd: z.string().max(MAX_TEXT_FIELD, 'PRD too long (max 10KB)').optional(),
  userStories: z.array(z.string()).max(MAX_ARRAY_LENGTH, 'Too many user stories (max 50)').optional(),
  requirements: z.string().max(MAX_TEXT_FIELD, 'Requirements too long (max 10KB)').optional(),
});

// System Cartridge
export const SystemCartridgeSchema = z.object({
  systemPrompt: z.string().max(MAX_TEXT_FIELD, 'System prompt too long (max 10KB)').optional(),
  role: z.string().max(1000, 'Role too long (max 1KB)').optional(),
  rules: z.string().max(MAX_TEXT_FIELD, 'Rules too long (max 10KB)').optional(),
});

// Context Cartridge
export const ContextCartridgeSchema = z.object({
  domain: z.string().max(MAX_TEXT_FIELD, 'Domain too long (max 10KB)').optional(),
  appFeatures: z.array(z.string()).max(MAX_ARRAY_LENGTH, 'Too many features (max 50)').optional(),
  structure: z.string().max(MAX_TEXT_FIELD, 'Structure too long (max 10KB)').optional(),
});

// Skills Cartridge
export const ChipSchema = z.object({
  name: z.string().min(1, 'Chip name required').max(100, 'Chip name too long'),
  description: z.string().min(1, 'Chip description required').max(500, 'Description too long'),
});

export const SkillsCartridgeSchema = z.object({
  chips: z.array(ChipSchema).max(MAX_ARRAY_LENGTH, 'Too many chips (max 50)').optional(),
});

// Plugins Cartridge
export const PluginsCartridgeSchema = z.object({
  enabled: z.array(z.string()).max(20, 'Too many plugins (max 20)').optional(),
  config: z.record(z.any()).optional(),
  required: z.array(z.string()).max(20, 'Too many required plugins (max 20)').optional(),
  description: z.string().max(2000, 'Description too long (max 2KB)').optional(),
});

// Knowledge Cartridge
export const KnowledgeCartridgeSchema = z.object({
  documentation: z.string().max(MAX_TEXT_FIELD, 'Documentation too long (max 10KB)').optional(),
  examples: z.array(z.string()).max(MAX_ARRAY_LENGTH, 'Too many examples (max 50)').optional(),
  bestPractices: z.string().max(MAX_TEXT_FIELD, 'Best practices too long (max 10KB)').optional(),
});

// Memory Cartridge
export const MemoryCartridgeSchema = z.object({
  scoping: z.string().max(200, 'Scoping pattern too long').optional(),
  whatToRemember: z.array(z.string()).max(MAX_ARRAY_LENGTH, 'Too many items (max 50)').optional(),
  contextInjection: z.string().max(2000, 'Context injection too long (max 2KB)').optional(),
  guidelines: z.string().max(MAX_TEXT_FIELD, 'Guidelines too long (max 10KB)').optional(),
});

// UI Cartridge
export const InlineButtonsSchema = z.object({
  style: z.string().max(500, 'Style too long').optional(),
  frequency: z.string().max(100, 'Frequency too long').optional(),
  placement: z.string().max(500, 'Placement too long').optional(),
  examples: z.array(z.string()).max(MAX_ARRAY_LENGTH, 'Too many examples (max 50)').optional(),
});

export const ButtonActionsSchema = z.object({
  navigation: z.string().max(500, 'Navigation too long').optional(),
  verification: z.string().max(500, 'Verification too long').optional(),
  philosophy: z.string().max(500, 'Philosophy too long').optional(),
});

export const FullscreenTriggersSchema = z.object({
  when: z.array(z.string()).max(20, 'Too many trigger words (max 20)').optional(),
  never: z.array(z.string()).max(20, 'Too many never words (max 20)').optional(),
});

export const UICartridgeSchema = z.object({
  inlineButtons: InlineButtonsSchema.optional(),
  buttonActions: ButtonActionsSchema.optional(),
  fullscreenTriggers: FullscreenTriggersSchema.optional(),
  principle: z.string().max(2000, 'Principle too long (max 2KB)').optional(),
});

// Full Console Config
export const ConsoleConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  displayName: z.string().min(1),
  version: z.number().int().positive(),
  systemInstructions: z.string().optional(), // Backward compat
  behaviorRules: z.array(z.object({
    rule: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    description: z.string().optional(),
  }).or(z.string())).optional(), // Backward compat: allows both objects and strings

  operationsCartridge: OperationsCartridgeSchema.optional(),
  systemCartridge: SystemCartridgeSchema.optional(),
  contextCartridge: ContextCartridgeSchema.optional(),
  skillsCartridge: SkillsCartridgeSchema.optional(),
  pluginsCartridge: PluginsCartridgeSchema.optional(),
  knowledgeCartridge: KnowledgeCartridgeSchema.optional(),
  memoryCartridge: MemoryCartridgeSchema.optional(),
  uiCartridge: UICartridgeSchema.optional(),
});

export type ConsoleConfig = z.infer<typeof ConsoleConfigSchema>;
export type OperationsCartridge = z.infer<typeof OperationsCartridgeSchema>;
export type SystemCartridge = z.infer<typeof SystemCartridgeSchema>;
export type ContextCartridge = z.infer<typeof ContextCartridgeSchema>;
export type SkillsCartridge = z.infer<typeof SkillsCartridgeSchema>;
export type PluginsCartridge = z.infer<typeof PluginsCartridgeSchema>;
export type KnowledgeCartridge = z.infer<typeof KnowledgeCartridgeSchema>;
export type MemoryCartridge = z.infer<typeof MemoryCartridgeSchema>;
export type UICartridge = z.infer<typeof UICartridgeSchema>;

/**
 * Validate cartridge size (max 50KB JSON)
 */
export function validateCartridgeSize(cartridge: any, name: string): void {
  const size = JSON.stringify(cartridge).length;
  if (size > MAX_CARTRIDGE_SIZE) {
    throw new Error(`${name} too large: ${size} chars (max ${MAX_CARTRIDGE_SIZE})`);
  }
}

/**
 * Safe parse with detailed error messages
 */
export function safeParseConsoleConfig(data: unknown) {
  return ConsoleConfigSchema.safeParse(data);
}
