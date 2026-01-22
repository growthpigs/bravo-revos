/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
/**
 * Permission Service
 *
 * Core service for permission checking and evaluation
 * Implements caching, hierarchy rules, and client-scoped access
 *
 * TASK-006: PermissionService class with caching and evaluation logic
 * TASK-007: getUserPermissions() with role and client-access resolution
 * TASK-008: checkPermission() with hierarchy and inheritance rules
 * TASK-009: Permission caching layer with invalidation on role changes
 * TASK-010: Effective permission calculation for custom roles
 */

import { createClient as createBrowserClient, createServiceRoleClient } from '@/lib/supabase';
import type {
  EffectivePermission,
  PermissionCheckResult,
  PermissionCacheEntry,
  ResourceType,
  PermissionAction,
  UserWithRole,
} from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * PermissionService - Core RBAC logic
 *
 * Features:
 * - In-memory caching with TTL (5 minutes)
 * - Permission hierarchy (manage > delete > write > read)
 * - Client-scoped permissions for Members
 * - Cache invalidation on role changes
 */
class PermissionService {
  private cache = new Map<string, PermissionCacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000; // Maximum cache entries
  private lastCleanupTime = 0;
  private readonly CLEANUP_INTERVAL = 60 * 1000; // Cleanup every 1 minute

  /**
   * TASK-007: Get user's effective permissions
   *
   * Returns all permissions from:
   * 1. User's role permissions
   * 2. Client-level access (for Members only)
   *
   * @param userId - User ID
   * @param agencyId - Agency ID
   * @param supabase - Supabase client (optional, creates new if not provided)
   * @returns Array of effective permissions with source tracking
   */
  async getUserPermissions(
    userId: string,
    agencyId: string,
    supabase?: SupabaseClient<any>
  ): Promise<EffectivePermission[]> {
    // Validate inputs - do not log actual IDs
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('[PermissionService] Invalid userId provided');
      return [];
    }
    if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
      console.error('[PermissionService] Invalid agencyId:', agencyId);
      return [];
    }

    // Run cleanup periodically
    this.cleanupCacheIfNeeded();

    // Check cache first
    const cacheKey = `${userId}:${agencyId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.permissions;
    }

    // Create client - use service_role to bypass RLS for permission lookups
    // Permission lookups are internal server operations, not user-facing queries
    const client = createServiceRoleClient() || supabase || createBrowserClient();

    try {
      // Get user with role and permissions
      const { data: user, error: userError } = await client
        .from('user')
        .select(
          `
          id,
          agency_id,
          email,
          is_owner,
          role_id,
          role:role_id (
            id,
            name,
            hierarchy_level,
            role_permissions:role_permission (
              permission:permission_id (
                id,
                resource,
                action
              )
            )
          )
        `
        )
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .single();

      if (userError || !user) {
        console.error('[PermissionService] Failed to fetch user:', userError);
        return [];
      }

      const permissions: EffectivePermission[] = [];

      // Add role permissions
      if (user.role?.role_permissions) {
        for (const rp of user.role.role_permissions) {
          if (rp.permission) {
            permissions.push({
              resource: rp.permission.resource as ResourceType,
              action: rp.permission.action as PermissionAction,
              source: 'role',
              roleId: user.role.id,
            });
          }
        }
      }

      // For Members (hierarchy_level = 4), add client-level access
      if (user.role?.hierarchy_level === 4) {
        const { data: clientAccess, error: accessError } = await client
          .from('member_client_access')
          .select('client_id, permission')
          .eq('user_id', userId)
          .eq('agency_id', agencyId);

        if (!accessError && clientAccess) {
          for (const access of clientAccess) {
            // Client-scoped permissions for assigned resources
            const clientResources: ResourceType[] = [
              'clients',
              'communications',
              'tickets',
            ];

            for (const resource of clientResources) {
              permissions.push({
                resource,
                action: access.permission as PermissionAction,
                source: 'client_access',
                clientId: access.client_id,
              });
            }
          }
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        permissions,
        expires: Date.now() + this.CACHE_TTL,
      });

      return permissions;
    } catch (error) {
      console.error('[PermissionService] Error fetching permissions:', error);
      return [];
    }
  }

  /**
   * TASK-008: Check if user has specific permission
   *
   * Implements permission hierarchy:
   * - manage implies all actions (read, write, delete)
   * - write implies read
   * - delete is independent
   *
   * For client-scoped resources, checks client_id match
   *
   * @param permissions - User's effective permissions
   * @param resource - Resource to check
   * @param action - Action to check
   * @param clientId - Optional client ID for client-scoped checks
   * @returns True if user has permission
   */
  checkPermission(
    permissions: EffectivePermission[],
    resource: ResourceType,
    action: PermissionAction,
    clientId?: string
  ): boolean {
    // Validate inputs
    if (!resource || !action) {
      console.error('[PermissionService] Invalid resource or action:', {
        resource,
        action,
      });
      return false;
    }
    if (!Array.isArray(permissions)) {
      console.error('[PermissionService] permissions must be an array');
      return false;
    }

    for (const perm of permissions) {
      // Check resource match
      if (perm.resource !== resource) continue;

      // Handle permission hierarchy
      if (this.hasActionPermission(perm.action, action)) {
        // If permission is client-scoped, check client ID
        if (perm.source === 'client_access') {
          // For specific client checks (e.g., GET /clients/:id)
          if (clientId !== undefined) {
            // Only return true if this specific client matches
            // Continue checking other permissions if no match
            if (perm.clientId === clientId) {
              return true;
            }
            // Don't return false yet - might have other client_access permissions
            continue;
          }
          // For listing (e.g., GET /clients) - allow if user has ANY client_access
          // RLS will filter results to only their assigned clients
          return true;
        } else if (perm.source === 'role') {
          // Role permissions are not client-scoped
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if permission action satisfies required action
   *
   * Hierarchy:
   * - manage: satisfies all (read, write, delete, manage)
   * - write: satisfies read and write
   * - delete: satisfies only delete
   * - read: satisfies only read
   *
   * @param hasAction - Action user has
   * @param needsAction - Action required
   * @returns True if hasAction satisfies needsAction
   */
  private hasActionPermission(
    hasAction: PermissionAction,
    needsAction: PermissionAction
  ): boolean {
    // Exact match
    if (hasAction === needsAction) return true;

    // Manage implies everything
    if (hasAction === 'manage') return true;

    // Write implies read
    if (hasAction === 'write' && needsAction === 'read') return true;

    return false;
  }

  /**
   * TASK-010: Check permission with detailed result
   *
   * Returns detailed information about why permission was allowed/denied
   * Useful for debugging and audit logs
   *
   * @param permissions - User's effective permissions
   * @param resource - Resource to check
   * @param action - Action to check
   * @param clientId - Optional client ID
   * @returns Detailed permission check result
   */
  checkPermissionDetailed(
    permissions: EffectivePermission[],
    resource: ResourceType,
    action: PermissionAction,
    clientId?: string
  ): PermissionCheckResult {
    const allowed = this.checkPermission(permissions, resource, action, clientId);

    if (allowed) {
      return {
        allowed: true,
        effectivePermissions: permissions.filter((p) => p.resource === resource),
      };
    }

    return {
      allowed: false,
      reason: `Missing permission: ${resource}:${action}${
        clientId ? ` on client ${clientId}` : ''
      }`,
      requiredPermission: `${resource}:${action}`,
    };
  }

  /**
   * Check if user has ANY of the specified permissions
   *
   * @param permissions - User's effective permissions
   * @param checks - Array of permission checks
   * @returns True if user has at least one permission
   */
  hasAnyPermission(
    permissions: EffectivePermission[],
    checks: Array<{ resource: ResourceType; action: PermissionAction }>
  ): boolean {
    return checks.some(({ resource, action }) =>
      this.checkPermission(permissions, resource, action)
    );
  }

  /**
   * Check if user has ALL of the specified permissions
   *
   * @param permissions - User's effective permissions
   * @param checks - Array of permission checks
   * @returns True if user has all permissions
   */
  hasAllPermissions(
    permissions: EffectivePermission[],
    checks: Array<{ resource: ResourceType; action: PermissionAction }>
  ): boolean {
    return checks.every(({ resource, action }) =>
      this.checkPermission(permissions, resource, action)
    );
  }

  /**
   * TASK-009: Invalidate permission cache for specific user
   *
   * Call this when:
   * - User's role changes
   * - Role permissions are modified
   * - Client access is added/removed
   *
   * @param userId - User ID
   * @param agencyId - Agency ID
   */
  invalidateCache(userId: string, agencyId: string): void {
    // Validate inputs
    if (!userId || !agencyId) {
      console.error('[PermissionService] Invalid userId or agencyId for cache invalidation');
      return;
    }

    const cacheKey = `${userId}:${agencyId}`;
    this.cache.delete(cacheKey);
    console.log(`[PermissionService] Cache invalidated for ${cacheKey}`);
  }

  /**
   * TASK-009: Invalidate all permission caches for an agency
   *
   * Call this when:
   * - Agency-wide role changes
   * - Bulk permission updates
   * - System role permissions modified
   *
   * @param agencyId - Agency ID
   */
  invalidateAgencyCache(agencyId: string): void {
    // Validate input
    if (!agencyId) {
      console.error('[PermissionService] Invalid agencyId for cache invalidation');
      return;
    }

    let invalidatedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${agencyId}`)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    console.log(
      `[PermissionService] Invalidated ${invalidatedCount} cache entries for agency ${agencyId}`
    );
  }

  /**
   * Clear entire permission cache
   *
   * Use sparingly - mainly for testing or system maintenance
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[PermissionService] Cleared ${size} cache entries`);
  }

  /**
   * Get cache statistics
   *
   * Useful for monitoring and debugging
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; expires: Date; expired: boolean }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      expires: new Date(value.expires),
      expired: value.expires < now,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Clean up cache if needed (expired entries + size limit)
   *
   * Called periodically from getUserPermissions to prevent memory leaks
   * - Runs at most once per CLEANUP_INTERVAL (1 minute)
   * - Removes expired entries
   * - Enforces MAX_CACHE_SIZE by removing oldest entries (LRU)
   */
  private cleanupCacheIfNeeded(): void {
    const now = Date.now();

    // Only cleanup if interval has passed
    if (now - this.lastCleanupTime < this.CLEANUP_INTERVAL) {
      return;
    }

    this.lastCleanupTime = now;
    let cleaned = 0;

    // Remove expired entries
    for (const [key, value] of this.cache.entries()) {
      if (value.expires < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // Enforce max size (remove oldest entries if over limit)
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entriesToRemove = this.cache.size - this.MAX_CACHE_SIZE;
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.expires - b.expires); // Sort by expiry (oldest first)

      for (let i = 0; i < entriesToRemove; i++) {
        this.cache.delete(entries[i][0]);
        cleaned++;
      }

      console.log(
        `[PermissionService] Cache size limit reached (${this.cache.size}/${this.MAX_CACHE_SIZE}), removed ${entriesToRemove} oldest entries`
      );
    }

    if (cleaned > 0) {
      console.log(`[PermissionService] Cleaned ${cleaned} cache entries`);
    }
  }

  /**
   * Clean up expired cache entries (legacy method, now calls cleanupCacheIfNeeded)
   *
   * @deprecated Use cleanupCacheIfNeeded instead
   */
  private cleanExpiredEntries(): void {
    this.cleanupCacheIfNeeded();
  }

  /**
   * TASK-013 Part 2: Check user role hierarchy
   *
   * Short-circuits permission checks by verifying role hierarchy level
   * - hierarchy_level <= 3: Owner, Admin, Manager (see all data)
   * - hierarchy_level = 4: Member (see only assigned data)
   *
   * @param userId - User ID
   * @param agencyId - Agency ID
   * @param supabase - Supabase client (optional)
   * @returns Hierarchy level or null if not found
   */
  async getUserHierarchyLevel(
    userId: string,
    agencyId: string,
    supabase?: SupabaseClient<any>
  ): Promise<number | null> {
    if (!userId || !agencyId) {
      return null;
    }

    // Use service_role to bypass RLS for hierarchy lookups
    const client = createServiceRoleClient() || supabase || createBrowserClient();

    try {
      const { data: user, error } = await client
        .from('user')
        .select(
          `
          id,
          role:role_id (
            hierarchy_level
          )
        `
        )
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .single();

      if (error || !user?.role) {
        return null;
      }

      return user.role.hierarchy_level;
    } catch (error) {
      console.error('[PermissionService] Error fetching hierarchy level:', error);
      return null;
    }
  }

  /**
   * TASK-013 Part 2: Check if user has management privileges
   *
   * Managers and above (hierarchy_level <= 3) can manage data agency-wide
   * Members (hierarchy_level = 4) can only manage assigned clients
   *
   * @param hierarchyLevel - User's role hierarchy level
   * @returns True if user has management privileges (Owner, Admin, Manager)
   */
  hasManagementPrivileges(hierarchyLevel: number | null): boolean {
    if (hierarchyLevel === null || hierarchyLevel === undefined) {
      return false;
    }
    return hierarchyLevel <= 3;
  }

  /**
   * TASK-013 Part 2: Get list of client IDs user has access to
   *
   * For Members, returns only assigned clients
   * For Managers and above, returns empty array (they have agency-wide access)
   *
   * @param userId - User ID
   * @param agencyId - Agency ID
   * @param supabase - Supabase client (optional)
   * @returns Array of client IDs user can access, or empty array for non-Members
   */
  async getMemberAccessibleClientIds(
    userId: string,
    agencyId: string,
    supabase?: SupabaseClient<any>
  ): Promise<string[]> {
    if (!userId || !agencyId) {
      return [];
    }

    // Use service_role to bypass RLS for member access lookups
    const client = createServiceRoleClient() || supabase || createBrowserClient();

    try {
      // Check if user is a Member
      const hierarchyLevel = await this.getUserHierarchyLevel(
        userId,
        agencyId,
        client
      );

      // Only Members have client-scoped access
      if (hierarchyLevel !== 4) {
        return [];
      }

      // Fetch member_client_access records
      const { data: access, error } = await client
        .from('member_client_access')
        .select('client_id')
        .eq('user_id', userId)
        .eq('agency_id', agencyId);

      if (error || !access) {
        return [];
      }

      return access.map((a) => a.client_id);
    } catch (error) {
      console.error('[PermissionService] Error fetching member client IDs:', error);
      return [];
    }
  }

  /**
   * TASK-013 Part 2: Verify member has access to specific client
   *
   * Returns true if:
   * - User is Owner/Admin/Manager (hierarchy_level <= 3), OR
   * - User is Member (hierarchy_level = 4) AND has entry in member_client_access
   *
   * @param userId - User ID
   * @param agencyId - Agency ID
   * @param clientId - Client ID to check access for
   * @param supabase - Supabase client (optional)
   * @returns True if user has access to this client
   */
  async hasMemberClientAccess(
    userId: string,
    agencyId: string,
    clientId: string,
    supabase?: SupabaseClient<any>
  ): Promise<boolean> {
    if (!userId || !agencyId || !clientId) {
      return false;
    }

    // Use service_role to bypass RLS for client access checks
    const client = createServiceRoleClient() || supabase || createBrowserClient();

    try {
      const hierarchyLevel = await this.getUserHierarchyLevel(
        userId,
        agencyId,
        client
      );

      // Managers and above have agency-wide access
      if (hierarchyLevel !== null && hierarchyLevel <= 3) {
        return true;
      }

      // For Members, check member_client_access
      if (hierarchyLevel === 4) {
        const { data, error } = await client
          .from('member_client_access')
          .select('client_id')
          .eq('user_id', userId)
          .eq('agency_id', agencyId)
          .eq('client_id', clientId)
          .single();

        return !error && !!data;
      }

      return false;
    } catch (error) {
      console.error('[PermissionService] Error checking member client access:', error);
      return false;
    }
  }
}

// Export singleton instance
export const permissionService = new PermissionService();

// Export class for testing
export { PermissionService };
