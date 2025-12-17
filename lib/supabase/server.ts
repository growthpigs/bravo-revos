import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(options?: { isServiceRole?: boolean }) {
  // CRITICAL: Service role requests should NOT call cookies()
  // Workers run outside Next.js request context and cookies() will throw
  if (options?.isServiceRole) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

  // For regular authenticated requests, use cookies (requires Next.js request context)
  const cookieStore = await cookies()

  console.log('[AUTH_DEBUG] createClient called', {
    isServiceRole: options?.isServiceRole,
    cookieCount: cookieStore.getAll().length,
    cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
  });

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
