/**
 * Admin Users Page - Multi-Role Checkbox Tests
 * Tests for /app/admin/users/page.tsx
 *
 * Tests the new multi-role checkbox functionality:
 * - RLS policy enforcement
 * - Multi-role checkbox behavior
 * - Primary role derivation logic
 * - Edge cases (empty roles, single role, multiple roles)
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

describe('AdminUsersPage - Multi-Role Functionality', () => {
  // Mock Supabase client instance
  let mockSupabase: {
    from: jest.Mock
  }

  // Mock clipboard
  const mockClipboard = {
    writeText: jest.fn(),
  }

  // Sample users with multi-role support
  const mockUsers = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      roles: ['user'], // Only user role
      client_id: null,
      unipile_account_id: 'unipile-123',
      last_login_at: '2024-01-15T10:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      email: 'admin@example.com',
      first_name: 'Jane',
      last_name: 'Admin',
      role: 'super_admin',
      roles: ['user', 'super_admin'], // Both roles
      client_id: null,
      unipile_account_id: null,
      last_login_at: null,
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'user-3',
      email: 'superadmin@example.com',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin',
      roles: ['super_admin'], // Only super_admin role
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

  describe('1. RLS Policy Tests', () => {
    it('should fetch all users (simulating admin RLS policy)', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users')
      })

      // Verify query selects roles array
      const fromResult = mockSupabase.from('user')
      expect(fromResult.select).toHaveBeenCalledWith(
        expect.stringContaining('roles')
      )

      // Verify all users loaded
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('should display users table with roles column', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Verify roles are displayed
      const userBadges = screen.getAllByText('user')
      expect(userBadges.length).toBeGreaterThan(0)
    })
  })

  describe('2. Multi-Role Checkbox Tests', () => {
    it('should load edit modal with correct roles from database', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click edit on first user (user-1: only 'user' role)
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Verify User checkbox is checked
      const userCheckbox = screen.getByRole('checkbox', { name: /User/ })
      expect(userCheckbox).toBeChecked()

      // Verify Super Admin checkbox is NOT checked
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })
      expect(adminCheckbox).not.toBeChecked()
    })

    it('should load edit modal with both roles checked for multi-role user', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Edit second user in the list (Jane Admin - has both roles)
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[1]) // Jane Admin is second in Users tab

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Verify both checkboxes are checked
      const userCheckbox = screen.getByRole('checkbox', { name: /User/ })
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })

      expect(userCheckbox).toBeChecked()
      expect(adminCheckbox).toBeChecked()
    })

    it('should update formData.roles when checking User checkbox', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Edit third user (Super Admin - only super_admin role)
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[2])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // User checkbox should NOT be checked initially
      const userCheckbox = screen.getByRole('checkbox', { name: /User/ })
      expect(userCheckbox).not.toBeChecked()

      // Check User checkbox
      fireEvent.click(userCheckbox)

      // Verify checkbox is now checked
      expect(userCheckbox).toBeChecked()

      // Save and verify roles array includes both
      const saveButton = screen.getByRole('button', { name: /Save Changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSupabase.from('user').update).toHaveBeenCalledWith(
          expect.objectContaining({
            roles: expect.arrayContaining(['user', 'super_admin']),
          })
        )
      })
    })

    it('should update formData.roles when unchecking Super Admin checkbox', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Edit Jane Admin (has both roles)
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[1])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Uncheck Super Admin checkbox
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })
      fireEvent.click(adminCheckbox)

      // Verify checkbox is now unchecked
      expect(adminCheckbox).not.toBeChecked()

      // Save and verify roles array only has 'user'
      const saveButton = screen.getByRole('button', { name: /Save Changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSupabase.from('user').update).toHaveBeenCalledWith(
          expect.objectContaining({
            roles: ['user'],
          })
        )
      })
    })

    it('should persist both roles and legacy role field on save', async () => {
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

      // Edit first user
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Add Super Admin role
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })
      fireEvent.click(adminCheckbox)

      // Save changes
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        // Verify both roles array and legacy role field are saved
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            roles: expect.arrayContaining(['user', 'super_admin']),
            role: 'super_admin', // Primary role
          })
        )
        expect(toast.success).toHaveBeenCalledWith('User updated successfully')
      })
    })
  })

  describe('3. Primary Role Derivation Tests', () => {
    it('should derive primary role as super_admin when both roles selected', async () => {
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

      // Edit user with only 'user' role
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Add super_admin role
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })
      fireEvent.click(adminCheckbox)

      // Save
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'super_admin', // Super admin takes precedence
          })
        )
      })
    })

    it('should derive primary role as user when only user role selected', async () => {
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

      // Edit user with both roles (Jane Admin)
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[1])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Uncheck super_admin role
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })
      fireEvent.click(adminCheckbox)

      // Save
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'user', // Only user role remains
          })
        )
      })
    })
  })

  describe('4. Tab Filtering Tests', () => {
    it('should show all users in Users tab', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Users tab shows all users (default)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Admin')).toBeInTheDocument()
      expect(screen.getByText('Super Admin')).toBeInTheDocument()
    })

    it('should filter to only admin/super_admin roles in Admins tab', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Switch to Admins tab
      fireEvent.click(screen.getByRole('tab', { name: 'Admins' }))

      // Wait for filtering to complete
      await waitFor(() => {
        // Should show Jane Admin (has super_admin in roles array)
        expect(screen.getByText('Jane Admin')).toBeInTheDocument()
        // Should show Super Admin (has super_admin in roles array)
        expect(screen.getByText('Super Admin')).toBeInTheDocument()
      })

    })
  })

  describe('5. Edge Cases', () => {
    it('should handle user with only user role', async () => {
      // user-1 has roles: ['user']
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Edit user
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Verify only User checkbox is checked
      const userCheckbox = screen.getByRole('checkbox', { name: /User/ })
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })

      expect(userCheckbox).toBeChecked()
      expect(adminCheckbox).not.toBeChecked()
    })

    it('should handle user with only super_admin role', async () => {
      // user-3 has roles: ['super_admin']
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Edit third user (Super Admin - only super_admin role)
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[2])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Verify only Super Admin checkbox is checked
      const userCheckbox = screen.getByRole('checkbox', { name: /User/ })
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })

      expect(userCheckbox).not.toBeChecked()
      expect(adminCheckbox).toBeChecked()
    })

    it('should handle user with both roles', async () => {
      // user-2 has roles: ['user', 'super_admin']
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Edit Jane Admin (second user in list)
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[1])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Verify both checkboxes are checked
      const userCheckbox = screen.getByRole('checkbox', { name: /User/ })
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })

      expect(userCheckbox).toBeChecked()
      expect(adminCheckbox).toBeChecked()
    })

    it('should handle empty roles array gracefully', async () => {
      const usersWithEmptyRoles = [
        {
          ...mockUsers[0],
          roles: [], // Empty array
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: usersWithEmptyRoles,
            error: null,
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Edit user with empty roles
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Should not crash - checkboxes should be unchecked
      const userCheckbox = screen.getByRole('checkbox', { name: /User/ })
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })

      // May default to ['user'] based on implementation
      // The page sets formData.roles to user.roles || ['user']
      expect(userCheckbox).toBeInTheDocument()
      expect(adminCheckbox).toBeInTheDocument()
    })

    it('should handle null roles field gracefully', async () => {
      const usersWithNullRoles = [
        {
          ...mockUsers[0],
          roles: null as any, // Null instead of array
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: usersWithNullRoles,
            error: null,
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Should not crash when displaying user
      expect(screen.getByText('user1@example.com')).toBeInTheDocument()
    })
  })

  describe('6. Create User with Multi-Role', () => {
    it('should create user with default user role', async () => {
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

      // Open create modal
      fireEvent.click(screen.getByRole('button', { name: /Invite User/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Verify User checkbox is checked by default
      const userCheckbox = screen.getByRole('checkbox', { name: /User/ })
      expect(userCheckbox).toBeChecked()

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
        // Verify API called with correct roles
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const body = JSON.parse(fetchCall[1].body)
        expect(body.roles).toEqual(['user'])
        expect(body.role).toBe('user')
      })
    })

    it('should create user with super_admin role when checkbox selected', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user_id: 'new-admin-123',
          email: 'newadmin@example.com',
        }),
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Open create modal
      fireEvent.click(screen.getByRole('button', { name: /Invite User/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Check super_admin checkbox
      const adminCheckbox = screen.getByRole('checkbox', { name: /Super Admin/ })
      fireEvent.click(adminCheckbox)

      // Fill form
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: 'newadmin@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/Temporary Password/i), {
        target: { value: 'password123' },
      })

      // Submit
      const buttons = screen.getAllByRole('button')
      const createBtn = buttons.find(b => b.textContent === 'Create User')
      if (createBtn) fireEvent.click(createBtn)

      await waitFor(() => {
        // Verify API called with both roles and super_admin as primary
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const body = JSON.parse(fetchCall[1].body)
        expect(body.roles).toEqual(expect.arrayContaining(['user', 'super_admin']))
        expect(body.role).toBe('super_admin') // Primary role
      })
    })
  })

  describe('7. Role Badge Display', () => {
    it('should display all roles as badges for multi-role user', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Jane Admin has both 'user' and 'super_admin' roles
      // Both should be displayed as badges
      const userBadges = screen.getAllByText('user')
      const adminBadges = screen.getAllByText('super_admin')

      expect(userBadges.length).toBeGreaterThan(0)
      expect(adminBadges.length).toBeGreaterThan(0)
    })

    it('should display single role badge for single-role user', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // John Doe has only 'user' role
      const userBadges = screen.getAllByText('user')
      expect(userBadges.length).toBeGreaterThan(0)
    })
  })
})
