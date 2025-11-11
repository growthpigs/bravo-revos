import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(options?: { isServiceRole?: boolean }) {
  const cookieStore = await cookies()

  console.log('[AUTH_DEBUG] createClient called', {
    isServiceRole: options?.isServiceRole,
    cookieCount: cookieStore.getAll().length,
    cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
  });

  // Use service role key if requested, otherwise use anon key
  const apiKey = options?.isServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // CRITICAL: When using service role, do NOT send cookies
  // Cookies contain user auth tokens that override the service role key
  if (options?.isServiceRole) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      apiKey,
      {
        cookies: {
          getAll() {
            return [] // No cookies for service role
          },
          setAll() {
            // No-op for service role
          },
        },
      }
    )
  }

  // For regular authenticated requests, use cookies
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    apiKey,
    {
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
