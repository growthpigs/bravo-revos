'use client';

/**
 * Permission Matrix - Admin Dashboard View
 *
 * RBAC Phase 3: Admin UI Component
 * Displays permission matrix for all roles (read-only or editable)
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PermissionGate } from './permission-gate';
import { Resource, PermissionAction } from '@/types/rbac';
import type { Role } from '@/types/rbac';

interface PermissionMatrixProps {
  editable?: boolean;
  onPermissionChange?: (roleId: string, resource: Resource, action: PermissionAction, granted: boolean) => void;
}

/**
 * PermissionMatrix - Display/Edit role permissions
 */
export function PermissionMatrix({ editable = false, onPermissionChange }: PermissionMatrixProps) {
  const [matrix, setMatrix] = useState<Record<string, Record<Resource, PermissionAction[]>>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissionMatrix();
  }, []);

  const fetchPermissionMatrix = async () => {
    try {
      const response = await fetch('/api/v1/rbac/permission-matrix', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch permission matrix');

      const { matrix: m, roles: r } = await response.json();
      setMatrix(m);
      setRoles(r);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch permission matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading permission matrix...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  // Use enum values from types/rbac.ts
  const resources: Resource[] = [
    Resource.CLIENTS,
    Resource.SETTINGS,
    Resource.USERS,
    Resource.ROLES,
    Resource.TEAM_MEMBERS,
    Resource.DOCUMENTS,
    Resource.WORKFLOWS,
    Resource.TICKETS,
  ];

  const actions: PermissionAction[] = [
    PermissionAction.READ,
    PermissionAction.WRITE,
    PermissionAction.MANAGE,
  ];

  return (
    <PermissionGate resource={Resource.ROLES} action={PermissionAction.READ} fallback={<div>Not authorized</div>}>
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>
            View role permissions across all resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left font-semibold">Resource / Action</th>
                  {roles.map((role) => (
                    <th key={role.id} className="border p-2 text-center font-semibold">
                      {role.display_name}
                      {role.is_system_role && <Badge className="ml-2 text-xs">System</Badge>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) =>
                  actions.map((action) => (
                    <tr key={`${resource}-${action}`} className="hover:bg-muted/50">
                      <td className="border p-2 font-medium">
                        {resource} → {action}
                      </td>
                      {roles.map((role) => {
                        const hasPermission = matrix[role.id]?.[resource]?.includes(action) || false;
                        return (
                          <td key={`${role.id}-${resource}-${action}`} className="border p-2 text-center">
                            {editable ? (
                              <Checkbox
                                checked={hasPermission}
                                onCheckedChange={(checked) => {
                                  if (onPermissionChange) {
                                    onPermissionChange(role.id, resource, action, checked as boolean);
                                  }
                                }}
                              />
                            ) : (
                              <div className={hasPermission ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                {hasPermission ? '✓' : '—'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
