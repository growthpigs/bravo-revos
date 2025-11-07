import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  try {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, request.url)
      )
    }

    // Redirect to dashboard on successful confirmation
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('Callback route error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=An%20error%20occurred%20during%20authentication', request.url)
    )
  }
}
