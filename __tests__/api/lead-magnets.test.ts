/**
 * Lead Magnets API Tests
 *
 * Tests for the lead magnets library CRUD endpoints:
 * - GET /api/lead-magnets - List active magnets with search/filter
 * - POST /api/lead-magnets - Create magnet (admin only)
 * - GET /api/lead-magnets/[id] - Get specific magnet
 * - PATCH /api/lead-magnets/[id] - Update magnet (admin only)
 * - DELETE /api/lead-magnets/[id] - Soft delete (admin only)
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/lead-magnets/route';
import {
  GET as GET_BY_ID,
  PATCH,
  DELETE,
} from '@/app/api/lead-magnets/[id]/route';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Mock both Supabase clients
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('Lead Magnets API', () => {
  let mockServerSupabase: any;
  let mockDirectSupabase: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
    client_id: 'client-123',
  };

  const mockMagnet = {
    id: 'magnet-123',
    title: 'Ultimate Guide to LinkedIn',
    description: 'Learn how to grow your network',
    url: 'https://example.com/guide.pdf',
    category: 'Social Media',
    client_id: 'client-123',
    is_active: true,
    download_count: 42,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  const createMockRequest = (options: {
    method?: string;
    body?: any;
    searchParams?: Record<string, string>;
  } = {}) => {
    const url = new URL('http://localhost:3000/api/lead-magnets');
    if (options.searchParams) {
      Object.entries(options.searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return {
      json: jest.fn().mockResolvedValue(options.body || {}),
      nextUrl: url,
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock for server client (used in [id] routes)
    mockServerSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: jest.fn(),
    };
    (createServerClient as jest.Mock).mockResolvedValue(mockServerSupabase);

    // Mock for direct client (used in main route)
    mockDirectSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: jest.fn(),
    };
    (createSupabaseClient as jest.Mock).mockReturnValue(mockDirectSupabase);
  });

  describe('GET /api/lead-magnets', () => {
    test('should return list of active magnets', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [mockMagnet],
        error: null,
      });

      mockDirectSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.count).toBe(1);
    });

    test('should filter by category', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [mockMagnet],
        error: null,
      });

      mockDirectSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      // First eq is for is_active, second should be for category
      mockEq.mockReturnValue({ order: mockOrder, eq: mockEq });
      mockOrder.mockReturnValue({ limit: mockLimit, eq: mockEq });
      mockLimit.mockReturnValue({ eq: mockEq });

      const request = createMockRequest({
        searchParams: { category: 'Social Media' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should filter by search term on title', async () => {
      const magnets = [
        { ...mockMagnet, title: 'LinkedIn Guide' },
        { ...mockMagnet, id: 'magnet-2', title: 'Facebook Tips' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: magnets,
        error: null,
      });

      mockDirectSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const request = createMockRequest({
        searchParams: { search: 'linkedin' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should only return LinkedIn result after client-side filter
      expect(data.data.every((m: any) => m.title.toLowerCase().includes('linkedin'))).toBe(true);
    });

    test('should handle database error', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockDirectSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Database error');
    });

    test('should return empty array when no magnets found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockDirectSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
      expect(data.count).toBe(0);
    });
  });

  describe('POST /api/lead-magnets', () => {
    test('should return 401 if not authenticated', async () => {
      mockDirectSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest({
        body: { title: 'Test', url: 'https://test.com' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 400 if title is missing', async () => {
      // Mock user fetch
      const mockUserSelect = jest.fn().mockReturnThis();
      const mockUserEq = jest.fn().mockReturnThis();
      const mockUserMaybeSingle = jest.fn().mockResolvedValue({
        data: mockAdminUser,
        error: null,
      });

      mockDirectSupabase.from.mockReturnValue({
        select: mockUserSelect,
      });
      mockUserSelect.mockReturnValue({ eq: mockUserEq });
      mockUserEq.mockReturnValue({ maybeSingle: mockUserMaybeSingle });

      const request = createMockRequest({
        body: { url: 'https://test.com' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title and URL are required');
    });

    test('should return 400 if url is missing', async () => {
      const mockUserSelect = jest.fn().mockReturnThis();
      const mockUserEq = jest.fn().mockReturnThis();
      const mockUserMaybeSingle = jest.fn().mockResolvedValue({
        data: mockAdminUser,
        error: null,
      });

      mockDirectSupabase.from.mockReturnValue({
        select: mockUserSelect,
      });
      mockUserSelect.mockReturnValue({ eq: mockUserEq });
      mockUserEq.mockReturnValue({ maybeSingle: mockUserMaybeSingle });

      const request = createMockRequest({
        body: { title: 'Test Guide' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title and URL are required');
    });

    test('should return 403 if user is not admin', async () => {
      const mockUserSelect = jest.fn().mockReturnThis();
      const mockUserEq = jest.fn().mockReturnThis();
      const mockUserMaybeSingle = jest.fn().mockResolvedValue({
        data: { ...mockUser, role: 'user', client_id: 'client-123' },
        error: null,
      });

      mockDirectSupabase.from.mockReturnValue({
        select: mockUserSelect,
      });
      mockUserSelect.mockReturnValue({ eq: mockUserEq });
      mockUserEq.mockReturnValue({ maybeSingle: mockUserMaybeSingle });

      const request = createMockRequest({
        body: { title: 'Test', url: 'https://test.com' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only admins can create library entries');
    });

    test('should create magnet successfully for admin', async () => {
      const newMagnet = {
        id: 'new-magnet-123',
        title: 'New Guide',
        description: 'A new guide',
        url: 'https://example.com/new.pdf',
        category: 'Marketing',
        client_id: 'client-123',
        is_active: true,
      };

      const mockUserSelect = jest.fn().mockReturnThis();
      const mockUserEq = jest.fn().mockReturnThis();
      const mockUserMaybeSingle = jest.fn().mockResolvedValue({
        data: mockAdminUser,
        error: null,
      });

      const mockInsert = jest.fn().mockReturnThis();
      const mockInsertSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: newMagnet,
        error: null,
      });

      let callCount = 0;
      mockDirectSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: get user
          return { select: mockUserSelect };
        }
        // Second call: insert
        return { insert: mockInsert };
      });

      mockUserSelect.mockReturnValue({ eq: mockUserEq });
      mockUserEq.mockReturnValue({ maybeSingle: mockUserMaybeSingle });
      mockInsert.mockReturnValue({ select: mockInsertSelect });
      mockInsertSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({
        body: {
          title: 'New Guide',
          description: 'A new guide',
          url: 'https://example.com/new.pdf',
          category: 'Marketing',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('New Guide');
    });
  });

  describe('GET /api/lead-magnets/[id]', () => {
    const params = { id: 'magnet-123' };

    test('should return magnet by id', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockMagnet,
        error: null,
      });

      mockServerSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      // Chain eq for id and is_active
      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });

      const request = createMockRequest();
      const response = await GET_BY_ID(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('magnet-123');
    });

    test('should return 404 if magnet not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockServerSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });

      const request = createMockRequest();
      const response = await GET_BY_ID(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Lead magnet not found');
    });
  });

  describe('PATCH /api/lead-magnets/[id]', () => {
    const params = { id: 'magnet-123' };

    test('should return 401 if not authenticated', async () => {
      mockServerSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest({ body: { title: 'Updated' } });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 403 if not admin', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { role: 'user' },
        error: null,
      });

      mockServerSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const request = createMockRequest({ body: { title: 'Updated' } });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only admins can update library entries');
    });

    test('should update magnet successfully for admin', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockUpdateEq = jest.fn().mockReturnThis();
      const mockUpdateSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockMagnet, title: 'Updated Title' },
        error: null,
      });

      let callCount = 0;
      mockServerSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect };
        }
        return { update: mockUpdate };
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });
      mockUpdateEq.mockReturnValue({ select: mockUpdateSelect });
      mockUpdateSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({ body: { title: 'Updated Title' } });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/lead-magnets/[id]', () => {
    const params = { id: 'magnet-123' };

    test('should return 401 if not authenticated', async () => {
      mockServerSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest();
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 403 if not admin', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { role: 'user' },
        error: null,
      });

      mockServerSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const request = createMockRequest();
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only admins can delete library entries');
    });

    test('should soft delete magnet successfully for admin', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockUpdateEq = jest.fn().mockResolvedValue({
        error: null,
      });

      let callCount = 0;
      mockServerSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect };
        }
        return { update: mockUpdate };
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const request = createMockRequest();
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Lead magnet deleted');
    });

    test('should return 400 if delete fails', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockUpdateEq = jest.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      let callCount = 0;
      mockServerSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect };
        }
        return { update: mockUpdate };
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const request = createMockRequest();
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Delete failed');
    });
  });
});
