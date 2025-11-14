/**
 * HGC-v2 Session Persistence Tests
 *
 * Tests core session functionality:
 * - New session creation
 * - Session continuation
 * - Message persistence
 * - History loading
 * - Voice ID support
 */

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

import { NextRequest } from 'next/server';
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

// Mock MarketingConsole
jest.mock('@/lib/console/marketing-console', () => ({
  MarketingConsole: jest.fn().mockImplementation(() => ({
    loadCartridge: jest.fn(),
    execute: jest.fn().mockResolvedValue({
      response: 'Test response from AI',
      interactive: null,
    }),
  })),
}));

// Mock cartridges
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

const TEST_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
};

const TEST_SESSION = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  user_id: TEST_USER.id,
  started_at: new Date().toISOString(),
  last_active_at: new Date().toISOString(),
  ended_at: null,
  voice_id: null,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('[DEBUG_SESSION_PERSISTENCE] HGC-v2 Session Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    });
  });

  describe('New Session Creation', () => {
    it('should create new session when no sessionId provided', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: New session creation');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello, this is my first message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      console.log('[DEBUG_SESSION_PERSISTENCE] Response:', data);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBe(TEST_SESSION.id);
      expect(data.response).toBeDefined();

      // Verify session was created without sessionId parameter
      expect(getOrCreateSession).toHaveBeenCalledWith(
        mockSupabase,
        TEST_USER.id,
        undefined, // No sessionId on first call
        undefined // No voiceId
      );

      // Verify messages were saved
      expect(saveMessages).toHaveBeenCalledWith(
        mockSupabase,
        TEST_SESSION.id,
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Hello, this is my first message',
          }),
          expect.objectContaining({
            role: 'assistant',
            content: expect.any(String),
          }),
        ])
      );
    });

    it('should return sessionId for client to save', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: SessionId in response');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Create session test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.sessionId).toBe(TEST_SESSION.id);
      expect(typeof data.sessionId).toBe('string');
      expect(data.sessionId.length).toBeGreaterThan(0);
    });
  });

  describe('Session Continuation', () => {
    it('should load history from database when sessionId provided', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: Session continuation');

      const previousHistory = [
        { role: 'user' as const, content: 'Previous message 1' },
        { role: 'assistant' as const, content: 'Previous response 1' },
        { role: 'user' as const, content: 'Previous message 2' },
        { role: 'assistant' as const, content: 'Previous response 2' },
      ];

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue(previousHistory);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Follow-up question',
          sessionId: TEST_SESSION.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      console.log('[DEBUG_SESSION_PERSISTENCE] History loaded:', previousHistory.length, 'messages');

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBe(TEST_SESSION.id);

      // Verify session was retrieved with sessionId
      expect(getOrCreateSession).toHaveBeenCalledWith(
        mockSupabase,
        TEST_USER.id,
        TEST_SESSION.id,
        undefined
      );

      // Verify history was loaded
      expect(getConversationHistory).toHaveBeenCalledWith(mockSupabase, TEST_SESSION.id);
    });

    it('should ignore conversationHistory parameter when sessionId provided', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: ConversationHistory ignored');

      const dbHistory = [
        { role: 'user' as const, content: 'Database message 1' },
        { role: 'assistant' as const, content: 'Database response 1' },
      ];

      const clientHistory = [
        { role: 'user' as const, content: 'Client message 1' },
        { role: 'assistant' as const, content: 'Client response 1' },
      ];

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue(dbHistory);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'New message',
          sessionId: TEST_SESSION.id,
          conversationHistory: clientHistory, // This should be ignored
        }),
      });

      await POST(request);

      // Verify DB history was loaded, not client history
      expect(getConversationHistory).toHaveBeenCalledWith(mockSupabase, TEST_SESSION.id);
    });
  });

  describe('Message Persistence', () => {
    it('should save user and assistant messages to database', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: Message saving');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([
        {
          id: 'msg-1',
          session_id: TEST_SESSION.id,
          role: 'user',
          content: 'Test message',
          created_at: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          session_id: TEST_SESSION.id,
          role: 'assistant',
          content: 'Test response from AI',
          created_at: new Date().toISOString(),
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
          sessionId: TEST_SESSION.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.meta.messagePersisted).toBe(true);
      expect(saveMessages).toHaveBeenCalledWith(
        mockSupabase,
        TEST_SESSION.id,
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Test message',
          }),
          expect.objectContaining({
            role: 'assistant',
          }),
        ])
      );
    });

    it('should indicate persistence failure without breaking response', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: Persistence failure handling');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockRejectedValue(new Error('Database write failed'));

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test persistence failure',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      console.log('[DEBUG_SESSION_PERSISTENCE] Persistence failed but response succeeded');

      // Request should still succeed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.response).toBeDefined();

      // But messagePersisted should be false
      expect(data.meta.messagePersisted).toBe(false);
    });

    it('should persist messages even with long history', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: Long history persistence');

      const longHistory = Array.from({ length: 50 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
      }));

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue(longHistory);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Message after long conversation',
          sessionId: TEST_SESSION.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meta.messagePersisted).toBe(true);
    });
  });

  describe('Voice ID Support', () => {
    it('should associate voiceId with new session', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: Voice ID association');

      const voiceId = '789e0123-e89b-12d3-a456-426614174000';
      const sessionWithVoice = { ...TEST_SESSION, voice_id: voiceId };

      (getOrCreateSession as jest.Mock).mockResolvedValue(sessionWithVoice);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test with voice',
          voiceId: voiceId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getOrCreateSession).toHaveBeenCalledWith(
        mockSupabase,
        TEST_USER.id,
        undefined,
        voiceId
      );
    });

    it('should preserve voiceId when continuing session', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: Voice ID preservation');

      const voiceId = '789e0123-e89b-12d3-a456-426614174000';
      const sessionWithVoice = { ...TEST_SESSION, voice_id: voiceId };

      (getOrCreateSession as jest.Mock).mockResolvedValue(sessionWithVoice);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Continue with voice',
          sessionId: TEST_SESSION.id,
          voiceId: voiceId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getOrCreateSession).toHaveBeenCalledWith(
        mockSupabase,
        TEST_USER.id,
        TEST_SESSION.id,
        voiceId
      );
    });
  });

  describe('History Behavior', () => {
    it('should use conversationHistory for new session', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: ConversationHistory on new session');

      const clientHistory = [
        { role: 'user' as const, content: 'Context message' },
        { role: 'assistant' as const, content: 'Context response' },
      ];

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'New message with context',
          conversationHistory: clientHistory,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // New session, so conversationHistory should be used
      // (We can't directly verify this, but history wasn't loaded from DB)
      expect(getConversationHistory).not.toHaveBeenCalled();
    });

    it('should start fresh when no history provided and no sessionId', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: Fresh start');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Completely new conversation',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(getConversationHistory).not.toHaveBeenCalled();
    });
  });

  describe('Response Format', () => {
    it('should include meta.messagePersisted in response', async () => {
      console.log('[DEBUG_SESSION_PERSISTENCE] Test: Response format');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test response format',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('response');
      expect(data).toHaveProperty('sessionId');
      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('messagePersisted');
      expect(data.meta).toHaveProperty('consoleSource');
    });
  });
});
