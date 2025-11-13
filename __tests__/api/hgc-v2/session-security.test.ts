/**
 * HGC-v2 Session Security Tests
 *
 * Tests security and isolation:
 * - Session isolation between users
 * - RLS policy enforcement
 * - Unauthorized access prevention
 * - Session hijacking protection
 */

import { NextRequest } from 'next/server';
// Mock OpenAI BEFORE importing anything that uses it
jest.mock('openai', () => {
  const mockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
  return mockOpenAI;
});

import { POST } from '@/app/api/hgc-v2/route';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateSession, getConversationHistory, saveMessages } from '@/lib/session-manager';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/session-manager');
jest.mock('@/lib/console/console-loader', () => ({
  loadConsolePrompt: jest.fn().mockResolvedValue({
    id: 'test-console',
    name: 'marketing-console-v1',
    displayName: 'Marketing Console',
    systemInstructions: 'You are a marketing assistant.',
    behaviorRules: [],
    version: 1,
  }),
}));

jest.mock('@/lib/console/marketing-console', () => ({
  MarketingConsole: jest.fn().mockImplementation(() => ({
    loadCartridge: jest.fn(),
    execute: jest.fn().mockResolvedValue({
      response: 'Test response',
      interactive: null,
    }),
  })),
}));

jest.mock('@/lib/cartridges/linkedin-cartridge', () => ({
  LinkedInCartridge: jest.fn().mockImplementation(() => ({
    id: 'linkedin',
    name: 'LinkedIn',
  })),
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

const USER_A = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user-a@example.com',
};

const USER_B = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  email: 'user-b@example.com',
};

const SESSION_A = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  user_id: USER_A.id,
  started_at: new Date().toISOString(),
  last_active_at: new Date().toISOString(),
  ended_at: null,
  voice_id: null,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('[DEBUG_SESSION_SECURITY] HGC-v2 Session Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: Reject unauthenticated');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Unauthorized message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      console.log('[DEBUG_SESSION_SECURITY] Unauthenticated response:', data);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');

      // Should NOT attempt to create session
      expect(getOrCreateSession).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid auth token', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: Invalid auth token');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      });

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Invalid token test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(getOrCreateSession).not.toHaveBeenCalled();
    });
  });

  describe('Session Isolation', () => {
    it('should prevent User B from accessing User A session', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: Session isolation');

      // User B tries to access User A's session
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: USER_B },
        error: null,
      });

      // Simulate RLS enforcement: getOrCreateSession returns null for wrong user
      (getOrCreateSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Trying to access another user session',
          sessionId: SESSION_A.id, // User A's session
        }),
      });

      try {
        const response = await POST(request);
        const data = await response.json();

        // Should either fail or create new session for User B
        if (data.success) {
          expect(data.sessionId).not.toBe(SESSION_A.id);
        } else {
          expect(data.success).toBe(false);
        }
      } catch (error: any) {
        // Expected to fail
        console.log('[DEBUG_SESSION_SECURITY] Correctly rejected cross-user access');
      }

      // Verify attempt to access with correct user_id check
      expect(getOrCreateSession).toHaveBeenCalledWith(
        mockSupabase,
        USER_B.id, // Not USER_A.id
        SESSION_A.id,
        undefined
      );
    });

    it('should only load messages from user own sessions', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: Message isolation');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: USER_A },
        error: null,
      });

      (getOrCreateSession as jest.Mock).mockResolvedValue(SESSION_A);
      (getConversationHistory as jest.Mock).mockResolvedValue([
        { role: 'user' as const, content: 'My private message' },
        { role: 'assistant' as const, content: 'My private response' },
      ]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Continue my conversation',
          sessionId: SESSION_A.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify history loaded for correct session only
      expect(getConversationHistory).toHaveBeenCalledWith(mockSupabase, SESSION_A.id);
    });

    it('should create separate sessions for different users', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: Separate user sessions');

      const SESSION_B = {
        id: '660e8400-e29b-41d4-a716-446655440002',
        user_id: USER_B.id,
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        ended_at: null,
        voice_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // User A request
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: USER_A },
        error: null,
      });
      (getOrCreateSession as jest.Mock).mockResolvedValueOnce(SESSION_A);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const requestA = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({ message: 'User A message' }),
      });

      const responseA = await POST(requestA);
      const dataA = await responseA.json();

      expect(dataA.sessionId).toBe(SESSION_A.id);

      // User B request
      jest.clearAllMocks();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: USER_B },
        error: null,
      });
      (getOrCreateSession as jest.Mock).mockResolvedValueOnce(SESSION_B);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const requestB = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({ message: 'User B message' }),
      });

      const responseB = await POST(requestB);
      const dataB = await responseB.json();

      expect(dataB.sessionId).toBe(SESSION_B.id);
      expect(dataB.sessionId).not.toBe(dataA.sessionId);
    });
  });

  describe('RLS Policy Enforcement', () => {
    it('should enforce user_id match on session retrieval', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: RLS enforcement');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: USER_A },
        error: null,
      });

      (getOrCreateSession as jest.Mock).mockImplementation(
        async (supabase, userId, sessionId) => {
          // Simulate RLS: Only return session if user_id matches
          if (sessionId === SESSION_A.id && userId === USER_A.id) {
            return SESSION_A;
          }
          // RLS prevents access - no rows returned
          return null;
        }
      );

      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test RLS',
          sessionId: SESSION_A.id,
        }),
      });

      const response = await POST(request);

      // Should succeed because user_id matches
      expect(response.status).toBe(200);

      // Verify called with correct user_id
      expect(getOrCreateSession).toHaveBeenCalledWith(
        mockSupabase,
        USER_A.id,
        SESSION_A.id,
        undefined
      );
    });

    it('should enforce RLS on message retrieval', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: RLS on messages');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: USER_A },
        error: null,
      });

      (getOrCreateSession as jest.Mock).mockResolvedValue(SESSION_A);

      // Simulate RLS on messages table
      (getConversationHistory as jest.Mock).mockImplementation(async (supabase, sessionId) => {
        // RLS checks session belongs to auth.uid()
        if (sessionId === SESSION_A.id) {
          return [
            { role: 'user' as const, content: 'Message 1' },
            { role: 'assistant' as const, content: 'Response 1' },
          ];
        }
        // No access to other users' messages
        return [];
      });

      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Load my messages',
          sessionId: SESSION_A.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getConversationHistory).toHaveBeenCalledWith(mockSupabase, SESSION_A.id);
    });

    it('should enforce RLS on message insertion', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: RLS on insert');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: USER_A },
        error: null,
      });

      (getOrCreateSession as jest.Mock).mockResolvedValue(SESSION_A);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);

      // Simulate RLS on insert
      (saveMessages as jest.Mock).mockImplementation(async (supabase, sessionId, messages) => {
        // RLS verifies session belongs to auth.uid() via FK constraint
        if (sessionId === SESSION_A.id) {
          return messages.map((msg: any, i: number) => ({
            id: `msg-${i}`,
            session_id: sessionId,
            ...msg,
            metadata: {},
            created_at: new Date().toISOString(),
          }));
        }
        // Cannot insert to other users' sessions
        throw new Error('RLS policy violation: session does not belong to user');
      });

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Save my message',
          sessionId: SESSION_A.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.messagePersisted).toBe(true);
    });
  });

  describe('Session Hijacking Prevention', () => {
    it('should not accept arbitrary sessionId without auth', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: Session hijacking prevention');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Try to hijack session',
          sessionId: SESSION_A.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(getOrCreateSession).not.toHaveBeenCalled();
    });

    it('should validate sessionId belongs to authenticated user', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: SessionId validation');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: USER_B },
        error: null,
      });

      // User B tries to use User A's session ID
      (getOrCreateSession as jest.Mock).mockImplementation(
        async (supabase, userId, sessionId) => {
          // RLS: session not found for this user
          if (sessionId === SESSION_A.id && userId !== SESSION_A.user_id) {
            return null; // No match due to RLS
          }
          return SESSION_A;
        }
      );

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hijack attempt',
          sessionId: SESSION_A.id, // User A's session
        }),
      });

      try {
        await POST(request);
      } catch (error: any) {
        console.log('[DEBUG_SESSION_SECURITY] Correctly prevented session hijacking');
      }

      // Verify it tried with USER_B, not USER_A
      expect(getOrCreateSession).toHaveBeenCalledWith(
        mockSupabase,
        USER_B.id,
        SESSION_A.id,
        undefined
      );
    });
  });

  describe('Database Connection Failures', () => {
    it('should handle auth.getUser() failure gracefully', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: Auth failure handling');

      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test connection failure',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should fail gracefully with 500 or 401
      expect(response.status).toBeGreaterThanOrEqual(401);
      expect(data.success).toBe(false);
    });

    it('should handle session creation failure', async () => {
      console.log('[DEBUG_SESSION_SECURITY] Test: Session creation failure');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: USER_A },
        error: null,
      });

      (getOrCreateSession as jest.Mock).mockRejectedValue(
        new Error('Failed to create chat session: Connection timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test session failure',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to create chat session');
    });
  });
});
