/**
 * LinkedIn Authentication API Tests
 * Tests both development mode (with fixed test user) and production mode
 */

import { POST as authHandler } from '@/app/api/linkedin/auth/route';
import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock Unipile client
jest.mock('@/lib/unipile-client', () => ({
  authenticateLinkedinAccount: jest.fn(),
  getAccountStatus: jest.fn(),
}));

// Mock encryption
jest.mock('@/lib/encryption', () => ({
  encryptData: jest.fn((data) => data),
}));

import { createClient } from '@/lib/supabase/server';
import {
  authenticateLinkedinAccount,
  getAccountStatus,
} from '@/lib/unipile-client';

describe('POST /api/linkedin/auth', () => {
  let mockSupabaseClient: any;
  const testUserId = '00000000-0000-0000-0000-000000000003';
  const testClientId = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
  });

  describe('Development Mode (UNIPILE_MOCK_MODE=true)', () => {
    beforeEach(() => {
      process.env.UNIPILE_MOCK_MODE = 'true';
    });

    it('should authenticate LinkedIn account with test user in development', async () => {
      // Mock successful Unipile authentication
      (authenticateLinkedinAccount as jest.Mock).mockResolvedValueOnce({
        account_id: 'mock_test123',
        provider: 'LINKEDIN',
        status: 'OK',
        name: 'Test User',
        email: 'test@linkedin.com',
      });

      // Mock successful account status retrieval
      (getAccountStatus as jest.Mock).mockResolvedValueOnce({
        name: 'Test User',
        email: 'test@linkedin.com',
        status: 'OK',
      });

      // Mock successful database insert
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: 'account-uuid-123',
          user_id: testUserId,
          account_name: 'Test Dev Account',
          unipile_account_id: 'mock_test123',
          status: 'active',
        },
        error: null,
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/auth'),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'authenticate',
            username: 'test.dev@linkedin.com',
            password: 'testpass',
            accountName: 'Test Dev Account',
          }),
        }
      );

      const response = await authHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.account).toBeDefined();
      expect(data.account.user_id).toBe(testUserId);
      expect(data.account.account_name).toBe('Test Dev Account');
    });

    it('should return error when Unipile authentication fails', async () => {
      (authenticateLinkedinAccount as jest.Mock).mockResolvedValueOnce({
        status: 'FAILED',
        account_id: 'acc123',
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/auth'),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'authenticate',
            username: 'invalid@linkedin.com',
            password: 'wrongpass',
            accountName: 'Test Account',
          }),
        }
      );

      const response = await authHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Authentication failed');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/auth'),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'authenticate',
            username: 'test@linkedin.com',
            // missing password and accountName
          }),
        }
      );

      const response = await authHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should use service role key to bypass RLS', async () => {
      (authenticateLinkedinAccount as jest.Mock).mockResolvedValueOnce({
        account_id: 'mock_123',
        status: 'OK',
        name: 'Test',
        email: 'test@linkedin.com',
      });

      (getAccountStatus as jest.Mock).mockResolvedValueOnce({
        name: 'Test',
        email: 'test@linkedin.com',
        status: 'OK',
      });

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'uuid', user_id: testUserId },
        error: null,
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/auth'),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'authenticate',
            username: 'test@linkedin.com',
            password: 'pass',
            accountName: 'Test',
          }),
        }
      );

      await authHandler(request);

      // Verify service role was requested
      expect(createClient).toHaveBeenCalledWith({ isServiceRole: true });
    });
  });

  describe('Production Mode (UNIPILE_MOCK_MODE=false)', () => {
    beforeEach(() => {
      process.env.UNIPILE_MOCK_MODE = 'false';
    });

    it('should require authenticated user in production', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/auth'),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'authenticate',
            username: 'test@linkedin.com',
            password: 'pass',
            accountName: 'Test Account',
          }),
        }
      );

      const response = await authHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should authenticate with real user in production', async () => {
      const realUserId = 'real-user-uuid-123';
      const realClientId = 'real-client-uuid-456';

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { email: 'real@example.com' } },
      });

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: realUserId, client_id: realClientId },
        error: null,
      });

      (authenticateLinkedinAccount as jest.Mock).mockResolvedValueOnce({
        account_id: 'real_linkedin_123',
        status: 'OK',
        name: 'Real User',
        email: 'real@linkedin.com',
      });

      (getAccountStatus as jest.Mock).mockResolvedValueOnce({
        name: 'Real User',
        email: 'real@linkedin.com',
        status: 'OK',
      });

      const secondMock = {
        data: { id: 'account-uuid', user_id: realUserId },
        error: null,
      };
      mockSupabaseClient.single.mockResolvedValueOnce(secondMock);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/auth'),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'authenticate',
            username: 'user@linkedin.com',
            password: 'realpass',
            accountName: 'Production Account',
          }),
        }
      );

      const response = await authHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.account.user_id).toBe(realUserId);
    });
  });

  describe('Checkpoint Resolution', () => {
    it('should handle 2FA checkpoint', async () => {
      process.env.UNIPILE_MOCK_MODE = 'true';

      (authenticateLinkedinAccount as jest.Mock).mockResolvedValueOnce({
        account_id: 'acc_with_2fa',
        checkpoint_type: 'OTP',
        status: 'CHECKPOINT_REQUIRED',
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/auth'),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'authenticate',
            username: 'test@linkedin.com',
            password: 'pass',
            accountName: 'Test',
          }),
        }
      );

      const response = await authHandler(request);
      const data = await response.json();

      expect(data.status).toBe('checkpoint_required');
      expect(data.checkpoint_type).toBe('OTP');
      expect(data.account_id).toBe('acc_with_2fa');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      process.env.UNIPILE_MOCK_MODE = 'true';

      (authenticateLinkedinAccount as jest.Mock).mockResolvedValueOnce({
        account_id: 'mock_123',
        status: 'OK',
        name: 'Test',
        email: 'test@linkedin.com',
      });

      (getAccountStatus as jest.Mock).mockResolvedValueOnce({
        name: 'Test',
        email: 'test@linkedin.com',
        status: 'OK',
      });

      // Simulate RLS error (should return mock in dev mode)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'row-level security policy violation' },
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/auth'),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'authenticate',
            username: 'test@linkedin.com',
            password: 'pass',
            accountName: 'Test',
          }),
        }
      );

      const response = await authHandler(request);
      const data = await response.json();

      // In dev mode, should return mock data even on DB error
      expect(data.status).toBe('success');
      expect(data.message).toContain('dev mock');
    });

    it('should reject invalid actions', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/auth'),
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'invalid_action',
            username: 'test@linkedin.com',
          }),
        }
      );

      const response = await authHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid action');
    });
  });
});
