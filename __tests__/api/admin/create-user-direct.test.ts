/**
 * Admin Direct User Creation API Tests
 * Tests for /api/admin/create-user-direct endpoint
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/admin/create-user-direct/route'

// Mock the auth/admin module
jest.mock('@/lib/auth/admin', () => ({
  getCurrentAdminUser: jest.fn(),
}))

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock Supabase service client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

// Import mocked functions
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const mockGetCurrentAdminUser = getCurrentAdminUser as jest.MockedFunction<typeof getCurrentAdminUser>
const mockCreateServiceClient = createServiceClient as jest.MockedFunction<typeof createServiceClient>

describe('POST /api/admin/create-user-direct', () => {
  // Mock Supabase admin client
  let mockSupabaseAdmin: {
    auth: {
      admin: {
        listUsers: jest.Mock
        createUser: jest.Mock
      }
    }
    from: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

    // Create mock Supabase admin client
    mockSupabaseAdmin = {
      auth: {
        admin: {
          listUsers: jest.fn(),
          createUser: jest.fn(),
        },
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      }),
    }

    mockCreateServiceClient.mockReturnValue(mockSupabaseAdmin as any)
  })

  // Helper to create NextRequest
  const createRequest = (body: object) => {
    return new NextRequest('http://localhost:3000/api/admin/create-user-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  describe('Authentication', () => {
    it('should reject unauthenticated requests with 401', async () => {
      mockGetCurrentAdminUser.mockResolvedValue(null)

      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized - Admin access required')
    })

    it('should reject non-admin users with 401', async () => {
      mockGetCurrentAdminUser.mockResolvedValue(null)

      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockGetCurrentAdminUser.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
      } as any)
    })

    it('should validate required email field', async () => {
      const request = createRequest({
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should validate email format', async () => {
      const request = createRequest({
        email: 'invalid-email',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'Invalid email address' })
        ])
      )
    })

    it('should validate required firstName field', async () => {
      const request = createRequest({
        email: 'test@example.com',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should validate required lastName field', async () => {
      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should validate required password field', async () => {
      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should validate password minimum length (6 characters)', async () => {
      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: '12345', // Only 5 characters
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'Password must be at least 6 characters' })
        ])
      )
    })

    it('should accept empty firstName with validation error', async () => {
      const request = createRequest({
        email: 'test@example.com',
        firstName: '',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'First name is required' })
        ])
      )
    })
  })

  describe('User Creation', () => {
    beforeEach(() => {
      mockGetCurrentAdminUser.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
      } as any)

      // Default: no existing users
      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      })
    })

    it('should return 409 if user already exists', async () => {
      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [{ id: 'existing-123', email: 'test@example.com' }],
        },
        error: null,
      })

      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('User already exists')
      expect(data.existing_user_id).toBe('existing-123')
    })

    it('should successfully create user in auth and users table', async () => {
      const newUserId = 'new-user-123'

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: newUserId,
            email: 'test@example.com',
          },
        },
        error: null,
      })

      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabaseAdmin.from.mockReturnValue({ insert: mockInsert })

      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user_id).toBe(newUserId)
      expect(data.email).toBe('test@example.com')
      expect(data.message).toContain('User account created')

      // Verify createUser was called correctly
      expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'User',
        },
      })

      // Verify users table insert
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('users')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: newUserId,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
        })
      )
    })

    it('should handle role parameter (super_admin)', async () => {
      const newUserId = 'admin-user-123'

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: newUserId,
            email: 'admin@example.com',
          },
        },
        error: null,
      })

      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabaseAdmin.from.mockReturnValue({ insert: mockInsert })

      const request = createRequest({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        password: 'password123',
        role: 'super_admin',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify role is set correctly
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'super_admin',
        })
      )
    })

    it('should default to user role when not specified', async () => {
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      })

      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabaseAdmin.from.mockReturnValue({ insert: mockInsert })

      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        // No role specified
      })

      await POST(request)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
        })
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetCurrentAdminUser.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
      } as any)

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      })
    })

    it('should return 500 on listUsers error', async () => {
      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to check existing users')
    })

    it('should return 500 on createUser error', async () => {
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth creation failed' },
      })

      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Auth creation failed')
    })

    it('should return success with warning on users table insert error', async () => {
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      })

      const mockInsert = jest.fn().mockResolvedValue({
        error: { message: 'Insert failed' },
      })
      mockSupabaseAdmin.from.mockReturnValue({ insert: mockInsert })

      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.warning).toContain('failed to add to users table')
    })

    it('should handle unexpected errors with 500', async () => {
      mockGetCurrentAdminUser.mockRejectedValue(new Error('Unexpected error'))

      const request = createRequest({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
