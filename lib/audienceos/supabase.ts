import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/audienceos/database'

// Environment variables - check at runtime, not module load
// This allows builds to succeed even without env vars (CI/CD)
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During build/static generation, these may not be available
    // Return empty strings to prevent crashes - actual usage will fail gracefully
    if (typeof window === 'undefined') {
      console.warn('[Supabase] Environment variables not configured - using placeholders for build')
      return { url: 'https://placeholder.supabase.co', key: 'placeholder-key' }
    }
    throw new Error('Supabase URL and API key are required. Check your environment variables.')
  }

  return { url, key }
}

// Lazy-loaded config to avoid issues during static generation
let _supabaseUrl: string | null = null
let _supabaseAnonKey: string | null = null

function getConfig() {
  if (!_supabaseUrl || !_supabaseAnonKey) {
    const config = getSupabaseConfig()
    _supabaseUrl = config.url
    _supabaseAnonKey = config.key
  }
  return { supabaseUrl: _supabaseUrl, supabaseAnonKey: _supabaseAnonKey }
}

/**
 * Singleton browser client - prevents infinite re-render loops
 * when used in React hooks with dependency arrays
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Create a Supabase client for browser/client components
 * Uses cookie-based auth with automatic token refresh
 * Returns singleton to prevent re-render loops in hooks
 *
 * NOTE: Auth options disabled to fix getSession() hang issue
 * discovered 2026-01-05. The SSR client's auto-detection was causing
 * infinite hangs. Direct REST API works fine, issue is client-side.
 */
export function createClient() {
  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = getConfig()
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,       // Keep session in storage
        autoRefreshToken: false,    // Disable auto-refresh - was hanging
        detectSessionInUrl: false,  // Disable URL detection - was hanging
        flowType: 'pkce',
      }
    })
  }
  return browserClient
}

/**
 * Create a Supabase client for Server Components
 * Requires cookies() from next/headers
 */
export async function createServerComponentClient(
  cookiesFn: () => Promise<{
    getAll: () => { name: string; value: string }[]
    set: (name: string, value: string, options?: object) => void
  }>
) {
  const cookieStore = await cookiesFn()
  const { supabaseUrl, supabaseAnonKey } = getConfig()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component - can't set cookies
        }
      },
    },
  })
}

/**
 * Create a Supabase client for Route Handlers and Server Actions
 * Requires cookies() from next/headers - async version for Next.js 15
 */
export async function createRouteHandlerClient(
  cookiesFn: () => Promise<{
    getAll: () => { name: string; value: string }[]
    set: (name: string, value: string, options?: object) => void
  }>
) {
  const cookieStore = await cookiesFn()
  const { supabaseUrl, supabaseAnonKey } = getConfig()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
}

/**
 * Create a Supabase client for middleware
 * Handles auth token refresh on each request
 */
export function createMiddlewareClient(
  request: Request,
  response: Response
) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookiePairs = cookieHeader.split(';').filter(Boolean)
  const { supabaseUrl, supabaseAnonKey } = getConfig()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookiePairs.map((cookie: string) => {
          const [name, ...rest] = cookie.trim().split('=')
          return { name, value: rest.join('=') }
        })
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          response.headers.append('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
        })
      },
    },
  })
}

// =============================================================================
// SERVICE ROLE CLIENT (bypasses RLS for admin operations)
// =============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * USE WITH CAUTION - only for admin operations like invitation lookup
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.warn('[Supabase] Service role key not configured')
    return null
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// =============================================================================
// AUTH HELPERS (SEC-003, SEC-006)
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get the current user's agency_id from the database
 * This is more secure than trusting JWT user_metadata which can be stale
 *
 * NOTE: Uses service role client to bypass RLS. This is safe because:
 * 1. Caller has already verified the user is authenticated
 * 2. We only query by the verified user ID
 * 3. We only return agency_id, not sensitive data
 *
 * @returns agency_id or null if user not found
 */
export async function getUserAgencyId(
  _supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  // Use service role client to bypass RLS on user table
  // The RLS policy may not allow users to read their own row
  const serviceClient = createServiceRoleClient()

  if (!serviceClient) {
    console.error('[getUserAgencyId] Service role client not configured')
    return null
  }

  const { data, error } = await serviceClient
    .from('user')
    .select('agency_id')
    .eq('id', userId)
    .single()

  if (error || !data?.agency_id) {
    if (error) {
      console.error('[getUserAgencyId] Query error:', error.message)
    }
    return null
  }

  return data.agency_id
}

/**
 * Get the authenticated user using getUser() (server-verified)
 *
 * NOTE: We skip getSession() entirely because it has known issues with
 * @supabase/ssr where it can hang or return null even when cookies exist.
 * Using getUser() directly is more reliable as it validates server-side.
 *
 * @returns { user, agencyId } or { user: null, agencyId: null } if not authenticated
 */
export async function getAuthenticatedUser(
  supabase: SupabaseClient<Database>
): Promise<{
  user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']
  agencyId: string | null
  error: string | null
}> {
  // Skip getSession() - it has bugs in @supabase/ssr that cause hangs/nulls
  // Go directly to getUser() which validates server-side
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    // Log the actual error for debugging
    if (authError) {
      console.warn('[getAuthenticatedUser] Auth error:', authError.message)
    }
    return { user: null, agencyId: null, error: authError?.message || 'Not authenticated' }
  }

  const agencyId = await getUserAgencyId(supabase, user.id)

  if (!agencyId) {
    console.warn('[getAuthenticatedUser] User has no agency:', user.id)
    return { user, agencyId: null, error: 'No agency associated with user' }
  }

  return { user, agencyId, error: null }
}

// Re-export types for convenience
export type { Database }

// =============================================================================
// DEPRECATED EXPORTS (for compatibility with older code)
// =============================================================================

/**
 * Alias for createClient() - use createClient() instead
 * @deprecated Use createClient() instead
 */
export function getSupabaseClient() {
  return createClient()
}

/**
 * Placeholder for SessionRepository - not implemented
 * Chat service legacy compatibility
 * @deprecated SessionRepository interface no longer used
 */
export interface SessionRepository {
  save: (session: unknown) => Promise<void>
  load: (id: string) => Promise<unknown>
}

/**
 * Placeholder for getSessionRepository - returns null
 * Chat service legacy compatibility
 * @deprecated Use Zustand stores for session management instead
 */
export function getSessionRepository(): SessionRepository | null {
  return null
}
