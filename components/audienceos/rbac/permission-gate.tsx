'use client';

/**
 * PermissionGate - Conditional Rendering Based on Permissions
 *
 * RBAC Phase 3: Frontend Component
 * Wraps content and conditionally renders based on user permissions
 *
 * Usage:
 * ```tsx
 * <PermissionGate resource="clients" action="write" fallback={<Unauthorized />}>
 *   <ClientForm />
 * </PermissionGate>
 * ```
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import type { Resource, PermissionAction } from '@/types/rbac';

interface PermissionGateProps {
  resource: Resource;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  clientId?: string; // For client-scoped permissions (Members)
}

/**
 * PermissionGate component - Check permissions before rendering
 *
 * Flow:
 * 1. Get current user and their permissions from auth store
 * 2. Check if user has required resource + action permission
 * 3. If Member role, also check client-scoped access
 * 4. Render children if allowed, fallback otherwise
 */
export function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
  clientId,
}: PermissionGateProps) {
  const { user, userRole, userPermissions } = useAuthStore();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Helper: Check permissions from user's permission list
    const checkPermissions = () => {
      if (!userPermissions) {
        setHasPermission(false);
        return;
      }

      const permission = userPermissions.find(
        (p) => p.resource === resource && p.action === action
      );
      setHasPermission(!!permission);
    };

    // Helper: Check member's client-scoped access via API
    const checkMemberClientAccess = async () => {
      if (!clientId || !user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/v1/rbac/member-access?client_id=${clientId}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          setHasPermission(false);
        } else {
          const { has_access } = await response.json();
          setHasPermission(has_access);
        }
      } catch {
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    // Main permission check logic
    if (!user || !userRole) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    // Owner/Admin/Manager (levels 1-3) always have full permissions
    if (userRole.hierarchy_level <= 3) {
      setHasPermission(true);
      setLoading(false);
      return;
    }

    // Member role (level 4) - check client-scoped access or general permissions
    if (userRole.hierarchy_level === 4) {
      if (clientId) {
        // Check if Member has access to this specific client
        checkMemberClientAccess();
      } else {
        // Member accessing without client scope - check general permissions
        checkPermissions();
        setLoading(false);
      }
      return;
    }

    // Unknown role levels - check specific permissions
    checkPermissions();
    setLoading(false);
  }, [user, userRole, userPermissions, resource, action, clientId]);

  if (loading) {
    return null; // Or a loading skeleton
  }

  if (!hasPermission) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Hook version for imperative permission checks
 */
export function usePermission(resource: Resource, action: PermissionAction, clientId?: string) {
  const { userRole, userPermissions } = useAuthStore();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAsync = async () => {
      if (!userRole) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      // Fast path for high-privilege users
      if (userRole.hierarchy_level <= 3) {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // Member: check client access if provided
      if (userRole.hierarchy_level === 4 && clientId) {
        try {
          const response = await fetch(
            `/api/v1/rbac/member-access?client_id=${clientId}`,
            { credentials: 'include' }
          );
          const { has_access } = await response.json();
          setHasPermission(has_access);
        } catch {
          setHasPermission(false);
        }
      } else {
        // Check specific permission
        const permission = userPermissions?.find(
          (p) => p.resource === resource && p.action === action
        );
        setHasPermission(!!permission);
      }

      setLoading(false);
    };

    checkAsync();
  }, [userRole, userPermissions, resource, action, clientId]);

  return { hasPermission, loading };
}
