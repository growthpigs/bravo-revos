/**
 * TASK-013 Part 3: Client Access Helper Functions
 *
 * Utilities for working with member-scoped client access patterns:
 * - Filter resources to only those a member can access
 * - Verify member has access to specific clients
 * - Build queries that respect client-scoped permissions
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { permissionService } from './permission-service';

/**
 * Client with permission metadata
 */
export interface ClientWithAccess {
  id: string;
  name: string;
  access_level: 'read' | 'write';
  accessible: boolean;
}

/**
 * Member access record
 */
export interface MemberClientAccess {
  user_id: string;
  client_id: string;
  agency_id: string;
  permission: 'read' | 'write';
}

/**
 * TASK-013 Part 3: Verify member can access specific client
 *
 * Before returning data about a client to a member, verify they have access.
 * Short-circuits if user is Owner/Admin/Manager (they access all clients).
 *
 * @param userId - User ID
 * @param agencyId - Agency ID
 * @param clientId - Client ID to verify access for
 * @param supabase - Supabase client
 * @returns True if user can access this client
 */
export async function verifyClientAccess(
  userId: string,
  agencyId: string,
  clientId: string,
  supabase: SupabaseClient<any>
): Promise<boolean> {
  return await permissionService.hasMemberClientAccess(
    userId,
    agencyId,
    clientId,
    supabase
  );
}

/**
 * TASK-013 Part 3: Get accessible client IDs for member
 *
 * Used to:
 * - Filter client lists to only accessible clients
 * - Build WHERE clauses for client queries
 * - Determine data visibility on dashboard
 *
 * @param userId - User ID
 * @param agencyId - Agency ID
 * @param supabase - Supabase client
 * @returns Array of client IDs user can access (empty array = all clients for non-Members)
 */
export async function getAccessibleClientIds(
  userId: string,
  agencyId: string,
  supabase: SupabaseClient<any>
): Promise<string[]> {
  return await permissionService.getMemberAccessibleClientIds(
    userId,
    agencyId,
    supabase
  );
}

/**
 * TASK-013 Part 3: Filter client list to accessible clients only
 *
 * Takes a list of clients and:
 * - For Members: filters to only those with member_client_access entries
 * - For Managers+: returns all clients unchanged
 *
 * @param clients - Array of clients to filter
 * @param userId - User ID
 * @param agencyId - Agency ID
 * @param supabase - Supabase client
 * @returns Filtered client array
 */
export async function filterClientsByAccess<T extends { id: string }>(
  clients: T[],
  userId: string,
  agencyId: string,
  supabase: SupabaseClient<any>
): Promise<T[]> {
  const accessibleClientIds = await getAccessibleClientIds(
    userId,
    agencyId,
    supabase
  );

  // Empty array means user is not a Member (has full access)
  if (accessibleClientIds.length === 0) {
    return clients;
  }

  // For Members, only return clients they have access to
  return clients.filter((client) => accessibleClientIds.includes(client.id));
}

/**
 * TASK-013 Part 3: Build WHERE clause for client-scoped queries
 *
 * Returns a WHERE clause to filter queries based on user's client access.
 * Example:
 *  - For Owners: undefined (no filtering)
 *  - For Members: { client_id: { in: ['client-1', 'client-2'] } }
 *
 * @param userId - User ID
 * @param agencyId - Agency ID
 * @param supabase - Supabase client
 * @returns WHERE clause or undefined if no filtering needed
 */
export async function buildClientAccessFilter(
  userId: string,
  agencyId: string,
  supabase: SupabaseClient<any>
): Promise<{ client_id: { in: string[] } } | undefined> {
  const accessibleClientIds = await getAccessibleClientIds(
    userId,
    agencyId,
    supabase
  );

  // No filtering needed for non-Members
  if (accessibleClientIds.length === 0) {
    return undefined;
  }

  // For Members, return filter
  return {
    client_id: { in: accessibleClientIds },
  };
}

/**
 * TASK-013 Part 3: Check if member has write permission to client
 *
 * Used to determine if edit/delete operations should be available.
 * Managers+ always have write access.
 * Members have write access only if member_client_access.permission = 'write'
 *
 * @param userId - User ID
 * @param agencyId - Agency ID
 * @param clientId - Client ID
 * @param supabase - Supabase client
 * @returns True if user can write to this client
 */
export async function hasMemberWriteAccess(
  userId: string,
  agencyId: string,
  clientId: string,
  supabase: SupabaseClient<any>
): Promise<boolean> {
  const hierarchyLevel = await permissionService.getUserHierarchyLevel(
    userId,
    agencyId,
    supabase
  );

  // Managers and above have write access
  if (hierarchyLevel !== null && hierarchyLevel <= 3) {
    return true;
  }

  // For Members, check if they have write access to this specific client
  if (hierarchyLevel === 4) {
    const { data, error } = await supabase
      .from('member_client_access')
      .select('permission')
      .eq('user_id', userId)
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .single();

    return !error && data?.permission === 'write';
  }

  return false;
}

/**
 * TASK-013 Part 3: Get member's permission level for specific client
 *
 * Returns 'read', 'write', or null if member doesn't have access.
 * Managers+ always return 'write' (implied full access).
 *
 * @param userId - User ID
 * @param agencyId - Agency ID
 * @param clientId - Client ID
 * @param supabase - Supabase client
 * @returns Permission level or null
 */
export async function getMemberClientPermission(
  userId: string,
  agencyId: string,
  clientId: string,
  supabase: SupabaseClient<any>
): Promise<'read' | 'write' | null> {
  const hierarchyLevel = await permissionService.getUserHierarchyLevel(
    userId,
    agencyId,
    supabase
  );

  // Managers and above have full write access
  if (hierarchyLevel !== null && hierarchyLevel <= 3) {
    return 'write';
  }

  // For Members, check member_client_access
  if (hierarchyLevel === 4) {
    const { data, error } = await supabase
      .from('member_client_access')
      .select('permission')
      .eq('user_id', userId)
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .single();

    if (!error && data) {
      return data.permission as 'read' | 'write';
    }
  }

  return null;
}

/**
 * TASK-013 Part 3: Enforce member-scoped access in middleware context
 *
 * This is called from middleware to block access early if:
 * - Member is trying to access a client they don't have access to
 * - Member is trying to write when they only have read access
 *
 * @param userId - User ID
 * @param agencyId - Agency ID
 * @param clientId - Client ID to check
 * @param requiredPermission - Permission level needed ('read' or 'write')
 * @param supabase - Supabase client
 * @returns True if access is allowed
 */
export async function enforceClientAccess(
  userId: string,
  agencyId: string,
  clientId: string,
  requiredPermission: 'read' | 'write',
  supabase: SupabaseClient<any>
): Promise<boolean> {
  const hierarchyLevel = await permissionService.getUserHierarchyLevel(
    userId,
    agencyId,
    supabase
  );

  // Managers and above have full access
  if (hierarchyLevel !== null && hierarchyLevel <= 3) {
    return true;
  }

  // For Members, check specific client access and permission level
  if (hierarchyLevel === 4) {
    const permission = await getMemberClientPermission(
      userId,
      agencyId,
      clientId,
      supabase
    );

    if (!permission) {
      return false; // No access to this client
    }

    // Check if permission level satisfies requirement
    if (requiredPermission === 'write' && permission === 'read') {
      return false; // Only has read, but write is required
    }

    return true;
  }

  return false;
}

/**
 * TASK-013 Part 3: Log client access attempt (for audit trail)
 *
 * Call this when a member attempts to access a specific client.
 * Used for audit logs and detecting suspicious access patterns.
 *
 * @param userId - User ID
 * @param clientId - Client ID
 * @param action - Action attempted (read, write, delete)
 * @param allowed - Whether the action was allowed
 * @param metadata - Optional additional context
 */
export function logClientAccessAttempt(
  userId: string,
  clientId: string,
  action: string,
  allowed: boolean,
  metadata?: Record<string, any>
): void {
  console.log('[ClientAccess] Member access attempt:', {
    userId,
    clientId,
    action,
    allowed,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}
