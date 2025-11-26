/**
 * Safe JSON Parsing Utilities
 *
 * Provides crash-safe JSON parsing for AI responses that may be malformed.
 * Returns structured results instead of throwing exceptions.
 *
 * Usage:
 *   const result = safeJsonParse<MyType>(aiResponse);
 *   if (result.success) {
 *     // Use result.data
 *   } else {
 *     // Handle result.error, access result.raw for original input
 *   }
 */

import { z } from 'zod';

/**
 * Result type for safe JSON parsing operations
 */
export interface SafeParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  raw?: string;
}

/**
 * Clean common AI response artifacts from JSON strings
 * Handles markdown code blocks and other common AI output quirks
 */
export function cleanAiJsonResponse(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let cleaned = input.trim();

  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  // Remove leading/trailing whitespace after code block removal
  cleaned = cleaned.trim();

  // Handle cases where AI adds explanation before/after JSON
  // Look for JSON object or array boundaries
  const jsonStartObject = cleaned.indexOf('{');
  const jsonStartArray = cleaned.indexOf('[');
  const jsonStart = Math.min(
    jsonStartObject === -1 ? Infinity : jsonStartObject,
    jsonStartArray === -1 ? Infinity : jsonStartArray
  );

  if (jsonStart !== Infinity && jsonStart > 0) {
    cleaned = cleaned.slice(jsonStart);
  }

  // Find the matching end bracket
  if (cleaned.startsWith('{')) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      cleaned = cleaned.slice(0, lastBrace + 1);
    }
  } else if (cleaned.startsWith('[')) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket !== -1) {
      cleaned = cleaned.slice(0, lastBracket + 1);
    }
  }

  return cleaned.trim();
}

/**
 * Safely parse JSON string with optional Zod schema validation
 *
 * @param input - The JSON string to parse (can be null/undefined)
 * @param schema - Optional Zod schema for validation
 * @returns SafeParseResult with success status, data, and error info
 *
 * @example
 * // Basic usage
 * const result = safeJsonParse<{name: string}>(jsonString);
 *
 * @example
 * // With Zod schema
 * const schema = z.object({ name: z.string() });
 * const result = safeJsonParse(jsonString, schema);
 */
export function safeJsonParse<T>(
  input: string | null | undefined,
  schema?: z.ZodSchema<T>
): SafeParseResult<T> {
  // Handle null/undefined input
  if (input === null || input === undefined) {
    return {
      success: false,
      error: 'Input is null or undefined',
      raw: String(input),
    };
  }

  // Handle non-string input
  if (typeof input !== 'string') {
    return {
      success: false,
      error: `Input is not a string (got ${typeof input})`,
      raw: String(input),
    };
  }

  // Handle empty string
  if (input.trim() === '') {
    return {
      success: false,
      error: 'Input is empty string',
      raw: input,
    };
  }

  try {
    // Clean AI response artifacts
    const cleaned = cleanAiJsonResponse(input);

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // If schema provided, validate against it
    if (schema) {
      const validation = schema.safeParse(parsed);
      if (!validation.success) {
        return {
          success: false,
          error: `Schema validation failed: ${validation.error.message}`,
          raw: input,
        };
      }
      return { success: true, data: validation.data };
    }

    // Return parsed data without schema validation
    return { success: true, data: parsed as T };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'JSON parse failed',
      raw: input,
    };
  }
}

/**
 * Parse JSON with fallback to default value
 * Never throws - always returns a valid value
 *
 * @param input - The JSON string to parse
 * @param defaultValue - Value to return if parsing fails
 * @returns Parsed data or defaultValue
 *
 * @example
 * const data = safeJsonParseWithDefault(response, { items: [] });
 */
export function safeJsonParseWithDefault<T>(
  input: string | null | undefined,
  defaultValue: T
): T {
  const result = safeJsonParse<T>(input);
  return result.success && result.data !== undefined ? result.data : defaultValue;
}

/**
 * Parse JSON array with fallback to empty array
 * Convenience function for array responses
 *
 * @param input - The JSON string to parse
 * @returns Parsed array or empty array
 */
export function safeJsonParseArray<T>(input: string | null | undefined): T[] {
  const result = safeJsonParse<T[]>(input);
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
}

/**
 * Parse JSON object with fallback to empty object
 * Convenience function for object responses
 *
 * @param input - The JSON string to parse
 * @returns Parsed object or empty object
 */
export function safeJsonParseObject<T extends Record<string, unknown>>(
  input: string | null | undefined
): T {
  const result = safeJsonParse<T>(input);
  if (result.success && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data;
  }
  return {} as T;
}
