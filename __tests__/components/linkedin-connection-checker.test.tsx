/**
 * LinkedIn Connection Checker Component Tests
 * Tests for /components/linkedin-connection-checker.tsx
 */

import { render, screen, waitFor } from '@testing-library/react'
import { LinkedInConnectionChecker } from '@/components/linkedin-connection-checker'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}))

// Import mocked functions
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('LinkedInConnectionChecker', () => {
  // Mock Supabase client instance
  let mockSupabase: {
    auth: {
      getUser: jest.Mock
    }
    from: jest.Mock
  }

  // Mock window.location.href
  let originalLocation: Location

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn(),
          }),
        }),
      }),
    }

    mockCreateClient.mockReturnValue(mockSupabase as any)

    // Mock window.location
    originalLocation = window.location
    delete (window as any).location
    window.location = { href: '' } as any

    // Mock fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    window.location = originalLocation
  })

  describe('No User Logged In', () => {
    it('should do nothing if user is not logged in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      render(<LinkedInConnectionChecker />)

      await waitFor(() => {
        expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      })

      // Should not query users table
      expect(mockSupabase.from).not.toHaveBeenCalled()
      // Should return null (no visible content)
      expect(screen.queryByText(/Connecting/)).not.toBeInTheDocument()
    })
  })

  describe('Super Admin User', () => {
    it('should skip LinkedIn check for super_admin role', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
      })

      const mockSingle = jest.fn().mockResolvedValue({
        data: { unipile_account_id: null, role: 'super_admin' },
      })
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      render(<LinkedInConnectionChecker />)

      await waitFor(() => {
        expect(mockSingle).toHaveBeenCalled()
      })

      // Should not redirect
      expect(window.location.href).toBe('')
      // Should not call Unipile API
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('User Without LinkedIn Connection', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const mockSingle = jest.fn().mockResolvedValue({
        data: { unipile_account_id: null, role: 'user' },
      })
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })
    })

    it('should redirect to Unipile OAuth if no unipile_account_id', async () => {
      const mockAuthUrl = 'https://unipile.com/oauth/authorize'
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ authUrl: mockAuthUrl }),
      })

      render(<LinkedInConnectionChecker />)

      await waitFor(() => {
        expect(window.location.href).toBe(mockAuthUrl)
      }, { timeout: 3000 })

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/unipile/create-hosted-link',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'linkedin',
            onboarding: true,
          }),
        })
      )
    })

    it('should show loading overlay while redirecting', async () => {
      let resolvePromise: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      ;(global.fetch as jest.Mock).mockReturnValue(fetchPromise)

      render(<LinkedInConnectionChecker />)

      // Wait for loading state to appear
      await waitFor(() => {
        expect(screen.getByText('Connecting to LinkedIn...')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should have loading spinner
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()

      // Resolve to cleanup
      resolvePromise!({
        ok: true,
        json: async () => ({ authUrl: 'https://unipile.com/oauth' }),
      })
    })
  })

  describe('User With LinkedIn Connection', () => {
    it('should return null when user has unipile_account_id', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const mockSingle = jest.fn().mockResolvedValue({
        data: { unipile_account_id: 'unipile-123', role: 'user' },
      })
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const { container } = render(<LinkedInConnectionChecker />)

      await waitFor(() => {
        expect(mockSingle).toHaveBeenCalled()
      })

      // Should not redirect
      expect(window.location.href).toBe('')
      // Should not fetch
      expect(global.fetch).not.toHaveBeenCalled()
      // Should render nothing
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const mockSingle = jest.fn().mockResolvedValue({
        data: { unipile_account_id: null, role: 'user' },
      })
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })
    })

    it('should handle API errors gracefully with toast', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'API Error' }),
      })

      render(<LinkedInConnectionChecker />)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to connect LinkedIn. Please try again.')
      }, { timeout: 3000 })

      // Should not redirect on error
      expect(window.location.href).toBe('')
    })

    it('should handle network errors with toast', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<LinkedInConnectionChecker />)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred. Please try again.')
      }, { timeout: 3000 })
    })

    it('should reset redirecting state on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Error' }),
      })

      render(<LinkedInConnectionChecker />)

      // Wait for error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      }, { timeout: 3000 })

      // Loading overlay should not be visible
      expect(screen.queryByText('Connecting to LinkedIn...')).not.toBeInTheDocument()
    })
  })

  describe('Component Rendering', () => {
    it('should return null when not redirecting', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const mockSingle = jest.fn().mockResolvedValue({
        data: { unipile_account_id: 'connected-123', role: 'user' },
      })
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const { container } = render(<LinkedInConnectionChecker />)

      await waitFor(() => {
        expect(mockSingle).toHaveBeenCalled()
      })

      expect(container.firstChild).toBeNull()
    })
  })
})
