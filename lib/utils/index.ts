/**
 * Utility Functions Index
 *
 * Central export point for all utility functions.
 * Import from '@/lib/utils' instead of individual files.
 *
 * @example
 * import { safeJsonParse, safeFirst, safeParseInt } from '@/lib/utils';
 */

// Safe JSON parsing utilities
export {
  safeJsonParse,
  safeJsonParseWithDefault,
  safeJsonParseArray,
  safeJsonParseObject,
  cleanAiJsonResponse,
  type SafeParseResult,
} from './safe-json';

// Safe array access utilities
export {
  safeFirst,
  safeLast,
  safeArrayAccess,
  safeFirstOrDefault,
  safeSplitAt,
  safeAt,
  hasElements,
  safeLength,
  type SafeArrayResult,
} from './safe-array';

// Safe numeric parsing utilities
export {
  safeParseInt,
  safeParseFloat,
  parseTimeRangeDays,
  parseTimeRangeMs,
  safeParseQueryParam,
  safeParseBool,
} from './safe-parse';

// Workflow ID validation utilities
export {
  validateWorkflowId,
  generateWorkflowId,
  extractWorkflowName,
  isWorkflowIdFormat,
  WorkflowIdSchema,
  type WorkflowIdParts,
  type WorkflowIdValidationResult,
} from './workflow-validation';

// Database helper utilities
export {
  upsertLead,
  genericUpsert,
  safeFetchSingle,
  safeFetchMany,
  type UpsertResult,
  type LeadUpsertData,
} from './db-helpers';

// Re-export existing utilities
export { deepMerge } from './deep-merge';
