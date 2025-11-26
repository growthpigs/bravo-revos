/**
 * Safe Array Access Utilities
 *
 * Provides bounds-safe array access to prevent "Cannot read property of undefined" errors.
 * All functions handle null, undefined, and out-of-bounds access gracefully.
 *
 * Usage:
 *   const first = safeFirst(myArray);
 *   if (first !== undefined) {
 *     // Use first element
 *   }
 */

/**
 * Result type for safe array access operations
 */
export interface SafeArrayResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Safely access array element at specific index
 *
 * @param array - The array to access (can be null/undefined)
 * @param index - The index to access
 * @returns SafeArrayResult with success status and data
 *
 * @example
 * const result = safeArrayAccess(myArray, 0);
 * if (result.success) {
 *   console.log(result.data);
 * }
 */
export function safeArrayAccess<T>(
  array: T[] | null | undefined,
  index: number
): SafeArrayResult<T> {
  // Handle null/undefined array
  if (!array) {
    return {
      success: false,
      error: 'Array is null or undefined',
    };
  }

  // Handle non-array input
  if (!Array.isArray(array)) {
    return {
      success: false,
      error: 'Input is not an array',
    };
  }

  // Handle negative index
  if (index < 0) {
    return {
      success: false,
      error: `Negative index not allowed: ${index}`,
    };
  }

  // Handle out of bounds
  if (index >= array.length) {
    return {
      success: false,
      error: `Index ${index} out of bounds (array length: ${array.length})`,
    };
  }

  return { success: true, data: array[index] };
}

/**
 * Safely get first element of array
 *
 * @param array - The array (can be null/undefined)
 * @returns First element or undefined
 *
 * @example
 * const first = safeFirst(linkedinAccounts);
 * if (first) {
 *   const accountId = first.unipile_account_id;
 * }
 */
export function safeFirst<T>(array: T[] | null | undefined): T | undefined {
  if (!array || !Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  return array[0];
}

/**
 * Safely get last element of array
 *
 * @param array - The array (can be null/undefined)
 * @returns Last element or undefined
 */
export function safeLast<T>(array: T[] | null | undefined): T | undefined {
  if (!array || !Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  return array[array.length - 1];
}

/**
 * Get first element with default fallback
 *
 * @param array - The array (can be null/undefined)
 * @param defaultValue - Value to return if array is empty/null
 * @returns First element or defaultValue
 *
 * @example
 * const account = safeFirstOrDefault(accounts, { id: 'default' });
 */
export function safeFirstOrDefault<T>(
  array: T[] | null | undefined,
  defaultValue: T
): T {
  const first = safeFirst(array);
  return first !== undefined ? first : defaultValue;
}

/**
 * Safely split string and access specific index
 *
 * @param str - The string to split (can be null/undefined)
 * @param separator - The separator to split by
 * @param index - The index to access after splitting
 * @returns The string at index or empty string
 *
 * @example
 * const firstName = safeSplitAt(fullName, ' ', 0); // "John Doe" -> "John"
 * const domain = safeSplitAt(email, '@', 1); // "user@example.com" -> "example.com"
 */
export function safeSplitAt(
  str: string | null | undefined,
  separator: string,
  index: number
): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  const parts = str.split(separator);

  if (index < 0 || index >= parts.length) {
    return '';
  }

  return parts[index] ?? '';
}

/**
 * Safely get element at index with default
 *
 * @param array - The array (can be null/undefined)
 * @param index - The index to access
 * @param defaultValue - Value to return if index is invalid
 * @returns Element at index or defaultValue
 */
export function safeAt<T>(
  array: T[] | null | undefined,
  index: number,
  defaultValue: T
): T {
  const result = safeArrayAccess(array, index);
  return result.success && result.data !== undefined ? result.data : defaultValue;
}

/**
 * Safely check if array has elements
 *
 * @param array - The array (can be null/undefined)
 * @returns true if array has at least one element
 */
export function hasElements<T>(array: T[] | null | undefined): boolean {
  return Array.isArray(array) && array.length > 0;
}

/**
 * Safely get array length
 *
 * @param array - The array (can be null/undefined)
 * @returns Array length or 0
 */
export function safeLength<T>(array: T[] | null | undefined): number {
  if (!array || !Array.isArray(array)) {
    return 0;
  }
  return array.length;
}
