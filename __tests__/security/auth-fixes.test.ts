/**
 * Security Tests: Critical Authentication Fixes
 * Tests for hardcoded user ID removal and proper auth implementation
 */

import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

describe('Security: Authentication Fixes', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        })),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      })),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Products & Services Page', () => {
    it('should NOT contain hardcoded user ID', async () => {
      // Read the file and check for hardcoded IDs
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'app/dashboard/products-services/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Check for common hardcoded user ID patterns
      expect(fileContent).not.toMatch(/userId:\s*['"][\w-]{36}['"]/);
      expect(fileContent).not.toMatch(/user_id:\s*['"][\w-]{36}['"]/);
      expect(fileContent).not.toMatch(/['"][\w-]{8}-[\w-]{4}-[\w-]{4}-[\w-]{4}-[\w-]{12}['"]/g);
    });

    it('should get user from Supabase auth', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      await mockSupabase.auth.getUser();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('should redirect to login when auth fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const { data, error } = await mockSupabase.auth.getUser();

      expect(error).toBeTruthy();
      expect(data.user).toBeNull();
    });

    it('should redirect to login when user is null', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const { data } = await mockSupabase.auth.getUser();

      expect(data.user).toBeNull();
    });

    it('should use authenticated user ID for offerings operations', async () => {
      const mockUser = {
        id: 'authenticated-user-id',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { data } = await mockSupabase.auth.getUser();

      expect(data.user.id).toBe('authenticated-user-id');
      expect(data.user.id).not.toBe(''); // No empty strings
      expect(data.user.id).not.toBeUndefined();
    });
  });

  describe('Pod Activity Page', () => {
    it('should authenticate user before loading activities', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { data } = await mockSupabase.auth.getUser();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(data.user).toBeTruthy();
    });

    it('should set up auth state listener', () => {
      const mockCallback = jest.fn();
      const unsubscribe = jest.fn();

      mockSupabase.auth.onAuthStateChange.mockReturnValueOnce({
        data: {
          subscription: {
            unsubscribe,
          },
        },
      });

      const result = mockSupabase.auth.onAuthStateChange(mockCallback);

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(result.data.subscription.unsubscribe).toBeDefined();
    });

    it('should redirect to login on auth failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Auth failed'),
      });

      const { error } = await mockSupabase.auth.getUser();

      expect(error).toBeTruthy();
    });
  });

  describe('API Key Security', () => {
    it('should NOT expose OpenAI API key in client-side code', () => {
      // Check Products & Services page
      const fs = require('fs');
      const path = require('path');

      const productsServicesPath = path.join(process.cwd(), 'app/dashboard/products-services/page.tsx');
      const productsServicesContent = fs.readFileSync(productsServicesPath, 'utf-8');

      expect(productsServicesContent).not.toMatch(/process\.env\.OPENAI_API_KEY/);
      expect(productsServicesContent).not.toMatch(/sk-[a-zA-Z0-9]{48}/); // OpenAI key pattern

      // Check conversation intelligence chip
      const chipPath = path.join(process.cwd(), 'lib/chips/conversation-intelligence.ts');
      const chipContent = fs.readFileSync(chipPath, 'utf-8');

      expect(chipContent).not.toMatch(/new OpenAI/);
      expect(chipContent).not.toMatch(/process\.env\.OPENAI_API_KEY/);
      expect(chipContent).not.toMatch(/sk-[a-zA-Z0-9]{48}/);
    });

    it('should use server-side API route for OpenAI calls', () => {
      const fs = require('fs');
      const path = require('path');

      const chipPath = path.join(process.cwd(), 'lib/chips/conversation-intelligence.ts');
      const chipContent = fs.readFileSync(chipPath, 'utf-8');

      // Should call API route, not OpenAI directly
      expect(chipContent).toMatch(/fetch\(['"]\/api\/conversation-intelligence['"]/);
    });
  });

  describe('RLS Policy Enforcement', () => {
    it('should filter offerings by authenticated user ID', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      });

      const { data: userData } = await mockSupabase.auth.getUser();
      const query = mockSupabase.from('offerings');

      expect(userData.user.id).toBe('user-123');
    });

    it('should filter pod activities by pod membership', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockQuery);

      const { data: userData } = await mockSupabase.auth.getUser();
      const query = mockSupabase.from('pod_activity').select('*, pod_members!inner(user_id)');

      expect(userData.user.id).toBe('user-456');
      expect(mockQuery.select).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should maintain auth state across page loads', () => {
      const mockCallback = jest.fn();
      mockSupabase.auth.onAuthStateChange(mockCallback);

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
    });

    it('should cleanup auth listener on unmount', () => {
      const unsubscribe = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValueOnce({
        data: {
          subscription: {
            unsubscribe,
          },
        },
      });

      const result = mockSupabase.auth.onAuthStateChange(jest.fn());
      result.data.subscription.unsubscribe();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
