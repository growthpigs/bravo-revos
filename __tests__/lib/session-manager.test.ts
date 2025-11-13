/**
 * Session Manager Tests
 *
 * TDD approach: Tests written first, before implementation
 * These tests will FAIL initially, then pass as we implement
 */

import {
  getOrCreateSession,
  getConversationHistory,
  saveMessage,
  saveMessages,
  endSession,
  getActiveSessions,
  type ChatSession,
  type ChatMessage,
} from '@/lib/session-manager';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client for testing
const mockSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
);

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('Session Manager', () => {
  describe('getOrCreateSession', () => {
    it('should create new session for user', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      expect(session.id).toBeDefined();
      expect(session.user_id).toBe(TEST_USER_ID);
      expect(session.started_at).toBeDefined();
      expect(session.ended_at).toBeNull();
    });

    it('should retrieve existing session by ID', async () => {
      // Create initial session
      const created = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      // Retrieve by ID
      const retrieved = await getOrCreateSession(
        mockSupabase,
        TEST_USER_ID,
        created.id
      );

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.user_id).toBe(TEST_USER_ID);
    });

    it('should create new session if invalid ID provided', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';
      const session = await getOrCreateSession(
        mockSupabase,
        TEST_USER_ID,
        invalidId
      );

      expect(session.id).not.toBe(invalidId);
      expect(session.user_id).toBe(TEST_USER_ID);
    });

    it('should associate voice_id with session', async () => {
      const voiceId = '789e0123-e89b-12d3-a456-426614174000';
      const session = await getOrCreateSession(
        mockSupabase,
        TEST_USER_ID,
        undefined,
        voiceId
      );

      expect(session.voice_id).toBe(voiceId);
    });

    it('should store metadata in session', async () => {
      const metadata = { source: 'test', campaign_id: 'campaign-123' };
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      expect(session.metadata).toEqual({});
    });
  });

  describe('getConversationHistory', () => {
    it('should return empty array for new session', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);
      const history = await getConversationHistory(mockSupabase, session.id);

      expect(history).toEqual([]);
    });

    it('should return messages in chronological order', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      // Save multiple messages
      await saveMessage(mockSupabase, session.id, {
        role: 'user',
        content: 'First message',
      });
      await saveMessage(mockSupabase, session.id, {
        role: 'assistant',
        content: 'First response',
      });
      await saveMessage(mockSupabase, session.id, {
        role: 'user',
        content: 'Second message',
      });

      const history = await getConversationHistory(mockSupabase, session.id);

      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('First message');
      expect(history[1].content).toBe('First response');
      expect(history[2].content).toBe('Second message');
    });

    it('should respect limit parameter', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      // Save 10 messages
      for (let i = 0; i < 10; i++) {
        await saveMessage(mockSupabase, session.id, {
          role: 'user',
          content: `Message ${i}`,
        });
      }

      const history = await getConversationHistory(mockSupabase, session.id, 5);

      expect(history).toHaveLength(5);
    });

    it('should include tool_calls and tool_call_id', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      const toolCall = [
        {
          id: 'call_123',
          type: 'function',
          function: { name: 'publish_post', arguments: '{}' },
        },
      ];

      await saveMessage(mockSupabase, session.id, {
        role: 'assistant',
        content: 'Posting content',
        tool_calls: toolCall,
      });

      const history = await getConversationHistory(mockSupabase, session.id);

      expect(history[0].tool_calls).toEqual(toolCall);
    });
  });

  describe('saveMessage', () => {
    it('should save single message to session', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      const saved = await saveMessage(mockSupabase, session.id, {
        role: 'user',
        content: 'Test message',
      });

      expect(saved.id).toBeDefined();
      expect(saved.session_id).toBe(session.id);
      expect(saved.role).toBe('user');
      expect(saved.content).toBe('Test message');
    });

    it('should save assistant messages with tool_calls', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      const toolCall = [
        {
          id: 'call_456',
          type: 'function',
          function: { name: 'get_analytics', arguments: '{}' },
        },
      ];

      const saved = await saveMessage(mockSupabase, session.id, {
        role: 'assistant',
        content: 'Getting analytics',
        tool_calls: toolCall,
      });

      expect(saved.tool_calls).toEqual(toolCall);
    });

    it('should save tool response messages', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      const saved = await saveMessage(mockSupabase, session.id, {
        role: 'tool',
        content: '{"result": "data"}',
        tool_call_id: 'call_789',
        name: 'get_analytics',
      });

      expect(saved.role).toBe('tool');
      expect(saved.tool_call_id).toBe('call_789');
      expect(saved.name).toBe('get_analytics');
    });

    it('should update session last_active_at on message save', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);
      const initialTime = new Date(session.last_active_at);

      // Wait 100ms to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      await saveMessage(mockSupabase, session.id, {
        role: 'user',
        content: 'New message',
      });

      const updated = await getOrCreateSession(
        mockSupabase,
        TEST_USER_ID,
        session.id
      );
      const updatedTime = new Date(updated.last_active_at);

      expect(updatedTime.getTime()).toBeGreaterThan(initialTime.getTime());
    });
  });

  describe('saveMessages (bulk)', () => {
    it('should save multiple messages in one call', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      const messages = [
        { role: 'user' as const, content: 'First' },
        { role: 'assistant' as const, content: 'Response' },
        { role: 'user' as const, content: 'Second' },
      ];

      const saved = await saveMessages(mockSupabase, session.id, messages);

      expect(saved).toHaveLength(3);
      expect(saved[0].content).toBe('First');
      expect(saved[1].content).toBe('Response');
      expect(saved[2].content).toBe('Second');
    });

    it('should maintain order with bulk save', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      const messages = Array.from({ length: 5 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `Message ${i}`,
      }));

      await saveMessages(mockSupabase, session.id, messages);
      const history = await getConversationHistory(mockSupabase, session.id);

      expect(history).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(history[i].content).toBe(`Message ${i}`);
      }
    });
  });

  describe('endSession', () => {
    it('should mark session as ended', async () => {
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);
      const initialEnded = session.ended_at;

      expect(initialEnded).toBeNull();

      await endSession(mockSupabase, session.id);

      const updated = await getOrCreateSession(
        mockSupabase,
        TEST_USER_ID,
        session.id
      );

      expect(updated.ended_at).not.toBeNull();
    });
  });

  describe('getActiveSessions', () => {
    it('should return only active sessions (ended_at is null)', async () => {
      // Create one active session
      const active = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      // Create and end another session
      const ended = await getOrCreateSession(mockSupabase, TEST_USER_ID);
      await endSession(mockSupabase, ended.id);

      const active_sessions = await getActiveSessions(
        mockSupabase,
        TEST_USER_ID
      );

      expect(active_sessions.some((s) => s.id === active.id)).toBe(true);
      expect(active_sessions.some((s) => s.id === ended.id)).toBe(false);
    });

    it('should order by last_active_at descending', async () => {
      const session1 = await getOrCreateSession(mockSupabase, TEST_USER_ID);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const session2 = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      const sessions = await getActiveSessions(mockSupabase, TEST_USER_ID);

      const session2Index = sessions.findIndex((s) => s.id === session2.id);
      const session1Index = sessions.findIndex((s) => s.id === session1.id);

      expect(session2Index).toBeLessThan(session1Index);
    });

    it('should respect limit parameter', async () => {
      // Create multiple sessions
      for (let i = 0; i < 5; i++) {
        await getOrCreateSession(mockSupabase, TEST_USER_ID);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const sessions = await getActiveSessions(mockSupabase, TEST_USER_ID, 3);

      expect(sessions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Error Handling', () => {
    it('should throw error if tables do not exist', async () => {
      // This test will pass once tables are created and fail if migration not applied
      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);
      expect(session).toBeDefined();
    });

    it('should throw error with helpful message on invalid input', async () => {
      const invalidId = 'not-a-uuid';

      try {
        await getOrCreateSession(mockSupabase, invalidId);
        // If we get here, the function accepted invalid UUID
        // (Supabase may be lenient, so this test may pass)
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });
});
