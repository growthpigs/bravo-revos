import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Max cookie size in bytes (4KB per cookie is standard browser limit)
const MAX_COOKIE_SIZE = 4096

export async function middleware(request: NextRequest) {
  // Create response object that we'll modify with cookies
  let response = NextResponse.next()

  try {
    // Create Supabase client to refresh session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Update cookies in response with size validation
            cookiesToSet.forEach(({ name, value, options }) => {
              // Check cookie size to prevent "Cookie Too Large" errors
              // (Cloudflare outage Nov 18, 2025 caused oversized cookies)
              const cookieSize = new TextEncoder().encode(value).length

              if (cookieSize > MAX_COOKIE_SIZE) {
                console.error(`[Middleware] Cookie "${name}" exceeds max size: ${cookieSize} bytes (max: ${MAX_COOKIE_SIZE})`)
                // Don't set oversized cookie - will cause 400 error
                // Clear the cookie instead to force re-auth
                response.cookies.delete(name)
                return
              }

              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Refresh session - this updates cookies if needed for server-side auth checks
    await supabase.auth.getUser()
  } catch (error) {
    console.error('[Middleware] Session refresh error:', error)

    // On session refresh failure, clear auth cookies to force fresh login
    // This prevents users from being stuck with corrupted sessions
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Check for common cookie/session corruption indicators (case-insensitive)
    const errorLower = errorMessage.toLowerCase()
    if (errorLower.includes('cookie') ||
        errorLower.includes('session') ||
        errorLower.includes('token') ||
        errorLower.includes('400') ||
        errorLower.includes('invalid')) {
      console.warn('[Middleware] Clearing auth cookies due to session error')

      // Clear Supabase auth cookies dynamically based on project ID
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'trdoainmejxanrownbuz'

      response.cookies.delete(`sb-${projectRef}-auth-token`)
      response.cookies.delete(`sb-${projectRef}-auth-token.0`)
      response.cookies.delete(`sb-${projectRef}-auth-token.1`)
    }
  }

  return response
}

export const config = {
  matcher: [
    // Don't run middleware on API routes or static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
