/**
 * Memory Injector
 *
 * Injects relevant memories into system prompts.
 * Detects memory recall queries ("Do you remember...").
 */

import type {
  Memory,
  MemoryInjection,
  RecallDetection,
  MemorySearchRequest,
} from './types';
import { getMem0Service, initializeMem0Service } from './mem0-service';

/**
 * Memory recall patterns
 */
const RECALL_PATTERNS = [
  { pattern: /do you remember/i, confidence: 0.95 },
  { pattern: /we (discussed|talked about|decided)/i, confidence: 0.9 },
  { pattern: /you (told|said|mentioned)/i, confidence: 0.85 },
  { pattern: /remind me (of|about)/i, confidence: 0.9 },
  { pattern: /last (time|session|conversation)/i, confidence: 0.8 },
  { pattern: /what did (i|we|you) (say|discuss|decide)/i, confidence: 0.9 },
  { pattern: /previously/i, confidence: 0.7 },
  { pattern: /before,? you/i, confidence: 0.75 },
  { pattern: /our earlier (conversation|discussion)/i, confidence: 0.85 },
  { pattern: /you mentioned/i, confidence: 0.85 },
];

/**
 * Time reference patterns
 */
const TIME_PATTERNS = [
  { pattern: /yesterday/i, value: 'yesterday' },
  { pattern: /last week/i, value: 'last week' },
  { pattern: /last month/i, value: 'last month' },
  { pattern: /earlier today/i, value: 'earlier today' },
  { pattern: /a few days ago/i, value: 'a few days ago' },
  { pattern: /recently/i, value: 'recently' },
];

/**
 * MemoryInjector - Inject memories into system prompts
 */
export class MemoryInjector {
  private maxMemories: number = 5;
  private minRelevanceScore: number = 0.5;

  /**
   * Detect if query is asking about memories
   */
  detectRecall(query: string): RecallDetection {
    let maxConfidence = 0;
    let isRecallQuery = false;

    // Check recall patterns
    for (const { pattern, confidence } of RECALL_PATTERNS) {
      if (pattern.test(query)) {
        isRecallQuery = true;
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }

    // Extract time reference if any
    let timeReference: string | undefined;
    for (const { pattern, value } of TIME_PATTERNS) {
      if (pattern.test(query)) {
        timeReference = value;
        break;
      }
    }

    // Extract topic (simplified - could use NLP)
    const extractedTopic = this.extractTopic(query);

    // Build suggested search query
    const suggestedSearchQuery = this.buildSearchQuery(
      query,
      extractedTopic,
      timeReference
    );

    return {
      isRecallQuery,
      confidence: maxConfidence,
      extractedTopic,
      timeReference,
      suggestedSearchQuery,
    };
  }

  /**
   * Extract topic from recall query
   */
  private extractTopic(query: string): string | undefined {
    // Remove recall phrases to get the topic
    let topic = query
      .replace(/do you remember/gi, '')
      .replace(/we (discussed|talked about|decided)/gi, '')
      .replace(/you (told|said|mentioned)/gi, '')
      .replace(/remind me (of|about)/gi, '')
      .replace(/last (time|session|conversation)/gi, '')
      .replace(/what did (i|we|you) (say|discuss|decide)/gi, '')
      .replace(/\?/g, '')
      .trim();

    // Clean up common words
    topic = topic
      .replace(/^(the|a|an|about|regarding)\s+/i, '')
      .replace(/\s+(earlier|before|previously)$/i, '')
      .trim();

    return topic.length > 2 ? topic : undefined;
  }

  /**
   * Build search query from recall components
   */
  private buildSearchQuery(
    originalQuery: string,
    topic?: string,
    timeReference?: string
  ): string {
    if (topic) {
      return topic;
    }
    // Fall back to cleaned original query
    return originalQuery
      .replace(/do you remember/gi, '')
      .replace(/remind me/gi, '')
      .trim();
  }

  /**
   * Inject relevant memories into system prompt
   */
  async injectMemories(
    query: string,
    agencyId: string,
    userId: string
  ): Promise<MemoryInjection> {
    // Auto-initialize if not already done
    let mem0 = getMem0Service();
    if (!mem0) {
      try {
        mem0 = initializeMem0Service();
      } catch (error) {
        console.warn('[Memory] Failed to initialize Mem0:', error);
        return {
          contextBlock: '',
          memories: [],
          relevanceExplanation: 'Memory service not available',
        };
      }
    }

    // Search for relevant memories
    const searchResult = await mem0.searchMemories({
      query,
      agencyId,
      userId,
      limit: this.maxMemories,
      minScore: this.minRelevanceScore,
    });

    if (searchResult.memories.length === 0) {
      return {
        contextBlock: '',
        memories: [],
        relevanceExplanation: 'No relevant memories found',
      };
    }

    // Build context block
    const contextBlock = this.buildContextBlock(searchResult.memories);
    const relevanceExplanation = this.buildRelevanceExplanation(
      searchResult.memories
    );

    return {
      contextBlock,
      memories: searchResult.memories,
      relevanceExplanation,
    };
  }

  /**
   * Build memory context block for system prompt
   */
  private buildContextBlock(memories: Memory[]): string {
    if (memories.length === 0) {
      return '';
    }

    const lines = [
      '<user_memory_context>',
      'The following is relevant context from previous conversations:',
      '',
    ];

    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      const typeLabel = this.getTypeLabel(memory.metadata.type);
      lines.push(`[${i + 1}] ${typeLabel}: ${memory.content}`);

      if (memory.metadata.topic) {
        lines.push(`    Topic: ${memory.metadata.topic}`);
      }
    }

    lines.push('');
    lines.push(
      'Use this context to provide more personalized and relevant responses.'
    );
    lines.push('</user_memory_context>');

    return lines.join('\n');
  }

  /**
   * Get human-readable type label
   */
  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      conversation: 'Previous conversation',
      decision: 'Decision made',
      preference: 'User preference',
      project: 'Ongoing project',
      insight: 'Learned insight',
      task: 'Task/Action item',
    };
    return labels[type] || 'Memory';
  }

  /**
   * Build relevance explanation
   */
  private buildRelevanceExplanation(memories: Memory[]): string {
    const types = [...new Set(memories.map((m) => m.metadata.type))];
    const avgScore =
      memories.reduce((sum, m) => sum + (m.score || 0), 0) / memories.length;

    return `Found ${memories.length} relevant memories (${types.join(', ')}). Average relevance: ${(avgScore * 100).toFixed(0)}%`;
  }

  /**
   * Process query with memory injection
   */
  async processWithMemory(
    query: string,
    agencyId: string,
    userId: string,
    baseSystemPrompt: string
  ): Promise<{ systemPrompt: string; usedMemories: Memory[] }> {
    // Check if this is a recall query
    const recall = this.detectRecall(query);

    // Get relevant memories
    const injection = await this.injectMemories(
      recall.isRecallQuery ? recall.suggestedSearchQuery : query,
      agencyId,
      userId
    );

    // Build enhanced system prompt
    let systemPrompt = baseSystemPrompt;

    if (injection.contextBlock) {
      systemPrompt = `${baseSystemPrompt}\n\n${injection.contextBlock}`;
    }

    // Add recall-specific instructions if needed
    if (recall.isRecallQuery && injection.memories.length > 0) {
      systemPrompt += `\n\nThe user is asking about a previous conversation. Reference the memory context above to answer their question.`;
    }

    return {
      systemPrompt,
      usedMemories: injection.memories,
    };
  }

  /**
   * Should memories be stored for this interaction?
   */
  shouldStoreMemory(
    userMessage: string,
    assistantResponse: string
  ): { should: boolean; type: string; importance: string } {
    const lowerUser = userMessage.toLowerCase();
    const lowerResponse = assistantResponse.toLowerCase();

    // Check for decisions
    if (
      lowerUser.includes('decide') ||
      lowerUser.includes('let\'s go with') ||
      lowerResponse.includes('you decided')
    ) {
      return { should: true, type: 'decision', importance: 'high' };
    }

    // Check for preferences
    if (
      lowerUser.includes('i prefer') ||
      lowerUser.includes('i like') ||
      lowerUser.includes('i want')
    ) {
      return { should: true, type: 'preference', importance: 'high' };
    }

    // Check for tasks
    if (
      lowerUser.includes('remind me') ||
      lowerUser.includes('todo') ||
      lowerUser.includes('action item')
    ) {
      return { should: true, type: 'task', importance: 'medium' };
    }

    // Check for significant conversations (longer exchanges)
    if (userMessage.length > 100 && assistantResponse.length > 200) {
      return { should: true, type: 'conversation', importance: 'low' };
    }

    return { should: false, type: '', importance: '' };
  }

  /**
   * Update configuration
   */
  configure(options: { maxMemories?: number; minRelevanceScore?: number }): void {
    if (options.maxMemories !== undefined) {
      this.maxMemories = options.maxMemories;
    }
    if (options.minRelevanceScore !== undefined) {
      this.minRelevanceScore = options.minRelevanceScore;
    }
  }
}

// Singleton instance
let memoryInjectorInstance: MemoryInjector | null = null;

/**
 * Get or create MemoryInjector instance
 */
export function getMemoryInjector(): MemoryInjector {
  if (!memoryInjectorInstance) {
    memoryInjectorInstance = new MemoryInjector();
  }
  return memoryInjectorInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetMemoryInjector(): void {
  memoryInjectorInstance = null;
}
