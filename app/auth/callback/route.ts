import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'

  console.log('[AUTH_CALLBACK] Received callback:', {
    hasCode: !!code,
    next,
    url: request.url
  })

  if (!code) {
    console.error('[AUTH_CALLBACK] No code provided')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  try {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[AUTH_CALLBACK] Error exchanging code:', error)
      // For onboarding flow, redirect back to onboard-new with error
      if (next.includes('onboard')) {
        return NextResponse.redirect(
          new URL(`/onboard-new?error=${encodeURIComponent(error.message)}`, request.url)
        )
      }
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, request.url)
      )
    }

    console.log('[AUTH_CALLBACK] Session established for user:', data.user?.id)

    // Redirect to the 'next' parameter (supports onboarding flow)
    return NextResponse.redirect(new URL(next, request.url))
  } catch (error) {
    console.error('[AUTH_CALLBACK] Unexpected error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=An%20error%20occurred%20during%20authentication', request.url)
    )
  }
}
