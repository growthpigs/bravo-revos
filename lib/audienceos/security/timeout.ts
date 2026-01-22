/**
 * Timeout utilities for security
 *
 * Provides timeout wrappers to prevent long-running operations
 * from consuming resources indefinitely.
 */

// Timeout constants (milliseconds)
export const TIMEOUTS = {
  SHORT: 5000,      // 5 seconds - quick operations
  MEDIUM: 15000,    // 15 seconds - normal operations
  LONG: 30000,      // 30 seconds - extended operations
  VERY_LONG: 60000, // 60 seconds - AI operations
} as const;

/**
 * Wrap a promise with a timeout
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds
 * @param label - Label for the operation (for error messages)
 * @returns The promise that resolves/rejects with timeout protection
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return Promise.race([
    promise.finally(() => {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }),
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timeout: ${label || 'unknown'} exceeded ${ms}ms`));
      }, ms);
    }),
  ]);
}
