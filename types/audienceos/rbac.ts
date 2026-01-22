/**
 * RBAC Types - Generated from 009_rbac_schema.sql
 * Last Updated: 2026-01-08
 *
 * Types for Multi-Org Roles & Permissions System
 */

// ============================================================================
// Enums
// ============================================================================

export enum RoleHierarchyLevel {
  OWNER = 1,
  ADMIN = 2,
  MANAGER = 3,
  MEMBER = 4,
}

export enum Resource {
  CLIENTS = 'clients',
  SETTINGS = 'settings',
  USERS = 'users',
  ROLES = 'roles',
  TEAM_MEMBERS = 'team_members',
  DOCUMENTS = 'documents',
  WORKFLOWS = 'workflows',
  TICKETS = 'tickets',
}

export enum PermissionAction {
  READ = 'read',
  WRITE = 'write',
  MANAGE = 'manage',
}

export enum AuditResult {
  ALLOWED = 'allowed',
  DENIED = 'denied',
}

export enum AuditActionType {
  PERMISSION_CHECK = 'permission_check',
  ROLE_CHANGE = 'role_change',
  CLIENT_ASSIGNMENT = 'client_assignment',
  PERMISSION_UPDATE = 'permission_update',
}

// ============================================================================
// Database Models (correspond to tables)
// ============================================================================

export interface Role {
  id: string;
  name: string;
  display_name: string;
  hierarchy_level: RoleHierarchyLevel;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  role_id: string;
  resource: Resource;
  action: PermissionAction;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  agency_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface MemberClientAccess {
  id: string;
  user_id: string;
  agency_id: string;
  client_id: string;
  permission: 'read' | 'write';
  assigned_by: string;
  assigned_at: string;
}

export interface AuditLog {
  id: string;
  agency_id: string;
  user_id: string | null;
  action_type: AuditActionType;
  resource: Resource | null;
  resource_id: string | null;
  permission_action: PermissionAction | null;
  result: AuditResult;
  reason: string | null;
  metadata: Record<string, any> | null;
  timestamp: string;
}

// ============================================================================
// Extended User Type (with role information)
// ============================================================================

export interface UserWithRole extends Record<string, any> {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string | null;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Permission Check Results
// ============================================================================

export interface PermissionCheckResult {
  user_id: string;
  resource: Resource;
  action: PermissionAction;
  client_id?: string;
  has_permission: boolean;
  reason?: string;
}

export interface BulkPermissionCheckResult {
  user_id: string;
  results: Array<{
    resource: Resource;
    action: PermissionAction;
    client_id?: string;
    has_permission: boolean;
  }>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AssignRoleRequest {
  role_id: string;
}

export interface AssignRoleResponse {
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string;
}

export interface AssignClientRequest {
  client_ids: string[];
  replace?: boolean;
}

export interface AssignClientResponse {
  user_id: string;
  assigned_clients: string[];
  total_assignments: number;
}

export interface CheckPermissionRequest {
  resource: Resource;
  action: PermissionAction;
  client_id?: string;
}

export interface UpdatePermissionsRequest {
  permissions: Array<{
    resource: Resource;
    action: PermissionAction;
    granted: boolean;
  }>;
}

export interface AuditLogQuery {
  user_id?: string;
  resource?: Resource;
  result?: AuditResult;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  entries: AuditLog[];
  total: number;
  has_more: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export type PermissionMatrix = Record<string, Record<Resource, PermissionAction[]>>;

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface UserAccessLevel {
  user_id: string;
  agency_id: string;
  role_id: string;
  hierarchy_level: RoleHierarchyLevel;
  accessible_clients: string[];
  can_manage_roles: boolean;
  can_manage_users: boolean;
  can_audit: boolean;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface PermissionCacheEntry {
  user_id: string;
  agency_id: string;
  permissions: Permission[];
  accessible_clients: string[];
  timestamp: number;
  ttl: number;
}

export interface RoleHierarchyCacheEntry {
  agency_id: string;
  roles: Role[];
  timestamp: number;
  ttl: number;
}
