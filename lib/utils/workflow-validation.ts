/**
 * Workflow ID Validation Utilities
 *
 * Security-hardened validation for workflow IDs to prevent:
 * - Regex injection attacks
 * - DoS via long strings
 * - XSS via malicious workflow names
 * - Timestamp manipulation
 *
 * Workflow ID format: {workflow-name}-{13-digit-timestamp}
 * Example: "linkedin-dm-pod-1732645123456"
 */

import { z } from 'zod';

// Constants for validation
const MAX_WORKFLOW_ID_LENGTH = 65;
const MAX_WORKFLOW_NAME_LENGTH = 50;
const TIMESTAMP_LENGTH = 13;

// Regex patterns - compiled once at module level for performance
const WORKFLOW_ID_REGEX = /^([a-z][a-z0-9-]{0,49})-(\d{13})$/i;
const SAFE_WORKFLOW_NAME_REGEX = /^[a-z][a-z0-9-]*$/i;

// Time bounds for timestamp validation
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

/**
 * Parsed workflow ID components
 */
export interface WorkflowIdParts {
  baseName: string;
  timestamp: string;
  timestampMs: number;
}

/**
 * Result type for workflow ID validation
 */
export interface WorkflowIdValidationResult {
  success: boolean;
  data?: WorkflowIdParts;
  error?: string;
}

/**
 * Zod schema for workflow ID validation
 * Can be used for additional validation if needed
 */
export const WorkflowIdSchema = z
  .string()
  .min(15, 'Workflow ID too short')
  .max(MAX_WORKFLOW_ID_LENGTH, 'Workflow ID too long')
  .regex(WORKFLOW_ID_REGEX, 'Invalid workflow ID format');

/**
 * Validate and parse workflow ID with comprehensive security checks
 *
 * Validates:
 * - Non-null input
 * - Length bounds
 * - Format pattern (name-timestamp)
 * - Safe characters only (no XSS)
 * - Reasonable timestamp range (within ±1 year)
 *
 * @param workflowId - The workflow ID to validate
 * @returns Validation result with parsed parts or error
 *
 * @example
 * const result = validateWorkflowId(workflow_id);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * const { baseName, timestampMs } = result.data;
 */
export function validateWorkflowId(
  workflowId: string | null | undefined
): WorkflowIdValidationResult {
  // Check for null/undefined
  if (!workflowId) {
    return {
      success: false,
      error: 'Workflow ID is required',
    };
  }

  // Check type
  if (typeof workflowId !== 'string') {
    return {
      success: false,
      error: 'Workflow ID must be a string',
    };
  }

  // Check length (prevent DoS via extremely long strings)
  if (workflowId.length > MAX_WORKFLOW_ID_LENGTH) {
    return {
      success: false,
      error: `Workflow ID too long (max ${MAX_WORKFLOW_ID_LENGTH} characters)`,
    };
  }

  if (workflowId.length < 15) {
    return {
      success: false,
      error: 'Workflow ID too short',
    };
  }

  // Match against pattern
  const match = workflowId.match(WORKFLOW_ID_REGEX);
  if (!match) {
    return {
      success: false,
      error: 'Invalid workflow ID format. Expected: {name}-{timestamp}',
    };
  }

  const [, rawName, timestamp] = match;

  // Sanitize workflow name - defense in depth
  // Remove any potentially dangerous characters (should already be filtered by regex)
  const baseName = rawName
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase()
    .slice(0, MAX_WORKFLOW_NAME_LENGTH);

  // Verify sanitized name is still valid
  if (!SAFE_WORKFLOW_NAME_REGEX.test(baseName)) {
    return {
      success: false,
      error: 'Workflow name contains invalid characters',
    };
  }

  // Validate timestamp
  const timestampMs = parseInt(timestamp, 10);

  if (isNaN(timestampMs)) {
    return {
      success: false,
      error: 'Invalid timestamp in workflow ID',
    };
  }

  // Check timestamp is reasonable (within bounds)
  const now = Date.now();
  const oneYearAgo = now - ONE_YEAR_MS;
  const oneMinuteFromNow = now + ONE_MINUTE_MS;

  if (timestampMs > oneMinuteFromNow) {
    return {
      success: false,
      error: 'Workflow timestamp is in the future',
    };
  }

  if (timestampMs < oneYearAgo) {
    return {
      success: false,
      error: 'Workflow timestamp is too old (expired)',
    };
  }

  return {
    success: true,
    data: {
      baseName,
      timestamp,
      timestampMs,
    },
  };
}

/**
 * Generate a new workflow ID
 *
 * @param workflowName - Base name for the workflow
 * @returns Valid workflow ID string
 *
 * @example
 * const workflowId = generateWorkflowId('linkedin-dm-pod');
 * // "linkedin-dm-pod-1732645123456"
 */
export function generateWorkflowId(workflowName: string): string {
  // Sanitize workflow name
  const sanitized = workflowName
    .toLowerCase()
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_WORKFLOW_NAME_LENGTH);

  // Ensure name starts with a letter
  const safeName = SAFE_WORKFLOW_NAME_REGEX.test(sanitized)
    ? sanitized
    : `workflow-${sanitized}`;

  return `${safeName}-${Date.now()}`;
}

/**
 * Extract just the workflow name from a workflow ID
 * Returns null if invalid format
 *
 * @param workflowId - The workflow ID
 * @returns Workflow name or null
 */
export function extractWorkflowName(workflowId: string | null | undefined): string | null {
  const result = validateWorkflowId(workflowId);
  return result.success ? result.data!.baseName : null;
}

/**
 * Check if a string looks like a valid workflow ID (quick check)
 * Use validateWorkflowId for full validation
 *
 * @param workflowId - String to check
 * @returns true if format matches
 */
export function isWorkflowIdFormat(workflowId: string | null | undefined): boolean {
  if (!workflowId || typeof workflowId !== 'string') {
    return false;
  }
  return WORKFLOW_ID_REGEX.test(workflowId);
}
