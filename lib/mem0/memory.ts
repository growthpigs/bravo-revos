/**
 * F-02: Mem0 Memory Operations (CRUD + Search)
 * Long-term memory management with multi-tenant isolation
 */

import { getMem0Client, buildTenantKey } from './client';
import type { Memory as Mem0Memory, Message as Mem0Message } from 'mem0ai';

const LOG_PREFIX = '[MEM0_MEMORY]';

export interface MemoryInput {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface Memory {
  id: string;
  memory: string | null;
  data?: { memory: string };
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface MemorySearchResult {
  id: string;
  memory?: string | null;
  data?: { memory: string };
  score?: number;
}

/**
 * Add memory with tenant isolation
 * Stores conversation context and insights for AI
 */
export async function addMemory(
  tenantKey: string,
  input: MemoryInput,
  metadata?: Record<string, any>
): Promise<Mem0Memory[]> {
  if (!tenantKey) {
    throw new Error(`${LOG_PREFIX} Tenant key required`);
  }

  try {
    const client = getMem0Client();

    // Convert to Mem0Message format
    const messages: Mem0Message[] = input.messages as Mem0Message[];

    const memories = await client.add(messages, {
      user_id: tenantKey, // Use tenant key as user identifier
      metadata: metadata || {},
    });

    console.log(
      `${LOG_PREFIX} Added ${memories?.length || 0} memories for tenant ${tenantKey}`
    );

    return memories || [];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error adding memory:`, error);
    throw error;
  }
}

/**
 * Get all memories for a tenant
 */
export async function getMemories(
  tenantKey: string,
  limit?: number
): Promise<Mem0Memory[]> {
  if (!tenantKey) {
    throw new Error(`${LOG_PREFIX} Tenant key required`);
  }

  try {
    const client = getMem0Client();

    const memories = await client.getAll({
      user_id: tenantKey,
      page_size: limit || 100,
    });

    return memories || [];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching memories:`, error);
    throw error;
  }
}

/**
 * Search memories with semantic similarity
 * Returns relevant memories matching query
 */
export async function searchMemories(
  tenantKey: string,
  query: string,
  limit?: number
): Promise<Mem0Memory[]> {
  if (!tenantKey) {
    throw new Error(`${LOG_PREFIX} Tenant key required`);
  }

  if (!query) {
    throw new Error(`${LOG_PREFIX} Search query required`);
  }

  try {
    const client = getMem0Client();

    const results = await client.search(query, {
      user_id: tenantKey,
      limit: limit || 10,
    });

    console.log(
      `${LOG_PREFIX} Found ${results?.length || 0} matching memories for query: "${query}"`
    );

    return results || [];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error searching memories:`, error);
    throw error;
  }
}

/**
 * Update existing memory
 */
export async function updateMemory(
  tenantKey: string,
  memoryId: string,
  newMemory: string,
  metadata?: Record<string, any>
): Promise<Mem0Memory | null> {
  if (!tenantKey || !memoryId || !newMemory) {
    throw new Error(
      `${LOG_PREFIX} Tenant key, memory ID, and new memory content required`
    );
  }

  try {
    const client = getMem0Client();

    // Mem0 update operation - signature: update(memoryId, { text, metadata })
    const updatedMemories = await client.update(memoryId, {
      text: newMemory,
      metadata: metadata || {},
    });

    console.log(
      `${LOG_PREFIX} Updated memory ${memoryId} for tenant ${tenantKey}`
    );

    // Return first updated memory or null
    return (updatedMemories && updatedMemories[0]) || null;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating memory:`, error);
    throw error;
  }
}

/**
 * Delete memory by ID
 */
export async function deleteMemory(
  tenantKey: string,
  memoryId: string
): Promise<void> {
  if (!tenantKey || !memoryId) {
    throw new Error(`${LOG_PREFIX} Tenant key and memory ID required`);
  }

  try {
    const client = getMem0Client();

    // Delete doesn't use user_id in options, tenant isolation is handled via API key
    await client.delete(memoryId);

    console.log(
      `${LOG_PREFIX} Deleted memory ${memoryId} for tenant ${tenantKey}`
    );
  } catch (error) {
    console.error(`${LOG_PREFIX} Error deleting memory:`, error);
    throw error;
  }
}

/**
 * Clear all memories for a tenant
 * WARNING: Destructive operation, use with caution
 */
export async function clearAllMemories(tenantKey: string): Promise<void> {
  if (!tenantKey) {
    throw new Error(`${LOG_PREFIX} Tenant key required`);
  }

  try {
    const client = getMem0Client();

    // Delete each memory individually
    const memories = await getMemories(tenantKey);

    for (const memory of memories) {
      if (memory.id) {
        await deleteMemory(tenantKey, memory.id);
      }
    }

    console.log(
      `${LOG_PREFIX} Cleared ${memories.length} memories for tenant ${tenantKey}`
    );
  } catch (error) {
    console.error(`${LOG_PREFIX} Error clearing memories:`, error);
    throw error;
  }
}

/**
 * Verify tenant isolation - ensure tenant cannot access other tenants' memories
 */
export async function verifyTenantIsolation(
  tenantKey1: string,
  tenantKey2: string
): Promise<boolean> {
  try {
    const memories1 = await getMemories(tenantKey1);
    const memories2 = await getMemories(tenantKey2);

    // Check that memories don't overlap
    const ids1 = new Set(memories1.map((m) => m.id || m.hash));
    const ids2 = new Set(memories2.map((m) => m.id || m.hash));

    const hasOverlap = Array.from(ids1).some((id) => ids2.has(id));

    if (!hasOverlap) {
      console.log(
        `${LOG_PREFIX} ✅ Tenant isolation verified: ${tenantKey1} and ${tenantKey2} have separate memories`
      );
      return true;
    } else {
      console.error(
        `${LOG_PREFIX} ❌ Tenant isolation FAILED: ${tenantKey1} and ${tenantKey2} share memories!`
      );
      return false;
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error verifying isolation:`, error);
    throw error;
  }
}
