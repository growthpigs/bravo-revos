/**
 * DM Sequences API Tests
 *
 * Tests for the DM sequences CRUD endpoints:
 * - GET /api/dm-sequences - List all sequences
 * - POST /api/dm-sequences - Create a sequence
 * - GET /api/dm-sequences/[id] - Get specific sequence
 * - PUT /api/dm-sequences/[id] - Update a sequence
 * - DELETE /api/dm-sequences/[id] - Delete a sequence
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/dm-sequences/route';
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from '@/app/api/dm-sequences/[id]/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('DM Sequences API', () => {
  let mockSupabase: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockCampaign = {
    id: 'campaign-123',
    name: 'Test Campaign',
    client_id: 'client-123',
  };

  const mockSequence = {
    id: 'sequence-123',
    campaign_id: 'campaign-123',
    client_id: 'client-123',
    name: 'Test Sequence',
    description: 'Test description',
    status: 'active',
    step1_template: 'Hey {{first_name}}, here is your guide!',
    step1_delay_min: 2,
    step1_delay_max: 15,
    voice_cartridge_id: null,
    step2_auto_extract: true,
    step2_confirmation_template: 'Got it! Sending your lead magnet now...',
    step3_enabled: true,
    step3_delay: 5,
    step3_template: 'Here is your direct download link',
    step3_link_expiry: 24,
    sent_count: 0,
    replied_count: 0,
    email_captured_count: 0,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  const createMockRequest = (options: {
    method?: string;
    body?: any;
    searchParams?: Record<string, string>;
  } = {}) => {
    const url = new URL('http://localhost:3000/api/dm-sequences');
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

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/dm-sequences', () => {
    test('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return list of sequences', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [mockSequence],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });
      mockSelect.mockReturnValue({ order: mockOrder });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.count).toBe(1);
    });

    test('should filter by campaign_id if provided', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: [mockSequence],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        eq: mockEq,
      });

      const request = createMockRequest({
        searchParams: { campaign_id: 'campaign-123' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should return empty array if no sequences', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ order: mockOrder });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    test('should handle database error', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ order: mockOrder });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/dm-sequences', () => {
    const validCreatePayload = {
      campaign_id: 'campaign-123',
      name: 'New Sequence',
      step1_template: 'Hey {{first_name}}!',
      step1_delay_min: 2,
      step1_delay_max: 15,
    };

    test('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest({ body: validCreatePayload });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 400 if validation fails', async () => {
      const invalidPayload = {
        campaign_id: 'not-a-uuid',
        name: '',
      };

      const request = createMockRequest({ body: invalidPayload });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    test('should return 403 if campaign not found', async () => {
      // Use a valid UUID that doesn't exist in the mock
      const validPayloadWithMissingCampaign = {
        campaign_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'New Sequence',
        step1_template: 'Hey {{first_name}}!',
        step1_delay_min: 2,
        step1_delay_max: 15,
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const request = createMockRequest({ body: validPayloadWithMissingCampaign });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Campaign not found or access denied');
    });

    test('should create sequence successfully', async () => {
      // Use valid UUIDs
      const validPayload = {
        campaign_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'New Sequence',
        step1_template: 'Hey {{first_name}}!',
        step1_delay_min: 2,
        step1_delay_max: 15,
      };

      // Mock campaign check
      const mockCampaignSelect = jest.fn().mockReturnThis();
      const mockCampaignEq = jest.fn().mockReturnThis();
      const mockCampaignMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: validPayload.campaign_id },
        error: null,
      });

      // Mock sequence insert
      const mockInsert = jest.fn().mockReturnThis();
      const mockInsertSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockSequence, ...validPayload },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: mockCampaignSelect,
          };
        }
        if (table === 'dm_sequences') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      });

      mockCampaignSelect.mockReturnValue({ eq: mockCampaignEq });
      mockCampaignEq.mockReturnValue({ maybeSingle: mockCampaignMaybeSingle });

      mockInsert.mockReturnValue({ select: mockInsertSelect });
      mockInsertSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({ body: validPayload });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Sequence');
    });

    test('should return 400 if insert fails', async () => {
      // Use valid UUIDs
      const validPayload = {
        campaign_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'New Sequence',
        step1_template: 'Hey {{first_name}}!',
        step1_delay_min: 2,
        step1_delay_max: 15,
      };

      // Mock campaign check
      const mockCampaignSelect = jest.fn().mockReturnThis();
      const mockCampaignEq = jest.fn().mockReturnThis();
      const mockCampaignMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: validPayload.campaign_id },
        error: null,
      });

      // Mock sequence insert failure
      const mockInsert = jest.fn().mockReturnThis();
      const mockInsertSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return { select: mockCampaignSelect };
        }
        if (table === 'dm_sequences') {
          return { insert: mockInsert };
        }
        return {};
      });

      mockCampaignSelect.mockReturnValue({ eq: mockCampaignEq });
      mockCampaignEq.mockReturnValue({ maybeSingle: mockCampaignMaybeSingle });
      mockInsert.mockReturnValue({ select: mockInsertSelect });
      mockInsertSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({ body: validPayload });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Failed to create DM sequence');
    });
  });

  describe('GET /api/dm-sequences/[id]', () => {
    const params = { id: 'sequence-123' };

    test('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest();
      const response = await GET_BY_ID(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return sequence by id', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: mockSequence,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const request = createMockRequest();
      const response = await GET_BY_ID(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('sequence-123');
    });

    test('should return 404 if sequence not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const request = createMockRequest();
      const response = await GET_BY_ID(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('DM sequence not found');
    });
  });

  describe('PUT /api/dm-sequences/[id]', () => {
    const params = { id: 'sequence-123' };
    const updatePayload = {
      name: 'Updated Sequence',
      status: 'paused' as const,
    };

    test('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest({ body: updatePayload });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 400 if validation fails', async () => {
      const invalidPayload = {
        status: 'invalid-status',
      };

      const request = createMockRequest({ body: invalidPayload });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    test('should update sequence successfully', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockSequence, ...updatePayload },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({ body: updatePayload });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Sequence');
      expect(data.data.status).toBe('paused');
    });

    test('should return 404 if sequence not found on update', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({ body: updatePayload });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('DM sequence not found or access denied');
    });
  });

  describe('DELETE /api/dm-sequences/[id]', () => {
    const params = { id: 'sequence-123' };

    test('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest();
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should delete sequence successfully', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });
      mockDelete.mockReturnValue({ eq: mockEq });

      const request = createMockRequest();
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('DM sequence deleted successfully');
    });

    test('should return 400 if delete fails', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });
      mockDelete.mockReturnValue({ eq: mockEq });

      const request = createMockRequest();
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Failed to delete DM sequence');
    });
  });

  describe('Validation Edge Cases', () => {
    test('should validate step1_delay_min is at least 1', async () => {
      const invalidPayload = {
        campaign_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Test',
        step1_template: 'Hey!',
        step1_delay_min: 0, // Invalid - must be >= 1
        step1_delay_max: 10,
      };

      const request = createMockRequest({ body: invalidPayload });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    test('should validate name is not empty', async () => {
      const invalidPayload = {
        campaign_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: '',
        step1_template: 'Hey!',
      };

      const request = createMockRequest({ body: invalidPayload });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    test('should validate step1_template is required', async () => {
      const invalidPayload = {
        campaign_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Test Sequence',
        // Missing step1_template
      };

      const request = createMockRequest({ body: invalidPayload });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    test('should accept valid status values for update', async () => {
      const params = { id: 'sequence-123' };

      // Mock for update
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockSequence, status: 'archived' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({ body: { status: 'archived' } });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('archived');
    });
  });
});
