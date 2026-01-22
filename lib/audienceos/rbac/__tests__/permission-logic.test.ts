/**
 * Unit tests for client-scoped permission logic
 *
 * Tests the fix for Blocker 2: Members should be able to list
 * their assigned clients, not just view specific clients.
 */

import { PermissionService } from '../permission-service';
import type { EffectivePermission } from '../types';

describe('Client-Scoped Permission Logic', () => {
  const service = new PermissionService();

  describe('Member with client_access permissions', () => {
    const memberPermissions: EffectivePermission[] = [
      {
        resource: 'clients',
        action: 'read',
        source: 'client_access',
        clientId: 'client-123',
      },
      {
        resource: 'clients',
        action: 'read',
        source: 'client_access',
        clientId: 'client-456',
      },
    ];

    it('should allow listing clients (clientId undefined)', () => {
      const canList = service.checkPermission(
        memberPermissions,
        'clients',
        'read',
        undefined // Listing, no specific client
      );

      expect(canList).toBe(true);
    });

    it('should allow access to assigned client (client-123)', () => {
      const canView = service.checkPermission(
        memberPermissions,
        'clients',
        'read',
        'client-123'
      );

      expect(canView).toBe(true);
    });

    it('should allow access to assigned client (client-456)', () => {
      const canView = service.checkPermission(
        memberPermissions,
        'clients',
        'read',
        'client-456'
      );

      expect(canView).toBe(true);
    });

    it('should deny access to unassigned client', () => {
      const canView = service.checkPermission(
        memberPermissions,
        'clients',
        'read',
        'client-999'
      );

      expect(canView).toBe(false);
    });
  });

  describe('Admin with role permissions', () => {
    const adminPermissions: EffectivePermission[] = [
      {
        resource: 'clients',
        action: 'manage',
        source: 'role',
        roleId: 'admin-role',
      },
    ];

    it('should allow listing all clients', () => {
      const canList = service.checkPermission(
        adminPermissions,
        'clients',
        'read',
        undefined
      );

      expect(canList).toBe(true);
    });

    it('should allow access to any specific client', () => {
      const canView = service.checkPermission(
        adminPermissions,
        'clients',
        'read',
        'any-client-id'
      );

      expect(canView).toBe(true);
    });
  });

  describe('Member with NO client_access', () => {
    const noAccessPermissions: EffectivePermission[] = [];

    it('should deny listing clients', () => {
      const canList = service.checkPermission(
        noAccessPermissions,
        'clients',
        'read',
        undefined
      );

      expect(canList).toBe(false);
    });

    it('should deny access to specific client', () => {
      const canView = service.checkPermission(
        noAccessPermissions,
        'clients',
        'read',
        'client-123'
      );

      expect(canView).toBe(false);
    });
  });
});
