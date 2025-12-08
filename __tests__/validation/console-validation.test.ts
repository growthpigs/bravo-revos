/**
 * Console Configuration Validation Tests
 *
 * Tests validation of the 8-cartridge console configuration system:
 * - Database schema validation
 * - Zod schema validation with size limits
 * - Deep merge immutability
 * - Console loader integration
 * - System prompt assembly
 */

import { createClient } from '@/lib/supabase/server';
import {
  ConsoleConfigSchema,
  safeParseConsoleConfig,
  validateCartridgeSize,
  OperationsCartridgeSchema,
  SystemCartridgeSchema,
  ContextCartridgeSchema,
  SkillsCartridgeSchema,
  PluginsCartridgeSchema,
  KnowledgeCartridgeSchema,
  MemoryCartridgeSchema,
  UICartridgeSchema,
} from '@/lib/validations/console';
import { deepMerge, deepEqual, setNestedValue } from '@/lib/utils/deep-merge';
import { loadConsolePrompt, assembleSystemPrompt } from '@/lib/console/console-loader';

// Mock Supabase for tests that don't need real database
function createMockSupabase() {
  const chainMethods: any = {
    select: jest.fn(function (this: any) {
      return chainMethods;
    }),
    eq: jest.fn(function (this: any) {
      return chainMethods;
    }),
    single: jest.fn(),
  };

  return {
    from: jest.fn(() => chainMethods),
    __mockChain: chainMethods,
  } as any;
}

describe('Console Configuration Validation', () => {
  describe('Zod Schema Validation', () => {
    it('should validate a complete console configuration', () => {
      const validConfig = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        systemInstructions: 'Test instructions',
        behaviorRules: [{ rule: 'be helpful', priority: 'high' as const }],
        operationsCartridge: { prd: 'Test PRD' },
        systemCartridge: { systemPrompt: 'Test prompt' },
        contextCartridge: { domain: 'Testing' },
        skillsCartridge: { chips: [{ name: 'test', description: 'A test chip' }] },
        pluginsCartridge: { enabled: ['test-plugin'] },
        knowledgeCartridge: { documentation: 'Test docs' },
        memoryCartridge: { scoping: 'user-specific' },
        uiCartridge: { principle: 'Test principle' },
      };

      const result = safeParseConsoleConfig(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('test-console');
      }
    });

    it('should reject invalid UUID', () => {
      const invalidConfig = {
        id: 'not-a-uuid',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
      };

      const result = safeParseConsoleConfig(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidConfig = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        // Missing name, displayName, version
      };

      const result = safeParseConsoleConfig(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should allow backward compatible behaviorRules (string array)', () => {
      const config = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        behaviorRules: ['rule1', 'rule2'], // Old format
      };

      const result = safeParseConsoleConfig(config);
      expect(result.success).toBe(true);
    });

    it('should allow new behaviorRules (object array)', () => {
      const config = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        behaviorRules: [
          { rule: 'be helpful', priority: 'high' as const },
          { rule: 'be concise', priority: 'medium' as const },
        ],
      };

      const result = safeParseConsoleConfig(config);
      expect(result.success).toBe(true);
    });
  });

  describe('Cartridge Size Validation', () => {
    it('should allow cartridges under 50KB', () => {
      const validCartridge = {
        prd: 'A'.repeat(10000), // 10KB
        userStories: ['Story 1', 'Story 2'],
      };

      expect(() => validateCartridgeSize(validCartridge, 'operations')).not.toThrow();
    });

    it('should reject cartridges over 50KB', () => {
      const oversizedCartridge = {
        prd: 'A'.repeat(60000), // 60KB
      };

      expect(() => validateCartridgeSize(oversizedCartridge, 'operations'))
        .toThrow('operations too large');
    });

    it('should handle empty cartridges', () => {
      expect(() => validateCartridgeSize({}, 'empty')).not.toThrow();
    });

    it('should handle null values in cartridges', () => {
      const cartridge = { field: null };
      expect(() => validateCartridgeSize(cartridge, 'test')).not.toThrow();
    });
  });

  describe('Individual Cartridge Schema Validation', () => {
    it('should validate operations cartridge', () => {
      const valid = { prd: 'Test PRD', userStories: ['Story 1'], requirements: 'Test' };
      const result = OperationsCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);

      const invalid = { prd: 'A'.repeat(11000) }; // Over 10KB
      const result2 = OperationsCartridgeSchema.safeParse(invalid);
      expect(result2.success).toBe(false);
    });

    it('should validate system cartridge', () => {
      const valid = { systemPrompt: 'Test', role: 'Assistant', rules: 'Be helpful' };
      const result = SystemCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate context cartridge', () => {
      const valid = { domain: 'Testing', appFeatures: ['Feature 1'], structure: 'Standard' };
      const result = ContextCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate skills cartridge', () => {
      const valid = { chips: [{ name: 'test', description: 'A test chip' }] };
      const result = SkillsCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);

      const invalid = { chips: [{ name: '', description: 'Missing name' }] };
      const result2 = SkillsCartridgeSchema.safeParse(invalid);
      expect(result2.success).toBe(false);
    });

    it('should validate plugins cartridge', () => {
      const valid = { enabled: ['plugin1'], required: ['plugin1'], description: 'Test' };
      const result = PluginsCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate knowledge cartridge', () => {
      const valid = { documentation: 'Docs', examples: ['Ex 1'], bestPractices: 'Best' };
      const result = KnowledgeCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate memory cartridge', () => {
      const valid = { scoping: 'user-specific', whatToRemember: ['Preferences'] };
      const result = MemoryCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate UI cartridge', () => {
      const valid = {
        inlineButtons: { frequency: '80%', style: 'blue' },
        principle: 'User-friendly',
      };
      const result = UICartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject arrays over max length', () => {
      const tooManyStories = { userStories: Array(51).fill('story') };
      const result = OperationsCartridgeSchema.safeParse(tooManyStories);
      expect(result.success).toBe(false);
    });
  });

  describe('Deep Merge Immutability', () => {
    it('should not mutate source objects', () => {
      const original = {
        uiCartridge: {
          inlineButtons: { style: 'blue', frequency: '80%' },
          principle: 'helpful',
        },
      };
      const originalCopy = JSON.parse(JSON.stringify(original));

      const update = { uiCartridge: { inlineButtons: { style: 'red' } } };
      const result = deepMerge(original, update as any);

      // Original should be unchanged
      expect(original).toEqual(originalCopy);
      expect(original.uiCartridge.inlineButtons.style).toBe('blue');

      // Result should have update
      expect(result.uiCartridge.inlineButtons.style).toBe('red');
      expect(result.uiCartridge.inlineButtons.frequency).toBe('80%');
    });

    it('should handle nested updates without mutation', () => {
      const config = {
        operationsCartridge: { prd: 'Original PRD' },
        systemCartridge: { role: 'Assistant' },
      };
      const original = JSON.parse(JSON.stringify(config));

      const updated = setNestedValue(config, 'operationsCartridge.prd', 'New PRD');

      expect(config).toEqual(original);
      expect(updated.operationsCartridge.prd).toBe('New PRD');
    });

    it('should preserve unmodified fields', () => {
      const config = {
        systemCartridge: { systemPrompt: 'Test', role: 'Assistant', rules: 'Rules' },
      };

      const updated = setNestedValue(config, 'systemCartridge.role', 'Helper');

      expect(updated.systemCartridge.systemPrompt).toBe('Test');
      expect(updated.systemCartridge.role).toBe('Helper');
      expect(updated.systemCartridge.rules).toBe('Rules');
    });
  });

  describe('Console Loader Integration', () => {
    it('should load console with all 8 cartridges', async () => {
      const supabase = createMockSupabase();
      const mockData = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'marketing-console-v1',
        display_name: 'Marketing Console V1',
        system_instructions: 'Marketing instructions',
        behavior_rules: [],
        version: 1,
        operations_cartridge: { prd: 'Test PRD' },
        system_cartridge: { systemPrompt: 'Test prompt' },
        context_cartridge: { domain: 'Marketing' },
        skills_cartridge: { chips: [] },
        plugins_cartridge: { enabled: [] },
        knowledge_cartridge: { documentation: 'Docs' },
        memory_cartridge: { scoping: 'user' },
        ui_cartridge: { principle: 'Helpful' },
      };

      supabase.__mockChain.single.mockResolvedValue({ data: mockData, error: null });

      const result = await loadConsolePrompt('marketing-console-v1', supabase);

      expect(result.operationsCartridge).toEqual({ prd: 'Test PRD' });
      expect(result.systemCartridge).toEqual({ systemPrompt: 'Test prompt' });
      expect(result.uiCartridge).toEqual({ principle: 'Helpful' });
    });

    it('should provide defaults for empty cartridges', async () => {
      const supabase = createMockSupabase();
      const mockData = {
        id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        name: 'minimal-console',
        display_name: 'Minimal Console',
        system_instructions: 'Minimal',
        behavior_rules: null,
        version: 1,
        operations_cartridge: null,
        system_cartridge: null,
        context_cartridge: null,
        skills_cartridge: null,
        plugins_cartridge: null,
        knowledge_cartridge: null,
        memory_cartridge: null,
        ui_cartridge: null,
      };

      supabase.__mockChain.single.mockResolvedValue({ data: mockData, error: null });

      const result = await loadConsolePrompt('minimal-console', supabase);

      expect(result.operationsCartridge).toEqual({});
      expect(result.skillsCartridge).toEqual({ chips: [] });
      expect(result.pluginsCartridge).toEqual({
        enabled: [],
        config: {},
        required: [],
        description: '',
      });
    });
  });

  describe('System Prompt Assembly', () => {
    it('should assemble prompt from all 8 cartridges', () => {
      const config = {
        id: 'test-id',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        systemInstructions: '',
        behaviorRules: [],
        operationsCartridge: {},
        systemCartridge: {
          systemPrompt: 'You are a helpful assistant',
          role: 'Helper',
          rules: 'Be concise',
        },
        contextCartridge: {
          domain: 'Testing',
          appFeatures: ['Feature 1', 'Feature 2'],
          structure: 'Standard',
        },
        skillsCartridge: {
          chips: [
            { name: 'analyze', description: 'Analyze data' },
            { name: 'report', description: 'Generate reports' },
          ],
        },
        pluginsCartridge: {
          enabled: ['test-plugin'],
          config: {},
          required: ['test-plugin'],
          description: 'Required for testing',
        },
        knowledgeCartridge: {
          documentation: 'Test documentation',
          examples: ['Example 1'],
          bestPractices: 'Follow best practices',
        },
        memoryCartridge: {
          scoping: 'user-specific',
          whatToRemember: ['User preferences', 'Past interactions'],
          contextInjection: 'Inject relevant memories',
          guidelines: 'Memory guidelines',
        },
        uiCartridge: {
          inlineButtons: {
            frequency: '80%',
            style: 'Professional',
            placement: 'Below message',
            examples: ['View Dashboard', 'Create Campaign'],
          },
          buttonActions: {
            navigation: 'Navigate to relevant pages',
            verification: 'Verify changes',
            philosophy: 'Buttons guide user actions',
          },
          fullscreenTriggers: {
            when: ['write', 'create'],
            never: ['hi', 'hello'],
          },
          principle: 'Conversational with helpful buttons',
        },
      };

      const prompt = assembleSystemPrompt(config);

      // Check all sections are present
      expect(prompt).toContain('You are a helpful assistant');
      expect(prompt).toContain('ROLE: Helper');
      expect(prompt).toContain('Be concise');
      expect(prompt).toContain('Domain: Testing');
      expect(prompt).toContain('Feature 1');
      expect(prompt).toContain('analyze: Analyze data');
      expect(prompt).toContain('Frequency: 80%');
      expect(prompt).toContain('View Dashboard');
      expect(prompt).toContain('Scoping: user-specific');
      expect(prompt).toContain('test-plugin');
      expect(prompt).toContain('Follow best practices');
    });

    it('should fall back to legacy systemInstructions when cartridges empty', () => {
      const config = {
        id: 'test-id',
        name: 'legacy-console',
        displayName: 'Legacy Console',
        version: 1,
        systemInstructions: 'Legacy system prompt text',
        behaviorRules: [],
        operationsCartridge: {},
        systemCartridge: {}, // Empty - triggers fallback
        contextCartridge: {},
        skillsCartridge: {},
        pluginsCartridge: {},
        knowledgeCartridge: {},
        memoryCartridge: {},
        uiCartridge: {},
      };

      const prompt = assembleSystemPrompt(config);

      expect(prompt).toBe('Legacy system prompt text');
    });

    it('should use safe defaults for missing cartridge fields', () => {
      const config = {
        id: 'test-id',
        name: 'minimal-console',
        displayName: 'Minimal Console',
        version: 1,
        systemInstructions: '',
        behaviorRules: [],
        operationsCartridge: {},
        systemCartridge: {}, // All fields missing
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
      expect(prompt).toContain('Be helpful and professional');
      expect(prompt).toContain('No specific capabilities defined');
    });
  });

  describe('Edge Cases', () => {
    it('should handle oversized text fields in validation', () => {
      const oversized = {
        systemPrompt: 'A'.repeat(11000), // Over 10KB
      };

      const result = SystemCartridgeSchema.safeParse(oversized);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('too long');
      }
    });

    it('should handle deeply nested updates', () => {
      const config = {
        uiCartridge: {
          inlineButtons: {
            examples: ['Example 1', 'Example 2'],
          },
        },
      };

      const updated = setNestedValue(
        config,
        'uiCartridge.inlineButtons.examples',
        ['New 1', 'New 2']
      );

      expect(updated.uiCartridge.inlineButtons.examples).toEqual(['New 1', 'New 2']);
      expect(config.uiCartridge.inlineButtons.examples).toEqual(['Example 1', 'Example 2']);
    });

    it('should handle equality checks with nested objects', () => {
      const a = {
        systemCartridge: { role: 'Assistant', rules: 'Be helpful' },
        uiCartridge: { principle: 'User-friendly' },
      };

      const b = {
        uiCartridge: { principle: 'User-friendly' },
        systemCartridge: { rules: 'Be helpful', role: 'Assistant' },
      };

      expect(deepEqual(a, b)).toBe(true);
    });

    it('should handle null and undefined in cartridges', () => {
      const config = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'test',
        displayName: 'Test',
        version: 1,
        operationsCartridge: { prd: null as any },
        systemCartridge: {},
        contextCartridge: {},
        skillsCartridge: {},
        pluginsCartridge: {},
        knowledgeCartridge: {},
        memoryCartridge: {},
        uiCartridge: {},
      };

      const result = safeParseConsoleConfig(config);
      expect(result.success).toBe(false); // prd should be string or undefined, not null
    });
  });
});
