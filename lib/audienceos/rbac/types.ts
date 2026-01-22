/**
 * RBAC Type Definitions
 *
 * Types for the Role-Based Access Control system
 */

// =====================================================================
// ENUMS (Match database enums)
// =====================================================================

export type ResourceType =
  | 'clients'
  | 'communications'
  | 'tickets'
  | 'knowledge-base'
  | 'automations'
  | 'settings'
  | 'users'
  | 'billing'
  | 'roles'
  | 'integrations'
  | 'analytics'
  | 'ai-features'
  | 'cartridges';

export type PermissionAction = 'read' | 'write' | 'delete' | 'manage';

export type ClientAccessPermission = 'read' | 'write';

// =====================================================================
// DATABASE MODELS
// =====================================================================

export interface Permission {
  id: string;
  resource: ResourceType;
  action: PermissionAction;
  description?: string;
  created_at: string;
}

export interface Role {
  id: string;
  agency_id: string;
  name: string;
  description?: string;
  is_system: boolean;
  hierarchy_level?: number; // 1=Owner, 2=Admin, 3=Manager, 4=Member, null=custom
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  agency_id: string;
  granted_by?: string;
  granted_at: string;
}

export interface MemberClientAccess {
  id: string;
  agency_id: string;
  user_id: string;
  client_id: string;
  permission: ClientAccessPermission;
  assigned_by: string;
  assigned_at: string;
}

// =====================================================================
// SERVICE TYPES
// =====================================================================

/**
 * Effective permission with source tracking
 * Used to understand where a permission comes from (role vs client access)
 */
export interface EffectivePermission {
  resource: ResourceType;
  action: PermissionAction;
  source: 'role' | 'client_access';
  roleId?: string;
  clientId?: string; // For client-scoped permissions
}

/**
 * Permission check result with detailed information
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermission?: string;
  effectivePermissions?: EffectivePermission[];
}

/**
 * User with role information for permission checks
 */
export interface UserWithRole {
  id: string;
  agency_id: string;
  email: string;
  is_owner: boolean;
  role_id: string;
  role?: Role & {
    role_permissions?: Array<{
      permission: Permission;
    }>;
  };
}

/**
 * Cache entry for permission data
 */
export interface PermissionCacheEntry {
  permissions: EffectivePermission[];
  expires: number;
}

/**
 * Permission requirement for middleware
 */
export interface PermissionRequirement {
  resource: ResourceType;
  action: PermissionAction;
  clientScoped?: boolean; // For Member client-level access
}

/**
 * Permission denial log entry
 */
export interface PermissionDenialLog {
  user_id: string;
  agency_id: string;
  resource: ResourceType;
  action: PermissionAction;
  client_id?: string;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}
