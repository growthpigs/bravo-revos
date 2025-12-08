/**
 * Console System Integration Test
 *
 * Tests the complete flow: load → validate → assemble → use
 */

import { loadConsolePrompt, assembleSystemPrompt } from '@/lib/console/console-loader';
import { safeParseConsoleConfig } from '@/lib/validations/console';

// Mock Supabase factory
function createMockSupabase(mockData: any) {
  const chainMethods: any = {
    select: jest.fn(function (this: any) {
      return chainMethods;
    }),
    eq: jest.fn(function (this: any) {
      return chainMethods;
    }),
    single: jest.fn().mockResolvedValue({
      data: mockData,
      error: null,
    }),
  };

  return {
    from: jest.fn(() => chainMethods),
    __mockChain: chainMethods,
  } as any;
}

describe('Console System Integration', () => {
  it('should load, validate, and assemble a complete console', async () => {
    // 1. Mock database data (what we expect from migration 036)
    const mockDatabaseData = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'marketing-console-v1',
      display_name: 'Marketing Console V1',
      system_instructions: 'Legacy prompt',
      behavior_rules: [],
      version: 2,
      operations_cartridge: {
        prd: 'RevOS is an AI-powered LinkedIn growth platform',
        userStories: ['Story 1', 'Story 2'],
        requirements: 'Pod coordination, campaign management',
      },
      system_cartridge: {
        systemPrompt: 'You are RevOS Intelligence, a marketing expert',
        role: 'Marketing Automation Expert',
        rules: 'Be professional and data-driven',
      },
      context_cartridge: {
        domain: 'LinkedIn marketing automation',
        appFeatures: ['Pod amplification', 'Campaign management'],
        structure: 'Console → Cartridge → Chip hierarchy',
      },
      skills_cartridge: {
        chips: [
          { name: 'dm_scraper', description: 'Scrapes LinkedIn DMs' },
          { name: 'email_extractor', description: 'Extracts emails' },
        ],
      },
      plugins_cartridge: {
        enabled: ['mem0', 'agentkit'],
        required: ['mem0'],
        description: 'Memory and orchestration',
      },
      knowledge_cartridge: {
        documentation: 'RevOS documentation',
        examples: ['Example 1', 'Example 2'],
        bestPractices: 'Follow HGC architecture',
      },
      memory_cartridge: {
        scoping: 'agencyId::clientId::userId',
        whatToRemember: ['User preferences', 'Campaign history'],
        guidelines: 'Remember context across sessions',
      },
      ui_cartridge: {
        inlineButtons: {
          frequency: '80%',
          style: 'Professional buttons',
          placement: 'Below message',
        },
        principle: 'Always provide helpful UI',
      },
    };

    const supabase = createMockSupabase(mockDatabaseData);

    // 2. Load console from database
    const consoleConfig = await loadConsolePrompt('marketing-console-v1', supabase);

    // 3. Verify data structure (snake_case → camelCase)
    expect(consoleConfig.name).toBe('marketing-console-v1');
    expect(consoleConfig.displayName).toBe('Marketing Console V1');
    expect(consoleConfig.version).toBe(2);
    expect(consoleConfig.operationsCartridge).toBeDefined();
    expect(consoleConfig.systemCartridge).toBeDefined();
    expect(consoleConfig.contextCartridge).toBeDefined();
    expect(consoleConfig.skillsCartridge).toBeDefined();
    expect(consoleConfig.pluginsCartridge).toBeDefined();
    expect(consoleConfig.knowledgeCartridge).toBeDefined();
    expect(consoleConfig.memoryCartridge).toBeDefined();
    expect(consoleConfig.uiCartridge).toBeDefined();

    // 4. Validate with Zod schema
    const validation = safeParseConsoleConfig(consoleConfig);
    expect(validation.success).toBe(true);

    // 5. Assemble system prompt from all cartridges
    const systemPrompt = assembleSystemPrompt(consoleConfig);

    // 6. Verify prompt includes content from all cartridges
    expect(systemPrompt).toContain('RevOS Intelligence'); // system_cartridge
    expect(systemPrompt).toContain('Marketing Automation Expert'); // role
    expect(systemPrompt).toContain('dm_scraper'); // skills_cartridge
    expect(systemPrompt).toContain('Scrapes LinkedIn DMs'); // chip description
    expect(systemPrompt).toContain('LinkedIn marketing automation'); // context_cartridge
    expect(systemPrompt).toContain('80%'); // ui_cartridge
    expect(systemPrompt).toContain('agencyId::clientId::userId'); // memory_cartridge
    expect(systemPrompt).toContain("Follow HGC architecture"); // knowledge_cartridge (bestPractices)
    expect(systemPrompt).toContain('mem0'); // plugins_cartridge

    // 7. Verify prompt structure is well-formed

    // 8. Verify prompt is not too large (should be < 8000 tokens)
    const approximateTokens = systemPrompt.length / 4;
    expect(approximateTokens).toBeLessThan(8000);

    console.log('[Integration Test] System prompt assembled successfully');
    console.log(`[Integration Test] Prompt length: ${systemPrompt.length} chars (~${Math.floor(approximateTokens)} tokens)`);
  });

  it('should handle empty cartridges gracefully', async () => {
    const mockDatabaseData = {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      name: 'minimal-console',
      display_name: 'Minimal Console',
      system_instructions: 'Fallback instructions',
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
    };

    const supabase = createMockSupabase(mockDatabaseData);

    const consoleConfig = await loadConsolePrompt('minimal-console', supabase);
    const validation = safeParseConsoleConfig(consoleConfig);

    expect(validation.success).toBe(true);

    const systemPrompt = assembleSystemPrompt(consoleConfig);

    // Should fall back to legacy system_instructions
    expect(systemPrompt).toBe('Fallback instructions');
  });

  it('should provide safe defaults when cartridges have partial data', async () => {
    const mockDatabaseData = {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      name: 'partial-console',
      display_name: 'Partial Console',
      system_instructions: '',
      behavior_rules: [],
      version: 1,
      operations_cartridge: {},
      system_cartridge: {
        systemPrompt: 'Custom prompt',
        // role and rules are missing
      },
      context_cartridge: {
        domain: 'Testing',
        // appFeatures and structure missing
      },
      skills_cartridge: {
        // chips missing
      },
      plugins_cartridge: {},
      knowledge_cartridge: {},
      memory_cartridge: {},
      ui_cartridge: {},
    };

    const supabase = createMockSupabase(mockDatabaseData);

    const consoleConfig = await loadConsolePrompt('partial-console', supabase);
    const systemPrompt = assembleSystemPrompt(consoleConfig);

    // Should use safe defaults
    expect(systemPrompt).toContain('Custom prompt');
    expect(systemPrompt).toContain('ROLE: Assistant'); // Default role
    expect(systemPrompt).toContain('Be helpful and professional'); // Default rules
    expect(systemPrompt).toContain('Domain: Testing');
    expect(systemPrompt).toContain('No specific capabilities defined'); // Default for empty chips
  });

  it('should match HGC V2 usage pattern', async () => {
    // This test verifies the integration pattern used in app/api/hgc-v2/route.ts
    const mockDatabaseData = {
      id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      name: 'marketing-console-v1',
      display_name: 'Marketing Console V1',
      system_instructions: '',
      behavior_rules: [],
      version: 1,
      operations_cartridge: {},
      system_cartridge: {
        systemPrompt: 'You are a test assistant',
      },
      context_cartridge: {},
      skills_cartridge: {},
      plugins_cartridge: {},
      knowledge_cartridge: {},
      memory_cartridge: {},
      ui_cartridge: {},
    };

    const supabase = createMockSupabase(mockDatabaseData);

    // Simulate HGC V2 flow
    let consoleConfig;
    try {
      consoleConfig = await loadConsolePrompt('marketing-console-v1', supabase);
    } catch (error) {
      // Fallback to DEFAULT_CONSOLE (as in HGC V2)
      consoleConfig = {
        id: 'fallback',
        name: 'fallback-console',
        displayName: 'Fallback Console',
        systemInstructions: 'Fallback prompt',
        behaviorRules: [],
        version: 0,
      };
    }

    // This is what gets passed to MarketingConsole
    const baseInstructions = assembleSystemPrompt(consoleConfig);

    expect(baseInstructions).toBeDefined();
    expect(baseInstructions.length).toBeGreaterThan(0);
    expect(baseInstructions).toContain('You are a test assistant');
  });
});
