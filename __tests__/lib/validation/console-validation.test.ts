/**
 * Console Validation Tests
 *
 * Tests Zod schemas for 8-cartridge system validation
 */

import {
  ConsoleConfigSchema,
  OperationsCartridgeSchema,
  SystemCartridgeSchema,
  ContextCartridgeSchema,
  SkillsCartridgeSchema,
  PluginsCartridgeSchema,
  KnowledgeCartridgeSchema,
  MemoryCartridgeSchema,
  UICartridgeSchema,
  validateCartridgeSize,
  safeParseConsoleConfig,
} from '@/lib/validations/console';

describe('Console Validation', () => {
  describe('OperationsCartridgeSchema', () => {
    it('should accept valid operations cartridge', () => {
      const valid = {
        prd: 'Product requirements',
        userStories: ['Story 1', 'Story 2'],
        requirements: 'Technical requirements',
      };

      const result = OperationsCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject too-long PRD', () => {
      const invalid = {
        prd: 'a'.repeat(11000), // > 10KB
      };

      const result = OperationsCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('PRD too long');
      }
    });

    it('should reject too many user stories', () => {
      const invalid = {
        userStories: Array(51).fill('story'), // > 50
      };

      const result = OperationsCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('SystemCartridgeSchema', () => {
    it('should accept valid system cartridge', () => {
      const valid = {
        systemPrompt: 'You are a helpful assistant',
        role: 'Marketing Expert',
        rules: 'Be professional and data-driven',
      };

      const result = SystemCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty system cartridge', () => {
      const result = SystemCartridgeSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject too-long system prompt', () => {
      const invalid = {
        systemPrompt: 'a'.repeat(11000),
      };

      const result = SystemCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ContextCartridgeSchema', () => {
    it('should accept valid context cartridge', () => {
      const valid = {
        domain: 'Marketing automation',
        appFeatures: ['Feature 1', 'Feature 2'],
        structure: 'Modular architecture',
      };

      const result = ContextCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject too many app features', () => {
      const invalid = {
        appFeatures: Array(51).fill('feature'),
      };

      const result = ContextCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('SkillsCartridgeSchema', () => {
    it('should accept valid skills cartridge', () => {
      const valid = {
        chips: [
          { name: 'dm_scraper', description: 'Scrapes LinkedIn DMs' },
          { name: 'email_extractor', description: 'Extracts emails from text' },
        ],
      };

      const result = SkillsCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject chip without name', () => {
      const invalid = {
        chips: [{ description: 'Missing name' }],
      };

      const result = SkillsCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject chip without description', () => {
      const invalid = {
        chips: [{ name: 'test_chip' }],
      };

      const result = SkillsCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject too many chips', () => {
      const invalid = {
        chips: Array(51)
          .fill(null)
          .map((_, i) => ({ name: `chip_${i}`, description: `Chip ${i}` })),
      };

      const result = SkillsCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('PluginsCartridgeSchema', () => {
    it('should accept valid plugins cartridge', () => {
      const valid = {
        enabled: ['mem0', 'agentkit'],
        config: { mem0: { api_key: 'test' } },
        required: ['mem0'],
        description: 'Required plugins for operation',
      };

      const result = PluginsCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject too many enabled plugins', () => {
      const invalid = {
        enabled: Array(21).fill('plugin'),
      };

      const result = PluginsCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('KnowledgeCartridgeSchema', () => {
    it('should accept valid knowledge cartridge', () => {
      const valid = {
        documentation: 'How to use this console',
        examples: ['Example 1', 'Example 2'],
        bestPractices: 'Follow these guidelines',
      };

      const result = KnowledgeCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject too many examples', () => {
      const invalid = {
        examples: Array(51).fill('example'),
      };

      const result = KnowledgeCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('MemoryCartridgeSchema', () => {
    it('should accept valid memory cartridge', () => {
      const valid = {
        scoping: 'agencyId::clientId::userId',
        whatToRemember: ['User preferences', 'Campaign history'],
        contextInjection: 'Inject relevant context',
        guidelines: 'Remember user preferences',
      };

      const result = MemoryCartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject too many items to remember', () => {
      const invalid = {
        whatToRemember: Array(51).fill('item'),
      };

      const result = MemoryCartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('UICartridgeSchema', () => {
    it('should accept valid UI cartridge', () => {
      const valid = {
        inlineButtons: {
          style: 'blue',
          frequency: '80%',
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
        principle: 'Always provide helpful UI',
      };

      const result = UICartridgeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty UI cartridge', () => {
      const result = UICartridgeSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject too many trigger words', () => {
      const invalid = {
        fullscreenTriggers: {
          when: Array(21).fill('trigger'),
        },
      };

      const result = UICartridgeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ConsoleConfigSchema', () => {
    it('should accept valid complete console config', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'test-console',
        displayName: 'Test Console',
        version: 1,
        systemInstructions: 'Legacy instructions',
        behaviorRules: [{ rule: 'be-helpful' }],
        operationsCartridge: { prd: 'Product spec' },
        systemCartridge: { systemPrompt: 'You are helpful' },
        contextCartridge: { domain: 'Testing' },
        skillsCartridge: { chips: [{ name: 'test', description: 'Test chip' }] },
        pluginsCartridge: { enabled: ['test'] },
        knowledgeCartridge: { documentation: 'Docs' },
        memoryCartridge: { scoping: 'user' },
        uiCartridge: { principle: 'Be helpful' },
      };

      const result = ConsoleConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept minimal console config', () => {
      const minimal = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'minimal',
        displayName: 'Minimal',
        version: 1,
      };

      const result = ConsoleConfigSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalid = {
        id: 'not-a-uuid',
        name: 'test',
        displayName: 'Test',
        version: 1,
      };

      const result = ConsoleConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        // Missing name, displayName, version
      };

      const result = ConsoleConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-positive version', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'test',
        displayName: 'Test',
        version: 0,
      };

      const result = ConsoleConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCartridgeSize', () => {
    it('should accept cartridge within 50KB limit', () => {
      const smallCartridge = { data: 'a'.repeat(1000) }; // ~1KB

      expect(() => validateCartridgeSize(smallCartridge, 'test')).not.toThrow();
    });

    it('should reject cartridge exceeding 50KB limit', () => {
      const largeCartridge = { data: 'a'.repeat(51000) }; // >50KB

      expect(() => validateCartridgeSize(largeCartridge, 'test')).toThrow(
        /too large/
      );
    });

    it('should include cartridge name in error', () => {
      const largeCartridge = { data: 'a'.repeat(51000) };

      expect(() => validateCartridgeSize(largeCartridge, 'systemCartridge')).toThrow(
        /systemCartridge/
      );
    });
  });

  describe('safeParseConsoleConfig', () => {
    it('should successfully parse valid config', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'test',
        displayName: 'Test',
        version: 1,
      };

      const result = safeParseConsoleConfig(valid);
      expect(result.success).toBe(true);
    });

    it('should return detailed errors for invalid config', () => {
      const invalid = {
        id: 'not-uuid',
        name: 'test',
        displayName: 'Test',
        version: -1,
      };

      const result = safeParseConsoleConfig(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });
});
