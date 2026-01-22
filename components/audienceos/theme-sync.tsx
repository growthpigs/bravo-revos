'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/use-auth'

/**
 * ThemeSync - Loads user's theme preference from database on mount
 *
 * This component:
 * 1. Waits for authentication
 * 2. Fetches theme preference from user_preference table
 * 3. Applies the theme via next-themes
 *
 * Place this in the layout after ThemeProvider
 */
export function ThemeSync() {
  const { setTheme } = useTheme()
  const { profile, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    // Only load after auth is ready
    if (isLoading || !isAuthenticated || !profile) {
      return
    }

    const loadThemePreference = async () => {
      try {
        const response = await fetch('/api/v1/settings/preferences?category=display', {
          credentials: 'include',
        })

        if (response.ok) {
          const { data } = await response.json()
          const themePreference = data?.display?.theme

          if (themePreference === 'light' || themePreference === 'dark') {
            setTheme(themePreference)
          }
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error)
        // Silently fail - default theme will be used
      }
    }

    loadThemePreference()
  }, [isLoading, isAuthenticated, profile, setTheme])

  return null
}
