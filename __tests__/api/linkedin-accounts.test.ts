/**
 * LinkedIn Accounts API Tests
 * Tests GET (retrieve accounts) and DELETE (disconnect account) endpoints
 */

import { GET as getHandler, DELETE as deleteHandler } from '@/app/api/linkedin/accounts/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/unipile-client', () => ({
  disconnectAccount: jest.fn(),
  getAccountStatus: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { disconnectAccount, getAccountStatus } from '@/lib/unipile-client';

describe('GET /api/linkedin/accounts', () => {
  let mockSupabaseClient: any;
  const testUserId = '00000000-0000-0000-0000-000000000003';

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.UNIPILE_MOCK_MODE = 'true';
    });

    it('should retrieve all accounts for test user in development', async () => {
      const testAccounts = [
        {
          id: 'acc-1',
          user_id: testUserId,
          account_name: 'Test Account 1',
          unipile_account_id: 'mock_test1',
          status: 'active',
          profile_data: { name: 'Test User 1', email: 'test1@linkedin.com' },
          session_expires_at: '2026-02-06T12:00:00Z',
          created_at: '2025-11-08T00:00:00Z',
        },
        {
          id: 'acc-2',
          user_id: testUserId,
          account_name: 'Test Account 2',
          unipile_account_id: 'mock_test2',
          status: 'active',
          profile_data: { name: 'Test User 2', email: 'test2@linkedin.com' },
          session_expires_at: '2026-02-06T12:00:00Z',
          created_at: '2025-11-08T00:00:00Z',
        },
      ];

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: testAccounts,
        error: null,
      });

      // Mock account status checks
      (getAccountStatus as jest.Mock).mockResolvedValue({
        status: 'OK',
        name: 'Test User',
        email: 'test@linkedin.com',
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts'),
        { method: 'GET' }
      );

      const response = await getHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(2);
      expect(data.accounts).toHaveLength(2);
      expect(data.accounts[0].account_name).toBe('Test Account 1');
    });

    it('should return empty array when no accounts exist', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts'),
        { method: 'GET' }
      );

      const response = await getHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(0);
      expect(data.accounts).toEqual([]);
    });

    it('should use service role to bypass RLS in development', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts'),
        { method: 'GET' }
      );

      await getHandler(request);

      // Verify service role was requested
      expect(createClient).toHaveBeenCalledWith({ isServiceRole: true });
    });

    it('should check and update account status from Unipile', async () => {
      const accountData = {
        id: 'acc-1',
        user_id: testUserId,
        account_name: 'Test Account',
        unipile_account_id: 'mock_test',
        status: 'active',
        profile_data: { name: 'Test', email: 'test@linkedin.com' },
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: [accountData],
        error: null,
      });

      (getAccountStatus as jest.Mock).mockResolvedValueOnce({
        status: 'CREDENTIALS',
        name: 'Test',
        email: 'test@linkedin.com',
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts'),
        { method: 'GET' }
      );

      const response = await getHandler(request);
      const data = await response.json();

      // Should update status from CREDENTIALS (expired) to 'expired'
      expect(getAccountStatus).toHaveBeenCalledWith('mock_test');
      expect(data.accounts[0].status).toBe('expired');
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.UNIPILE_MOCK_MODE = 'false';
    });

    it('should require authenticated user in production', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts'),
        { method: 'GET' }
      );

      const response = await getHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should fetch accounts for authenticated user in production', async () => {
      const realUserId = 'real-user-uuid';

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { email: 'user@example.com' } },
      });

      // First call: get user ID
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: realUserId },
        error: null,
      });

      // Second call: get accounts
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: [
          {
            id: 'acc-prod-1',
            user_id: realUserId,
            account_name: 'Production Account',
            unipile_account_id: 'real_linkedin_123',
            status: 'active',
            profile_data: { name: 'Prod User', email: 'prod@linkedin.com' },
          },
        ],
        error: null,
      });

      (getAccountStatus as jest.Mock).mockResolvedValueOnce({
        status: 'OK',
        name: 'Prod User',
        email: 'prod@linkedin.com',
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts'),
        { method: 'GET' }
      );

      const response = await getHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(1);
      expect(data.accounts[0].user_id).toBe(realUserId);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      process.env.UNIPILE_MOCK_MODE = 'true';

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts'),
        { method: 'GET' }
      );

      const response = await getHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch accounts');
    });

    it('should handle Unipile status check failures', async () => {
      process.env.UNIPILE_MOCK_MODE = 'true';

      const accountData = {
        id: 'acc-1',
        user_id: testUserId,
        account_name: 'Test Account',
        unipile_account_id: 'mock_test',
        status: 'active',
        profile_data: { name: 'Test', email: 'test@linkedin.com' },
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: [accountData],
        error: null,
      });

      // Unipile call fails but doesn't crash the endpoint
      (getAccountStatus as jest.Mock).mockRejectedValueOnce(
        new Error('Unipile API unavailable')
      );

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts'),
        { method: 'GET' }
      );

      const response = await getHandler(request);
      const data = await response.json();

      // Should still return cached status
      expect(response.status).toBe(200);
      expect(data.accounts[0].status).toBe('active');
    });
  });
});

describe('DELETE /api/linkedin/accounts', () => {
  let mockSupabaseClient: any;
  const testUserId = '00000000-0000-0000-0000-000000000003';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.UNIPILE_MOCK_MODE = 'true';

    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
  });

  describe('Development Mode', () => {
    it('should disconnect LinkedIn account in development', async () => {
      const accountId = 'acc-to-delete';

      // Get account
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: accountId,
          user_id: testUserId,
          unipile_account_id: 'mock_acc_123',
        },
        error: null,
      });

      // Delete from DB
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { deleted: true },
        error: null,
      });

      (disconnectAccount as jest.Mock).mockResolvedValueOnce({ success: true });

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/linkedin/accounts?id=${accountId}`),
        { method: 'DELETE' }
      );

      const response = await deleteHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.message).toContain('disconnected');
      expect(disconnectAccount).toHaveBeenCalledWith('mock_acc_123');
    });

    it('should verify account ownership before deletion', async () => {
      const accountId = 'acc-to-delete';
      const otherUserId = 'other-user-uuid';

      // Get account owned by different user
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: accountId,
          user_id: otherUserId, // Different user
          unipile_account_id: 'mock_acc_123',
        },
        error: null,
      });

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/linkedin/accounts?id=${accountId}`),
        { method: 'DELETE' }
      );

      const response = await deleteHandler(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
      expect(disconnectAccount).not.toHaveBeenCalled();
    });

    it('should require account ID parameter', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts'), // No ID
        { method: 'DELETE' }
      );

      const response = await deleteHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing account ID');
    });

    it('should return 404 when account not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts?id=nonexistent'),
        { method: 'DELETE' }
      );

      const response = await deleteHandler(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Account not found');
    });

    it('should handle Unipile disconnect failures gracefully', async () => {
      const accountId = 'acc-to-delete';

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: accountId,
          user_id: testUserId,
          unipile_account_id: 'mock_acc_123',
        },
        error: null,
      });

      // Unipile fails but local delete still succeeds
      (disconnectAccount as jest.Mock).mockRejectedValueOnce(
        new Error('Unipile unavailable')
      );

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { deleted: true },
        error: null,
      });

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/linkedin/accounts?id=${accountId}`),
        { method: 'DELETE' }
      );

      const response = await deleteHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.UNIPILE_MOCK_MODE = 'false';
    });

    it('should require authenticated user in production', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/linkedin/accounts?id=test-id'),
        { method: 'DELETE' }
      );

      const response = await deleteHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
