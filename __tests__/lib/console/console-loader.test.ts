/**
 * Console Loader Tests
 *
 * Tests the loadConsolePrompt and loadAllConsoles functions with mocked Supabase
 */

import { loadConsolePrompt, loadAllConsoles } from '@/lib/console/console-loader';

// Mock factory for creating Supabase-like objects
function createMockSupabase() {
  const chainMethods = {
    select: jest.fn(function () {
      return chainMethods;
    }),
    eq: jest.fn(function () {
      return chainMethods;
    }),
    order: jest.fn(function () {
      return chainMethods;
    }),
    single: jest.fn(),
  };

  return {
    from: jest.fn(() => chainMethods),
    __mockChain: chainMethods,
  } as any;
}

describe('Console Loader', () => {
  describe('loadConsolePrompt', () => {
    it('should load a console by name', async () => {
      const supabase = createMockSupabase();
      const mockData = {
        id: 'console-123',
        name: 'marketing-console-v1',
        display_name: 'Marketing Console V1',
        system_instructions: 'You are a marketing assistant',
        behavior_rules: [{ rule: 'be-helpful' }],
        version: 1,
      };

      supabase.__mockChain.single.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await loadConsolePrompt('marketing-console-v1', supabase);

      expect(result).toEqual({
        id: 'console-123',
        name: 'marketing-console-v1',
        displayName: 'Marketing Console V1',
        systemInstructions: 'You are a marketing assistant',
        behaviorRules: [{ rule: 'be-helpful' }],
        version: 1,
      });

      expect(supabase.from).toHaveBeenCalledWith('console_prompts');
      expect(supabase.__mockChain.select).toHaveBeenCalled();
      expect(supabase.__mockChain.eq).toHaveBeenCalledWith('name', 'marketing-console-v1');
      expect(supabase.__mockChain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should handle snake_case to camelCase conversion', async () => {
      const supabase = createMockSupabase();
      supabase.__mockChain.single.mockResolvedValue({
        data: {
          id: '123',
          name: 'test-console',
          display_name: 'Test Console',
          system_instructions: 'Test instructions',
          behavior_rules: null,
          version: 1,
        },
        error: null,
      });

      const result = await loadConsolePrompt('test-console', supabase);

      expect(result.displayName).toBe('Test Console');
      expect(result.systemInstructions).toBe('Test instructions');
      expect(result.behaviorRules).toEqual([]);
    });

    it('should throw error if console name is missing', async () => {
      const supabase = createMockSupabase();

      await expect(loadConsolePrompt('', supabase)).rejects.toThrow(
        'Console name is required'
      );
    });

    it('should throw error if supabase is missing', async () => {
      await expect(loadConsolePrompt('test-console', null as any)).rejects.toThrow(
        'Supabase client is required'
      );
    });

    it('should throw error if console not found', async () => {
      const supabase = createMockSupabase();
      supabase.__mockChain.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(loadConsolePrompt('missing-console', supabase)).rejects.toThrow(
        "Console 'missing-console' not found or not active"
      );
    });

    it('should handle database errors', async () => {
      const supabase = createMockSupabase();
      supabase.__mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      await expect(loadConsolePrompt('test-console', supabase)).rejects.toThrow(
        "Failed to load console 'test-console': Network error"
      );
    });

    it('should provide helpful error for missing table', async () => {
      const supabase = createMockSupabase();
      supabase.__mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Could not find the table "console_prompts"' },
      });

      await expect(loadConsolePrompt('test-console', supabase)).rejects.toThrow(
        'console_prompts table not found'
      );

      try {
        await loadConsolePrompt('test-console', supabase);
      } catch (error: any) {
        expect(error.message).toContain('apply migration 033_console_prompts.sql');
      }
    });

    it('should handle null behavior_rules', async () => {
      const supabase = createMockSupabase();
      supabase.__mockChain.single.mockResolvedValue({
        data: {
          id: '123',
          name: 'test-console',
          display_name: 'Test Console',
          system_instructions: 'Test',
          behavior_rules: null,
          version: 1,
        },
        error: null,
      });

      const result = await loadConsolePrompt('test-console', supabase);
      expect(result.behaviorRules).toEqual([]);
    });
  });

  describe('loadAllConsoles', () => {
    it('should load all active consoles', async () => {
      const supabase = createMockSupabase();
      const mockData = [
        {
          id: '123',
          name: 'marketing-console-v1',
          display_name: 'Marketing Console V1',
          system_instructions: 'Marketing instructions',
          behavior_rules: [],
          version: 1,
        },
        {
          id: '456',
          name: 'support-console-v1',
          display_name: 'Support Console V1',
          system_instructions: 'Support instructions',
          behavior_rules: [],
          version: 1,
        },
      ];

      supabase.__mockChain.order.mockReturnValue({
        ...supabase.__mockChain,
      });

      // Mock the final response
      Object.defineProperty(supabase.__mockChain, 'order', {
        value: jest.fn(function () {
          return {
            ...this,
            then: function (callback: any) {
              return Promise.resolve(callback({ data: mockData, error: null }));
            },
            catch: jest.fn(),
          };
        }),
        configurable: true,
      });

      // Override the from method to return a proper chain
      supabase.from.mockReturnValue({
        select: jest.fn(function () {
          return {
            eq: jest.fn(function () {
              return {
                order: jest.fn().mockReturnValue(
                  Promise.resolve({ data: mockData, error: null })
                ),
              };
            }),
          };
        }),
      });

      const result = await loadAllConsoles(supabase);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('marketing-console-v1');
      expect(result[1].name).toBe('support-console-v1');
    });

    it('should return empty array if no consoles found', async () => {
      const supabase = createMockSupabase();

      supabase.from.mockReturnValue({
        select: jest.fn(function () {
          return {
            eq: jest.fn(function () {
              return {
                order: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              };
            }),
          };
        }),
      });

      const result = await loadAllConsoles(supabase);

      expect(result).toEqual([]);
    });

    it('should throw error if supabase is missing', async () => {
      await expect(loadAllConsoles(null as any)).rejects.toThrow(
        'Supabase client is required'
      );
    });

    it('should handle database errors', async () => {
      const supabase = createMockSupabase();

      supabase.from.mockReturnValue({
        select: jest.fn(function () {
          return {
            eq: jest.fn(function () {
              return {
                order: jest
                  .fn()
                  .mockResolvedValue({
                    data: null,
                    error: { message: 'Permission denied' },
                  }),
              };
            }),
          };
        }),
      });

      await expect(loadAllConsoles(supabase)).rejects.toThrow(
        'Failed to load consoles: Permission denied'
      );
    });

    it('should provide helpful error for missing table', async () => {
      const supabase = createMockSupabase();

      supabase.from.mockReturnValue({
        select: jest.fn(function () {
          return {
            eq: jest.fn(function () {
              return {
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Could not find the table "console_prompts"' },
                }),
              };
            }),
          };
        }),
      });

      await expect(loadAllConsoles(supabase)).rejects.toThrow(
        'console_prompts table not found'
      );
    });
  });
});
