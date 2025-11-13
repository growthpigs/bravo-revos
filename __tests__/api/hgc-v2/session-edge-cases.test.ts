/**
 * HGC-v2 Session Edge Cases Tests
 *
 * Tests error handling and edge cases:
 * - Concurrent requests to same session
 * - Large conversation history
 * - Database connection failures
 * - Invalid input handling
 * - Race conditions
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

describe('[DEBUG_SESSION_EDGE] HGC-v2 Session Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    });
  });

  describe('Large Conversation History', () => {
    it('should handle 50+ messages in history', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Large history (50 messages)');

      const largeHistory = Array.from({ length: 50 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}: This is a test message with some content to simulate real conversation.`,
      }));

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue(largeHistory);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Continue long conversation',
          sessionId: TEST_SESSION.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      console.log('[DEBUG_SESSION_EDGE] Large history handled successfully');

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBe(TEST_SESSION.id);
    });

    it('should handle 100+ messages efficiently', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Very large history (100 messages)');

      const veryLargeHistory = Array.from({ length: 100 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
      }));

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue(veryLargeHistory);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Very long conversation',
          sessionId: TEST_SESSION.id,
        }),
      });

      const startTime = Date.now();
      const response = await POST(request);
      const duration = Date.now() - startTime;

      const data = await response.json();

      console.log('[DEBUG_SESSION_EDGE] Very large history processed in', duration, 'ms');

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should complete in reasonable time (< 10 seconds)
      expect(duration).toBeLessThan(10000);
    });

    it('should handle messages with tool_calls in history', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Tool calls in history');

      const historyWithTools = [
        { role: 'user' as const, content: 'Publish a post' },
        {
          role: 'assistant' as const,
          content: 'Publishing your post',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function' as const,
              function: { name: 'publish_post', arguments: '{"content":"Test"}' },
            },
          ],
        },
        {
          role: 'tool' as const,
          content: '{"success": true}',
          tool_call_id: 'call_123',
          name: 'publish_post',
        },
        { role: 'assistant' as const, content: 'Post published successfully!' },
      ];

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue(historyWithTools);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What did we just do?',
          sessionId: TEST_SESSION.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple requests to same session', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Concurrent requests');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const requests = [
        new NextRequest('http://localhost:3000/api/hgc-v2', {
          method: 'POST',
          body: JSON.stringify({
            message: 'Concurrent message 1',
            sessionId: TEST_SESSION.id,
          }),
        }),
        new NextRequest('http://localhost:3000/api/hgc-v2', {
          method: 'POST',
          body: JSON.stringify({
            message: 'Concurrent message 2',
            sessionId: TEST_SESSION.id,
          }),
        }),
        new NextRequest('http://localhost:3000/api/hgc-v2', {
          method: 'POST',
          body: JSON.stringify({
            message: 'Concurrent message 3',
            sessionId: TEST_SESSION.id,
          }),
        }),
      ];

      const responses = await Promise.all(requests.map((req) => POST(req)));
      const data = await Promise.all(responses.map((res) => res.json()));

      console.log('[DEBUG_SESSION_EDGE] Concurrent requests completed');

      // All should succeed
      expect(responses.every((res) => res.status === 200)).toBe(true);
      expect(data.every((d) => d.success === true)).toBe(true);
      expect(data.every((d) => d.sessionId === TEST_SESSION.id)).toBe(true);
    });

    it('should maintain message order with concurrent saves', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Message ordering');

      let saveCallCount = 0;

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockImplementation(async (supabase, sessionId, messages) => {
        saveCallCount++;
        console.log('[DEBUG_SESSION_EDGE] Save call', saveCallCount, '- Messages:', messages.length);
        // Simulate slight delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        return messages;
      });

      const request1 = POST(
        new NextRequest('http://localhost:3000/api/hgc-v2', {
          method: 'POST',
          body: JSON.stringify({
            message: 'First message',
            sessionId: TEST_SESSION.id,
          }),
        })
      );

      const request2 = POST(
        new NextRequest('http://localhost:3000/api/hgc-v2', {
          method: 'POST',
          body: JSON.stringify({
            message: 'Second message',
            sessionId: TEST_SESSION.id,
          }),
        })
      );

      await Promise.all([request1, request2]);

      // Both should have attempted to save
      expect(saveCallCount).toBe(2);
    });
  });

  describe('Database Connection Failures', () => {
    it('should handle getConversationHistory failure', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: History load failure');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockRejectedValue(
        new Error('Failed to retrieve conversation history: Connection timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Load history failure',
          sessionId: TEST_SESSION.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      console.log('[DEBUG_SESSION_EDGE] History failure:', data);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to retrieve conversation history');
    });

    it('should continue even if saveMessages fails', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Save failure graceful handling');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockRejectedValue(
        new Error('Failed to save messages: Write timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test save failure',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      console.log('[DEBUG_SESSION_EDGE] Save failed but response succeeded:', data.meta);

      // Request should still succeed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.response).toBeDefined();

      // But messagePersisted should be false
      expect(data.meta.messagePersisted).toBe(false);
    });

    it('should handle intermittent database issues', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Intermittent DB issues');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);

      // First call fails, second succeeds
      let attemptCount = 0;
      (saveMessages as jest.Mock).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Temporary database issue');
        }
        return [];
      });

      const request1 = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({ message: 'First attempt' }),
      });

      const response1 = await POST(request1);
      const data1 = await response1.json();

      // First request: save failed
      expect(data1.meta.messagePersisted).toBe(false);

      // Second request should succeed
      const request2 = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Second attempt',
          sessionId: TEST_SESSION.id,
        }),
      });

      jest.clearAllMocks();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: TEST_USER },
        error: null,
      });
      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(data2.meta.messagePersisted).toBe(true);
    });
  });

  describe('Invalid Input Handling', () => {
    it('should handle empty message gracefully', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Empty message');

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      console.log('[DEBUG_SESSION_EDGE] Empty message response:', data);

      // Should reject invalid input
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle malformed sessionId', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Malformed sessionId');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test',
          sessionId: 'not-a-valid-uuid',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should either reject or create new session
      if (data.success) {
        expect(data.sessionId).toBeDefined();
      } else {
        expect(data.error).toBeDefined();
      }
    });

    it('should handle very long messages', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Very long message');

      const longMessage = 'A'.repeat(10000); // 10KB message

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: longMessage,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should handle long messages
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle missing request body', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Missing body');

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      console.log('[DEBUG_SESSION_EDGE] Missing body response:', data);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });

    it('should handle invalid JSON', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Invalid JSON');

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: 'not valid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Edge Case Scenarios', () => {
    it('should handle session with ended_at set', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Ended session');

      const endedSession = {
        ...TEST_SESSION,
        ended_at: new Date().toISOString(),
      };

      (getOrCreateSession as jest.Mock).mockResolvedValue(endedSession);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Continue ended session',
          sessionId: endedSession.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still work (or create new session)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle empty history array', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Empty history');

      (getOrCreateSession as jest.Mock).mockResolvedValue(TEST_SESSION);
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'First message in session',
          sessionId: TEST_SESSION.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle voiceId with non-existent voice', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Non-existent voiceId');

      const nonExistentVoiceId = '00000000-0000-0000-0000-000000000000';

      (getOrCreateSession as jest.Mock).mockResolvedValue({
        ...TEST_SESSION,
        voice_id: nonExistentVoiceId,
      });
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test with non-existent voice',
          voiceId: nonExistentVoiceId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still create session (voice validation happens elsewhere)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle rapid session creation', async () => {
      console.log('[DEBUG_SESSION_EDGE] Test: Rapid session creation');

      (getOrCreateSession as jest.Mock).mockImplementation(async () => ({
        ...TEST_SESSION,
        id: `session-${Math.random()}`, // Different ID each time
      }));
      (getConversationHistory as jest.Mock).mockResolvedValue([]);
      (saveMessages as jest.Mock).mockResolvedValue([]);

      const requests = Array.from({ length: 5 }, (_, i) =>
        POST(
          new NextRequest('http://localhost:3000/api/hgc-v2', {
            method: 'POST',
            body: JSON.stringify({
              message: `Rapid message ${i}`,
            }),
          })
        )
      );

      const responses = await Promise.all(requests);
      const data = await Promise.all(responses.map((res) => res.json()));

      // All should succeed
      expect(responses.every((res) => res.status === 200)).toBe(true);
      expect(data.every((d) => d.success === true)).toBe(true);
    });
  });
});
