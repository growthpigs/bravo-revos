// RBAC Components - Export all permission-based UI components
//
// NOTE: Phase 3 components commented out until auth-store is created
// These components require useAuthStore which doesn't exist yet.
// Uncomment when Phase 3 frontend integration begins.

// Phase 3 - uncomment when auth-store exists:
// export { PermissionGate, usePermission } from './permission-gate';
// export { RoleBasedRoute, OwnerOnly, AdminOnly, ManagerOnly, useRoleAccess } from './role-based-route';
// export { PermissionMatrix } from './permission-matrix';
// export { RoleAssignment } from './role-assignment';
// export { ClientAssignment } from './client-assignment';

// Re-export types from RBAC (always available)
export type { Resource, PermissionAction, RoleHierarchyLevel, UserRole, Role } from '@/types/rbac';
