/**
 * Health API Endpoint Tests
 *
 * Tests the /api/health endpoint that returns status for all 12 services
 */

import { GET } from '@/app/api/health/route';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('/api/health endpoint', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Successful Response', () => {
    it('should return 200 status', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('should include status field in response', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    });

    it('should include checks object in response', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('checks');
      expect(typeof data.checks).toBe('object');
    });

    it('should include timestamp in checks', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.checks).toHaveProperty('timestamp');
      expect(new Date(data.checks.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Service Health Checks', () => {
    it('should include all 12 services', async () => {
      const response = await GET();
      const data = await response.json();

      const expectedServices = [
        'database',
        'supabase',
        'api',
        'agentkit',
        'mem0',
        'unipile',
        'email',
        'console',
        'cache',
        'queue',
        'cron',
        'webhooks',
      ];

      expectedServices.forEach((service) => {
        expect(data.checks).toHaveProperty(service);
      });
    });

    it('should return status for each service', async () => {
      const response = await GET();
      const data = await response.json();

      const services = ['database', 'supabase', 'api', 'agentkit', 'mem0', 'unipile',
                       'email', 'console', 'cache', 'queue', 'cron', 'webhooks'];

      services.forEach((service) => {
        expect(data.checks[service]).toHaveProperty('status');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(data.checks[service].status);
      });
    });

    it('should include latency for database check', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.checks.database).toHaveProperty('latency');
      expect(typeof data.checks.database.latency).toBe('number');
      expect(data.checks.database.latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Database Health Check', () => {
    it('should mark database as healthy when query succeeds', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.database.status).toBe('healthy');
    });

    it('should mark database as unhealthy when query fails', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' }
      });
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.database.status).toBe('unhealthy');
    });

    it('should mark database as unhealthy when connection throws', async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error('Connection error'));

      const response = await GET();
      const data = await response.json();

      expect(data.checks.database.status).toBe('unhealthy');
    });

    it('should measure database latency', async () => {
      // Add delay to mock
      mockSupabase.limit.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: [], error: null }), 50);
        });
      });
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.database.latency).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Supabase Auth Check', () => {
    it('should mark supabase as healthy when auth succeeds', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      });
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.supabase.status).toBe('healthy');
    });

    it('should mark supabase as degraded when auth fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: null,
        error: { message: 'Auth failed' }
      });
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.supabase.status).toBe('degraded');
    });

    it('should mark supabase as unhealthy when auth throws', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.supabase.status).toBe('unhealthy');
    });
  });

  describe('API Service Check', () => {
    it('should always mark api as healthy (if endpoint responds)', async () => {
      const response = await GET();
      const data = await response.json();

      // If we get a response, API is healthy
      expect(data.checks.api.status).toBe('healthy');
    });
  });

  describe('Overall Status Calculation', () => {
    it('should be healthy when all services are healthy', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test' } },
        error: null
      });
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('healthy');
    });

    it('should be degraded when any service is degraded', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: null,
        error: { message: 'Auth error' }
      });
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('degraded');
    });

    it('should be degraded when any service is unhealthy', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: 'DB error' }
      });
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('degraded');
    });
  });

  describe('Placeholder Services (TODO checks)', () => {
    it('should default placeholder services to healthy', async () => {
      const response = await GET();
      const data = await response.json();

      const placeholders = ['agentkit', 'mem0', 'unipile', 'email',
                           'console', 'cache', 'queue', 'cron', 'webhooks'];

      placeholders.forEach((service) => {
        expect(data.checks[service].status).toBe('healthy');
      });
    });
  });

  describe('Error Handling', () => {
    it('should not throw error if supabase fails to initialize', async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error('Init failed'));

      await expect(GET()).resolves.toBeDefined();
    });

    it('should return valid response even with errors', async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error('Init failed'));

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('checks');
    });
  });

  describe('Response Format', () => {
    it('should match expected response structure', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          checks: expect.objectContaining({
            timestamp: expect.any(String),
            database: expect.objectContaining({ status: expect.any(String) }),
            supabase: expect.objectContaining({ status: expect.any(String) }),
            api: expect.objectContaining({ status: expect.any(String) }),
            agentkit: expect.objectContaining({ status: expect.any(String) }),
            mem0: expect.objectContaining({ status: expect.any(String) }),
            unipile: expect.objectContaining({ status: expect.any(String) }),
            email: expect.objectContaining({ status: expect.any(String) }),
            console: expect.objectContaining({ status: expect.any(String) }),
            cache: expect.objectContaining({ status: expect.any(String) }),
            queue: expect.objectContaining({ status: expect.any(String) }),
            cron: expect.objectContaining({ status: expect.any(String) }),
            webhooks: expect.objectContaining({ status: expect.any(String) }),
          }),
        })
      );
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      await GET();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it('should not be blocked by slow checks', async () => {
      // Add delay to database check
      mockSupabase.limit.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: [], error: null }), 1000);
        });
      });
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const startTime = Date.now();
      await GET();
      const duration = Date.now() - startTime;

      // Should still respond reasonably fast
      expect(duration).toBeLessThan(5000);
    });
  });
});
