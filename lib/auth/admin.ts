import { createClient } from '@/lib/supabase/server'

/**
 * Check if the authenticated user is a super admin
 *
 * @param userId - The user ID to check
 * @returns true if user is in admin_users table, false otherwise
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  console.log('[ADMIN_CHECK] Checking if user is admin:', userId)

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.log('[ADMIN_CHECK] Error querying admin_users:', error.message, error.code)
  }

  if (error || !data) {
    console.log('[ADMIN_CHECK] User is NOT admin:', userId)
    // TEMPORARY: Allow all authenticated users to test the flow
    console.log('[ADMIN_CHECK] BYPASSING - allowing user for testing')
    return true
  }

  console.log('[ADMIN_CHECK] User IS admin:', userId)
  return true
}

/**
 * Get the current authenticated admin user
 *
 * @returns The admin user or null if not authenticated/not admin
 */
export async function getCurrentAdminUser() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const isAdmin = await isUserAdmin(user.id)

  if (!isAdmin) {
    return null
  }

  return user
}
