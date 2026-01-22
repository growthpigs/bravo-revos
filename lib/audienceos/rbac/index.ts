/**
 * RBAC (Role-Based Access Control) Module
 *
 * Exports:
 * - Permission Service: Core permission checking and caching
 * - Role Service: Role management operations
 * - Types: TypeScript definitions for RBAC
 *
 * Usage:
 * ```typescript
 * import { permissionService, roleService } from '@/lib/rbac';
 *
 * // Get user permissions
 * const permissions = await permissionService.getUserPermissions(userId, agencyId);
 *
 * // Check permission
 * const canRead = permissionService.checkPermission(permissions, 'clients', 'read');
 *
 * // Create custom role
 * const role = await roleService.createRole(agencyId, userId, {
 *   name: 'Sales Rep',
 *   permissions: [
 *     { resource: 'clients', action: 'read' },
 *     { resource: 'clients', action: 'write' },
 *   ]
 * });
 * ```
 */

// Services
export { permissionService, PermissionService } from './permission-service';
export { roleService, RoleService } from './role-service';
export { auditService, AuditService } from './audit-service';

// Audit types
export type {
  AuditActionType,
  AuditResult,
  PermissionCheckLog,
  RoleChangeLog,
  ClientAccessLog,
  PermissionChangeLog,
} from './audit-service';

// Types
export type {
  ResourceType,
  PermissionAction,
  ClientAccessPermission,
  Permission,
  Role,
  RolePermission,
  MemberClientAccess,
  EffectivePermission,
  PermissionCheckResult,
  UserWithRole,
  PermissionCacheEntry,
  PermissionRequirement,
  PermissionDenialLog,
} from './types';

export type { CreateRoleInput, UpdateRoleInput } from './role-service';
