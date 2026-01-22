/**
 * CSRF Protection Client Utilities (TD-005)
 *
 * Usage:
 * ```typescript
 * import { getCsrfToken, fetchWithCsrf } from '@/lib/csrf'
 *
 * // Use the wrapper for automatic CSRF header inclusion
 * const response = await fetchWithCsrf('/api/v1/clients', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * })
 *
 * // Or manually get the token
 * const token = getCsrfToken()
 * fetch('/api/v1/clients', {
 *   headers: { 'X-CSRF-Token': token },
 *   ...
 * })
 * ```
 */

const CSRF_COOKIE_NAME = '__csrf_token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Get CSRF token from cookie
 * Returns null if cookie not found
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Fetch wrapper that automatically includes CSRF token
 * Use for all state-changing requests (POST, PUT, PATCH, DELETE)
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfToken = getCsrfToken()

  const headers = new Headers(options.headers)

  // Add CSRF token if available and method requires it
  const method = (options.method || 'GET').toUpperCase()
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers.set(CSRF_HEADER_NAME, csrfToken)
  }

  // Ensure JSON content type for body requests
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })
}

/**
 * Create a fetch function with automatic CSRF handling
 * Useful for creating API clients
 */
export function createCsrfFetch() {
  return fetchWithCsrf
}

/**
 * Hook-compatible function to get CSRF headers for fetch
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken()
  return token ? { [CSRF_HEADER_NAME]: token } : {}
}
