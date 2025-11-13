/**
 * Chat Request Validation
 *
 * Zod schemas for validating incoming chat requests to /api/hgc-v2
 */

import { z } from 'zod';

/**
 * Valid roles for chat messages
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content cannot be empty'),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Complete chat request schema
 * Note: userId comes from authentication, not request body
 */
export const ChatRequestSchema = z.object({
  sessionId: z.string().optional(), // Optional - will be generated if not provided
  messages: z
    .array(ChatMessageSchema)
    .min(1, 'At least one message is required')
    .max(50, 'Too many messages in conversation history'),
  voiceId: z.string().uuid('Invalid voice ID format').optional(),
  metadata: z.record(z.any()).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * Legacy v1 format schema (for backward compatibility)
 * Format: { message: string, conversationHistory?: Message[] }
 */
export const LegacyV1RequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationHistory: z.array(ChatMessageSchema).optional(),
  voiceId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

export type LegacyV1Request = z.infer<typeof LegacyV1RequestSchema>;

/**
 * Validate and parse a chat request
 *
 * @param body - Raw request body
 * @returns Parsed and validated chat request
 * @throws ZodError if validation fails
 */
export function validateChatRequest(body: unknown): ChatRequest {
  return ChatRequestSchema.parse(body);
}

/**
 * Safe validation that returns errors instead of throwing
 *
 * @param body - Raw request body
 * @returns Success with data or error with issues
 */
export function safeParseChatRequest(body: unknown) {
  return ChatRequestSchema.safeParse(body);
}

/**
 * Validate legacy v1 format request
 *
 * @param body - Raw request body in v1 format
 * @returns Parsed and validated request
 * @throws ZodError if validation fails
 */
export function validateLegacyV1Request(body: unknown): LegacyV1Request {
  return LegacyV1RequestSchema.parse(body);
}

/**
 * Safe validation for legacy v1 format
 *
 * @param body - Raw request body
 * @returns Success with data or error with issues
 */
export function safeParseLegacyV1Request(body: unknown) {
  return LegacyV1RequestSchema.safeParse(body);
}
