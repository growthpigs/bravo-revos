/**
 * Audit Service
 *
 * Persists RBAC audit logs to the audit_log table.
 * Implements US-015 (Log Permission Access Attempts) and US-016 (Track Permission Changes)
 *
 * Usage:
 * ```typescript
 * import { auditService } from '@/lib/rbac/audit-service';
 *
 * // Log a permission check
 * await auditService.logPermissionCheck({
 *   agencyId: 'agency-uuid',
 *   userId: 'user-uuid',
 *   resource: 'clients',
 *   action: 'read',
 *   result: 'allowed',
 * });
 *
 * // Log a role change
 * await auditService.logRoleChange({
 *   agencyId: 'agency-uuid',
 *   userId: 'user-uuid',
 *   targetUserId: 'target-user-uuid',
 *   oldRole: 'member',
 *   newRole: 'manager',
 * });
 * ```
 */

import { createClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Action types for audit log
export type AuditActionType =
  | 'permission_check'
  | 'role_change'
  | 'client_access'
  | 'permission_change'
  | 'login'
  | 'logout';

export type AuditResult = 'allowed' | 'denied';

export interface PermissionCheckLog {
  agencyId: string;
  userId: string;
  resource: string;
  action: string;
  resourceId?: string;
  result: AuditResult;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RoleChangeLog {
  agencyId: string;
  userId: string; // Who made the change
  targetUserId: string; // Whose role was changed
  oldRole: string | null;
  newRole: string;
  metadata?: Record<string, any>;
}

export interface ClientAccessLog {
  agencyId: string;
  userId: string;
  clientId: string;
  action: string;
  result: AuditResult;
  metadata?: Record<string, any>;
}

export interface PermissionChangeLog {
  agencyId: string;
  userId: string; // Who made the change
  roleId: string;
  resource: string;
  action: string;
  granted: boolean;
  metadata?: Record<string, any>;
}

/**
 * AuditService - Persists audit logs to database
 *
 * All methods are fire-and-forget (non-blocking) to avoid
 * slowing down API responses. Errors are logged but not thrown.
 */
class AuditService {
  /**
   * US-015: Log permission access attempt
   *
   * Called by withPermission middleware on every permission check.
   */
  async logPermissionCheck(
    log: PermissionCheckLog,
    supabase?: SupabaseClient<any>
  ): Promise<void> {
    try {
      const client = supabase || createClient();

      const { error } = await client.from('audit_log').insert({
        agency_id: log.agencyId,
        user_id: log.userId,
        action_type: 'permission_check',
        resource: log.resource,
        resource_id: log.resourceId || null,
        permission_action: log.action,
        result: log.result,
        reason: log.reason || null,
        metadata: log.metadata || null,
      });

      if (error) {
        // Log but don't throw - audit should never block operations
        console.error('[AuditService] Failed to log permission check:', error);
      }
    } catch (err) {
      console.error('[AuditService] Error in logPermissionCheck:', err);
    }
  }

  /**
   * US-016: Log role change
   *
   * Called when a user's role is modified.
   */
  async logRoleChange(
    log: RoleChangeLog,
    supabase?: SupabaseClient<any>
  ): Promise<void> {
    try {
      const client = supabase || createClient();

      const { error } = await client.from('audit_log').insert({
        agency_id: log.agencyId,
        user_id: log.userId,
        action_type: 'role_change',
        resource: 'user_role',
        resource_id: log.targetUserId,
        permission_action: 'write',
        result: 'allowed', // Role changes only happen if permitted
        reason: `Role changed from ${log.oldRole || 'none'} to ${log.newRole}`,
        metadata: {
          target_user_id: log.targetUserId,
          old_role: log.oldRole,
          new_role: log.newRole,
          ...log.metadata,
        },
      });

      if (error) {
        console.error('[AuditService] Failed to log role change:', error);
      }
    } catch (err) {
      console.error('[AuditService] Error in logRoleChange:', err);
    }
  }

  /**
   * US-015: Log client access attempt (for Members)
   *
   * Called when a Member attempts to access a specific client.
   */
  async logClientAccess(
    log: ClientAccessLog,
    supabase?: SupabaseClient<any>
  ): Promise<void> {
    try {
      const client = supabase || createClient();

      const { error } = await client.from('audit_log').insert({
        agency_id: log.agencyId,
        user_id: log.userId,
        action_type: 'client_access',
        resource: 'clients',
        resource_id: log.clientId,
        permission_action: log.action,
        result: log.result,
        reason:
          log.result === 'denied'
            ? 'Member does not have access to this client'
            : null,
        metadata: log.metadata || null,
      });

      if (error) {
        console.error('[AuditService] Failed to log client access:', error);
      }
    } catch (err) {
      console.error('[AuditService] Error in logClientAccess:', err);
    }
  }

  /**
   * US-016: Log permission matrix change
   *
   * Called when role permissions are modified.
   */
  async logPermissionChange(
    log: PermissionChangeLog,
    supabase?: SupabaseClient<any>
  ): Promise<void> {
    try {
      const client = supabase || createClient();

      const { error } = await client.from('audit_log').insert({
        agency_id: log.agencyId,
        user_id: log.userId,
        action_type: 'permission_change',
        resource: 'permission',
        resource_id: log.roleId,
        permission_action: log.granted ? 'grant' : 'revoke',
        result: 'allowed',
        reason: `${log.granted ? 'Granted' : 'Revoked'} ${log.resource}:${log.action}`,
        metadata: {
          role_id: log.roleId,
          resource: log.resource,
          action: log.action,
          granted: log.granted,
          ...log.metadata,
        },
      });

      if (error) {
        console.error('[AuditService] Failed to log permission change:', error);
      }
    } catch (err) {
      console.error('[AuditService] Error in logPermissionChange:', err);
    }
  }

  /**
   * Query audit logs for an agency
   *
   * Used by the audit log UI (future feature).
   */
  async getAuditLogs(
    agencyId: string,
    options?: {
      userId?: string;
      actionType?: AuditActionType;
      resource?: string;
      result?: AuditResult;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
    supabase?: SupabaseClient<any>
  ): Promise<{
    logs: any[];
    error: Error | null;
  }> {
    try {
      const client = supabase || createClient();

      let query = client
        .from('audit_log')
        .select('*')
        .eq('agency_id', agencyId)
        .order('timestamp', { ascending: false });

      // Apply filters
      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options?.actionType) {
        query = query.eq('action_type', options.actionType);
      }
      if (options?.resource) {
        query = query.eq('resource', options.resource);
      }
      if (options?.result) {
        query = query.eq('result', options.result);
      }
      if (options?.startDate) {
        query = query.gte('timestamp', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('timestamp', options.endDate.toISOString());
      }

      // Pagination
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('[AuditService] Failed to fetch audit logs:', error);
        return { logs: [], error };
      }

      return { logs: data || [], error: null };
    } catch (err) {
      console.error('[AuditService] Error in getAuditLogs:', err);
      return { logs: [], error: err as Error };
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();

// Export class for testing
export { AuditService };
