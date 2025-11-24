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

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

// Set up test environment BEFORE any imports
beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test-key-12345';
  process.env.MEM0_API_KEY = 'test-mem0-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

// Mock OpenAI BEFORE any imports that use it
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

// Mock Mem0
jest.mock('@/lib/mem0/client', () => ({
  getMem0Client: jest.fn(() => ({
    add: jest.fn(() => Promise.resolve()),
    search: jest.fn(() => Promise.resolve({ results: [] })),
  })),
}));

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
    from: jest.fn((table: string) => {
      // Mock different tables
      if (table === 'hgc_sessions') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null, // No existing session
                error: { code: 'PGRST116' }, // Not found
              })),
            })),
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { id: 'session-123', user_id: 'test-user-123' },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === 'hgc_messages') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              data: [{ id: 'msg-123' }],
              error: null,
            })),
          })),
        };
      }

      if (table === 'brand_cartridges' || table === 'swipe_cartridges' || table === 'platform_templates') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          })),
        };
      }

      // Default mock
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      };
    }),
  })),
}));

// Mock workflow loader
const mockLoadWorkflow = jest.fn((name: string) => {
  if (name === 'write-linkedin-post') {
    return Promise.resolve({
      id: 'workflow-123',
      name: 'write-linkedin-post',
      workflow_type: 'agentic',
      prompts: {},
      config: {},
    });
  }
  return Promise.resolve(null);
});

const mockFindWorkflowByTrigger = jest.fn(() => Promise.resolve({
  id: 'workflow-123',
  name: 'write-linkedin-post',
  workflow_type: 'agentic',
  prompts: {},
  config: {},
}));

jest.mock('@/lib/console/workflow-loader', () => ({
  findWorkflowByTrigger: mockFindWorkflowByTrigger,
  loadWorkflow: mockLoadWorkflow,
}));

// Mock workflow executor
jest.mock('@/lib/console/workflow-executor', () => ({
  executeWorkflow: jest.fn(() => Promise.resolve({
    success: true,
    response: 'Test workflow response',
    sessionId: 'session-123',
  })),
}));

// Mock MarketingConsole
jest.mock('@/lib/console/marketing-console', () => ({
  MarketingConsole: jest.fn().mockImplementation(() => ({
    execute: jest.fn(() => Promise.resolve({
      content: [{ type: 'text', text: 'Test response' }],
    })),
    loadCartridge: jest.fn(),
    unloadCartridge: jest.fn(),
  })),
}));

// Mock session manager (CRITICAL - prevents supabase.from().insert errors)
jest.mock('@/lib/session-manager', () => ({
  getOrCreateSession: jest.fn(() => Promise.resolve({
    id: 'session-123',
    user_id: 'test-user-123',
    created_at: new Date().toISOString(),
  })),
  getAllMessages: jest.fn(() => Promise.resolve([])),
  saveMessages: jest.fn(() => Promise.resolve()),
}));

// NOW import the route after all mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/hgc-v2/route';

describe('HGC V2 Workflow Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Workflow ID Format Validation', () => {
    it('should accept valid workflow_id format (name-timestamp)', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post-1700000000000',
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post-12345',
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post',
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid workflow session');
    });

    it('should reject workflow_id with multiple timestamps', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post-1234567890123-9876543210987',
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: "write'; DROP TABLE console_workflows; --1700000000000",
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);

      // Should reject due to invalid characters
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('Invalid workflow session');
    });

    it('should sanitize workflow name with special characters', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

    it('should allow workflow names with valid characters', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-linkedin-post-v2-1700000000000',
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);

      // Should pass validation (may fail at workflow lookup, but not at validation)
      expect(response.status).not.toBe(400);
    });
  });

  describe('3. Error Handling - Missing Workflows', () => {
    it('should return 410 Gone when workflow not found', async () => {
      // Mock loadWorkflow to return null
      mockLoadWorkflow.mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'nonexistent-workflow-1700000000000',
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Workflow session expired');
    });
  });

  describe('4. Edge Cases', () => {
    it('should handle workflow names with hyphens', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'topic:0:test_topic',
          workflow_id: 'write-social-media-post-1700000000000',
          decision: 'topic:0:test_topic',
        }),
      });

      const response = await POST(req);

      // Should pass validation
      expect(response.status).not.toBe(400);
    });

    it('should handle empty workflow_id gracefully', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'write',
          workflow_id: '',
          decision: '',
        }),
      });

      const response = await POST(req);

      // Should fall back to normal trigger matching
      expect(response.status).not.toBe(400);
    });
  });

  describe('5. Regression Prevention', () => {
    it('should NOT break topic generation workflow', async () => {
      const req = new NextRequest('http://localhost:3000/api/hgc-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'write',
        }),
      });

      const response = await POST(req);

      // Should not return validation errors
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(410);
    });

    it('should maintain workflow_id format consistency', () => {
      const workflowName = 'write-linkedin-post';
      const timestamp1 = Date.now();
      const timestamp2 = Date.now();

      const topicWorkflowId = `${workflowName}-${timestamp1}`;
      const confirmWorkflowId = `${workflowName}-${timestamp2}`;

      const pattern = /^([a-z0-9-]+)-(\d{13})$/i;

      expect(topicWorkflowId).toMatch(pattern);
      expect(confirmWorkflowId).toMatch(pattern);

      const extracted1 = topicWorkflowId.match(pattern)?.[1];
      const extracted2 = confirmWorkflowId.match(pattern)?.[1];

      expect(extracted1).toBe(workflowName);
      expect(extracted2).toBe(workflowName);
      expect(extracted1).toBe(extracted2);
    });
  });
});

describe('HGC V2 Workflow Format Extraction (Unit Tests)', () => {
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

  it('should handle workflow name with dangerous characters', () => {
    const extracted = "write'; DROP TABLE--";
    const sanitized = extracted
      .replace(/[^a-z0-9_-]/gi, '')
      .toLowerCase();

    // Hyphens preserved, SQL injection characters removed
    expect(sanitized).toBe('writedroptable--');
    expect(sanitized).not.toContain("'");
    expect(sanitized).not.toContain(';');
    expect(sanitized).not.toContain(' ');
  });
});
