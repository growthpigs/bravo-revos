'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/audienceos/supabase'

/**
 * OAuth Test Page
 *
 * Minimal page to test Google OAuth sign-in flow.
 * NOT for production - just for verifying OAuth configuration works.
 *
 * Flow:
 * 1. Click "Sign in with Google"
 * 2. Redirected to Google consent screen
 * 3. Google redirects to Supabase callback
 * 4. Supabase redirects to /auth/callback with code
 * 5. Our callback route exchanges code for session
 * 6. Redirected back here with session established
 */
export default function TestOAuthPage() {
  const [session, setSession] = useState<{ user: { email?: string; id: string } | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  const supabase = createClient()

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Session check error:', error)
          setError(error.message)
        }
        setSession(session)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    checkSession()
  }, [supabase.auth])

  // Handle Google sign-in
  async function handleGoogleSignIn() {
    setSigningIn(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/test-oauth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('OAuth error:', error)
        setError(error.message)
        setSigningIn(false)
      }
      // If no error, browser will redirect to Google
    } catch (err) {
      console.error('Unexpected error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSigningIn(false)
    }
  }

  // Handle sign out
  async function handleSignOut() {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setSession(null)
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2">OAuth Test Page</h1>
          <p className="text-gray-500 text-center text-sm mb-6">
            Testing Google OAuth sign-in flow
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {session?.user ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm font-medium">Signed In</p>
                <p className="text-green-600 text-sm mt-1">
                  Email: {session.user.email || 'N/A'}
                </p>
                <p className="text-green-600 text-xs mt-1 font-mono">
                  ID: {session.user.id}
                </p>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Sign Out
              </button>

              <div className="text-center">
                <Link href="/" className="text-blue-600 hover:underline text-sm">
                  Go to Dashboard →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {signingIn ? 'Redirecting...' : 'Sign in with Google'}
              </button>

              <p className="text-gray-400 text-xs text-center">
                This is a test page for verifying OAuth configuration.
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Supabase Project: <code className="bg-gray-100 px-1 rounded">command_center</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
