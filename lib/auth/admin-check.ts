/**
 * Admin Check Utilities
 *
 * Verify if a user has admin privileges using the admin_users table.
 * No JWT modifications or auth.users queries needed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminUser {
  id: string;
  email: string;
}

/**
 * Check if a specific user is an admin
 *
 * @param userId - User ID to check
 * @param supabase - Supabase client instance (server or client)
 * @returns true if user is admin, false otherwise
 */
export async function isUserAdmin(userId: string, supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (error) {
      // No record found is not an error - just means not admin
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('[admin-check] Error checking admin status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[admin-check] Unexpected error checking admin status:', error);
    return false;
  }
}

/**
 * Get current authenticated user if they are an admin
 *
 * @param supabase - Supabase client instance
 * @returns AdminUser object if user is authenticated AND admin, null otherwise
 */
export async function getCurrentAdminUser(supabase: SupabaseClient): Promise<AdminUser | null> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Check if this user is in the admin_users table
    const isAdmin = await isUserAdmin(user.id, supabase);

    if (!isAdmin) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    console.error('[admin-check] Error checking admin status:', error);
    return null;
  }
}
