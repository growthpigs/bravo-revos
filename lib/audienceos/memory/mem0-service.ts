/**
 * Mem0 Service
 *
 * Integrates with Mem0 MCP for cross-session memory.
 * Provides tenant + user scoped memory operations.
 */

import type {
  Memory,
  MemoryMetadata,
  MemoryType,
  MemorySearchRequest,
  MemorySearchResult,
  MemoryAddRequest,
  MemoryStats,
} from './types';

/**
 * Mem0 MCP interface (matches diiiploy-gateway)
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 */
interface Mem0MCPClient {
  addMemory: (params: { content: string; userId: string }) => Promise<{ id: string }>;
  searchMemories: (params: {
    query: string;
    userId: string;
  }) => Promise<Array<{ id: string; content: string; score?: number }>>;
}

/**
 * Build scoped user ID for multi-tenant support
 */
function buildScopedUserId(agencyId: string, userId: string): string {
  return `${agencyId}:${userId}`;
}

/**
 * Parse memory content that includes metadata
 */
function parseMemoryContent(rawContent: string): { content: string; metadata: Partial<MemoryMetadata> } {
  try {
    // Check if content has embedded metadata (JSON prefix)
    if (rawContent.startsWith('{') && rawContent.includes('"content":')) {
      const parsed = JSON.parse(rawContent);
      return {
        content: parsed.content || rawContent,
        metadata: parsed.metadata || {},
      };
    }
  } catch {
    // Not JSON, use raw content
  }
  return { content: rawContent, metadata: {} };
}

/**
 * Encode content with metadata for storage
 */
function encodeMemoryContent(content: string, metadata: Partial<MemoryMetadata>): string {
  return JSON.stringify({ content, metadata });
}

/**
 * Mem0Service - Cross-session memory with tenant scoping
 */
export class Mem0Service {
  private mcpClient: Mem0MCPClient;
  private memoryCache: Map<string, Memory[]> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(mcpClient: Mem0MCPClient) {
    this.mcpClient = mcpClient;
  }

  /**
   * Add a memory
   */
  async addMemory(request: MemoryAddRequest): Promise<Memory> {
    const scopedUserId = buildScopedUserId(request.agencyId, request.userId);

    const metadata: MemoryMetadata = {
      agencyId: request.agencyId,
      userId: request.userId,
      sessionId: request.sessionId,
      type: request.type,
      topic: request.topic,
      entities: request.entities,
      importance: request.importance || 'medium',
    };

    const encodedContent = encodeMemoryContent(request.content, metadata);

    const result = await this.mcpClient.addMemory({
      content: encodedContent,
      userId: scopedUserId,
    });

    const memory: Memory = {
      id: result.id,
      content: request.content,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Invalidate cache
    this.invalidateCache(scopedUserId);

    return memory;
  }

  /**
   * Search memories
   */
  async searchMemories(request: MemorySearchRequest): Promise<MemorySearchResult> {
    const startTime = Date.now();
    const scopedUserId = buildScopedUserId(request.agencyId, request.userId);

    const results = await this.mcpClient.searchMemories({
      query: request.query,
      userId: scopedUserId,
    });

    // Parse and filter results
    let memories: Memory[] = results.map((result) => {
      const { content, metadata } = parseMemoryContent(result.content);
      return {
        id: result.id,
        content,
        metadata: {
          agencyId: request.agencyId,
          userId: request.userId,
          type: (metadata.type as MemoryType) || 'conversation',
          ...metadata,
        },
        score: result.score,
        createdAt: new Date(), // Mem0 doesn't return dates
        updatedAt: new Date(),
      };
    });

    // Apply filters
    if (request.minScore !== undefined) {
      memories = memories.filter((m) => (m.score ?? 0) >= request.minScore!);
    }

    if (request.types && request.types.length > 0) {
      memories = memories.filter((m) => request.types!.includes(m.metadata.type));
    }

    // Limit results
    const limit = request.limit || 5;
    memories = memories.slice(0, limit);

    return {
      memories,
      totalFound: results.length,
      searchTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get recent memories for a user
   */
  async getRecentMemories(
    agencyId: string,
    userId: string,
    limit: number = 10
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      query: 'recent conversations and decisions',
      agencyId,
      userId,
      limit,
    });
    return result.memories;
  }

  /**
   * Get memories by type
   */
  async getMemoriesByType(
    agencyId: string,
    userId: string,
    type: MemoryType,
    limit: number = 10
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      query: `${type} memory`,
      agencyId,
      userId,
      limit,
      types: [type],
    });
    return result.memories;
  }

  /**
   * Get high importance memories
   */
  async getImportantMemories(
    agencyId: string,
    userId: string,
    limit: number = 5
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      query: 'important decisions and preferences',
      agencyId,
      userId,
      limit,
    });

    // Filter to high importance
    return result.memories.filter(
      (m) => m.metadata.importance === 'high'
    );
  }

  /**
   * Store a conversation summary
   */
  async storeConversationSummary(
    agencyId: string,
    userId: string,
    sessionId: string,
    summary: string,
    topics: string[]
  ): Promise<Memory> {
    return this.addMemory({
      content: summary,
      agencyId,
      userId,
      sessionId,
      type: 'conversation',
      topic: topics.join(', '),
      entities: topics,
      importance: 'medium',
    });
  }

  /**
   * Store a decision
   */
  async storeDecision(
    agencyId: string,
    userId: string,
    decision: string,
    context: string
  ): Promise<Memory> {
    return this.addMemory({
      content: `Decision: ${decision}. Context: ${context}`,
      agencyId,
      userId,
      type: 'decision',
      importance: 'high',
    });
  }

  /**
   * Store a user preference
   */
  async storePreference(
    agencyId: string,
    userId: string,
    preference: string
  ): Promise<Memory> {
    return this.addMemory({
      content: `Preference: ${preference}`,
      agencyId,
      userId,
      type: 'preference',
      importance: 'high',
    });
  }

  /**
   * Store a task/action item
   */
  async storeTask(
    agencyId: string,
    userId: string,
    task: string,
    dueContext?: string
  ): Promise<Memory> {
    return this.addMemory({
      content: `Task: ${task}${dueContext ? `. Due: ${dueContext}` : ''}`,
      agencyId,
      userId,
      type: 'task',
      importance: 'medium',
    });
  }

  /**
   * Get memory statistics (estimate)
   */
  async getStats(agencyId: string, userId: string): Promise<MemoryStats> {
    // Search for all types to estimate counts
    const types: MemoryType[] = [
      'conversation',
      'decision',
      'preference',
      'project',
      'insight',
      'task',
    ];

    const byType: Record<MemoryType, number> = {
      conversation: 0,
      decision: 0,
      preference: 0,
      project: 0,
      insight: 0,
      task: 0,
    };

    let totalMemories = 0;

    for (const type of types) {
      const result = await this.searchMemories({
        query: type,
        agencyId,
        userId,
        limit: 100,
        types: [type],
      });
      byType[type] = result.memories.length;
      totalMemories += result.memories.length;
    }

    return {
      totalMemories,
      byType,
      byImportance: { low: 0, medium: 0, high: 0 }, // Would need full scan
    };
  }

  /**
   * Invalidate cache for a user
   */
  private invalidateCache(scopedUserId: string): void {
    this.memoryCache.delete(scopedUserId);
  }
}

// Factory for creating Mem0Service
let mem0ServiceInstance: Mem0Service | null = null;

/**
 * Create Mem0Service with MCP client
 */
export function createMem0Service(mcpClient: Mem0MCPClient): Mem0Service {
  mem0ServiceInstance = new Mem0Service(mcpClient);
  return mem0ServiceInstance;
}

/**
 * Get existing Mem0Service instance
 */
export function getMem0Service(): Mem0Service | null {
  return mem0ServiceInstance;
}

/**
 * Reset the service (for testing)
 */
export function resetMem0Service(): void {
  mem0ServiceInstance = null;
}

/**
 * Diiiploy-gateway HTTP client for Mem0
 * Calls diiiploy-gateway's mem0_add and mem0_search MCP tools
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 */
function createDiiiplopyGatewayMem0Client(): Mem0MCPClient {
  const gatewayUrl = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.roderic-andrews.workers.dev';
  const apiKey = process.env.DIIIPLOY_GATEWAY_API_KEY || '';

  return {
    addMemory: async (params: { content: string; userId: string }) => {
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'mem0_add',
            arguments: params,
          },
          id: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Diiiploy-gateway error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.result?.content?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        return { id: parsed.id || crypto.randomUUID() };
      }
      return { id: crypto.randomUUID() };
    },

    searchMemories: async (params: { query: string; userId: string }) => {
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'mem0_search',
            arguments: params,
          },
          id: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Diiiploy-gateway error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.result?.content?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        // Mem0 returns { results: [...] } or array directly
        const results = parsed.results || parsed || [];
        return results.map((r: { id?: string; memory_id?: string; memory?: string; content?: string; score?: number }) => ({
          id: r.id || r.memory_id || crypto.randomUUID(),
          content: r.memory || r.content || '',
          score: r.score,
        }));
      }
      return [];
    },
  };
}

/**
 * Initialize Mem0Service with diiiploy-gateway (lazy init)
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 */
export function initializeMem0Service(): Mem0Service {
  if (!mem0ServiceInstance) {
    const client = createDiiiplopyGatewayMem0Client();
    mem0ServiceInstance = new Mem0Service(client);
  }
  return mem0ServiceInstance;
}
