/**
 * Offerings API Tests
 *
 * Tests for the offerings CRUD endpoints:
 * - GET /api/offerings - List user's offerings
 * - POST /api/offerings - Create new offering
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/offerings/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Offerings API', () => {
  let mockSupabase: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockOffering = {
    id: 'offering-123',
    user_id: 'user-123',
    name: 'LinkedIn Growth Course',
    elevator_pitch: 'Grow your LinkedIn following by 10x in 30 days',
    key_benefits: ['More connections', 'More leads', 'More revenue'],
    objection_handlers: {
      'too expensive': 'Consider the ROI - one client pays for the course',
      'no time': 'Just 15 minutes per day is all you need',
    },
    qualification_questions: [
      'Do you have a LinkedIn profile?',
      'Are you B2B?',
    ],
    proof_points: ['500+ students', '4.9 rating', '30-day guarantee'],
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  const createMockRequest = (options: {
    method?: string;
    body?: any;
    searchParams?: Record<string, string>;
  } = {}) => {
    const url = new URL('http://localhost:3000/api/offerings');
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
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/offerings', () => {
    test('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return list of user offerings', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [mockOffering],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.offerings).toHaveLength(1);
      expect(data.offerings[0].name).toBe('LinkedIn Growth Course');
    });

    test('should apply limit parameter', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [mockOffering],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const request = createMockRequest({
        searchParams: { limit: '5' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    test('should ignore invalid limit parameter', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [mockOffering],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const request = createMockRequest({
        searchParams: { limit: 'invalid' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.offerings).toBeDefined();
    });

    test('should return empty array if no offerings', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.offerings).toHaveLength(0);
    });

    test('should return 500 on database error', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch offerings');
    });
  });

  describe('POST /api/offerings', () => {
    test('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } });

      const request = createMockRequest({
        body: { name: 'Test', elevator_pitch: 'Test pitch' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 400 if name is missing', async () => {
      const request = createMockRequest({
        body: { elevator_pitch: 'Test pitch' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required and must be a string');
    });

    test('should return 400 if name is not a string', async () => {
      const request = createMockRequest({
        body: { name: 123, elevator_pitch: 'Test pitch' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required and must be a string');
    });

    test('should return 400 if elevator_pitch is missing', async () => {
      const request = createMockRequest({
        body: { name: 'Test Offering' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Elevator pitch is required and must be a string');
    });

    test('should return 400 if elevator_pitch is not a string', async () => {
      const request = createMockRequest({
        body: { name: 'Test', elevator_pitch: 123 },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Elevator pitch is required and must be a string');
    });

    test('should create offering successfully with required fields only', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'new-offering-123',
          user_id: 'user-123',
          name: 'New Offering',
          elevator_pitch: 'A great offering',
          key_benefits: [],
          objection_handlers: {},
          qualification_questions: [],
          proof_points: [],
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({
        body: {
          name: 'New Offering',
          elevator_pitch: 'A great offering',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.offering.name).toBe('New Offering');
      expect(data.offering.elevator_pitch).toBe('A great offering');
    });

    test('should create offering with all optional fields', async () => {
      const fullOffering = {
        id: 'new-offering-123',
        user_id: 'user-123',
        name: 'Complete Offering',
        elevator_pitch: 'The complete package',
        key_benefits: ['Benefit 1', 'Benefit 2'],
        objection_handlers: { 'price': 'Value outweighs cost' },
        qualification_questions: ['Question 1?', 'Question 2?'],
        proof_points: ['Testimonial 1', 'Stat 1'],
      };

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: fullOffering,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({
        body: {
          name: 'Complete Offering',
          elevator_pitch: 'The complete package',
          key_benefits: ['Benefit 1', 'Benefit 2'],
          objection_handlers: { 'price': 'Value outweighs cost' },
          qualification_questions: ['Question 1?', 'Question 2?'],
          proof_points: ['Testimonial 1', 'Stat 1'],
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.offering.key_benefits).toHaveLength(2);
      expect(data.offering.qualification_questions).toHaveLength(2);
      expect(data.offering.proof_points).toHaveLength(2);
    });

    test('should return 500 on database insert error', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({
        body: {
          name: 'Test Offering',
          elevator_pitch: 'Test pitch',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create offering');
    });

    test('should use user id from authenticated session', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockOffering, user_id: 'user-123' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const request = createMockRequest({
        body: {
          name: 'Test Offering',
          elevator_pitch: 'Test pitch',
        },
      });
      await POST(request);

      // Verify the insert was called with user_id from session
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
        })
      );
    });
  });
});
