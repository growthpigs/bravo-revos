/**
 * Safe Numeric Parsing Utilities
 *
 * Provides NaN-safe numeric parsing with configurable defaults and bounds.
 * Never returns NaN - always returns a valid number.
 *
 * Usage:
 *   const limit = safeParseInt(searchParams.get('limit'), 20);
 *   const days = parseTimeRangeDays(timeRange); // "7d" -> 7
 */

import { PARSE_DEFAULTS } from '@/lib/config';

/**
 * Safely parse integer with default fallback
 * Never returns NaN - always returns a valid number
 *
 * @param value - The string value to parse (can be null/undefined)
 * @param defaultValue - Value to return if parsing fails
 * @param options - Optional min/max bounds
 * @returns Parsed integer or defaultValue
 *
 * @example
 * const limit = safeParseInt(req.query.limit, 20, { min: 1, max: 100 });
 */
export function safeParseInt(
  value: string | null | undefined,
  defaultValue: number,
  options?: { min?: number; max?: number }
): number {
  // Handle null/undefined/empty
  if (value === null || value === undefined || value.trim() === '') {
    return defaultValue;
  }

  // Parse with radix 10
  const parsed = parseInt(value, 10);

  // Handle NaN
  if (isNaN(parsed)) {
    return defaultValue;
  }

  // Apply bounds if specified
  let result = parsed;

  if (options?.min !== undefined && result < options.min) {
    result = options.min;
  }

  if (options?.max !== undefined && result > options.max) {
    result = options.max;
  }

  return result;
}

/**
 * Safely parse float with default fallback
 * Never returns NaN - always returns a valid number
 *
 * @param value - The string value to parse
 * @param defaultValue - Value to return if parsing fails
 * @param options - Optional min/max bounds
 * @returns Parsed float or defaultValue
 */
export function safeParseFloat(
  value: string | null | undefined,
  defaultValue: number,
  options?: { min?: number; max?: number }
): number {
  if (value === null || value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }

  let result = parsed;

  if (options?.min !== undefined && result < options.min) {
    result = options.min;
  }

  if (options?.max !== undefined && result > options.max) {
    result = options.max;
  }

  return result;
}

/**
 * Parse time range string (e.g., "7d", "30d") to number of days
 *
 * @param timeRange - Time range string like "7d" or "30d"
 * @param defaultDays - Default days if parsing fails
 * @returns Number of days
 *
 * @example
 * const days = parseTimeRangeDays("7d"); // 7
 * const days = parseTimeRangeDays("invalid"); // 7 (default)
 */
export function parseTimeRangeDays(
  timeRange: string | null | undefined,
  defaultDays: number = PARSE_DEFAULTS.TIME_RANGE_DAYS
): number {
  if (!timeRange || typeof timeRange !== 'string') {
    return defaultDays;
  }

  // Match pattern like "7d", "30d", "365d"
  const match = timeRange.match(/^(\d+)d$/i);

  if (!match || !match[1]) {
    return defaultDays;
  }

  const days = parseInt(match[1], 10);

  if (isNaN(days) || days <= 0) {
    return defaultDays;
  }

  return days;
}

/**
 * Parse time range string to milliseconds
 *
 * @param timeRange - Time range string like "7d", "24h", "60m"
 * @param defaultMs - Default milliseconds if parsing fails
 * @returns Milliseconds
 *
 * @example
 * const ms = parseTimeRangeMs("7d"); // 604800000
 * const ms = parseTimeRangeMs("24h"); // 86400000
 */
export function parseTimeRangeMs(
  timeRange: string | null | undefined,
  defaultMs: number = PARSE_DEFAULTS.TIME_RANGE_DAYS * 24 * 60 * 60 * 1000
): number {
  if (!timeRange || typeof timeRange !== 'string') {
    return defaultMs;
  }

  // Match pattern with unit suffix
  const match = timeRange.match(/^(\d+)(d|h|m|s)$/i);

  if (!match || !match[1] || !match[2]) {
    return defaultMs;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (isNaN(value) || value <= 0) {
    return defaultMs;
  }

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return defaultMs;
  }
}

/**
 * Safely parse query parameter as integer
 *
 * @param searchParams - URLSearchParams object
 * @param key - Parameter key to extract
 * @param defaultValue - Default if missing or invalid
 * @param options - Optional min/max bounds
 * @returns Parsed integer
 *
 * @example
 * const limit = safeParseQueryParam(searchParams, 'limit', 20, { max: 100 });
 */
export function safeParseQueryParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue: number,
  options?: { min?: number; max?: number }
): number {
  return safeParseInt(searchParams.get(key), defaultValue, options);
}

/**
 * Parse boolean from string
 *
 * @param value - String to parse
 * @param defaultValue - Default if missing or invalid
 * @returns Parsed boolean
 *
 * @example
 * const enabled = safeParseBool(params.enabled, false);
 */
export function safeParseBool(
  value: string | null | undefined,
  defaultValue: boolean
): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const lower = value.toLowerCase().trim();

  if (lower === 'true' || lower === '1' || lower === 'yes') {
    return true;
  }

  if (lower === 'false' || lower === '0' || lower === 'no') {
    return false;
  }

  return defaultValue;
}
