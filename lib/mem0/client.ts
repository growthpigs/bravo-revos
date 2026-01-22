/**
 * F-02: Mem0 Client Setup
 * Initialize Mem0 for long-term AI memory with multi-tenant isolation
 *
 * Tenant Key Structure: agencyId::clientId::userId
 * This ensures complete data isolation across tenant boundaries
 */

import { MemoryClient } from 'mem0ai';

const LOG_PREFIX = '[MEM0_CLIENT]';

// Store client instance
let clientInstance: MemoryClient | null = null;

/**
 * Get or create Mem0 client
 * Singleton pattern ensures only one client instance
 */
export function getMem0Client(): MemoryClient {
  if (!clientInstance) {
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) {
      throw new Error(`${LOG_PREFIX} MEM0_API_KEY environment variable not set`);
    }

    clientInstance = new MemoryClient({ apiKey });

    console.log(`${LOG_PREFIX} Client initialized`);
  }
  return clientInstance;
}

/**
 * Build tenant-isolated memory key
 * Ensures complete isolation: agencyId::clientId::userId
 * Uses "_" wildcard for missing values (matches AudienceOS format)
 */
export function buildTenantKey(
  agencyId: string | undefined | null,
  clientId: string | undefined | null,
  userId: string
): string {
  if (!userId) {
    throw new Error(
      `${LOG_PREFIX} userId is required for tenant key`
    );
  }

  // Use "_" for wildcards to match AudienceOS mem0-service.ts format
  const key = `${agencyId || '_'}::${clientId || '_'}::${userId}`;
  return key;
}

/**
 * Verify tenant key belongs to authenticated user
 * Prevents unauthorized tenant access attempts
 */
export function verifyTenantKey(
  tenantKey: string,
  expectedAgencyId: string,
  expectedClientId: string,
  expectedUserId: string
): boolean {
  const expectedKey = buildTenantKey(expectedAgencyId, expectedClientId, expectedUserId);
  return tenantKey === expectedKey;
}

/**
 * Extract tenant identifiers from memory key
 */
export function extractTenantFromKey(
  tenantKey: string
): {
  agencyId: string;
  clientId: string;
  userId: string;
} | null {
  const parts = tenantKey.split('::');
  if (parts.length !== 3) {
    console.warn(`${LOG_PREFIX} Invalid tenant key format: ${tenantKey}`);
    return null;
  }

  return {
    agencyId: parts[0],
    clientId: parts[1],
    userId: parts[2],
  };
}

/**
 * Close Mem0 client on shutdown
 */
export async function closeMem0Client(): Promise<void> {
  if (clientInstance) {
    try {
      // Mem0 client cleanup if needed
      clientInstance = null;
      console.log(`${LOG_PREFIX} Client closed`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error closing client:`, error);
    }
  }
}
