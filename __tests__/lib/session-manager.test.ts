/**
 * Session Manager Unit Tests
 *
 * Tests with mocked Supabase client - no network calls
 * These tests verify the session manager logic in isolation
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

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440001';

// Helper to create a properly mocked Supabase client
function createMockSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockChain = jest.fn();

  // Create self-returning chain methods with explicit type
  type ChainMethods = {
    select: jest.Mock;
    insert: jest.Mock;
    eq: jest.Mock;
    is: jest.Mock;
    order: jest.Mock;
    limit: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    single: jest.Mock;
    maybeSingle: jest.Mock;
  };

  const chainMethods: ChainMethods = {
    select: jest.fn(function (): ChainMethods {
      return chainMethods;
    }),
    insert: jest.fn(function (): ChainMethods {
      return chainMethods;
    }),
    eq: jest.fn(function (): ChainMethods {
      return chainMethods;
    }),
    is: jest.fn(function (): ChainMethods {
      return chainMethods;
    }),
    order: jest.fn(function (): ChainMethods {
      return chainMethods;
    }),
    limit: jest.fn(function (): ChainMethods {
      return chainMethods;
    }),
    update: jest.fn(function (): ChainMethods {
      return chainMethods;
    }),
    delete: jest.fn(function (): ChainMethods {
      return chainMethods;
    }),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };

  return {
    from: jest.fn(() => chainMethods),
    __mockChain: chainMethods,
  } as any;
}

describe('Session Manager', () => {
  describe('getOrCreateSession', () => {
    it('should create new session for user', async () => {
      const mockSupabase = createMockSupabase();
      const mockSession: ChatSession = {
        id: TEST_SESSION_ID,
        user_id: TEST_USER_ID,
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        ended_at: null,
        voice_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      expect(session.id).toBe(TEST_SESSION_ID);
      expect(session.user_id).toBe(TEST_USER_ID);
      expect(session.started_at).toBeDefined();
      expect(session.ended_at).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_sessions');
    });

    it('should retrieve existing session by ID', async () => {
      const mockSupabase = createMockSupabase();
      const mockSession: ChatSession = {
        id: TEST_SESSION_ID,
        user_id: TEST_USER_ID,
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        ended_at: null,
        voice_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const retrieved = await getOrCreateSession(
        mockSupabase,
        TEST_USER_ID,
        TEST_SESSION_ID
      );

      expect(retrieved.id).toBe(TEST_SESSION_ID);
      expect(retrieved.user_id).toBe(TEST_USER_ID);
      expect(mockSupabase.__mockChain.eq).toHaveBeenCalledWith(
        'id',
        TEST_SESSION_ID
      );
    });

    it('should create new session if invalid ID provided', async () => {
      const mockSupabase = createMockSupabase();
      const invalidId = '00000000-0000-0000-0000-000000000000';
      const newSession: ChatSession = {
        id: TEST_SESSION_ID,
        user_id: TEST_USER_ID,
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        ended_at: null,
        voice_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // First call returns error (invalid ID), second creates new
      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });
      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: newSession,
        error: null,
      });

      const session = await getOrCreateSession(
        mockSupabase,
        TEST_USER_ID,
        invalidId
      );

      expect(session.id).not.toBe(invalidId);
      expect(session.user_id).toBe(TEST_USER_ID);
    });

    it('should associate voice_id with session', async () => {
      const mockSupabase = createMockSupabase();
      const voiceId = '789e0123-e89b-12d3-a456-426614174000';
      const mockSession: ChatSession = {
        id: TEST_SESSION_ID,
        user_id: TEST_USER_ID,
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        ended_at: null,
        voice_id: voiceId,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const session = await getOrCreateSession(
        mockSupabase,
        TEST_USER_ID,
        undefined,
        voiceId
      );

      expect(session.voice_id).toBe(voiceId);
    });

    it('should store metadata in session', async () => {
      const mockSupabase = createMockSupabase();
      const mockSession: ChatSession = {
        id: TEST_SESSION_ID,
        user_id: TEST_USER_ID,
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        ended_at: null,
        voice_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const session = await getOrCreateSession(mockSupabase, TEST_USER_ID);

      expect(session.metadata).toEqual({});
    });
  });

  describe('getConversationHistory', () => {
    it('should return empty array for new session', async () => {
      const mockSupabase = createMockSupabase();
      // Mock resolves on limit() since that's the final method before await
      mockSupabase.__mockChain.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const history = await getConversationHistory(mockSupabase, TEST_SESSION_ID);
      expect(history).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_messages');
    });

    it('should return messages in chronological order', async () => {
      const mockSupabase = createMockSupabase();
      const mockMessages = [
        {
          id: '1',
          session_id: TEST_SESSION_ID,
          role: 'user',
          content: 'First message',
          tool_calls: null,
          tool_call_id: null,
          name: null,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          session_id: TEST_SESSION_ID,
          role: 'assistant',
          content: 'First response',
          tool_calls: null,
          tool_call_id: null,
          name: null,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          session_id: TEST_SESSION_ID,
          role: 'user',
          content: 'Second message',
          tool_calls: null,
          tool_call_id: null,
          name: null,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.__mockChain.limit.mockResolvedValueOnce({
        data: mockMessages,
        error: null,
      });

      const history = await getConversationHistory(mockSupabase, TEST_SESSION_ID);

      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('First message');
      expect(history[1].content).toBe('First response');
      expect(history[2].content).toBe('Second message');
    });

    it('should respect limit parameter', async () => {
      const mockSupabase = createMockSupabase();
      const mockMessages = Array.from({ length: 5 }, (_, i) => ({
        id: String(i),
        session_id: TEST_SESSION_ID,
        role: 'user' as const,
        content: `Message ${i}`,
        tool_calls: null,
        tool_call_id: null,
        name: null,
        metadata: {},
        created_at: new Date().toISOString(),
      }));

      mockSupabase.__mockChain.limit.mockResolvedValueOnce({
        data: mockMessages,
        error: null,
      });

      const history = await getConversationHistory(mockSupabase, TEST_SESSION_ID, 5);

      expect(history).toHaveLength(5);
      expect(mockSupabase.__mockChain.limit).toHaveBeenCalledWith(5);
    });

    it('should include tool_calls and tool_call_id', async () => {
      const mockSupabase = createMockSupabase();
      const toolCallData = {
        id: 'call_123',
        type: 'function',
        function: { name: 'publish_post', arguments: '{}' },
      };
      const mockMessages = [
        {
          id: '1',
          session_id: TEST_SESSION_ID,
          role: 'assistant',
          content: 'Posting content',
          tool_calls: [toolCallData],
          tool_call_id: null,
          name: null,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.__mockChain.limit.mockResolvedValueOnce({
        data: mockMessages,
        error: null,
      });

      const history = await getConversationHistory(mockSupabase, TEST_SESSION_ID);

      expect(history[0].tool_calls).toEqual([toolCallData]);
    });
  });

  describe('saveMessage', () => {
    it('should save single message to session', async () => {
      const mockSupabase = createMockSupabase();
      const mockMessage: ChatMessage = {
        id: 'msg-1',
        session_id: TEST_SESSION_ID,
        role: 'user',
        content: 'Test message',
        tool_calls: undefined,
        tool_call_id: undefined,
        name: undefined,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: mockMessage,
        error: null,
      });

      const saved = await saveMessage(mockSupabase, TEST_SESSION_ID, {
        role: 'user',
        content: 'Test message',
      });

      expect(saved.id).toBe('msg-1');
      expect(saved.session_id).toBe(TEST_SESSION_ID);
      expect(saved.role).toBe('user');
      expect(saved.content).toBe('Test message');
    });

    it('should save assistant messages with tool_calls', async () => {
      const mockSupabase = createMockSupabase();
      const toolCallData = {
        id: 'call_456',
        type: 'function' as const,
        function: { name: 'get_analytics', arguments: '{}' },
      };
      const mockMessage: ChatMessage = {
        id: 'msg-2',
        session_id: TEST_SESSION_ID,
        role: 'assistant',
        content: 'Getting analytics',
        tool_calls: [toolCallData],
        tool_call_id: undefined,
        name: undefined,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: mockMessage,
        error: null,
      });

      const saved = await saveMessage(mockSupabase, TEST_SESSION_ID, {
        role: 'assistant',
        content: 'Getting analytics',
        tool_calls: [toolCallData],
      });

      expect(saved.tool_calls).toEqual([toolCallData]);
    });

    it('should save tool response messages', async () => {
      const mockSupabase = createMockSupabase();
      const mockMessage: ChatMessage = {
        id: 'msg-3',
        session_id: TEST_SESSION_ID,
        role: 'tool',
        content: '{"result": "data"}',
        tool_calls: undefined,
        tool_call_id: 'call_789',
        name: 'get_analytics',
        metadata: {},
        created_at: new Date().toISOString(),
      };

      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: mockMessage,
        error: null,
      });

      const saved = await saveMessage(mockSupabase, TEST_SESSION_ID, {
        role: 'tool',
        content: '{"result": "data"}',
        tool_call_id: 'call_789',
        name: 'get_analytics',
      });

      expect(saved.role).toBe('tool');
      expect(saved.tool_call_id).toBe('call_789');
      expect(saved.name).toBe('get_analytics');
    });
  });

  describe('saveMessages (bulk)', () => {
    it('should save multiple messages in one call', async () => {
      const mockSupabase = createMockSupabase();
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          session_id: TEST_SESSION_ID,
          role: 'user',
          content: 'First',
          tool_calls: undefined,
          tool_call_id: undefined,
          name: undefined,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          session_id: TEST_SESSION_ID,
          role: 'assistant',
          content: 'Response',
          tool_calls: undefined,
          tool_call_id: undefined,
          name: undefined,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'msg-3',
          session_id: TEST_SESSION_ID,
          role: 'user',
          content: 'Second',
          tool_calls: undefined,
          tool_call_id: undefined,
          name: undefined,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.__mockChain.select.mockResolvedValueOnce({
        data: mockMessages,
        error: null,
      });

      const messages = [
        { role: 'user' as const, content: 'First' },
        { role: 'assistant' as const, content: 'Response' },
        { role: 'user' as const, content: 'Second' },
      ];

      const saved = await saveMessages(mockSupabase, TEST_SESSION_ID, messages);

      expect(saved).toHaveLength(3);
      expect(saved[0].content).toBe('First');
      expect(saved[1].content).toBe('Response');
      expect(saved[2].content).toBe('Second');
    });
  });

  describe('endSession', () => {
    it('should mark session as ended', async () => {
      const mockSupabase = createMockSupabase();

      mockSupabase.__mockChain.update.mockReturnValueOnce(mockSupabase.__mockChain);

      await endSession(mockSupabase, TEST_SESSION_ID);

      expect(mockSupabase.from).toHaveBeenCalledWith('chat_sessions');
      expect(mockSupabase.__mockChain.update).toHaveBeenCalled();
      expect(mockSupabase.__mockChain.eq).toHaveBeenCalledWith('id', TEST_SESSION_ID);
    });
  });

  describe('getActiveSessions', () => {
    it('should return only active sessions', async () => {
      const mockSupabase = createMockSupabase();
      const mockSessions: ChatSession[] = [
        {
          id: TEST_SESSION_ID,
          user_id: TEST_USER_ID,
          started_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          ended_at: null,
          voice_id: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Mock resolves on limit() since that's the final method before await
      mockSupabase.__mockChain.limit.mockResolvedValueOnce({
        data: mockSessions,
        error: null,
      });

      const sessions = await getActiveSessions(mockSupabase, TEST_USER_ID);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(TEST_SESSION_ID);
      expect(mockSupabase.__mockChain.is).toHaveBeenCalledWith('ended_at', null);
    });

    it('should respect limit parameter', async () => {
      const mockSupabase = createMockSupabase();
      const mockSessions: ChatSession[] = Array.from({ length: 3 }, (_, i) => ({
        id: `session-${i}`,
        user_id: TEST_USER_ID,
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        ended_at: null,
        voice_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      mockSupabase.__mockChain.limit.mockResolvedValueOnce({
        data: mockSessions,
        error: null,
      });

      const sessions = await getActiveSessions(mockSupabase, TEST_USER_ID, 3);

      expect(sessions.length).toBeLessThanOrEqual(3);
      expect(mockSupabase.__mockChain.limit).toHaveBeenCalledWith(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabase.__mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to create chat session: Database error' },
      });

      try {
        await getOrCreateSession(mockSupabase, TEST_USER_ID, 'invalid-id');
      } catch (error: any) {
        expect(error.message).toContain('Failed to create chat session');
      }
    });
  });
});
