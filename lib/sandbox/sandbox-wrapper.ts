import { generateMockResponse } from './mock-responses';
import { SandboxResponse } from './types';

/**
 * Check if sandbox mode is enabled
 * Priority: localStorage > env var
 */
export function isSandboxMode(): boolean {
  if (typeof window !== 'undefined') {
    const storedValue = localStorage.getItem('sandbox_mode');
    if (storedValue !== null) {
      return storedValue === 'true';
    }
  }
  return process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';
}

/**
 * Toggle sandbox mode (stores in localStorage)
 */
export function toggleSandboxMode(): boolean {
  if (typeof window !== 'undefined') {
    const currentMode = isSandboxMode();
    const newMode = !currentMode;
    localStorage.setItem('sandbox_mode', String(newMode));
    return newMode;
  }
  return false;
}

/**
 * Sandbox-aware fetch wrapper
 *
 * Intercepts API calls when NEXT_PUBLIC_SANDBOX_MODE=true
 * Returns mock responses without executing real actions
 */
export async function sandboxFetch(
  url: string | URL,
  options: RequestInit = {}
): Promise<Response> {
  const urlString = typeof url === 'string' ? url : url.toString();

  // Pass through to real fetch if sandbox disabled
  if (!isSandboxMode()) {
    return fetch(url, options);
  }

  // Only intercept our own API routes
  if (!urlString.startsWith('/api/')) {
    return fetch(url, options);
  }

  console.log('[SANDBOX] Intercepting API call:', urlString, options.method || 'GET');

  // Generate mock response
  const mockData = await generateMockResponse(urlString, options);

  // Return Response object compatible with fetch API
  return new Response(JSON.stringify(mockData), {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
      'X-Sandbox-Mode': 'true',
    },
  });
}

/**
 * Get sandbox mode status for UI display
 */
export function getSandboxStatus() {
  const enabled = isSandboxMode();
  return {
    enabled,
    message: enabled
      ? '⚠️ Sandbox Mode: All API calls are mocked'
      : 'Production Mode: Real API calls',
    className: enabled
      ? 'border-4 border-yellow-400'
      : '',
  };
}
