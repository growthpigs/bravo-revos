/**
 * Validation Schemas Index
 *
 * Central export point for all Zod validation schemas.
 * Import from '@/lib/validations' instead of individual files.
 *
 * @example
 * import { ChatMessageSchema, ConsoleConfigSchema, campaignCreateSchema } from '@/lib/validations';
 */

// Chat validation schemas
export {
  ChatMessageSchema,
  ChatRequestSchema,
  LegacyV1RequestSchema,
  validateChatRequest,
  safeParseChatRequest,
  validateLegacyV1Request,
  safeParseLegacyV1Request,
  type ChatMessage,
  type ChatRequest,
  type LegacyV1Request,
} from './chat';

// Console/cartridge validation schemas
export {
  OperationsCartridgeSchema,
  SystemCartridgeSchema,
  ContextCartridgeSchema,
  ChipSchema,
  SkillsCartridgeSchema,
  PluginsCartridgeSchema,
  KnowledgeCartridgeSchema,
  MemoryCartridgeSchema,
  InlineButtonsSchema,
  ButtonActionsSchema,
  FullscreenTriggersSchema,
  UICartridgeSchema,
  ConsoleConfigSchema,
  CreateConsoleInputSchema,
  UpdateMetadataInputSchema,
  validateCartridgeSize,
  safeParseConsoleConfig,
  type ConsoleConfig,
  type OperationsCartridge,
  type SystemCartridge,
  type ContextCartridge,
  type SkillsCartridge,
  type PluginsCartridge,
  type KnowledgeCartridge,
  type MemoryCartridge,
  type UICartridge,
  type CreateConsoleInput,
  type UpdateMetadataInput,
} from './console';

// Campaign validation schemas
export {
  campaignCreateSchema,
  type CampaignCreateInput,
} from './campaign';

// HGC request validation
export {
  hgcRequestSchema,
  type HGCRequest,
} from './hgc';
