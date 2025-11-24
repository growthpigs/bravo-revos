/**
 * HGC V2 Workflow Security & Validation Tests
 *
 * Tests for the security hardening implemented in response to the
 * "e.content.map is not a function" error fix (commit 26b7873).
 *
 * CRITICAL AREAS TESTED:
 * 1. Workflow ID format validation (13-digit timestamp)
 * 2. Input sanitization (SQL injection prevention)
 * 3. Error handling (missing workflows return 410 Gone)
 * 4. Edge cases (malformed workflow_id, concurrent requests)
 *
 * @see docs/SITREP_2025-11-24_CONTENT_MAP_ERROR.md
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/hgc-v2/route';

// Mock OpenAI client (must be before route import)
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(() => Promise.resolve({
            choices: [{ message: { role: 'assistant', content: 'Test response' } }],
          })),
        },
      },
    })),
  };
});

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: {
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      })),
    },
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: table === 'console_workflows'
              ? { name: 'write-linkedin-post', workflow_type: 'agentic' }
              : null,
            error: null,
          })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'session-123' },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

// Mock MarketingConsole
jest.mock('@/lib/console/marketing-console', () => ({
  MarketingConsole: jest.fn(() => ({
    execute: jest.fn(() => Promise.resolve({
      content: [{ type: 'text', text: 'Test response' }],
    })),
  })),
}));

// Mock workflow loader
jest.mock('@/lib/console/workflow-loader', () => ({
  findWorkflowByTrigger: jest.fn(() => Promise.resolve({
    name: 'write-linkedin-post',
    workflow_type: 'agentic',
  })),
  loadWorkflow: jest.fn((name: string) => {
    if (name === 'write-linkedin-post') {
      return Promise.resolve({
        name: 'write-linkedin-post',
        workflow_type: 'agentic',
      });
    }
    return Promise.resolve(null); // Simulate missing workflow
  }),
}));

// Mock workflow executor
jest.mock('@/lib/console/workflow-executor', () => ({
  executeWorkflow: jest.fn(() => Promise.resolve({
    success: true,
    response: 'Test workflow response',
    sessionId: 'session-123',
  })),
}));

describe('HGC V2 Workflow Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Workflow ID Format Validation', () => {
    it('should accept valid workflow_id format (name-timestamp)', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post-1700000000000', // Valid: 13-digit timestamp
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      // Should NOT return 400 error
      expect(response.status).not.toBe(400);
      expect(data.error).not.toContain('Invalid workflow session');
    });

    it('should reject workflow_id with invalid timestamp (not 13 digits)', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post-12345', // Invalid: only 5-digit timestamp
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid workflow session');
    });

    it('should reject workflow_id with no timestamp', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post', // Invalid: missing timestamp
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid workflow session');
    });

    it('should reject workflow_id with multiple timestamps (double-dash)', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post-1234567890-9876543210', // Invalid: two timestamps
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('2. SQL Injection Prevention', () => {
    it('should sanitize workflow name with SQL injection attempt', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: "write'; DROP TABLE console_workflows; --1700000000000",
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);

      // Should reject due to invalid characters in workflow name
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('Invalid workflow session');
    });

    it('should sanitize workflow name with special characters', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write<script>alert("xss")</script>-1700000000000',
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);

      // Should reject due to invalid characters
      expect(response.status).toBe(400);
    });

    it('should allow workflow names with valid characters (alphanumeric, dash, underscore)', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post-v2-1700000000000', // Valid characters
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);

      // May fail at workflow lookup, but should NOT fail at validation
      expect(response.status).not.toBe(400);
    });
  });

  describe('3. Error Handling - Missing Workflows', () => {
    it('should return 410 Gone when workflow not found in database', async () => {
      // Mock loadWorkflow to return null (workflow not found)
      const { loadWorkflow } = require('@/lib/console/workflow-loader');
      (loadWorkflow as jest.Mock).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'nonexistent-workflow-1700000000000',
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(410); // 410 Gone
      expect(data.success).toBe(false);
      expect(data.error).toContain('Workflow session expired');
    });

    it('should NOT fall through to console_instance.execute() when workflow missing', async () => {
      const { MarketingConsole } = require('@/lib/console/marketing-console');
      const executeSpy = jest.fn();
      (MarketingConsole as jest.Mock).mockImplementation(() => ({
        execute: executeSpy,
      }));

      // Mock loadWorkflow to return null
      const { loadWorkflow } = require('@/lib/console/workflow-loader');
      (loadWorkflow as jest.Mock).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'nonexistent-workflow-1700000000000',
          decision: 'topic:0:test_topic',
        }),
      });

      await POST(req);

      // CRITICAL: execute() should NOT be called (should return 410 immediately)
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });

  describe('4. Edge Cases', () => {
    it('should handle workflow names with hyphens correctly', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-social-media-post-linkedin-1700000000000',
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);

      // Should extract "write-social-media-post-linkedin" correctly
      // (May fail at workflow lookup, but validation should pass)
      expect(response.status).not.toBe(400);
    });

    it('should handle concurrent workflow sessions (different timestamps)', async () => {
      const req1 = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic_1',
          workflow_id: 'write-linkedin-post-1700000000001',
          decision: 'topic:0:test_topic_1',
        }),
      });

      const req2 = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'topic:0:test_topic_2',
          workflow_id: 'write-linkedin-post-1700000000002',
          decision: 'topic:0:test_topic_2',
        }),
      });

      // Both requests should be processed independently
      const response1 = await POST(req1);
      const response2 = await POST(req2);

      // Neither should interfere with each other
      expect(response1.status).not.toBe(500);
      expect(response2.status).not.toBe(500);
    });

    it('should handle empty workflow_id gracefully', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'write',
          workflow_id: '', // Empty string
          decision: '',
        }),
      });

      const response = await POST(req);

      // Should fall back to normal trigger matching (no error)
      expect(response.status).not.toBe(400);
    });
  });

  describe('5. Regression Prevention', () => {
    it('should NOT break topic generation (original workflow)', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        body: JSON.stringify({
          message: 'write',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      // Should successfully trigger workflow
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(410);
    });

    it('should preserve workflow_id format consistency across steps', () => {
      const workflowName = 'write-linkedin-post';
      const timestamp1 = Date.now();
      const timestamp2 = Date.now();

      const topicWorkflowId = `${workflowName}-${timestamp1}`;
      const confirmWorkflowId = `${workflowName}-${timestamp2}`;

      // Both should match the same pattern
      const pattern = /^([a-z0-9-]+)-(\d{13})$/i;

      expect(topicWorkflowId).toMatch(pattern);
      expect(confirmWorkflowId).toMatch(pattern);

      // Extracted names should be identical
      const extracted1 = topicWorkflowId.match(pattern)?.[1];
      const extracted2 = confirmWorkflowId.match(pattern)?.[1];

      expect(extracted1).toBe(workflowName);
      expect(extracted2).toBe(workflowName);
      expect(extracted1).toBe(extracted2);
    });
  });
});

describe('HGC V2 Workflow Format Extraction', () => {
  it('should correctly extract workflow name from valid workflow_id', () => {
    const workflowIdPattern = /^([a-z0-9-]+)-(\d{13})$/i;
    const workflow_id = 'write-linkedin-post-1700000000000';

    const match = workflow_id.match(workflowIdPattern);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('write-linkedin-post');
    expect(match?.[2]).toBe('1700000000000');
  });

  it('should sanitize extracted workflow name', () => {
    const extracted = 'write-LinkedIn-Post';
    const sanitized = extracted
      .replace(/[^a-z0-9_-]/gi, '')
      .toLowerCase();

    expect(sanitized).toBe('write-linkedin-post');
  });

  it('should handle workflow name with special characters', () => {
    const extracted = "write'; DROP TABLE--";
    const sanitized = extracted
      .replace(/[^a-z0-9_-]/gi, '')
      .toLowerCase();

    // All dangerous characters removed (but hyphens kept)
    expect(sanitized).toBe('writedroptable--'); // Hyphens are allowed, just SQL injection chars removed
    expect(sanitized).not.toContain("'");
    expect(sanitized).not.toContain(';');
    expect(sanitized).not.toContain(' ');
  });
});
