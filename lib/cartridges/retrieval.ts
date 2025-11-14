/**
 * Cartridge Retrieval Utilities
 *
 * Retrieves Style and Instructions cartridge memories from Mem0 for HGC-v2 system prompt injection.
 *
 * Architecture:
 * - Style cartridges: Mem0 namespace `style::marketing::${userId}`
 * - Instructions cartridges: Mem0 namespace `instructions::marketing::${userId}`
 * - Performance target: <500ms per retrieval
 * - Graceful degradation: Returns empty/default if cartridges don't exist or Mem0 is down
 */

import { getMem0Client } from '@/lib/mem0/client';

const LOG_PREFIX = '[CARTRIDGE_RETRIEVAL]';

/**
 * Style memory structure
 */
export interface StyleMemory {
  tone?: string;
  structure?: string;
  vocabulary?: string;
  examples?: string[];
  patterns?: string[];
}

/**
 * Instruction memory structure
 */
export interface InstructionMemory {
  goals?: string;
  constraints?: string;
  context?: string;
  guidelines?: string[];
}

/**
 * Combined cartridge memories for system prompt
 */
export interface CartridgeMemories {
  style?: StyleMemory;
  instructions?: InstructionMemory;
}

/**
 * Retrieve style cartridge memories from Mem0
 *
 * @param userId - User ID for namespace scoping
 * @returns Style memory or undefined if not found
 */
export async function retrieveStyleCartridge(
  userId: string
): Promise<StyleMemory | undefined> {
  const startTime = Date.now();

  try {
    const mem0 = getMem0Client();
    const namespace = `style::marketing::${userId}`;

    console.log(`${LOG_PREFIX} Retrieving style cartridge for namespace: ${namespace}`);

    // Search for style-related memories
    const results = await mem0.search(
      'writing style tone structure vocabulary patterns examples',
      {
        user_id: namespace,
        limit: 10,
      }
    );

    const duration = Date.now() - startTime;
    console.log(`${LOG_PREFIX} Style retrieval completed in ${duration}ms`);

    if (!results || !Array.isArray(results) || results.length === 0) {
      console.log(`${LOG_PREFIX} No style memories found for user ${userId}`);
      return undefined;
    }

    // Parse memories into structured format
    const styleMemory: StyleMemory = {
      examples: [],
      patterns: [],
    };

    for (const result of results) {
      const content = result.memory || '';

      // Extract tone
      if (content.includes('Tone:') || content.includes('tone:')) {
        const toneMatch = content.match(/Tone:\s*([^\n]+)/i);
        if (toneMatch) {
          styleMemory.tone = toneMatch[1].trim();
        }
      }

      // Extract structure
      if (content.includes('structure') || content.includes('Structure')) {
        const structureMatch = content.match(/(?:Sentence structure|Structure):\s*([^\n]+)/i);
        if (structureMatch) {
          styleMemory.structure = structureMatch[1].trim();
        }
      }

      // Extract vocabulary
      if (content.includes('Vocabulary') || content.includes('vocabulary')) {
        const vocabMatch = content.match(/Vocabulary:\s*([^\n]+)/i);
        if (vocabMatch) {
          styleMemory.vocabulary = vocabMatch[1].trim();
        }
      }

      // Extract patterns
      if (content.includes('patterns') || content.includes('Patterns')) {
        const patternsMatch = content.match(/(?:Common patterns|patterns):\s*([^\n]+)/i);
        if (patternsMatch && styleMemory.patterns) {
          styleMemory.patterns.push(patternsMatch[1].trim());
        }
      }

      // Extract examples
      if (content.includes('Examples') || content.includes('examples')) {
        const examplesSection = content.split(/Examples:/i)[1];
        if (examplesSection && styleMemory.examples) {
          const examples = examplesSection
            .split('\n')
            .filter(line => line.trim().length > 0 && line.trim() !== 'Examples:')
            .map(line => line.trim());
          styleMemory.examples.push(...examples);
        }
      }
    }

    console.log(`${LOG_PREFIX} Parsed style memory:`, {
      hasTone: !!styleMemory.tone,
      hasStructure: !!styleMemory.structure,
      hasVocabulary: !!styleMemory.vocabulary,
      examplesCount: styleMemory.examples?.length || 0,
      patternsCount: styleMemory.patterns?.length || 0,
    });

    // Return style memory even if empty (to differentiate from "not found")
    return styleMemory;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${LOG_PREFIX} Error retrieving style cartridge (${duration}ms):`, error);

    // Graceful degradation: return undefined instead of crashing
    return undefined;
  }
}

/**
 * Retrieve instruction cartridge memories from Mem0
 *
 * @param userId - User ID for namespace scoping
 * @returns Instruction memory or undefined if not found
 */
export async function retrieveInstructionCartridge(
  userId: string
): Promise<InstructionMemory | undefined> {
  const startTime = Date.now();

  try {
    const mem0 = getMem0Client();
    const namespace = `instructions::marketing::${userId}`;

    console.log(`${LOG_PREFIX} Retrieving instruction cartridge for namespace: ${namespace}`);

    // Search for instruction-related memories
    const results = await mem0.search(
      'content generation instructions goals constraints context guidelines',
      {
        user_id: namespace,
        limit: 10,
      }
    );

    const duration = Date.now() - startTime;
    console.log(`${LOG_PREFIX} Instruction retrieval completed in ${duration}ms`);

    if (!results || !Array.isArray(results) || results.length === 0) {
      console.log(`${LOG_PREFIX} No instruction memories found for user ${userId}`);
      return undefined;
    }

    // Parse memories into structured format
    const instructionMemory: InstructionMemory = {
      guidelines: [],
    };

    for (const result of results) {
      const content = result.memory || '';

      // Extract goals
      if (content.includes('Goals:') || content.includes('goals:')) {
        const goalsMatch = content.match(/Goals:\s*([^\n]+(?:\n(?![\w\s]+:)[^\n]+)*)/i);
        if (goalsMatch) {
          instructionMemory.goals = goalsMatch[1].trim();
        }
      }

      // Extract constraints
      if (content.includes('Constraints:') || content.includes('constraints:')) {
        const constraintsMatch = content.match(/Constraints:\s*([^\n]+(?:\n(?![\w\s]+:)[^\n]+)*)/i);
        if (constraintsMatch) {
          instructionMemory.constraints = constraintsMatch[1].trim();
        }
      }

      // Extract context
      if (content.includes('context') || content.includes('Context')) {
        const contextMatch = content.match(/(?:Additional context|Context):\s*([^\n]+(?:\n(?![\w\s]+:)[^\n]+)*)/i);
        if (contextMatch) {
          instructionMemory.context = contextMatch[1].trim();
        }
      }

      // Extract guidelines
      if (content.includes('guidelines') || content.includes('Guidelines')) {
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.trim().match(/^[\-\*•]\s+/)) {
            instructionMemory.guidelines?.push(line.trim().replace(/^[\-\*•]\s+/, ''));
          }
        }
      }
    }

    console.log(`${LOG_PREFIX} Parsed instruction memory:`, {
      hasGoals: !!instructionMemory.goals,
      hasConstraints: !!instructionMemory.constraints,
      hasContext: !!instructionMemory.context,
      guidelinesCount: instructionMemory.guidelines?.length || 0,
    });

    return instructionMemory;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${LOG_PREFIX} Error retrieving instruction cartridge (${duration}ms):`, error);

    // Graceful degradation: return undefined instead of crashing
    return undefined;
  }
}

/**
 * Retrieve all cartridge memories for system prompt injection
 *
 * @param userId - User ID for namespace scoping
 * @returns Combined cartridge memories
 */
export async function retrieveAllCartridges(
  userId: string
): Promise<CartridgeMemories> {
  const startTime = Date.now();

  console.log(`${LOG_PREFIX} Retrieving all cartridges for user: ${userId}`);

  try {
    // Retrieve both cartridges in parallel for performance
    const [style, instructions] = await Promise.all([
      retrieveStyleCartridge(userId),
      retrieveInstructionCartridge(userId),
    ]);

    const duration = Date.now() - startTime;
    console.log(`${LOG_PREFIX} All cartridges retrieved in ${duration}ms`);

    return {
      style,
      instructions,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${LOG_PREFIX} Error retrieving all cartridges (${duration}ms):`, error);

    // Graceful degradation: return empty object
    return {};
  }
}

/**
 * Format style memory for system prompt injection
 *
 * @param style - Style memory to format
 * @returns Formatted string for system prompt
 */
export function formatStyleForPrompt(style: StyleMemory | undefined): string {
  if (!style) return '';

  const parts: string[] = [];

  if (style.tone) {
    parts.push(`Tone: ${style.tone}`);
  }

  if (style.structure) {
    parts.push(`Structure: ${style.structure}`);
  }

  if (style.vocabulary) {
    parts.push(`Vocabulary: ${style.vocabulary}`);
  }

  if (style.patterns && style.patterns.length > 0) {
    parts.push(`Common patterns: ${style.patterns.join(', ')}`);
  }

  if (style.examples && style.examples.length > 0) {
    parts.push(`\nExamples:\n${style.examples.join('\n')}`);
  }

  return parts.join('\n');
}

/**
 * Format instruction memory for system prompt injection
 *
 * @param instructions - Instruction memory to format
 * @returns Formatted string for system prompt
 */
export function formatInstructionsForPrompt(instructions: InstructionMemory | undefined): string {
  if (!instructions) return '';

  const parts: string[] = [];

  if (instructions.goals) {
    parts.push(`Goals: ${instructions.goals}`);
  }

  if (instructions.constraints) {
    parts.push(`Constraints: ${instructions.constraints}`);
  }

  if (instructions.context) {
    parts.push(`Context: ${instructions.context}`);
  }

  if (instructions.guidelines && instructions.guidelines.length > 0) {
    parts.push(`\nGuidelines:\n${instructions.guidelines.map(g => `- ${g}`).join('\n')}`);
  }

  return parts.join('\n');
}
