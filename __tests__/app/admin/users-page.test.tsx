/**
 * Admin Users Page Tests
 * Tests for /app/admin/users/page.tsx
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminUsersPage from '@/app/admin/users/page'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Import mocked functions
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('AdminUsersPage', () => {
  // Mock Supabase client instance
  let mockSupabase: {
    from: jest.Mock
  }

  // Mock clipboard
  const mockClipboard = {
    writeText: jest.fn(),
  }

  // Sample users for testing
  const mockUsers = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      client_id: null,
      unipile_account_id: 'unipile-123',
      last_login_at: '2024-01-15T10:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      email: 'user2@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'user',
      client_id: null,
      unipile_account_id: null,
      last_login_at: null,
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'admin-1',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'super_admin',
      client_id: null,
      unipile_account_id: 'unipile-456',
      last_login_at: '2024-01-20T10:00:00Z',
      created_at: '2024-01-05T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: mockClipboard,
    })
    mockClipboard.writeText.mockResolvedValue(undefined)

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }

    mockCreateClient.mockReturnValue(mockSupabase as any)

    // Mock fetch for API calls
    global.fetch = jest.fn()
  })

  describe('Loading and Display', () => {
    it('should show loading state initially', () => {
      // Make the query never resolve
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue(new Promise(() => {})),
        }),
      })

      render(<AdminUsersPage />)

      expect(screen.getByText('Loading users...')).toBeInTheDocument()
    })

    it('should load and display users', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      expect(screen.getByText('user1@example.com')).toBeInTheDocument()
    })

    it('should display user count', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        // Users tab shows only 'user' and 'member' roles by default
        expect(screen.getByText(/Showing 2 of 3 users/)).toBeInTheDocument()
      })
    })

    it('should show empty state when no users', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument()
      })
    })

    it('should handle load error with toast', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error', code: 'ERROR', details: null },
          }),
        }),
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load users')
      })
    })
  })

  describe('Tab Filtering', () => {
    it('should filter by Users tab by default', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      // Admin should not be visible
      expect(screen.queryByText('Admin User')).not.toBeInTheDocument()
    })

    it('should filter by Admins tab when selected', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click Admins tab
      fireEvent.click(screen.getByRole('tab', { name: 'Admins' }))

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      // Regular users should not be visible
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter users by search term', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/Search by name, email/i)
      fireEvent.change(searchInput, { target: { value: 'john' } })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      })
    })

    it('should filter by email', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/Search by name, email/i)
      fireEvent.change(searchInput, { target: { value: 'user2@' } })

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
    })

    it('should show no results message when search has no matches', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/Search by name, email/i)
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument()
        expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
      })
    })
  })

  describe('Create User Modal', () => {
    it('should open create user modal', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Invite User/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      })
    })

    it('should validate email is required', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Invite User/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Find and click the submit button in the dialog
      const dialog = screen.getByRole('dialog')
      const submitButton = dialog.querySelector('button:not([type="button"])')
      if (submitButton) {
        fireEvent.click(submitButton)
      } else {
        // Try finding by text within dialog
        const buttons = screen.getAllByRole('button')
        const createBtn = buttons.find(b => b.textContent === 'Create User')
        if (createBtn) fireEvent.click(createBtn)
      }

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Email is required')
      })
    })

    it('should validate password length', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Invite User/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill form with short password
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: 'new@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/First Name/i), {
        target: { value: 'New' },
      })
      fireEvent.change(screen.getByLabelText(/Last Name/i), {
        target: { value: 'User' },
      })
      fireEvent.change(screen.getByLabelText(/Temporary Password/i), {
        target: { value: '123' }, // Too short
      })

      // Find submit button
      const buttons = screen.getAllByRole('button')
      const createBtn = buttons.find(b => b.textContent === 'Create User')
      if (createBtn) fireEvent.click(createBtn)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters')
      })
    })

    it('should call API on form submit with valid data', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user_id: 'new-user-123',
          email: 'new@example.com',
        }),
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Invite User/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill form
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: 'new@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/First Name/i), {
        target: { value: 'New' },
      })
      fireEvent.change(screen.getByLabelText(/Last Name/i), {
        target: { value: 'User' },
      })
      fireEvent.change(screen.getByLabelText(/Temporary Password/i), {
        target: { value: 'password123' },
      })

      // Find submit button
      const buttons = screen.getAllByRole('button')
      const createBtn = buttons.find(b => b.textContent === 'Create User')
      if (createBtn) fireEvent.click(createBtn)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/create-user-direct',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })
    })

    it('should show credentials modal after creation', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user_id: 'new-user-123',
          email: 'new@example.com',
        }),
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Invite User/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill form
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: 'new@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/Temporary Password/i), {
        target: { value: 'password123' },
      })

      // Submit
      const buttons = screen.getAllByRole('button')
      const createBtn = buttons.find(b => b.textContent === 'Create User')
      if (createBtn) fireEvent.click(createBtn)

      await waitFor(() => {
        expect(screen.getByText('User Account Created')).toBeInTheDocument()
        expect(screen.getByText('Login Credentials')).toBeInTheDocument()
      })
    })
  })

  describe('Copy to Clipboard', () => {
    it('should copy credentials to clipboard', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user_id: 'new-user-123',
          email: 'new@example.com',
        }),
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Invite User/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: 'new@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/Temporary Password/i), {
        target: { value: 'password123' },
      })

      const buttons = screen.getAllByRole('button')
      const createBtn = buttons.find(b => b.textContent === 'Create User')
      if (createBtn) fireEvent.click(createBtn)

      await waitFor(() => {
        expect(screen.getByText('User Account Created')).toBeInTheDocument()
      })

      // Click copy button
      const copyButton = screen.getByRole('button', { name: /Copy/i })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
        expect(toast.success).toHaveBeenCalledWith('Invite link copied to clipboard')
      })
    })
  })

  describe('Edit User', () => {
    it('should open edit modal with user data', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Find and click edit button for first user
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Check that form is populated
      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
      expect(emailInput.value).toBe('user1@example.com')
    })

    it('should update user on save', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
        update: mockUpdate,
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Update first name
      fireEvent.change(screen.getByLabelText(/First Name/i), {
        target: { value: 'Johnny' },
      })

      // Click Save Changes
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name: 'Johnny',
          })
        )
        expect(toast.success).toHaveBeenCalledWith('User updated successfully')
      })
    })
  })

  describe('Unipile Status Badge', () => {
    it('should show badge when LinkedIn connected', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // User 1 has unipile_account_id
      const linkedInBadges = screen.getAllByText('LinkedIn Connected')
      expect(linkedInBadges.length).toBeGreaterThan(0)
    })

    it('should show badge when LinkedIn not connected', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      // User 2 has no unipile_account_id
      const notConnectedBadges = screen.getAllByText('Not Connected')
      expect(notConnectedBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Role Badge Display', () => {
    it('should display user role badges', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Check user role badges
      const userBadges = screen.getAllByText('user')
      expect(userBadges.length).toBeGreaterThan(0)
    })

    it('should display admin role badges in admins tab', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Switch to admins tab
      fireEvent.click(screen.getByRole('tab', { name: 'Admins' }))

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      const adminBadges = screen.getAllByText('super_admin')
      expect(adminBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Date Formatting', () => {
    it('should format dates correctly', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Check formatted date appears (Jan 15, 2024)
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument()
    })

    it('should show Never for null last_login_at', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      // Jane Smith has null last_login_at
      const neverTexts = screen.getAllByText(/Never/)
      expect(neverTexts.length).toBeGreaterThan(0)
    })
  })

  describe('API Error Handling', () => {
    it('should show error toast on create user API failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'User already exists' }),
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Invite User/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill form
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: 'existing@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/Temporary Password/i), {
        target: { value: 'password123' },
      })

      const buttons = screen.getAllByRole('button')
      const createBtn = buttons.find(b => b.textContent === 'Create User')
      if (createBtn) fireEvent.click(createBtn)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('User already exists')
      })
    })
  })
})
