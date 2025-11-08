/**
 * Cartridges API POST Tests - Insert-Select-RLS Bug Fix Validation
 *
 * Tests the fix for race condition bug where insert().select().single()
 * caused RLS filtering on SELECT to fail even though INSERT succeeded.
 *
 * Fix: Removed .select() from INSERT, return success immediately
 */

// Mock environment
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Import POST handler
import { POST } from '@/app/api/cartridges/route';

// Mock Next.js Request
class MockRequest {
  constructor(public url: string, public options: any = {}) {}
  async json() {
    return this.options.body ? JSON.parse(this.options.body) : {};
  }
}

describe('POST /api/cartridges - Insert-Select-RLS Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    test('returns 401 when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', tier: 'user' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('User Cartridge Creation (tier=user) - CRITICAL BUG FIX', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('✅ SECURITY FIX: Forces user_id from auth, NOT request body', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const requestBody = {
        name: 'My Voice Cartridge',
        description: 'Personal voice settings',
        tier: 'user',
        user_id: 'MALICIOUS_USER_ID', // Attacker tries to set different user_id
        voice_params: {
          tone: 'professional',
          style: 'conversational',
          personality: 'friendly',
          vocabulary: 'business',
        },
      };

      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // ✅ VERIFY: API forces user_id from auth, ignoring malicious request
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: mockUser.id, // ← From auth, NOT request body
          tier: 'user',
          name: 'My Voice Cartridge',
          created_by: mockUser.id,
        }),
      ]);

      // ✅ VERIFY: Malicious user_id was rejected
      expect(mockInsert).not.toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'MALICIOUS_USER_ID',
        }),
      ]);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    test('✅ RLS FIX: Returns 201 immediately WITHOUT .select()', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Cartridge',
          tier: 'user',
          voice_params: {
            tone: 'casual',
            style: 'brief',
            personality: 'witty',
            vocabulary: 'informal',
          },
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // ✅ VERIFY: No .select() in chain (prevents RLS race condition)
      expect(mockInsert).toHaveBeenCalled();
      const insertResult = mockInsert.mock.results[0].value;
      expect(insertResult).not.toHaveProperty('select');

      // ✅ VERIFY: Success returned immediately
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cartridge created successfully');
    });

    test('handles RLS INSERT rejection correctly', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: { message: 'RLS policy violation' },
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          tier: 'user',
          voice_params: { tone: 'test', style: 'test', personality: 'test', vocabulary: 'test' },
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('RLS policy violation');
    });
  });

  describe('Validation', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('rejects missing name and tier', async () => {
      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify({ description: 'No name or tier' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    test('rejects invalid tier value', async () => {
      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', tier: 'invalid_tier' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid tier');
    });

    test('rejects incomplete voice_params', async () => {
      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          tier: 'user',
          voice_params: { tone: 'casual' }, // Missing required fields
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('voice_params must contain');
    });
  });

  describe('Multi-tier Support', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('creates agency cartridge with agency_id', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Agency Voice',
          tier: 'agency',
          agency_id: 'agency-456',
          voice_params: {
            tone: 'professional',
            style: 'formal',
            personality: 'authoritative',
            vocabulary: 'technical',
          },
        }),
      });

      const response = await POST(request as any);

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          tier: 'agency',
          agency_id: 'agency-456',
        }),
      ]);

      expect(response.status).toBe(201);
    });

    test('creates client cartridge with client_id', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Client Voice',
          tier: 'client',
          client_id: 'client-789',
          voice_params: {
            tone: 'friendly',
            style: 'casual',
            personality: 'approachable',
            vocabulary: 'simple',
          },
        }),
      });

      const response = await POST(request as any);

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          tier: 'client',
          client_id: 'client-789',
        }),
      ]);

      expect(response.status).toBe(201);
    });
  });

  describe('Parent Hierarchy', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('supports parent_id for voice inheritance', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const request = new MockRequest('http://localhost:3000/api/cartridges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Child Voice',
          tier: 'user',
          parent_id: 'parent-cartridge-id',
          voice_params: {
            tone: 'casual',
            style: 'brief',
            personality: 'witty',
            vocabulary: 'informal',
          },
        }),
      });

      const response = await POST(request as any);

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          parent_id: 'parent-cartridge-id',
        }),
      ]);

      expect(response.status).toBe(201);
    });
  });
});
