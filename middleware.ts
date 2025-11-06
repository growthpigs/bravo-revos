import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
            // Update cookies in response so they get sent back to client
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session - this updates cookies if needed for server-side auth checks
    await supabase.auth.getUser()
  } catch (error) {
    console.error('Middleware: Session refresh error:', error)
    // Continue even if refresh fails - user might be unauthenticated
  }

  return response
}

export const config = {
  matcher: [
    // Don't run middleware on API routes or static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
