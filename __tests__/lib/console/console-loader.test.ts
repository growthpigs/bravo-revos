/**
 * Console Loader Tests
 *
 * Tests the loadConsolePrompt, loadAllConsoles, and assembleSystemPrompt functions
 */

import { loadConsolePrompt, loadAllConsoles, assembleSystemPrompt } from '@/lib/console/console-loader';
import { ConsoleConfig } from '@/lib/validation/console-validation';

// Mock factory for creating Supabase-like objects
function createMockSupabase() {
  const chainMethods: any = {
    select: jest.fn(function (this: any) {
      return chainMethods;
    }),
    eq: jest.fn(function (this: any) {
      return chainMethods;
    }),
    order: jest.fn(function (this: any) {
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
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Valid UUID
        name: 'marketing-console-v1',
        display_name: 'Marketing Console V1',
        system_instructions: 'You are a marketing assistant',
        behavior_rules: [{ rule: 'be-helpful' }],
        version: 1,
        operations_cartridge: {},
        system_cartridge: {},
        context_cartridge: {},
        skills_cartridge: {},
        plugins_cartridge: {},
        knowledge_cartridge: {},
        memory_cartridge: {},
        ui_cartridge: {},
      };

      supabase.__mockChain.single.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await loadConsolePrompt('marketing-console-v1', supabase);

      expect(result).toEqual({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'marketing-console-v1',
        displayName: 'Marketing Console V1',
        systemInstructions: 'You are a marketing assistant',
        behaviorRules: [{ rule: 'be-helpful' }],
        version: 1,
        operationsCartridge: {},
        systemCartridge: {},
        contextCartridge: {},
        skillsCartridge: {},
        pluginsCartridge: {},
        knowledgeCartridge: {},
        memoryCartridge: {},
        uiCartridge: {},
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
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          name: 'test-console',
          display_name: 'Test Console',
          system_instructions: 'Test instructions',
          behavior_rules: null,
          version: 1,
          operations_cartridge: {},
          system_cartridge: {},
          context_cartridge: {},
          skills_cartridge: {},
          plugins_cartridge: {},
          knowledge_cartridge: {},
          memory_cartridge: {},
          ui_cartridge: {},
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
        expect(error.message).toContain('apply migration 036_console_cartridges_8_system.sql');
      }
    });

    it('should handle null behavior_rules', async () => {
      const supabase = createMockSupabase();
      supabase.__mockChain.single.mockResolvedValue({
        data: {
          id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          name: 'test-console',
          display_name: 'Test Console',
          system_instructions: 'Test',
          behavior_rules: null,
          version: 1,
          operations_cartridge: {},
          system_cartridge: {},
          context_cartridge: {},
          skills_cartridge: {},
          plugins_cartridge: {},
          knowledge_cartridge: {},
          memory_cartridge: {},
          ui_cartridge: {},
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
          id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
          name: 'marketing-console-v1',
          display_name: 'Marketing Console V1',
          system_instructions: 'Marketing instructions',
          behavior_rules: [],
          version: 1,
          operations_cartridge: {},
          system_cartridge: {},
          context_cartridge: {},
          skills_cartridge: {},
          plugins_cartridge: {},
          knowledge_cartridge: {},
          memory_cartridge: {},
          ui_cartridge: {},
        },
        {
          id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
          name: 'support-console-v1',
          display_name: 'Support Console V1',
          system_instructions: 'Support instructions',
          behavior_rules: [],
          version: 1,
          operations_cartridge: {},
          system_cartridge: {},
          context_cartridge: {},
          skills_cartridge: {},
          plugins_cartridge: {},
          knowledge_cartridge: {},
          memory_cartridge: {},
          ui_cartridge: {},
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

  describe('assembleSystemPrompt', () => {
    it('assembles prompt from all 8 cartridges', () => {
      const config: ConsoleConfig = {
        id: 'test-id',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        systemInstructions: '',
        behaviorRules: [],
        systemCartridge: {
          systemPrompt: 'You are a test assistant',
          role: 'Tester',
          rules: 'Test rules',
        },
        contextCartridge: {
          domain: 'Testing',
          appFeatures: ['Feature 1', 'Feature 2'],
          structure: 'Test structure',
        },
        skillsCartridge: {
          chips: [
            { name: 'test_chip', description: 'Test capability' },
          ],
        },
        pluginsCartridge: {
          enabled: ['test-plugin'],
          config: {},
          required: ['test-plugin'],
          description: 'Test plugins required',
        },
        knowledgeCartridge: {
          documentation: 'Test docs',
          examples: ['Example 1'],
          bestPractices: 'Test best practices',
        },
        memoryCartridge: {
          scoping: 'user-specific',
          whatToRemember: ['User preferences'],
          contextInjection: 'Inject context',
          guidelines: 'Test guidelines',
        },
        uiCartridge: {
          inlineButtons: {
            frequency: '80%',
            style: 'Test style',
            placement: 'Below message',
            examples: ['Example 1'],
          },
          buttonActions: {
            navigation: 'Navigate to pages',
            verification: 'User sees changes',
            philosophy: 'Buttons help',
          },
          fullscreenTriggers: {
            when: ['write', 'create'],
            never: ['hi', 'hello'],
          },
          principle: 'Test principle',
        },
      };

      const prompt = assembleSystemPrompt(config);

      expect(prompt).toContain('You are a test assistant');
      expect(prompt).toContain('ROLE: Tester');
      expect(prompt).toContain('test_chip: Test capability');
      expect(prompt).toContain('Frequency: 80%');
      expect(prompt).toContain('Test principle');
      expect(prompt).toContain('Domain: Testing');
      expect(prompt).toContain('Test best practices');
    });

    it('falls back to legacy system_instructions when cartridges empty', () => {
      const config: ConsoleConfig = {
        id: 'test-id',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        systemInstructions: 'Legacy prompt',
        behaviorRules: [],
        systemCartridge: {}, // Empty
        contextCartridge: {},
        skillsCartridge: {},
        pluginsCartridge: {},
        knowledgeCartridge: {},
        memoryCartridge: {},
        uiCartridge: {},
      };

      const prompt = assembleSystemPrompt(config);

      expect(prompt).toBe('Legacy prompt');
    });

    it('uses safe defaults for missing cartridge fields', () => {
      const config: ConsoleConfig = {
        id: 'test-id',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        systemInstructions: '',
        behaviorRules: [],
        systemCartridge: {},
        contextCartridge: {},
        skillsCartridge: {},
        pluginsCartridge: {},
        knowledgeCartridge: {},
        memoryCartridge: {},
        uiCartridge: {},
      };

      const prompt = assembleSystemPrompt(config);

      expect(prompt).toContain('You are a helpful AI assistant');
      expect(prompt).toContain('ROLE: Assistant');
      expect(prompt).toContain('No specific capabilities defined');
    });

    it('handles empty arrays gracefully', () => {
      const config: ConsoleConfig = {
        id: 'test-id',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        systemInstructions: '',
        behaviorRules: [],
        systemCartridge: {
          systemPrompt: 'Test prompt',
        },
        contextCartridge: {
          appFeatures: [], // Empty array
        },
        skillsCartridge: {
          chips: [], // Empty array
        },
        pluginsCartridge: {},
        knowledgeCartridge: {},
        memoryCartridge: {},
        uiCartridge: {},
      };

      const prompt = assembleSystemPrompt(config);

      expect(prompt).toContain('Test prompt');
      expect(prompt).toContain('No specific capabilities defined');
    });

    it('handles undefined optional fields', () => {
      const config: ConsoleConfig = {
        id: 'test-id',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        systemInstructions: '',
        behaviorRules: [],
        systemCartridge: {
          systemPrompt: 'Test prompt',
          // role and rules are undefined
        },
        contextCartridge: {},
        skillsCartridge: {},
        pluginsCartridge: {},
        knowledgeCartridge: {},
        memoryCartridge: {},
        uiCartridge: {},
      };

      const prompt = assembleSystemPrompt(config);

      expect(prompt).toContain('Test prompt');
      expect(prompt).toContain('ROLE: Assistant'); // Default
      expect(prompt).toContain('Be helpful and professional'); // Default rules
    });
  });
});
