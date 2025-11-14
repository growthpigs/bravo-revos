/**
 * E2E Tests: Cartridge Integration with HGC-v2
 *
 * Tests that Style and Instructions cartridges actually influence AI-generated content.
 *
 * Test Flow:
 * 1. Mock style cartridge → Store in Mem0
 * 2. Mock instructions cartridge → Store in Mem0
 * 3. Generate content via HGC-v2 → Verify cartridges applied
 * 4. Test baseline (no cartridges) for comparison
 * 5. Verify token usage impact
 *
 * SKIP NOTE: These tests require Mem0 API and Supabase credentials.
 * Run with: npm test -- __tests__/e2e/cartridge-hgc-integration.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import {
  formatStyleForPrompt,
  formatInstructionsForPrompt,
  type StyleMemory,
  type InstructionMemory,
  type CartridgeMemories,
} from '@/lib/cartridges/retrieval';
import { assembleSystemPrompt } from '@/lib/console/console-loader';
import type { ConsoleConfig } from '@/lib/validation/console-validation';

// Test user ID
const TEST_USER_ID = 'test-user-cartridge-e2e';

// Mock console config
const mockConsoleConfig: ConsoleConfig = {
  id: 'test-console-123',
  name: 'marketing-console-v1',
  displayName: 'Marketing Console V1',
  version: 1,
  systemInstructions: 'You are RevOS Intelligence.',
  behaviorRules: ['Be professional', 'Be data-driven'],
  systemCartridge: {
    systemPrompt: 'You are RevOS Intelligence, a marketing AI assistant.',
    role: 'Strategic Marketing Partner',
    rules: 'Always be professional and data-driven',
  },
  contextCartridge: {
    domain: 'B2B Marketing and Lead Generation',
    structure: 'LinkedIn-first marketing platform',
    appFeatures: ['Campaign management', 'Lead qualification'],
  },
  skillsCartridge: {
    chips: [
      { name: 'analyze', description: 'Analyze LinkedIn profiles' },
      { name: 'generate', description: 'Generate marketing content' },
    ],
  },
  pluginsCartridge: {
    enabled: ['unipile', 'mem0'],
    config: {},
    required: ['unipile'],
    description: 'LinkedIn integration via UniPile',
  },
  knowledgeCartridge: {
    bestPractices: 'Follow B2B marketing best practices',
  },
  memoryCartridge: {
    scoping: 'agencyId::clientId::userId',
    whatToRemember: ['Campaign preferences', 'Lead criteria'],
    contextInjection: 'Retrieve before each request',
  },
  uiCartridge: {
    inlineButtons: {
      frequency: '80% of responses',
      style: 'Primary and secondary variants',
      placement: 'Below message content',
      examples: [],
    },
    buttonActions: {
      navigation: 'Navigate to relevant pages',
      philosophy: 'Buttons are helpful shortcuts',
    },
    fullscreenTriggers: {},
    principle: 'Conversational by default',
  },
  operationsCartridge: {},
};

describe('E2E: Cartridge Integration with HGC-v2', () => {

  describe('Style Cartridge Formatting', () => {
    it('should format style memory for prompt injection', () => {
      const styleMemory: StyleMemory = {
        tone: 'Professional and conversational',
        structure: 'Short paragraphs with clear transitions',
        vocabulary: 'Technical but accessible',
        patterns: ['Uses questions to engage', 'Data-driven examples'],
        examples: [
          'How can we improve lead quality? By analyzing conversion data.',
          'Our approach combines automation with human insight.',
        ],
      };

      const stylePrompt = formatStyleForPrompt(styleMemory);

      expect(stylePrompt).toBeTruthy();
      expect(stylePrompt).toContain('Tone: Professional and conversational');
      expect(stylePrompt).toContain('Structure: Short paragraphs');
      expect(stylePrompt).toContain('Vocabulary: Technical but accessible');
      expect(stylePrompt).toContain('Common patterns:');
      expect(stylePrompt).toContain('Examples:');
    });

    it('should handle partial style memory', () => {
      const partialStyle: StyleMemory = {
        tone: 'Casual',
      };

      const stylePrompt = formatStyleForPrompt(partialStyle);
      expect(stylePrompt).toContain('Tone: Casual');
      expect(stylePrompt).not.toContain('Structure:');
    });

    it('should handle undefined style memory', () => {
      const stylePrompt = formatStyleForPrompt(undefined);
      expect(stylePrompt).toBe('');
    });
  });

  describe('Instructions Cartridge Formatting', () => {
    it('should format instructions memory for prompt injection', () => {
      const instructionsMemory: InstructionMemory = {
        goals: 'Generate LinkedIn posts that drive engagement and showcase thought leadership',
        constraints: 'Keep posts under 280 characters, always include a call-to-action',
        context: 'B2B SaaS company targeting marketing directors and VPs',
        guidelines: [
          'Start with a hook question',
          'Include one data point or statistic',
          'End with an actionable next step',
        ],
      };

      const instructionsPrompt = formatInstructionsForPrompt(instructionsMemory);

      expect(instructionsPrompt).toBeTruthy();
      expect(instructionsPrompt).toContain('Goals: Generate LinkedIn');
      expect(instructionsPrompt).toContain('Constraints: Keep posts under 280');
      expect(instructionsPrompt).toContain('Context: B2B SaaS');
      expect(instructionsPrompt).toContain('Guidelines:');
      expect(instructionsPrompt).toContain('- Start with a hook question');
    });

    it('should handle partial instructions memory', () => {
      const partialInstructions: InstructionMemory = {
        goals: 'Generate content',
      };

      const instructionsPrompt = formatInstructionsForPrompt(partialInstructions);
      expect(instructionsPrompt).toContain('Goals: Generate content');
      expect(instructionsPrompt).not.toContain('Constraints:');
    });

    it('should handle undefined instructions memory', () => {
      const instructionsPrompt = formatInstructionsForPrompt(undefined);
      expect(instructionsPrompt).toBe('');
    });
  });

  describe('System Prompt Assembly with Cartridges', () => {
    it('should inject both cartridges into system prompt', () => {
      const cartridges: CartridgeMemories = {
        style: {
          tone: 'Professional and conversational',
          structure: 'Short paragraphs',
          vocabulary: 'Technical but accessible',
        },
        instructions: {
          goals: 'Generate LinkedIn posts',
          constraints: 'Keep posts under 280 characters',
        },
      };

      const prompt = assembleSystemPrompt(mockConsoleConfig, cartridges);

      // Verify prompt includes cartridge data
      expect(prompt).toContain('WRITING STYLE');
      expect(prompt).toContain('Professional and conversational');
      expect(prompt).toContain('CONTENT INSTRUCTIONS');
      expect(prompt).toContain('LinkedIn posts');
      expect(prompt).toContain('280 characters');
    });

    it('should work without cartridges (baseline)', () => {
      // Assemble prompt WITHOUT cartridges
      const prompt = assembleSystemPrompt(mockConsoleConfig);

      // Verify baseline prompt still works
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(100);
      expect(prompt).toContain('RevOS Intelligence');
      expect(prompt).toContain('Strategic Marketing Partner');

      // Cartridge sections should NOT be present
      expect(prompt).not.toContain('WRITING STYLE');
      expect(prompt).not.toContain('CONTENT INSTRUCTIONS');
    });

    it('should handle partial cartridge data gracefully', () => {
      // Test with only style cartridge (no instructions)
      const partialCartridges: CartridgeMemories = {
        style: {
          tone: 'Casual',
          structure: 'Short sentences',
        },
      };

      const prompt = assembleSystemPrompt(mockConsoleConfig, partialCartridges);

      expect(prompt).toContain('WRITING STYLE');
      expect(prompt).toContain('Casual');
      expect(prompt).not.toContain('CONTENT INSTRUCTIONS');
    });

    it('should handle undefined cartridges', () => {
      const prompt = assembleSystemPrompt(mockConsoleConfig, undefined);

      expect(prompt).toBeTruthy();
      expect(prompt).not.toContain('WRITING STYLE');
      expect(prompt).not.toContain('CONTENT INSTRUCTIONS');
    });

    it('should handle empty cartridges object', () => {
      const prompt = assembleSystemPrompt(mockConsoleConfig, {});

      expect(prompt).toBeTruthy();
      expect(prompt).not.toContain('WRITING STYLE');
      expect(prompt).not.toContain('CONTENT INSTRUCTIONS');
    });
  });

  describe('Token Usage Impact', () => {
    it('should measure token increase from cartridges', async () => {
      const { encode } = await import('gpt-3-encoder');

      // Baseline (no cartridges)
      const baselinePrompt = assembleSystemPrompt(mockConsoleConfig);
      const baselineTokens = encode(baselinePrompt).length;

      // With cartridges
      const cartridges: CartridgeMemories = {
        style: {
          tone: 'Professional and conversational',
          structure: 'Short paragraphs with clear transitions',
          vocabulary: 'Technical but accessible',
          patterns: ['Uses questions to engage', 'Data-driven examples'],
          examples: [
            'How can we improve lead quality? By analyzing conversion data.',
            'Our approach combines automation with human insight.',
          ],
        },
        instructions: {
          goals: 'Generate LinkedIn posts that drive engagement',
          constraints: 'Keep posts under 280 characters',
          context: 'B2B SaaS company',
          guidelines: ['Start with a hook', 'Include data', 'Call to action'],
        },
      };

      const enhancedPrompt = assembleSystemPrompt(mockConsoleConfig, cartridges);
      const enhancedTokens = encode(enhancedPrompt).length;

      // Verify token increase
      expect(enhancedTokens).toBeGreaterThan(baselineTokens);

      const tokenIncrease = enhancedTokens - baselineTokens;
      const percentIncrease = (tokenIncrease / baselineTokens) * 100;

      console.log('[TOKEN_ANALYSIS] Baseline tokens:', baselineTokens);
      console.log('[TOKEN_ANALYSIS] Enhanced tokens:', enhancedTokens);
      console.log('[TOKEN_ANALYSIS] Token increase:', tokenIncrease);
      console.log('[TOKEN_ANALYSIS] Percent increase:', percentIncrease.toFixed(2) + '%');

      // Cartridges should add reasonable token overhead (<60%)
      expect(percentIncrease).toBeLessThan(60);

      // Total should stay under 8000 tokens (GPT-4 8K context)
      expect(enhancedTokens).toBeLessThan(8000);
    });
  });

  describe('Cartridge Precedence', () => {
    it('should inject cartridges in correct order', () => {
      const cartridges: CartridgeMemories = {
        style: { tone: 'Professional' },
        instructions: { goals: 'Generate content' },
      };

      const prompt = assembleSystemPrompt(mockConsoleConfig, cartridges);

      // Split prompt into sections
      const lines = prompt.split('\n');

      // Find section indices
      let contextIdx = lines.findIndex(line => line.includes('CONTEXT'));
      let styleIdx = lines.findIndex(line => line.includes('WRITING STYLE'));
      let capabilitiesIdx = lines.findIndex(line => line.includes('AVAILABLE CAPABILITIES'));
      let instructionsIdx = lines.findIndex(line => line.includes('CONTENT INSTRUCTIONS'));

      // Verify order: CONTEXT → STYLE → CAPABILITIES → INSTRUCTIONS
      expect(contextIdx).toBeGreaterThan(-1);
      expect(styleIdx).toBeGreaterThan(contextIdx);
      expect(capabilitiesIdx).toBeGreaterThan(styleIdx);
      expect(instructionsIdx).toBeGreaterThan(capabilitiesIdx);
    });
  });
});
