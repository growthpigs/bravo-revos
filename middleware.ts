import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')

  // Redirect unauthenticated users to login
  if ((isAdminRoute || isDashboardRoute) && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Get user role if authenticated
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role, agency_id, client_id')
      .eq('id', user.id)
      .single()

    // Redirect based on role
    if (isAdminRoute && userData?.role && !['agency_admin', 'agency_member'].includes(userData.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (isDashboardRoute && userData?.role && !['client_admin', 'client_member'].includes(userData.role)) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Redirect authenticated users away from auth pages
    if (isAuthRoute && user) {
      const redirectTo = userData?.role && ['agency_admin', 'agency_member'].includes(userData.role)
        ? '/admin'
        : '/dashboard'
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
