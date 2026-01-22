import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { User, Session, SupabaseClient } from '@supabase/supabase-js'

// Mock mode detection - allows app to work without real Supabase
const MOCK_AGENCY_ID = 'demo-agency'
const isMockMode = () => {
  // Explicit override for development testing
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return true
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.includes('placeholder') || url === ''
}

/**
 * Extract Supabase project reference from URL
 * URL format: https://{projectRef}.supabase.co
 */
function getSupabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/)
  return match ? match[1] : null
}

/**
 * Parse session from Supabase auth cookie
 * Cookie format: sb-{projectRef}-auth-token = base64-{base64EncodedJSON}
 *
 * NOTE: This bypasses the hanging getSession() issue in @supabase/ssr
 * discovered 2026-01-05. Direct cookie reading is reliable.
 *
 * IMPORTANT: We specifically look for the cookie matching the current project
 * to avoid using stale cookies from old/different Supabase projects.
 * Fixed 2026-01-11 after cookie collision caused 401 errors.
 */
function getSessionFromCookie(): { access_token: string; refresh_token: string; user: User } | null {
  if (typeof document === 'undefined') return null

  const projectRef = getSupabaseProjectRef()
  const cookies = document.cookie.split(';').map(c => c.trim())

  // Look for the specific cookie matching current project
  // This prevents using stale cookies from other Supabase projects
  const expectedCookieName = projectRef ? `sb-${projectRef}-auth-token=` : null
  const authCookie = expectedCookieName
    ? cookies.find(c => c.startsWith(expectedCookieName))
    : cookies.find(c => c.startsWith('sb-') && c.includes('-auth-token='))

  if (!authCookie) return null

  try {
    let cookieValue = authCookie.split('=').slice(1).join('=')
    cookieValue = decodeURIComponent(cookieValue)

    // Strip 'base64-' prefix if present
    if (cookieValue.startsWith('base64-')) {
      cookieValue = cookieValue.substring(7)
    }

    const session = JSON.parse(atob(cookieValue))

    if (session.access_token && session.refresh_token && session.user) {
      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user as User
      }
    }
  } catch (e) {
    console.error('[AUTH] Failed to parse session cookie:', e)
  }

  return null
}

/**
 * Fetch user profile directly using REST API
 * This bypasses ALL Supabase client auth methods which hang in @supabase/ssr
 */
async function fetchProfileDirect(
  userId: string,
  accessToken: string
): Promise<UserProfile | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) return null

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/user?id=eq.${userId}&select=id,agency_id,first_name,last_name,email,avatar_url,role_id`,
      {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      console.error('[AUTH] Profile fetch failed:', response.status)
      return null
    }

    const data = await response.json()
    return data[0] as UserProfile || null
  } catch (e) {
    console.error('[AUTH] Profile fetch error:', e)
    return null
  }
}

export interface UserProfile {
  id: string
  agency_id: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  role_id: string
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

/**
 * Hook for managing authentication state
 * Uses Supabase Auth with automatic session refresh
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })

  const supabase = createClient()

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('id, agency_id, first_name, last_name, email, avatar_url, role_id')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data as UserProfile
    } catch (error) {
      console.error('Error in fetchProfile:', error)
      return null
    }
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      // Mock mode - return demo data without hitting Supabase
      if (isMockMode()) {
        console.info('[Auth] Mock mode enabled - using demo agency')
        setState({
          user: null,
          profile: {
            id: 'mock-user-id',
            agency_id: MOCK_AGENCY_ID,
            first_name: 'Demo',
            last_name: 'User',
            email: 'demo@audienceos.dev',
            avatar_url: null,
            role_id: 'demo-role-id',
          },
          session: null,
          isLoading: false,
          isAuthenticated: true, // Treat as authenticated for UI purposes
          error: null,
        })
        return
      }

      try {
        // Parse session directly from cookie - bypasses ALL hanging Supabase auth methods
        const cookieSession = getSessionFromCookie()

        if (!isMounted) return

        if (cookieSession) {
          // Fetch profile using direct REST API call (proven to work in testing)
          const profileStart = performance.now()
          const profile = await fetchProfileDirect(cookieSession.user.id, cookieSession.access_token)
          const profileDuration = performance.now() - profileStart
          console.warn(`[AUTH] Profile fetched in ${profileDuration.toFixed(0)}ms`)

          if (!isMounted) return

          setState({
            user: cookieSession.user,
            profile,
            session: null, // Session object not available without Supabase auth methods
            isLoading: false,
            isAuthenticated: true,
            error: profile ? null : 'Profile not found - please contact support',
          })
        } else {
          console.warn('[AUTH] No session cookie found')
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          })
        }
      } catch (error) {
        console.error('[AUTH] Error in initAuth:', error)
        if (!isMounted) return
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
      }
    }

    // DIAGNOSTIC: Log auth initialization start
    const authStartTime = performance.now()
    console.log('[AUTH-INIT] Starting auth initialization')

    // Timeout reference - will be cleared on auth success
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    // Add timeout to prevent infinite loading (only fires if auth doesn't complete)
    timeoutId = setTimeout(() => {
      const elapsed = performance.now() - authStartTime
      console.warn(`[AUTH-TIMEOUT] Auth timeout after ${elapsed.toFixed(0)}ms`)
      if (isMounted) {
        setState(prev => {
          if (prev.isLoading) {
            console.warn('Auth timeout - setting isLoading to false')
            return { ...prev, isLoading: false, error: 'Auth timeout' }
          }
          return prev
        })
      }
    }, 5000)

    // Run auth and clear timeout on completion
    initAuth().finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        const elapsed = performance.now() - authStartTime
        console.log(`[AUTH-COMPLETE] Auth completed in ${elapsed.toFixed(0)}ms, timeout cleared`)
      }
    })

    // Subscribe to auth changes - uses direct REST API to avoid hanging Supabase client
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        if (event === 'SIGNED_IN' && session?.user) {
          // Use fetchProfileDirect to bypass hanging Supabase client methods
          const profile = await fetchProfileDirect(session.user.id, session.access_token)
          if (!isMounted) return
          setState({
            user: session.user,
            profile,
            session: null, // Session object not needed - we have user and profile
            isLoading: false,
            isAuthenticated: true,
            error: null,
          })
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          })
        }
      }
    )

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase])

  // Sign out
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }, [supabase])

  return {
    ...state,
    signOut,
    // Convenience getters
    displayName: state.profile
      ? `${state.profile.first_name} ${state.profile.last_name}`
      : state.user?.email || 'User',
    agencyId: state.profile?.agency_id || null,
  }
}

/**
 * Hook that checks auth status and logs warning if not authenticated
 * Note: Redirect logic should be implemented at the page level
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      console.warn(`Auth required. User should be redirected to: ${redirectTo}`)
    }
  }, [auth.isLoading, auth.isAuthenticated, redirectTo])

  return auth
}
