import { createClient } from '@supabase/supabase-js'

/**
 * Create an admin Supabase client that bypasses RLS
 *
 * IMPORTANT: Only use this in server-side code (API routes, webhooks)
 * This client has full database access - use with caution!
 *
 * Use cases:
 * - Webhooks with no auth context (e.g., Unipile callbacks)
 * - Background jobs
 * - Admin operations
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
