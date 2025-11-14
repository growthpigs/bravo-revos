import { z } from 'zod'

/**
 * Validation schema for HGC API requests
 * Ensures messages array is well-formed and within limits
 *
 * Uses discriminated union to handle different message types:
 * - Regular messages (user/assistant/system): Just role + content
 * - Tool messages: Require tool_call_id (per OpenAI spec)
 */

// Regular message types (user, assistant, system)
const regularMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(10000),
})

// Tool message type (requires tool_call_id)
const toolMessageSchema = z.object({
  role: z.literal('tool'),
  content: z.string().min(1).max(10000),
  tool_call_id: z.string().min(1), // Required by OpenAI for tool messages
})

// Combined message type (discriminated union)
const messageSchema = z.union([regularMessageSchema, toolMessageSchema])

export const hgcRequestSchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1, 'At least one message required')
    .max(50, 'Maximum 50 messages allowed'),
})

export type HGCRequest = z.infer<typeof hgcRequestSchema>
