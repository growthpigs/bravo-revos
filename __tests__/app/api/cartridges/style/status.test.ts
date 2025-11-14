import { GET } from '@/app/api/cartridges/style/[id]/status/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('@/lib/supabase/server');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('GET /api/cartridges/style/[id]/status', () => {
  const mockUserId = '00000000-0000-0000-0000-000000000001';
  const mockStyleId = '11111111-1111-1111-1111-111111111111';

  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn()
    };

    mockCreateClient.mockResolvedValue(mockSupabase as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/style/123/status', {
      method: 'GET'
    });

    const response = await GET(request, { params: { id: mockStyleId } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if style cartridge not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockFrom = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('Not found')
    });

    mockSupabase.from = mockFrom;
    mockFrom.mockReturnValue({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/style/123/status', {
      method: 'GET'
    });

    const response = await GET(request, { params: { id: mockStyleId } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Style guide not found');
  });

  it('should return status for pending cartridge', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockStyleCartridge = {
      id: mockStyleId,
      analysis_status: 'pending',
      last_analyzed_at: null
    };

    const mockFrom = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockStyleCartridge,
      error: null
    });

    mockSupabase.from = mockFrom;
    mockFrom.mockReturnValue({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/style/123/status', {
      method: 'GET'
    });

    const response = await GET(request, { params: { id: mockStyleId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('pending');
    expect(data.lastProcessedAt).toBeNull();
    expect(data.progress).toBeNull();
    expect(data.error).toBeNull();
  });

  it('should return status for processing (analyzing) cartridge', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockStyleCartridge = {
      id: mockStyleId,
      analysis_status: 'analyzing',
      last_analyzed_at: null
    };

    const mockFrom = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockStyleCartridge,
      error: null
    });

    mockSupabase.from = mockFrom;
    mockFrom.mockReturnValue({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/style/123/status', {
      method: 'GET'
    });

    const response = await GET(request, { params: { id: mockStyleId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('processing');
    expect(data.lastProcessedAt).toBeNull();
    expect(data.progress).toBeNull();
    expect(data.error).toBeNull();
  });

  it('should return status for completed cartridge', async () => {
    const completedAt = '2024-01-15T10:00:00Z';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockStyleCartridge = {
      id: mockStyleId,
      analysis_status: 'completed',
      last_analyzed_at: completedAt
    };

    const mockFrom = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockStyleCartridge,
      error: null
    });

    mockSupabase.from = mockFrom;
    mockFrom.mockReturnValue({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/style/123/status', {
      method: 'GET'
    });

    const response = await GET(request, { params: { id: mockStyleId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('completed');
    expect(data.lastProcessedAt).toBe(completedAt);
    expect(data.progress).toBeNull();
    expect(data.error).toBeNull();
  });

  it('should return status for failed cartridge', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockStyleCartridge = {
      id: mockStyleId,
      analysis_status: 'failed',
      last_analyzed_at: '2024-01-15T10:00:00Z'
    };

    const mockFrom = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockStyleCartridge,
      error: null
    });

    mockSupabase.from = mockFrom;
    mockFrom.mockReturnValue({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/style/123/status', {
      method: 'GET'
    });

    const response = await GET(request, { params: { id: mockStyleId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('failed');
    expect(data.error).toBe('Style analysis failed');
  });

  it('should not return cartridge belonging to different user', async () => {
    const differentUserId = '99999999-9999-9999-9999-999999999999';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: differentUserId } },
      error: null
    });

    const mockFrom = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('Not found')
    });

    mockSupabase.from = mockFrom;
    mockFrom.mockReturnValue({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/style/123/status', {
      method: 'GET'
    });

    const response = await GET(request, { params: { id: mockStyleId } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Style guide not found');
  });

  it('should handle database errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockFrom = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('Database connection error')
    });

    mockSupabase.from = mockFrom;
    mockFrom.mockReturnValue({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/style/123/status', {
      method: 'GET'
    });

    const response = await GET(request, { params: { id: mockStyleId } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Style guide not found');
  });
});
