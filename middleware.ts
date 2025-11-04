import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // In development/bypass mode, just pass through without auth checks
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Don't run middleware on API routes or static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
