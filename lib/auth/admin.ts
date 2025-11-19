import { createClient } from '@/lib/supabase/server'

/**
 * Check if the authenticated user is a super admin
 *
 * @param userId - The user ID to check
 * @returns true if user is in admin_users table, false otherwise
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return false
  }

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
