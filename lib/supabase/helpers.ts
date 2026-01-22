/**
 * Supabase Auth Helpers
 * Ported from AudienceOS for unified platform
 *
 * These helpers provide consistent auth patterns across both apps.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * USE WITH CAUTION - only for admin operations
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.warn('[Supabase] Service role key not configured')
    return null
  }

  return createServiceClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Get the current user's agency_id from the database
 * More secure than trusting JWT user_metadata which can be stale
 *
 * Uses service role client to bypass RLS. Safe because:
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
  const serviceClient = createServiceRoleClient()

  if (!serviceClient) {
    console.error('[getUserAgencyId] Service role client not configured')
    return null
  }

  // Query 'user' table (singular, as per unified schema)
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
 * Get the authenticated user with agency context
 * Uses getUser() which validates server-side (more reliable than getSession)
 *
 * @returns { user, agencyId, error }
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
