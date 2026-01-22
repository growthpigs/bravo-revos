'use client';

/**
 * RoleBasedRoute - Route-Level Access Control
 *
 * RBAC Phase 3: Frontend Component
 * Protects entire routes based on role hierarchy
 *
 * Usage:
 * ```tsx
 * <RoleBasedRoute minimumRole="manager">
 *   <SettingsPage />
 * </RoleBasedRoute>
 * ```
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import type { RoleHierarchyLevel } from '@/types/rbac';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  minimumRole?: RoleHierarchyLevel | 'owner' | 'admin' | 'manager' | 'member';
  fallback?: React.ReactNode;
  redirectTo?: string; // Route to redirect if denied (default: /auth/unauthorized)
  onDenied?: () => void; // Callback when access is denied
}

/**
 * Map role names to hierarchy levels
 */
const ROLE_HIERARCHY: Record<string, RoleHierarchyLevel> = {
  owner: 1,
  admin: 2,
  manager: 3,
  member: 4,
};

/**
 * RoleBasedRoute - Protect routes with role hierarchy
 *
 * Flow:
 * 1. Get current user and their role from auth store
 * 2. Check if user's hierarchy_level meets minimum requirement
 * 3. If allowed, render children
 * 4. If denied, show fallback or redirect
 */
export function RoleBasedRoute({
  children,
  minimumRole = 'member',
  fallback = null,
  redirectTo = '/unauthorized',
  onDenied,
}: RoleBasedRouteProps) {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuthStore();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth to load
    }

    if (!user || !userRole) {
      // Not authenticated
      setHasAccess(false);
      setLoading(false);
      if (onDenied) onDenied();
      return;
    }

    // Convert role name to hierarchy level if needed
    const minHierarchy = typeof minimumRole === 'number'
      ? minimumRole
      : ROLE_HIERARCHY[minimumRole] || 4;

    // Check if user's role meets minimum requirement
    // Hierarchy: 1=Owner (highest), 2=Admin, 3=Manager, 4=Member (lowest)
    const granted = userRole.hierarchy_level <= minHierarchy;

    setHasAccess(granted);
    setLoading(false);

    if (!granted && onDenied) {
      onDenied();
    }
  }, [user, userRole, minimumRole, authLoading, onDenied]);

  // Redirect effect - called unconditionally (Rules of Hooks compliant)
  // Only performs redirect when hasAccess is false and redirectTo is provided
  useEffect(() => {
    if (!loading && !authLoading && !hasAccess && redirectTo) {
      router.push(redirectTo);
    }
  }, [router, redirectTo, hasAccess, loading, authLoading]);

  if (loading || authLoading) {
    return null; // Or a loading skeleton
  }

  if (!hasAccess) {
    // Show fallback while redirecting
    return fallback;
  }

  return <>{children}</>;
}

/**
 * OwnerOnly - Convenience wrapper for owner-only routes
 */
export function OwnerOnly({
  children,
  fallback,
  redirectTo,
}: Omit<RoleBasedRouteProps, 'minimumRole'>) {
  return (
    <RoleBasedRoute minimumRole="owner" fallback={fallback} redirectTo={redirectTo}>
      {children}
    </RoleBasedRoute>
  );
}

/**
 * AdminOnly - Convenience wrapper for admin-only routes
 */
export function AdminOnly({
  children,
  fallback,
  redirectTo,
}: Omit<RoleBasedRouteProps, 'minimumRole'>) {
  return (
    <RoleBasedRoute minimumRole="admin" fallback={fallback} redirectTo={redirectTo}>
      {children}
    </RoleBasedRoute>
  );
}

/**
 * ManagerOnly - Convenience wrapper for manager-only routes
 */
export function ManagerOnly({
  children,
  fallback,
  redirectTo,
}: Omit<RoleBasedRouteProps, 'minimumRole'>) {
  return (
    <RoleBasedRoute minimumRole="manager" fallback={fallback} redirectTo={redirectTo}>
      {children}
    </RoleBasedRoute>
  );
}

/**
 * Hook version for imperative role checks
 */
export function useRoleAccess(minimumRole: RoleHierarchyLevel | 'owner' | 'admin' | 'manager' | 'member' = 'member') {
  const { userRole, loading } = useAuthStore();

  const hasAccess = React.useMemo(() => {
    if (loading || !userRole) return false;

    const minHierarchy = typeof minimumRole === 'number'
      ? minimumRole
      : ROLE_HIERARCHY[minimumRole] || 4;

    return userRole.hierarchy_level <= minHierarchy;
  }, [userRole, minimumRole, loading]);

  return { hasAccess, loading, userRole };
}
