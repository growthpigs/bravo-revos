/**
 * API Route Tests: Conversation Intelligence
 * Tests for secure server-side OpenAI API route
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/conversation-intelligence/route';

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('API Route: /api/conversation-intelligence', () => {
  let mockSupabase: any;
  let originalEnv: string | undefined;

  beforeAll(() => {
    originalEnv = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalEnv;
  });

  beforeEach(() => {
    const { createClient } = require('@/lib/supabase/server');

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
    };

    createClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
          message: 'test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept authenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                formality: 'casual',
                sentiment: 'neutral',
                emotionalState: 'neutral',
                confidence: 0.8,
              }),
            },
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
          message: 'test message',
        }),
      });

      const response = await POST(request);

      expect(response.status).not.toBe(401);
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });
    });

    it('should require action field', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          message: 'test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should require message field', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate message length', async () => {
      const longMessage = 'a'.repeat(2001);

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
          message: longMessage,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('max 2000 characters');
    });

    it('should validate message is a string', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
          message: 12345,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('must be a string');
    });

    it('should validate action values', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid-action',
          message: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid action');
    });

    it('should require context for generate-response action', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate-response',
          message: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Context required');
    });
  });

  describe('Analyze Tone Action', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });
    });

    it('should analyze tone using GPT-4', async () => {
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                formality: 'casual',
                sentiment: 'skeptical',
                emotionalState: 'doubtful',
                confidence: 0.85,
              }),
            },
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
          message: 'ugh another sales tool',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.toneProfile).toBeDefined();
      expect(data.toneProfile.formality).toBeDefined();
      expect(data.toneProfile.sentiment).toBeDefined();
    });

    it('should return fallback when OpenAI unavailable', async () => {
      const tempKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
          message: 'test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.fallback).toBe(true);

      process.env.OPENAI_API_KEY = tempKey;
    });
  });

  describe('Generate Response Action', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });
    });

    it('should generate response using GPT-4', async () => {
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'This is a generated response',
            },
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate-response',
          message: 'What makes you different?',
          context: {
            toneProfile: {
              formality: 'casual',
              sentiment: 'skeptical',
              emotionalState: 'doubtful',
              confidence: 0.8,
            },
            style: {
              tone: 'conversational',
              structure: 'brief',
              vocabulary: 'simple',
              empathy: 'high',
            },
            emotion: {
              primary: 'skeptical',
              intensity: 0.7,
              triggers: ['doubt'],
            },
            conversationHistory: [],
            offering: {
              id: 'offer-1',
              name: 'Test Product',
              elevator_pitch: 'Great product',
              key_benefits: ['Fast', 'Reliable'],
              objection_handlers: {},
              qualification_questions: [],
              proof_points: [],
            },
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
      expect(typeof data.response).toBe('string');
    });

    it('should handle conversation history', async () => {
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Response with history context',
            },
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate-response',
          message: 'Tell me more',
          context: {
            toneProfile: {
              formality: 'neutral',
              sentiment: 'neutral',
              emotionalState: 'neutral',
              confidence: 0.7,
            },
            style: {
              tone: 'balanced',
              structure: 'moderate',
              vocabulary: 'standard',
              empathy: 'medium',
            },
            emotion: {
              primary: 'neutral',
              intensity: 0.5,
              triggers: [],
            },
            conversationHistory: [
              { role: 'user', content: 'What is this?' },
              { role: 'assistant', content: 'This is a product.' },
            ],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI API error')
      );

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
          message: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.fallback).toBe(true);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Security', () => {
    it('should never expose API key in response', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                formality: 'casual',
                sentiment: 'neutral',
                emotionalState: 'neutral',
                confidence: 0.8,
              }),
            },
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
          message: 'test',
        }),
      });

      const response = await POST(request);
      const responseText = await response.text();

      expect(responseText).not.toContain('sk-');
      expect(responseText).not.toContain(process.env.OPENAI_API_KEY || '');
    });

    it('should validate user owns the session', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Invalid session'),
      });

      const request = new NextRequest('http://localhost:3000/api/conversation-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze-tone',
          message: 'test',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });
});
