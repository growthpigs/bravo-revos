/**
 * Tests for db-helpers.ts utilities
 *
 * Note: These tests use mocked Supabase clients since we can't
 * connect to a real database in unit tests. Integration tests
 * would test against a real database.
 */

import {
  upsertLead,
  genericUpsert,
  safeFetchSingle,
  safeFetchMany,
  type LeadUpsertData,
} from '@/lib/utils/db-helpers';

// Mock Supabase client type
type MockSupabaseClient = {
  from: jest.Mock;
};

// Helper to create mock Supabase client
function createMockSupabase(): MockSupabaseClient {
  return {
    from: jest.fn(),
  };
}

describe('upsertLead', () => {
  const mockLeadData: LeadUpsertData = {
    campaign_id: 'campaign-123',
    linkedin_id: 'johndoe-123', // Required unique identifier
    linkedin_url: 'https://linkedin.com/in/johndoe', // Optional URL
    name: 'John Doe',
    status: 'dm_pending',
    source: 'comment_trigger',
  };

  it('should return success for successful upsert (insert)', async () => {
    const now = new Date().toISOString();
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'lead-123', created_at: now, updated_at: now },
            error: null,
          }),
        }),
      }),
    });

    const result = await upsertLead(mockSupabase as any, mockLeadData);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('lead-123');
    expect(result.wasInsert).toBe(true);
  });

  it('should return success for successful upsert (update)', async () => {
    const createdAt = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
    const updatedAt = new Date().toISOString();
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'lead-123', created_at: createdAt, updated_at: updatedAt },
            error: null,
          }),
        }),
      }),
    });

    const result = await upsertLead(mockSupabase as any, mockLeadData);

    expect(result.success).toBe(true);
    expect(result.wasInsert).toBe(false); // Existing record was updated
  });

  it('should return error for database error', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Unique constraint violation' },
          }),
        }),
      }),
    });

    const result = await upsertLead(mockSupabase as any, mockLeadData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unique constraint violation');
    expect(result.wasInsert).toBe(false);
  });

  it('should return error for thrown exception', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockImplementation(() => {
      throw new Error('Connection failed');
    });

    const result = await upsertLead(mockSupabase as any, mockLeadData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection failed');
    expect(result.wasInsert).toBe(false);
  });

  it('should use default values when optional fields not provided', async () => {
    const now = new Date().toISOString();
    const mockSupabase = createMockSupabase();
    let capturedData: any;

    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockImplementation((data) => {
        capturedData = data;
        return {
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lead-123', created_at: now, updated_at: now },
              error: null,
            }),
          }),
        };
      }),
    });

    await upsertLead(mockSupabase as any, {
      campaign_id: 'campaign-123',
      linkedin_id: 'test-user-123', // Required
      name: 'Test User',
    });

    expect(capturedData.status).toBe('comment_detected');
    expect(capturedData.source).toBe('comment');
    expect(capturedData.custom_fields).toEqual({});
  });
});

describe('genericUpsert', () => {
  it('should return success for successful upsert', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'record-123' },
            error: null,
          }),
        }),
      }),
    });

    const result = await genericUpsert(
      mockSupabase as any,
      'test_table',
      { name: 'test' },
      'name'
    );

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('record-123');
  });

  it('should return error for database error', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Table not found' },
          }),
        }),
      }),
    });

    const result = await genericUpsert(
      mockSupabase as any,
      'nonexistent_table',
      { name: 'test' },
      'name'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Table not found');
  });
});

describe('safeFetchSingle', () => {
  it('should return data for successful fetch', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: '123', name: 'Test' },
            error: null,
          }),
        }),
      }),
    });

    const result = await safeFetchSingle<{ id: string; name: string }>(
      mockSupabase as any,
      'users',
      'id',
      '123'
    );

    expect(result.error).toBeNull();
    expect(result.data?.name).toBe('Test');
  });

  it('should return null for non-existent record', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    const result = await safeFetchSingle(
      mockSupabase as any,
      'users',
      'id',
      'nonexistent'
    );

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('should return error for database error', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Permission denied' },
          }),
        }),
      }),
    });

    const result = await safeFetchSingle(
      mockSupabase as any,
      'users',
      'id',
      '123'
    );

    expect(result.error).toBe('Permission denied');
    expect(result.data).toBeNull();
  });

  it('should handle thrown exceptions', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockImplementation(() => {
      throw new Error('Network error');
    });

    const result = await safeFetchSingle(
      mockSupabase as any,
      'users',
      'id',
      '123'
    );

    expect(result.error).toBe('Network error');
    expect(result.data).toBeNull();
  });
});

describe('safeFetchMany', () => {
  it('should return array for successful fetch', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: '1', name: 'Test 1' },
            { id: '2', name: 'Test 2' },
          ],
          error: null,
        }),
      }),
    });

    const result = await safeFetchMany<{ id: string; name: string }>(
      mockSupabase as any,
      'users',
      'team_id',
      'team-123'
    );

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe('Test 1');
  });

  it('should return empty array for no results', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await safeFetchMany(
      mockSupabase as any,
      'users',
      'team_id',
      'empty-team'
    );

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('should apply limit when provided', async () => {
    const mockSupabase = createMockSupabase();
    const limitMock = jest.fn().mockResolvedValue({
      data: [{ id: '1' }],
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: limitMock,
        }),
      }),
    });

    await safeFetchMany(
      mockSupabase as any,
      'users',
      'team_id',
      'team-123',
      '*',
      10
    );

    expect(limitMock).toHaveBeenCalledWith(10);
  });

  it('should return empty array on error', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        }),
      }),
    });

    const result = await safeFetchMany(
      mockSupabase as any,
      'users',
      'team_id',
      'team-123'
    );

    expect(result.error).toBe('Query failed');
    expect(result.data).toEqual([]);
  });

  it('should return empty array for null data', async () => {
    const mockSupabase = createMockSupabase();

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    const result = await safeFetchMany(
      mockSupabase as any,
      'users',
      'team_id',
      'team-123'
    );

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});
