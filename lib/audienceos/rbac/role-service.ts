/**
 * Role Service
 *
 * Service for role management operations:
 * - Create/update/delete custom roles
 * - Assign roles to users
 * - Manage role permissions
 * - Owner protection logic
 *
 * TASK-010: Effective permission calculation for custom roles
 */

import { createClient as createBrowserClient } from '@/lib/supabase';
import { permissionService } from './permission-service';
import { auditService } from './audit-service';
import type {
  Role,
  ResourceType,
  PermissionAction,
} from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Type guards for Supabase relation objects
 * Supabase returns foreign key relations as unknown objects - these help type them safely
 */
interface RoleRelation {
  name?: string;
  hierarchy_level?: number | null;
}

interface PermissionRelation {
  resource?: string;
  action?: string;
}

function isRoleRelation(obj: unknown): obj is RoleRelation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    !Array.isArray(obj)
  );
}

function isPermissionRelation(obj: unknown): obj is PermissionRelation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    !Array.isArray(obj)
  );
}

/**
 * Input for creating a new custom role
 */
export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: Array<{ resource: ResourceType; action: PermissionAction }>;
}

/**
 * Input for updating a role
 */
export interface UpdateRoleInput {
  name?: string;
  description?: string;
}

/**
 * RoleService - Role management operations
 */
class RoleService {
  /**
   * Create a new custom role
   *
   * Validates:
   * - Name uniqueness per agency
   * - Custom role limit (10 per agency)
   * - Permission validity
   *
   * @param agencyId - Agency ID
   * @param createdBy - User ID creating the role
   * @param input - Role details
   * @param supabase - Supabase client (optional)
   * @returns Created role
   */
  async createRole(
    agencyId: string,
    createdBy: string,
    input: CreateRoleInput,
    supabase?: SupabaseClient<Database>
  ): Promise<Role> {
    const client = supabase || createBrowserClient();

    // Check custom role limit
    const { count, error: countError } = await client
      .from('role')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('is_system', false);

    if (countError) {
      throw new Error(`Failed to check role count: ${countError.message}`);
    }

    if (count !== null && count >= 10) {
      throw new Error('Maximum custom roles (10) reached for this agency');
    }

    // Check name uniqueness
    const { data: existing } = await client
      .from('role')
      .select('id')
      .eq('agency_id', agencyId)
      .ilike('name', input.name)
      .single();

    if (existing) {
      throw new Error(`Role "${input.name}" already exists`);
    }

    // Create role
    const { data: role, error: roleError } = await client
      .from('role')
      .insert({
        agency_id: agencyId,
        name: input.name,
        description: input.description || null,
        is_system: false,
        hierarchy_level: null, // Custom roles have no hierarchy
        created_by: createdBy,
      })
      .select()
      .single();

    if (roleError || !role) {
      throw new Error(`Failed to create role: ${roleError?.message}`);
    }

    // Get permission IDs for the requested permissions
    const { data: permissions, error: permError } = await client
      .from('permission')
      .select('id, resource, action');

    if (permError || !permissions) {
      throw new Error(`Failed to fetch permissions: ${permError?.message}`);
    }

    // Map input permissions to permission IDs
    const rolePermissions = input.permissions
      .map((inputPerm) => {
        const perm = permissions.find(
          (p) =>
            p.resource === inputPerm.resource && p.action === inputPerm.action
        );
        return perm
          ? {
              role_id: role.id,
              permission_id: perm.id,
              agency_id: agencyId,
              granted_by: createdBy,
            }
          : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // Insert role permissions
    if (rolePermissions.length > 0) {
      const { error: rpError } = await client
        .from('role_permission')
        .insert(rolePermissions);

      if (rpError) {
        // Rollback: delete the role
        await client.from('role').delete().eq('id', role.id);
        throw new Error(`Failed to assign permissions: ${rpError.message}`);
      }
    }

    // Invalidate agency cache
    permissionService.invalidateAgencyCache(agencyId);

    return role as Role;
  }

  /**
   * Update a custom role
   *
   * Cannot update system roles
   *
   * @param roleId - Role ID
   * @param agencyId - Agency ID
   * @param input - Updated fields
   * @param supabase - Supabase client (optional)
   */
  async updateRole(
    roleId: string,
    agencyId: string,
    input: UpdateRoleInput,
    supabase?: SupabaseClient<Database>
  ): Promise<Role> {
    const client = supabase || createBrowserClient();

    // Check if system role
    const { data: role, error: fetchError } = await client
      .from('role')
      .select('is_system, name')
      .eq('id', roleId)
      .eq('agency_id', agencyId)
      .single();

    if (fetchError) {
      throw new Error(`Role not found: ${fetchError.message}`);
    }

    if (role.is_system) {
      throw new Error('Cannot update system role');
    }

    // Check name uniqueness if changing name
    if (input.name && input.name !== role.name) {
      const { data: existing } = await client
        .from('role')
        .select('id')
        .eq('agency_id', agencyId)
        .ilike('name', input.name)
        .neq('id', roleId)
        .single();

      if (existing) {
        throw new Error(`Role "${input.name}" already exists`);
      }
    }

    // Update role
    const { data: updated, error: updateError } = await client
      .from('role')
      .update({
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', roleId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(`Failed to update role: ${updateError?.message}`);
    }

    // Invalidate caches for users with this role
    const { data: users } = await client
      .from('user')
      .select('id')
      .eq('role_id', roleId)
      .eq('agency_id', agencyId);

    if (users) {
      for (const user of users) {
        permissionService.invalidateCache(user.id, agencyId);
      }
    }

    return updated as Role;
  }

  /**
   * Delete a custom role
   *
   * Validates:
   * - Role is not a system role
   * - No users are assigned to the role
   *
   * @param roleId - Role ID
   * @param agencyId - Agency ID
   * @param supabase - Supabase client (optional)
   */
  async deleteRole(
    roleId: string,
    agencyId: string,
    supabase?: SupabaseClient<Database>
  ): Promise<void> {
    const client = supabase || createBrowserClient();

    // Check if system role
    const { data: role, error: fetchError } = await client
      .from('role')
      .select('is_system, name')
      .eq('id', roleId)
      .eq('agency_id', agencyId)
      .single();

    if (fetchError) {
      throw new Error(`Role not found: ${fetchError.message}`);
    }

    if (role.is_system) {
      throw new Error('Cannot delete system role');
    }

    // Check if users assigned
    const { count: userCount, error: countError } = await client
      .from('user')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId)
      .eq('agency_id', agencyId);

    if (countError) {
      throw new Error(`Failed to check users: ${countError.message}`);
    }

    if (userCount && userCount > 0) {
      throw new Error(
        `Cannot delete role with ${userCount} assigned users. Reassign users first.`
      );
    }

    // Delete permissions first (foreign key)
    await client.from('role_permission').delete().eq('role_id', roleId);

    // Delete role
    const { error: deleteError } = await client
      .from('role')
      .delete()
      .eq('id', roleId);

    if (deleteError) {
      throw new Error(`Failed to delete role: ${deleteError.message}`);
    }

    // Invalidate agency cache
    permissionService.invalidateAgencyCache(agencyId);
  }

  /**
   * Change a user's role
   *
   * Validates:
   * - Target role exists
   * - Not removing last owner
   * - Hierarchy rules (can't assign higher role than own)
   *
   * @param userId - User ID to change
   * @param newRoleId - New role ID
   * @param agencyId - Agency ID
   * @param changedBy - User ID making the change
   * @param supabase - Supabase client (optional)
   */
  async changeUserRole(
    userId: string,
    newRoleId: string,
    agencyId: string,
    changedBy: string,
    supabase?: SupabaseClient<Database>
  ): Promise<void> {
    const client = supabase || createBrowserClient();

    // Get current user with role name for audit logging
    const { data: user, error: userError } = await client
      .from('user')
      .select(`
        id,
        is_owner,
        role_id,
        role:role_id (
          name
        )
      `)
      .eq('id', userId)
      .eq('agency_id', agencyId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Capture old role name for audit log (US-016)
    const oldRoleName = isRoleRelation(user.role)
      ? user.role.name ?? null
      : null;

    // Cannot change Owner role if they're the only owner
    if (user.is_owner) {
      const { count: ownerCount } = await client
        .from('user')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('is_owner', true);

      if (ownerCount === 1) {
        throw new Error('Cannot change role of only Owner. Transfer ownership first.');
      }
    }

    // Get new role to validate it exists
    const { data: newRole, error: roleError } = await client
      .from('role')
      .select('id, hierarchy_level, name')
      .eq('id', newRoleId)
      .eq('agency_id', agencyId)
      .single();

    if (roleError || !newRole) {
      throw new Error('Target role not found');
    }

    // Get changer's role level for hierarchy check
    const { data: changer } = await client
      .from('user')
      .select(
        `
        id,
        role:role_id (
          hierarchy_level
        )
      `
      )
      .eq('id', changedBy)
      .eq('agency_id', agencyId)
      .single();

    // Hierarchy check: can only assign roles at or below own level
    if (
      newRole.hierarchy_level != null &&
      isRoleRelation(changer?.role) &&
      changer.role.hierarchy_level != null
    ) {
      const changerLevel = changer.role.hierarchy_level;
      if (newRole.hierarchy_level < changerLevel) {
        throw new Error('Cannot assign a role higher than your own');
      }
    }

    // Update user role
    const { error: updateError } = await client
      .from('user')
      .update({
        role_id: newRoleId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user role: ${updateError.message}`);
    }

    // Invalidate user's permission cache
    permissionService.invalidateCache(userId, agencyId);

    // Log role change to audit_log table (US-016)
    auditService.logRoleChange({
      agencyId,
      userId: changedBy,
      targetUserId: userId,
      oldRole: oldRoleName,
      newRole: newRole.name,
      metadata: {
        newRoleId: newRoleId,
        oldRoleId: user.role_id,
      },
    }, client);
  }

  /**
   * Update role permissions (replace all)
   *
   * @param roleId - Role ID
   * @param agencyId - Agency ID
   * @param permissions - New set of permissions
   * @param grantedBy - User ID granting permissions
   * @param supabase - Supabase client (optional)
   */
  async setRolePermissions(
    roleId: string,
    agencyId: string,
    permissions: Array<{ resource: ResourceType; action: PermissionAction }>,
    grantedBy: string,
    supabase?: SupabaseClient<Database>
  ): Promise<void> {
    const client = supabase || createBrowserClient();

    // Check role exists and is not system
    const { data: role, error: roleError } = await client
      .from('role')
      .select('is_system, name')
      .eq('id', roleId)
      .eq('agency_id', agencyId)
      .single();

    if (roleError || !role) {
      throw new Error('Role not found');
    }

    if (role.is_system) {
      throw new Error('Cannot modify system role permissions');
    }

    // Get existing permissions for audit comparison (US-016)
    const { data: existingPerms } = await client
      .from('role_permission')
      .select(`
        permission:permission_id (
          resource,
          action
        )
      `)
      .eq('role_id', roleId);

    const existingPermSet = new Set(
      existingPerms?.map(p =>
        isPermissionRelation(p.permission)
          ? `${p.permission.resource}:${p.permission.action}`
          : null
      ).filter(Boolean) || []
    );

    const newPermSet = new Set(
      permissions.map(p => `${p.resource}:${p.action}`)
    );

    // Delete existing permissions
    await client.from('role_permission').delete().eq('role_id', roleId);

    // Get permission IDs
    const { data: allPermissions, error: permError } = await client
      .from('permission')
      .select('id, resource, action');

    if (permError || !allPermissions) {
      throw new Error(`Failed to fetch permissions: ${permError?.message}`);
    }

    // Map new permissions
    const rolePermissions = permissions
      .map((inputPerm) => {
        const perm = allPermissions.find(
          (p) =>
            p.resource === inputPerm.resource && p.action === inputPerm.action
        );
        return perm
          ? {
              role_id: roleId,
              permission_id: perm.id,
              agency_id: agencyId,
              granted_by: grantedBy,
            }
          : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // Insert new permissions
    if (rolePermissions.length > 0) {
      const { error: insertError } = await client
        .from('role_permission')
        .insert(rolePermissions);

      if (insertError) {
        throw new Error(`Failed to assign permissions: ${insertError.message}`);
      }
    }

    // Invalidate caches for users with this role
    const { data: users } = await client
      .from('user')
      .select('id')
      .eq('role_id', roleId)
      .eq('agency_id', agencyId);

    if (users) {
      for (const user of users) {
        permissionService.invalidateCache(user.id, agencyId);
      }
    }

    // Log permission changes to audit_log table (US-016)
    // Log revoked permissions
    for (const permKey of existingPermSet) {
      if (!newPermSet.has(permKey as string)) {
        const [resource, action] = (permKey as string).split(':');
        auditService.logPermissionChange({
          agencyId,
          userId: grantedBy,
          roleId,
          resource,
          action,
          granted: false,
          metadata: { roleName: role.name },
        }, client);
      }
    }

    // Log granted permissions
    for (const permKey of newPermSet) {
      if (!existingPermSet.has(permKey)) {
        const [resource, action] = permKey.split(':');
        auditService.logPermissionChange({
          agencyId,
          userId: grantedBy,
          roleId,
          resource,
          action,
          granted: true,
          metadata: { roleName: role.name },
        }, client);
      }
    }
  }
}

// Export singleton instance
export const roleService = new RoleService();

// Export class for testing
export { RoleService };
