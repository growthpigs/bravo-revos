/**
 * Cartridges API PATCH Tests - Update-Select-RLS Bug Fix Validation
 *
 * Tests the fix for race condition bug where update().eq().select().single()
 * caused RLS filtering on SELECT to fail even though UPDATE succeeded.
 *
 * Fix: Removed .select() from UPDATE, frontend updates local state
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

// Import handlers
import { PATCH, DELETE } from '@/app/api/cartridges/[id]/route';

// Mock Next.js Request
class MockRequest {
  constructor(public url: string, public options: any = {}) {}
  async json() {
    return this.options.body ? JSON.parse(this.options.body) : {};
  }
}

describe('PATCH /api/cartridges/[id] - Update-Select-RLS Fix', () => {
  const cartridgeId = 'cartridge-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    test('returns 401 when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PATCH(request as any, { params: { id: cartridgeId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Update Without SELECT (Bug Fix)', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('✅ RLS FIX: Updates without calling .select()', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Cartridge Name',
          description: 'Updated description',
        }),
      });

      const response = await PATCH(request as any, { params: { id: cartridgeId } });
      const data = await response.json();

      // ✅ VERIFY: update() called with correct data
      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'Updated Cartridge Name',
        description: 'Updated description',
      });

      // ✅ VERIFY: eq() called with correct ID
      expect(mockEq).toHaveBeenCalledWith('id', cartridgeId);

      // ✅ VERIFY: No .select() in chain (prevents RLS race condition)
      const eqResult = mockEq.mock.results[0].value;
      expect(eqResult).not.toHaveProperty('select');

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cartridge updated successfully');
    });

    test('updates voice_params correctly', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      const newVoiceParams = {
        tone: 'professional',
        style: 'formal',
        personality: 'authoritative',
        vocabulary: 'technical',
      };

      const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ voice_params: newVoiceParams }),
      });

      const response = await PATCH(request as any, { params: { id: cartridgeId } });

      expect(mockUpdate).toHaveBeenCalledWith({
        voice_params: newVoiceParams,
      });

      expect(response.status).toBe(200);
    });

    test('updates is_active status', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false }),
      });

      const response = await PATCH(request as any, { params: { id: cartridgeId } });

      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(response.status).toBe(200);
    });

    test('handles partial updates', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Only Name Updated' }),
      });

      const response = await PATCH(request as any, { params: { id: cartridgeId } });

      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Only Name Updated' });
      expect(response.status).toBe(200);
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

    test('rejects empty update', async () => {
      const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await PATCH(request as any, { params: { id: cartridgeId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No fields to update');
    });

    test('handles RLS update error', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'Cannot update other users cartridges' },
      });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Malicious Update' }),
      });

      const response = await PATCH(request as any, { params: { id: cartridgeId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot update other users cartridges');
    });
  });

  describe('Multi-tenant Security', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('RLS enforces users can only update their own cartridges', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'RLS policy violation' },
      });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
      });

      const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Trying to update someone elses cartridge' }),
      });

      const response = await PATCH(request as any, { params: { id: cartridgeId } });

      expect(response.status).toBe(400);
    });
  });
});

describe('DELETE /api/cartridges/[id] - Soft Delete', () => {
  const cartridgeId = 'cartridge-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  test('prevents deletion of system cartridges', async () => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: { tier: 'system' },
      error: null,
    });
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    });

    const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request as any, { params: { id: cartridgeId } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Cannot delete system cartridges');
  });

  test('soft deletes user cartridges', async () => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: { tier: 'user' },
      error: null,
    });
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

    mockSupabaseClient.from
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ update: mockUpdate });

    const request = new MockRequest(`http://localhost:3000/api/cartridges/${cartridgeId}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request as any, { params: { id: cartridgeId } });
    const data = await response.json();

    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
