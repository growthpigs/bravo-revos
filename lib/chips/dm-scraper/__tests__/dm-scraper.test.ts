/**
 * DMScraperChip Integration Tests
 *
 * Tests the complete email extraction workflow with mock data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DMScraperChip } from '../index';
import { EmailExtractor } from '../email-extractor';
import * as unipileClient from '@/lib/unipile-client';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        is: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
}));

// Mock unipile client
vi.mock('@/lib/unipile-client', () => ({
  getDirectMessages: vi.fn(),
}));

describe('EmailExtractor', () => {
  let extractor: EmailExtractor;

  beforeEach(() => {
    extractor = new EmailExtractor();
  });

  it('should extract standard email format', () => {
    const text = 'Sure! My email is john.doe@example.com';
    const results = extractor.extract(text);

    expect(results).toHaveLength(1);
    expect(results[0].email).toBe('john.doe@example.com');
    expect(results[0].confidence).toBeGreaterThan(0.9);
  });

  it('should extract obfuscated email with [at] and [dot]', () => {
    const text = 'Contact me at john.doe[at]example[dot]com';
    const results = extractor.extract(text);

    expect(results).toHaveLength(1);
    expect(results[0].email).toBe('john.doe@example.com');
    expect(results[0].confidence).toBeGreaterThan(0.7);
  });

  it('should extract obfuscated email with "at" and "dot" words', () => {
    const text = 'My email is john.doe at example dot com';
    const results = extractor.extract(text);

    expect(results).toHaveLength(1);
    expect(results[0].email).toBe('john.doe@example.com');
    expect(results[0].confidence).toBeGreaterThan(0.7);
  });

  it('should boost confidence for contextual keywords', () => {
    const textWithContext = 'My email address is john@example.com';
    const textWithoutContext = 'john@example.com';

    const resultsWithContext = extractor.extract(textWithContext);
    const resultsWithoutContext = extractor.extract(textWithoutContext);

    expect(resultsWithContext[0].confidence).toBeGreaterThan(
      resultsWithoutContext[0].confidence
    );
  });

  it('should lower confidence for negative keywords', () => {
    const text = "This is not my email: fake@example.com - don't use it";
    const results = extractor.extract(text);

    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBeLessThan(0.7);
  });

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      'not-an-email',
      '@example.com',
      'john@',
      'john..doe@example.com',
      'john@example',
    ];

    for (const invalid of invalidEmails) {
      const results = extractor.extract(invalid);
      expect(results).toHaveLength(0);
    }
  });

  it('should deduplicate emails and keep highest confidence', () => {
    const messages = [
      { text: 'My email is john@example.com', id: '1' },
      { text: 'Contact me at john@example.com', id: '2' }, // Same email, better context
    ];

    const results = extractor.extractFromMessages(messages);

    expect(results).toHaveLength(1);
    expect(results[0].email).toBe('john@example.com');
    // Should keep the one with "contact" keyword (higher confidence)
    expect(results[0].confidence).toBeGreaterThan(0.9);
  });

  it('should return emails sorted by confidence', () => {
    const text = `
      Email me at john@example.com
      Or try jane@example.com
      Contact sarah@example.com
    `;

    const results = extractor.extract(text);

    expect(results.length).toBeGreaterThan(1);

    // Verify sorted descending by confidence
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence);
    }
  });

  it('should include source and context in results', () => {
    const text = 'Please email me at john.doe@example.com for more info';
    const results = extractor.extract(text);

    expect(results[0]).toHaveProperty('source');
    expect(results[0]).toHaveProperty('context');
    expect(results[0].context).toContain('john.doe@example.com');
  });

  it('should handle multiple emails in one text', () => {
    const text = 'Email john@example.com or jane@example.com';
    const results = extractor.extract(text);

    expect(results).toHaveLength(2);
    expect(results.map(r => r.email)).toContain('john@example.com');
    expect(results.map(r => r.email)).toContain('jane@example.com');
  });

  it('should handle hasEmail helper', () => {
    expect(extractor.hasEmail('Contact me at john@example.com')).toBe(true);
    expect(extractor.hasEmail('No email here')).toBe(false);
  });

  it('should handle getBestEmail helper', () => {
    const text = 'Email john@example.com or jane@example.com';
    const best = extractor.getBestEmail(text);

    expect(best).not.toBeNull();
    expect(best?.email).toBeTruthy();
    expect(best?.confidence).toBeGreaterThan(0);
  });
});

describe('DMScraperChip', () => {
  let chip: DMScraperChip;

  beforeEach(() => {
    chip = new DMScraperChip();
    vi.clearAllMocks();
  });

  it('should have correct tool definition', () => {
    const tool = chip.getTool();

    expect(tool.type).toBe('function');
    expect(tool.function.name).toBe('dm-scraper');
    expect(tool.function.parameters.required).toContain('accountId');
  });

  it('should execute successfully with no leads', async () => {
    // Mock empty leads query
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          is: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    };

    chip['supabase'] = mockSupabase as any;

    const result = await chip.execute({
      accountId: 'test-account-123',
    });

    expect(result.success).toBe(true);
    expect(result.emailsFound).toBe(0);
    expect(result.leadsUpdated).toBe(0);
  });

  it('should extract email from DM and update lead', async () => {
    // Mock leads query
    const mockLeads = [
      {
        id: 'lead-123',
        linkedin_profile_id: 'user-456',
        campaign_id: 'campaign-789',
        last_dm_checked: null,
      },
    ];

    // Mock DM messages
    const mockMessages = [
      {
        id: 'msg-1',
        text: 'Sure! My email is john.doe@example.com',
        created_at: new Date().toISOString(),
        direction: 'inbound' as const,
        author: {
          id: 'user-456',
          name: 'John Doe',
        },
      },
    ];

    vi.mocked(unipileClient.getDirectMessages).mockResolvedValue(mockMessages);

    let updateCalled = false;
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'leads') {
          return {
            select: vi.fn(() => ({
              is: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: mockLeads, error: null })),
              })),
            })),
            update: vi.fn(() => {
              updateCalled = true;
              return {
                eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
              };
            }),
          };
        }
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        };
      }),
    };

    chip['supabase'] = mockSupabase as any;

    const result = await chip.execute({
      accountId: 'test-account-123',
    });

    expect(result.success).toBe(true);
    expect(result.emailsFound).toBe(1);
    expect(result.leadsUpdated).toBe(1);
    expect(updateCalled).toBe(true);
  });

  it('should filter emails by minimum confidence', async () => {
    const mockLeads = [
      {
        id: 'lead-123',
        linkedin_profile_id: 'user-456',
        campaign_id: 'campaign-789',
        last_dm_checked: null,
      },
    ];

    // DM with low confidence email (negative context)
    const mockMessages = [
      {
        id: 'msg-1',
        text: "Don't use this fake email: spam@example.com",
        created_at: new Date().toISOString(),
        direction: 'inbound' as const,
        author: {
          id: 'user-456',
          name: 'John Doe',
        },
      },
    ];

    vi.mocked(unipileClient.getDirectMessages).mockResolvedValue(mockMessages);

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          is: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockLeads, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    };

    chip['supabase'] = mockSupabase as any;

    const result = await chip.execute({
      accountId: 'test-account-123',
      minConfidence: 0.7, // Require high confidence
    });

    expect(result.success).toBe(true);
    expect(result.emailsFound).toBe(0); // Low confidence email filtered out
    expect(result.leadsUpdated).toBe(0);
  });

  it('should handle webhook delivery when configured', async () => {
    const mockLeads = [
      {
        id: 'lead-123',
        linkedin_profile_id: 'user-456',
        campaign_id: 'campaign-789',
        last_dm_checked: null,
      },
    ];

    const mockMessages = [
      {
        id: 'msg-1',
        text: 'My email is john@example.com',
        created_at: new Date().toISOString(),
        direction: 'inbound' as const,
        author: {
          id: 'user-456',
          name: 'John Doe',
        },
      },
    ];

    vi.mocked(unipileClient.getDirectMessages).mockResolvedValue(mockMessages);

    // Mock fetch for webhook
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
      } as Response)
    );

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          is: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockLeads, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    };

    chip['supabase'] = mockSupabase as any;

    const result = await chip.execute({
      accountId: 'test-account-123',
      webhookUrl: 'https://example.com/webhook',
      webhookSecret: 'test-secret',
    });

    expect(result.success).toBe(true);
    expect(result.webhooksDelivered).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Webhook-Signature': expect.any(String),
        }),
      })
    );
  });
});
