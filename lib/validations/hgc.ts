import { z } from 'zod'

/**
 * Validation schema for HGC API requests
 * Ensures messages array is well-formed and within limits
 */
export const hgcRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system', 'tool']),
        content: z.string().min(1).max(10000),
      })
    )
    .min(1, 'At least one message required')
    .max(50, 'Maximum 50 messages allowed'),
})

export type HGCRequest = z.infer<typeof hgcRequestSchema>
