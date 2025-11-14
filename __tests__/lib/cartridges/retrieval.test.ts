/**
 * Cartridge Retrieval Tests
 *
 * Tests for Style and Instructions cartridge retrieval from Mem0
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  retrieveStyleCartridge,
  retrieveInstructionCartridge,
  retrieveAllCartridges,
  formatStyleForPrompt,
  formatInstructionsForPrompt,
  StyleMemory,
  InstructionMemory,
} from '@/lib/cartridges/retrieval';

// Mock Mem0 client - create a single instance that will be reused
const mockSearchFn = jest.fn();
const mockMem0Instance = {
  search: mockSearchFn,
} as any;

jest.mock('@/lib/mem0/client', () => ({
  getMem0Client: jest.fn(() => mockMem0Instance),
}));

import { getMem0Client } from '@/lib/mem0/client';

describe('Cartridge Retrieval - Style Cartridges', () => {
  const testUserId = 'user-test-123';
  const mockMem0 = mockMem0Instance as jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Successfully retrieve style cartridge
   */
  it('should retrieve style cartridge from Mem0', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: `Writing style analysis for user ${testUserId}:

Tone: Professional and approachable
Sentence structure: Medium-length sentences with varied complexity
Vocabulary: Moderate complexity with industry terms

Common patterns: Uses data-driven insights, starts with questions

Examples:
"Did you know 83% of marketers struggle with lead generation?"
"Here's why your LinkedIn strategy isn't working."`,
      },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const style = await retrieveStyleCartridge(testUserId);

    expect(style).toBeDefined();
    expect(style?.tone).toBe('Professional and approachable');
    expect(style?.structure).toBe('Medium-length sentences with varied complexity');
    expect(style?.vocabulary).toBe('Moderate complexity with industry terms');
    expect(style?.patterns).toContain('Uses data-driven insights, starts with questions');
    expect(style?.examples?.length).toBeGreaterThan(0);

    // Verify correct namespace
    expect(mockMem0.search).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        user_id: `style::marketing::${testUserId}`,
      })
    );
  });

  /**
   * Test 2: Handle no style cartridge found
   */
  it('should return undefined when no style cartridge exists', async () => {
    mockMem0.search.mockResolvedValue([]);

    const style = await retrieveStyleCartridge(testUserId);

    expect(style).toBeUndefined();
  });

  /**
   * Test 3: Handle Mem0 error gracefully
   */
  it('should handle Mem0 error gracefully for style cartridge', async () => {
    mockMem0.search.mockRejectedValue(new Error('Mem0 connection failed'));

    const style = await retrieveStyleCartridge(testUserId);

    expect(style).toBeUndefined(); // Graceful degradation
  });

  /**
   * Test 4: Parse multiple style memories
   */
  it('should parse multiple style memories correctly', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: 'Tone: Casual and friendly\nVocabulary: Simple language',
      },
      {
        id: "test-id-2",
        memory: 'Common patterns: Uses storytelling\nExamples:\n"Let me tell you a story..."',
      },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const style = await retrieveStyleCartridge(testUserId);

    expect(style?.tone).toBe('Casual and friendly');
    expect(style?.vocabulary).toBe('Simple language');
    expect(style?.patterns?.length).toBeGreaterThan(0);
    expect(style?.examples?.length).toBeGreaterThan(0);
  });

  /**
   * Test 5: Performance - retrieval under 500ms
   */
  it('should retrieve style cartridge in under 500ms', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: 'Tone: Professional',
      },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const startTime = Date.now();
    await retrieveStyleCartridge(testUserId);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
  });

  /**
   * Test 6: Extract examples from style memory
   */
  it('should extract examples correctly from style memory', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: `Examples:
"Example sentence 1"
"Example sentence 2"
"Example sentence 3"`,
        },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const style = await retrieveStyleCartridge(testUserId);

    expect(style?.examples).toBeDefined();
    expect(style?.examples?.length).toBeGreaterThanOrEqual(3);
  });

  /**
   * Test 7: Handle partial style data
   */
  it('should handle partial style data gracefully', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: 'Tone: Formal', // Only tone, no other fields
        },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const style = await retrieveStyleCartridge(testUserId);

    expect(style).toBeDefined();
    expect(style?.tone).toBe('Formal');
    expect(style?.structure).toBeUndefined();
    expect(style?.vocabulary).toBeUndefined();
  });
});

describe('Cartridge Retrieval - Instruction Cartridges', () => {
  const testUserId = 'user-test-456';
  const mockMem0 = getMem0Client() as jest.Mocked<ReturnType<typeof getMem0Client>>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 8: Successfully retrieve instruction cartridge
   */
  it('should retrieve instruction cartridge from Mem0', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: `Content generation instructions for user ${testUserId}:

Goals:
Generate LinkedIn posts that drive engagement and conversions

Constraints:
- Keep posts under 1300 characters
- Include clear call-to-action
- Use data-driven insights

Additional context:
Target audience is B2B SaaS founders`,
        },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const instructions = await retrieveInstructionCartridge(testUserId);

    expect(instructions).toBeDefined();
    expect(instructions?.goals).toContain('Generate LinkedIn posts');
    expect(instructions?.constraints).toContain('Keep posts under 1300 characters');
    expect(instructions?.context).toContain('B2B SaaS founders');

    // Verify correct namespace
    expect(mockMem0.search).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        user_id: `instructions::marketing::${testUserId}`,
      })
    );
  });

  /**
   * Test 9: Handle no instruction cartridge found
   */
  it('should return undefined when no instruction cartridge exists', async () => {
    mockMem0.search.mockResolvedValue([]);

    const instructions = await retrieveInstructionCartridge(testUserId);

    expect(instructions).toBeUndefined();
  });

  /**
   * Test 10: Handle Mem0 error gracefully
   */
  it('should handle Mem0 error gracefully for instruction cartridge', async () => {
    mockMem0.search.mockRejectedValue(new Error('Mem0 timeout'));

    const instructions = await retrieveInstructionCartridge(testUserId);

    expect(instructions).toBeUndefined(); // Graceful degradation
  });

  /**
   * Test 11: Parse multiple instruction memories
   */
  it('should parse multiple instruction memories correctly', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: 'Goals:\nIncrease brand awareness',
        },
        {
          id: "test-id-2",
          memory: 'Constraints:\nNo promotional language',
        },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const instructions = await retrieveInstructionCartridge(testUserId);

    expect(instructions?.goals).toContain('Increase brand awareness');
    expect(instructions?.constraints).toContain('No promotional language');
  });

  /**
   * Test 12: Performance - retrieval under 500ms
   */
  it('should retrieve instruction cartridge in under 500ms', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: 'Goals: Test goal',
        },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const startTime = Date.now();
    await retrieveInstructionCartridge(testUserId);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
  });

  /**
   * Test 13: Extract guidelines from instruction memory
   */
  it('should extract guidelines correctly from instruction memory', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: `Guidelines:
- Always include statistics
- Use engaging hooks
- End with clear CTA`,
        },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const instructions = await retrieveInstructionCartridge(testUserId);

    expect(instructions?.guidelines).toBeDefined();
    expect(instructions?.guidelines?.length).toBe(3);
    expect(instructions?.guidelines?.[0]).toContain('statistics');
  });

  /**
   * Test 14: Handle partial instruction data
   */
  it('should handle partial instruction data gracefully', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: 'Goals: Only goals provided', // Only goals, no other fields
        },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const instructions = await retrieveInstructionCartridge(testUserId);

    expect(instructions).toBeDefined();
    expect(instructions?.goals).toBe('Only goals provided');
    expect(instructions?.constraints).toBeUndefined();
    expect(instructions?.context).toBeUndefined();
  });
});

describe('Cartridge Retrieval - Combined Retrieval', () => {
  const testUserId = 'user-test-789';
  const mockMem0 = getMem0Client() as jest.Mocked<ReturnType<typeof getMem0Client>>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 15: Retrieve all cartridges successfully
   */
  it('should retrieve both style and instruction cartridges', async () => {
    const mockStyleResults = [{
      id: "test-id",
      memory: 'Tone: Professional' }];
    const mockInstructionResults = [{
      id: "test-id",
      memory: 'Goals: Test goals' }];

    mockMem0.search
      .mockResolvedValueOnce(mockStyleResults)
      .mockResolvedValueOnce(mockInstructionResults);

    const cartridges = await retrieveAllCartridges(testUserId);

    expect(cartridges.style).toBeDefined();
    expect(cartridges.instructions).toBeDefined();
  });

  /**
   * Test 16: Handle missing style cartridge
   */
  it('should handle missing style cartridge gracefully', async () => {
    mockMem0.search
      .mockResolvedValueOnce([]) // No style
      .mockResolvedValueOnce([{
      id: "test-id",
      memory: 'Goals: Test' }]); // Has instructions

    const cartridges = await retrieveAllCartridges(testUserId);

    expect(cartridges.style).toBeUndefined();
    expect(cartridges.instructions).toBeDefined();
  });

  /**
   * Test 17: Handle missing instruction cartridge
   */
  it('should handle missing instruction cartridge gracefully', async () => {
    mockMem0.search
      .mockResolvedValueOnce([{
      id: "test-id",
      memory: 'Tone: Casual' }]) // Has style
      .mockResolvedValueOnce([]); // No instructions

    const cartridges = await retrieveAllCartridges(testUserId);

    expect(cartridges.style).toBeDefined();
    expect(cartridges.instructions).toBeUndefined();
  });

  /**
   * Test 18: Handle both cartridges missing
   */
  it('should handle both cartridges missing gracefully', async () => {
    mockMem0.search
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const cartridges = await retrieveAllCartridges(testUserId);

    expect(cartridges.style).toBeUndefined();
    expect(cartridges.instructions).toBeUndefined();
  });

  /**
   * Test 19: Performance - parallel retrieval
   */
  it('should retrieve both cartridges in parallel', async () => {
    const mockResults = [{
      id: "test-id",
      memory: 'Test' }];
    mockMem0.search.mockResolvedValue(mockResults);

    const startTime = Date.now();
    await retrieveAllCartridges(testUserId);
    const duration = Date.now() - startTime;

    // Should be faster than sequential (expect <600ms for both in parallel)
    expect(duration).toBeLessThan(600);

    // Verify both searches were called
    expect(mockMem0.search).toHaveBeenCalledTimes(2);
  });

  /**
   * Test 20: Handle complete Mem0 failure
   */
  it('should handle complete Mem0 failure gracefully', async () => {
    mockMem0.search.mockRejectedValue(new Error('Mem0 service unavailable'));

    const cartridges = await retrieveAllCartridges(testUserId);

    // Should return empty object instead of crashing
    expect(cartridges).toEqual({});
  });
});

describe('Cartridge Formatting - System Prompt', () => {
  /**
   * Test 21: Format complete style memory
   */
  it('should format complete style memory for prompt', () => {
    const style: StyleMemory = {
      tone: 'Professional and friendly',
      structure: 'Medium sentences',
      vocabulary: 'Simple with industry terms',
      patterns: ['Uses questions', 'Data-driven'],
      examples: ['Example 1', 'Example 2'],
    };

    const formatted = formatStyleForPrompt(style);

    expect(formatted).toContain('Tone: Professional and friendly');
    expect(formatted).toContain('Structure: Medium sentences');
    expect(formatted).toContain('Vocabulary: Simple with industry terms');
    expect(formatted).toContain('Uses questions');
    expect(formatted).toContain('Example 1');
  });

  /**
   * Test 22: Format partial style memory
   */
  it('should format partial style memory for prompt', () => {
    const style: StyleMemory = {
      tone: 'Casual',
    };

    const formatted = formatStyleForPrompt(style);

    expect(formatted).toBe('Tone: Casual');
  });

  /**
   * Test 23: Format undefined style memory
   */
  it('should return empty string for undefined style', () => {
    const formatted = formatStyleForPrompt(undefined);

    expect(formatted).toBe('');
  });

  /**
   * Test 24: Format complete instruction memory
   */
  it('should format complete instruction memory for prompt', () => {
    const instructions: InstructionMemory = {
      goals: 'Increase engagement',
      constraints: 'No promotional language',
      context: 'B2B SaaS audience',
      guidelines: ['Use statistics', 'Include CTA'],
    };

    const formatted = formatInstructionsForPrompt(instructions);

    expect(formatted).toContain('Goals: Increase engagement');
    expect(formatted).toContain('Constraints: No promotional language');
    expect(formatted).toContain('Context: B2B SaaS audience');
    expect(formatted).toContain('- Use statistics');
    expect(formatted).toContain('- Include CTA');
  });

  /**
   * Test 25: Format partial instruction memory
   */
  it('should format partial instruction memory for prompt', () => {
    const instructions: InstructionMemory = {
      goals: 'Test goals only',
    };

    const formatted = formatInstructionsForPrompt(instructions);

    expect(formatted).toBe('Goals: Test goals only');
  });

  /**
   * Test 26: Format undefined instruction memory
   */
  it('should return empty string for undefined instructions', () => {
    const formatted = formatInstructionsForPrompt(undefined);

    expect(formatted).toBe('');
  });
});

describe('Cartridge Retrieval - Edge Cases', () => {
  const mockMem0 = getMem0Client() as jest.Mocked<ReturnType<typeof getMem0Client>>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 27: Handle malformed memory content
   */
  it('should handle malformed memory content gracefully', async () => {
    const mockResults = [
      {
      id: "test-id",
      memory: 'This is malformed content without proper structure',
        },
    ];

    mockMem0.search.mockResolvedValue(mockResults);

    const style = await retrieveStyleCartridge('user-test');

    // Should return an object even if parsing fails
    expect(style).toBeDefined();
  });

  /**
   * Test 28: Handle empty memory strings
   */
  it('should handle empty memory strings gracefully', async () => {
    const mockResults = [{
      id: "test-id",
      memory: '' }];

    mockMem0.search.mockResolvedValue(mockResults);

    const style = await retrieveStyleCartridge('user-test');

    expect(style).toBeDefined();
  });

  /**
   * Test 29: Handle null results from Mem0
   */
  it('should handle null results from Mem0', async () => {
    mockMem0.search.mockResolvedValue(null as any);

    const style = await retrieveStyleCartridge('user-test');

    expect(style).toBeUndefined();
  });

  /**
   * Test 30: Verify correct search query
   */
  it('should use correct search query for style cartridge', async () => {
    mockMem0.search.mockResolvedValue([]);

    await retrieveStyleCartridge('user-test');

    expect(mockMem0.search).toHaveBeenCalledWith(
      expect.stringContaining('writing style'),
      expect.objectContaining({
        limit: 10,
      })
    );
  });

  /**
   * Test 31: Verify correct search query for instructions
   */
  it('should use correct search query for instruction cartridge', async () => {
    mockMem0.search.mockResolvedValue([]);

    await retrieveInstructionCartridge('user-test');

    expect(mockMem0.search).toHaveBeenCalledWith(
      expect.stringContaining('content generation instructions'),
      expect.objectContaining({
        limit: 10,
      })
    );
  });
});
