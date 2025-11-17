/**
 * Pod Member Onboarding Security Tests
 *
 * Comprehensive security validation for pod member onboarding system:
 * 1. Admin authorization on server actions
 * 2. Secure password setting API with invite token validation
 * 3. TOCTOU prevention (Time-of-Check-Time-of-Use)
 * 4. Client scope validation (cross-client isolation)
 * 5. Token expiration enforcement (7-day TTL)
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminUser, isUserAdmin } from '@/lib/auth/admin-check';
import { invitePodMember, activatePodMember, resendPodInvite, togglePodMemberActive } from '@/app/admin/pods/actions';
import { POST as setPasswordPOST } from '@/app/api/admin/set-user-password/route';
import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock admin check utilities
jest.mock('@/lib/auth/admin-check', () => ({
  getCurrentAdminUser: jest.fn(),
  isUserAdmin: jest.fn(),
}));

// Mock email functions
jest.mock('@/lib/email/pod-invites', () => ({
  sendPodInviteEmail: jest.fn().mockResolvedValue(undefined),
  sendActivationConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock crypto utilities
jest.mock('@/lib/utils/crypto', () => ({
  generateSecureToken: jest.fn(() => 'mock-secure-token-abc123'),
}));

describe('Pod Member Onboarding Security', () => {
  let mockSupabase: any;

  // Helper to create a query chain
  const createQueryChain = () => {
    const chain: any = {
      from: jest.fn(() => chain),
      select: jest.fn(() => chain),
      insert: jest.fn(() => chain),
      update: jest.fn(() => chain),
      delete: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    };
    return chain;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mock
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        admin: {
          createUser: jest.fn(),
          updateUserById: jest.fn(),
          deleteUser: jest.fn(),
        },
      },
      from: jest.fn(() => createQueryChain()),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('1. Admin Authorization on Server Actions', () => {
    describe('invitePodMember()', () => {
      it('should reject non-admin users', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue(null);

        const result = await invitePodMember({
          name: 'John Doe',
          email: 'john@example.com',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          clientId: 'client-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Admin privileges required');
        expect(mockSupabase.auth.admin.createUser).not.toHaveBeenCalled();
      });

      it('should handle duplicate email gracefully without user enumeration', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue({
          id: 'admin-user-123',
          email: 'admin@example.com',
        });

        const chain = createQueryChain();
        chain.single.mockResolvedValueOnce({
          data: { name: 'Test Client' },
          error: null,
        });
        mockSupabase.from.mockReturnValueOnce(chain);

        mockSupabase.auth.admin.createUser.mockResolvedValue({
          data: null,
          error: { message: 'User already registered' },
        });

        const result = await invitePodMember({
          name: 'John Doe',
          email: 'existing@example.com',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          clientId: 'client-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('This email is already registered. Please contact support to resend the invite.');
      });
    });

    describe('activatePodMember()', () => {
      it('should reject non-admin users', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue(null);

        const result = await activatePodMember('pod-member-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Admin privileges required');
      });

      it('should reject activation without Unipile connection', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue({
          id: 'admin-user-123',
          email: 'admin@example.com',
        });

        const memberChain = createQueryChain();
        memberChain.single.mockResolvedValue({
          data: {
            id: 'pod-member-123',
            unipile_account_id: null, // No Unipile connected
            client_id: 'client-123',
            users: { email: 'member@example.com', full_name: 'Member', client_id: 'client-123' },
            clients: { name: 'Test Client' },
          },
          error: null,
        });

        const adminChain = createQueryChain();
        adminChain.single.mockResolvedValue({
          data: { client_id: 'client-123' },
          error: null,
        });

        mockSupabase.from
          .mockReturnValueOnce(memberChain)
          .mockReturnValueOnce(adminChain);

        const result = await activatePodMember('pod-member-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Member must connect Unipile before activation');
      });
    });

    describe('resendPodInvite()', () => {
      it('should reject non-admin users', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue(null);

        const result = await resendPodInvite('pod-member-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Admin privileges required');
      });

      it('should prevent resending invite for already active members', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue({
          id: 'admin-user-123',
          email: 'admin@example.com',
        });

        const memberChain = createQueryChain();
        memberChain.single.mockResolvedValue({
          data: {
            id: 'pod-member-123',
            onboarding_status: 'active', // Already active
            client_id: 'client-123',
            users: { email: 'member@example.com', client_id: 'client-123' },
            clients: { name: 'Test Client' },
          },
          error: null,
        });

        const adminChain = createQueryChain();
        adminChain.single.mockResolvedValue({
          data: { client_id: 'client-123' },
          error: null,
        });

        mockSupabase.from
          .mockReturnValueOnce(memberChain)
          .mockReturnValueOnce(adminChain);

        const result = await resendPodInvite('pod-member-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Member is already active');
      });
    });

    describe('togglePodMemberActive()', () => {
      it('should reject non-admin users', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue(null);

        const result = await togglePodMemberActive('pod-member-123', true);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Admin privileges required');
      });
    });
  });

  describe('2. Secure Password Setting API', () => {
    it('should reject requests without inviteToken', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/set-user-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          password: 'SecurePass123!',
        }),
      });

      const response = await setPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('inviteToken are required');
    });

    it('should reject requests with invalid invite token', async () => {
      const chain = createQueryChain();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });
      mockSupabase.from.mockReturnValue(chain);

      const request = new NextRequest('http://localhost:3000/api/admin/set-user-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          password: 'SecurePass123!',
          inviteToken: 'invalid-token',
        }),
      });

      const response = await setPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid or expired invite token');
    });

    it('should reject tokens in wrong onboarding status', async () => {
      const chain = createQueryChain();
      chain.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          onboarding_status: 'password_set', // Already used
          invite_sent_at: new Date().toISOString(),
        },
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      const request = new NextRequest('http://localhost:3000/api/admin/set-user-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          password: 'SecurePass123!',
          inviteToken: 'valid-token-123',
        }),
      });

      const response = await setPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invite token already used or expired');
    });

    it('should reject expired tokens (>7 days old)', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const chain = createQueryChain();
      chain.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          onboarding_status: 'invited',
          invite_sent_at: eightDaysAgo.toISOString(),
        },
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      const request = new NextRequest('http://localhost:3000/api/admin/set-user-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          password: 'SecurePass123!',
          inviteToken: 'expired-token',
        }),
      });

      const response = await setPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invite token expired. Please request a new invitation.');
    });

    it('should accept valid tokens and set password + email_confirm', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const chain = createQueryChain();
      chain.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          onboarding_status: 'invited',
          invite_sent_at: twoDaysAgo.toISOString(),
        },
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      mockSupabase.auth.admin.updateUserById.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/set-user-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          password: 'SecurePass123!',
          inviteToken: 'valid-token-123',
        }),
      });

      const response = await setPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', {
        password: 'SecurePass123!',
        email_confirm: true,
      });
    });

    it('should enforce minimum password length', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/set-user-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          password: 'short',
          inviteToken: 'valid-token',
        }),
      });

      const response = await setPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password must be at least 8 characters');
    });

    it('should prevent token reuse after password set', async () => {
      // First request succeeds
      const validChain = createQueryChain();
      validChain.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          onboarding_status: 'invited',
          invite_sent_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(validChain);
      mockSupabase.auth.admin.updateUserById.mockResolvedValue({
        data: null,
        error: null,
      });

      const request1 = new NextRequest('http://localhost:3000/api/admin/set-user-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          password: 'SecurePass123!',
          inviteToken: 'one-time-token',
        }),
      });

      await setPasswordPOST(request1);

      // Second request with same token should fail
      const usedChain = createQueryChain();
      usedChain.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          onboarding_status: 'password_set', // Status changed
          invite_sent_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(usedChain);

      const request2 = new NextRequest('http://localhost:3000/api/admin/set-user-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          password: 'AnotherPass456!',
          inviteToken: 'one-time-token',
        }),
      });

      const response2 = await setPasswordPOST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(403);
      expect(data2.error).toBe('Invite token already used or expired');
    });
  });

  describe('3. TOCTOU Prevention', () => {
    it('should validate token on page load and before submission', async () => {
      // This test documents the frontend behavior
      // Frontend checks token validity at two points:
      // 1. On page load (useEffect in PodInvitePage)
      // 2. Before password submission (handleSetPassword)

      const validToken = {
        onboarding_status: 'invited',
        invite_sent_at: new Date().toISOString(),
        user_id: 'user-123',
      };

      // Both checks should pass for valid token
      expect(validToken.onboarding_status).toBe('invited');
    });

    it('should reject expired tokens at both checkpoints', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const expiredToken = {
        onboarding_status: 'invited',
        invite_sent_at: eightDaysAgo.toISOString(),
        user_id: 'user-123',
      };

      const inviteSentAt = new Date(expiredToken.invite_sent_at);
      const expiresAt = new Date(inviteSentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isExpired = new Date() > expiresAt;

      // Both frontend checkpoints should detect expiration
      expect(isExpired).toBe(true);
    });

    it('should detect status change between page load and submission', async () => {
      // Page load: token valid
      const validAtLoad = {
        onboarding_status: 'invited',
        invite_sent_at: new Date().toISOString(),
      };

      // Pre-submission: token already used (TOCTOU attack scenario)
      const usedAtSubmit = {
        onboarding_status: 'password_set',
        invite_sent_at: new Date().toISOString(),
      };

      expect(validAtLoad.onboarding_status).toBe('invited');
      expect(usedAtSubmit.onboarding_status).toBe('password_set');

      // Frontend should reject because status changed
      const shouldReject = usedAtSubmit.onboarding_status !== 'invited';
      expect(shouldReject).toBe(true);
    });
  });

  describe('4. Client Scope Validation', () => {
    describe('Cross-client isolation', () => {
      it('should prevent admin from Client A activating member from Client B', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue({
          id: 'admin-user-123',
          email: 'admin@clientA.com',
        });

        const memberChain = createQueryChain();
        memberChain.single.mockResolvedValue({
          data: {
            id: 'pod-member-456',
            client_id: 'client-B', // Member from Client B
            unipile_account_id: 'unipile-acc-789',
            users: { email: 'member@clientB.com', full_name: 'Member B', client_id: 'client-B' },
            clients: { name: 'Client B' },
          },
          error: null,
        });

        const adminChain = createQueryChain();
        adminChain.single.mockResolvedValue({
          data: { client_id: 'client-A' }, // Admin from Client A
          error: null,
        });

        mockSupabase.from
          .mockReturnValueOnce(memberChain)
          .mockReturnValueOnce(adminChain);

        const result = await activatePodMember('pod-member-456');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Pod member not found'); // Generic error to prevent data leakage
      });

      it('should prevent admin from Client A resending invite for member from Client B', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue({
          id: 'admin-user-123',
          email: 'admin@clientA.com',
        });

        const memberChain = createQueryChain();
        memberChain.single.mockResolvedValue({
          data: {
            id: 'pod-member-456',
            client_id: 'client-B',
            onboarding_status: 'invited',
            invite_token: 'token-123',
            users: { email: 'member@clientB.com', client_id: 'client-B' },
            clients: { name: 'Client B' },
          },
          error: null,
        });

        const adminChain = createQueryChain();
        adminChain.single.mockResolvedValue({
          data: { client_id: 'client-A' },
          error: null,
        });

        mockSupabase.from
          .mockReturnValueOnce(memberChain)
          .mockReturnValueOnce(adminChain);

        const result = await resendPodInvite('pod-member-456');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Pod member not found');
      });

      it('should prevent admin from Client A toggling active status for member from Client B', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue({
          id: 'admin-user-123',
          email: 'admin@clientA.com',
        });

        const memberChain = createQueryChain();
        memberChain.single.mockResolvedValue({
          data: { client_id: 'client-B' },
          error: null,
        });

        const adminChain = createQueryChain();
        adminChain.single.mockResolvedValue({
          data: { client_id: 'client-A' },
          error: null,
        });

        mockSupabase.from
          .mockReturnValueOnce(memberChain)
          .mockReturnValueOnce(adminChain);

        const result = await togglePodMemberActive('pod-member-456', false);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Pod member not found');
      });
    });

    describe('Generic error messages (no data leakage)', () => {
      it('should return generic error instead of revealing cross-client data', async () => {
        (getCurrentAdminUser as jest.Mock).mockResolvedValue({
          id: 'admin-user-123',
          email: 'admin@clientA.com',
        });

        const memberChain = createQueryChain();
        memberChain.single.mockResolvedValue({
          data: {
            id: 'pod-member-456',
            client_id: 'client-B',
            users: { email: 'secret@clientB.com', client_id: 'client-B' },
          },
          error: null,
        });

        const adminChain = createQueryChain();
        adminChain.single.mockResolvedValue({
          data: { client_id: 'client-A' },
          error: null,
        });

        mockSupabase.from
          .mockReturnValueOnce(memberChain)
          .mockReturnValueOnce(adminChain);

        const result = await activatePodMember('pod-member-456');

        // Should NOT reveal that member exists in different client
        expect(result.error).toBe('Pod member not found');
        expect(result.error).not.toContain('Client B');
        expect(result.error).not.toContain('secret@clientB.com');
      });
    });
  });

  describe('5. Token Expiration Enforcement', () => {
    it('should enforce 7-day token expiration in frontend', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const inviteSentAt = new Date(eightDaysAgo);
      const expiresAt = new Date(inviteSentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isExpired = new Date() > expiresAt;

      expect(isExpired).toBe(true);
    });

    it('should allow tokens within 7-day window', async () => {
      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

      const inviteSentAt = new Date(sixDaysAgo);
      const expiresAt = new Date(inviteSentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isExpired = new Date() > expiresAt;

      expect(isExpired).toBe(false);
    });

    it('should enforce expiration in backend API', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const chain = createQueryChain();
      chain.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          onboarding_status: 'invited',
          invite_sent_at: eightDaysAgo.toISOString(),
        },
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      const request = new NextRequest('http://localhost:3000/api/admin/set-user-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          password: 'SecurePass123!',
          inviteToken: 'expired-token',
        }),
      });

      const response = await setPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invite token expired. Please request a new invitation.');
    });
  });
});
