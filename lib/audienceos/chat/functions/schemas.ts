/**
 * Zod Validation Schemas for Function Arguments (AudienceOS)
 *
 * Defines strict validation for all 6 dashboard functions
 */

import { z } from 'zod';

/**
 * Validation schemas for all 6 functions
 */
export const functionSchemas = {
  get_clients: z.object({
    stage: z.string().optional(),
    health_status: z.enum(['green', 'yellow', 'red']).optional(),
    limit: z.number().int().positive().max(100).optional().default(10),
    search: z.string().optional(),
  }),

  get_client_details: z.object({
    client_id: z.string().min(1).optional(),
    client_name: z.string().optional(),
  }).refine(
    (data) => data.client_id || data.client_name,
    { message: 'Either client_id or client_name is required' }
  ),

  get_alerts: z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.string().optional(),
    client_id: z.string().min(1).optional(),
    type: z.string().optional(),
    limit: z.number().int().positive().max(100).optional().default(10),
  }),

  get_recent_communications: z.object({
    client_id: z.string().min(1),
    type: z.enum(['email', 'call', 'meeting', 'note']).optional(),
    limit: z.number().int().positive().max(100).optional().default(10),
  }),

  get_agency_stats: z.object({
    period: z.enum(['today', 'week', 'month', 'quarter']).optional().default('month'),
  }),

  navigate_to: z.object({
    destination: z.string().min(1),
    client_id: z.string().min(1).optional(),
    filters: z.object({}).passthrough().optional(),
  }),
} as const;

/**
 * Type-safe validation function
 */
export function validateFunctionArgs(
  functionName: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  const schema = functionSchemas[functionName.toLowerCase() as keyof typeof functionSchemas];

  if (!schema) {
    throw new Error(`No validation schema defined for function: ${functionName}`);
  }

  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`Validation error for ${functionName}: ${issues}`);
    }
    throw error;
  }
}
