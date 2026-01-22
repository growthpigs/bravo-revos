/**
 * TASK-011: Permission Middleware Wrapper
 *
 * Wraps API route handlers with permission checking logic.
 * Automatically denies access if user lacks required permissions.
 *
 * TASK-013 Part 2: Enhanced with member client-scoped access checks
 * - Verifies Members have access to specific clients
 * - Uses role hierarchy for early permission denials
 * - Logs client-scoped access attempts for audit trail
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase';
import { permissionService } from './permission-service';
import { auditService } from './audit-service';
import { enforceClientAccess } from './client-access';
import type { ResourceType, PermissionAction } from './types';

export interface PermissionRequirement {
  /** The resource being accessed (e.g., 'clients', 'tickets') */
  resource: ResourceType;
  /** The action being performed (e.g., 'read', 'write', 'delete', 'manage') */
  action: PermissionAction;
  /** Optional: Required for client-scoped actions (Members accessing specific clients) */
  clientId?: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    agencyId: string;
    roleId: string | null;
    isOwner: boolean;
  };
}

/**
 * Shared helper: Authenticate and fetch app user
 * Used by all middleware wrappers to avoid duplication
 * Returns supabase client for use in downstream permission checks (TASK-013 Part 2)
 */
async function authenticateUser(): Promise<
  | {
      success: true;
      user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>['user']>;
      agencyId: string;
      appUser: {
        id: string;
        email: string;
        role_id: string | null;
        is_owner: boolean;
      };
      supabase: any; // Supabase client for downstream permission checks
    }
  | { success: false; response: NextResponse }
> {
  const supabase = await createRouteHandlerClient(cookies);
  const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase);

  if (!user || !agencyId) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to access this resource',
        },
        { status: 401 }
      ),
    };
  }

  const { data: appUser, error: userError } = await supabase
    .from('user')
    .select('id, email, role_id, is_owner')
    .eq('id', user.id)
    .single();

  if (userError || !appUser) {
    console.error('[authenticateUser] Failed to fetch app user:', userError);
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Internal Server Error',
          code: 'USER_FETCH_FAILED',
          message: 'Could not fetch user information',
        },
        { status: 500 }
      ),
    };
  }

  return { success: true, user, agencyId, appUser, supabase };
}

/**
 * Middleware wrapper that enforces permission checks on API routes
 *
 * @example
 * ```typescript
 * export const GET = withPermission({ resource: 'clients', action: 'read' })(
 *   async (req: AuthenticatedRequest) => {
 *     // User's permission already verified
 *     const clients = await fetchClients(req.user.agencyId);
 *     return NextResponse.json(clients);
 *   }
 * );
 * ```
 */
export function withPermission(requirement: PermissionRequirement) {
  return function wrapper<T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ) {
    return async function middleware(
      req: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> {
      try {
        // 1. Authenticate and fetch user
        const authResult = await authenticateUser();
        if (!authResult.success) {
          console.warn('[withPermission] Authentication failed:', {
            resource: requirement.resource,
            action: requirement.action,
            path: req.nextUrl.pathname,
          });
          return authResult.response;
        }

        const { user, agencyId, appUser, supabase } = authResult;

        // 2. Fetch user permissions (pass supabase client for server context)
        const permissions = await permissionService.getUserPermissions(
          user.id,
          agencyId,
          supabase
        );

        // 3. Extract client ID from request if needed
        let clientId = requirement.clientId;
        if (!clientId && requirement.resource === 'clients') {
          // Try to extract from URL path: /api/v1/clients/[id]
          const match = req.nextUrl.pathname.match(/\/clients\/([^/]+)/);
          if (match) {
            clientId = match[1];
          }
        }

        // 4. Check permission
        const hasPermission = permissionService.checkPermission(
          permissions,
          requirement.resource,
          requirement.action,
          clientId
        );

        if (!hasPermission) {
          // Log permission denial to audit_log table (US-015)
          auditService.logPermissionCheck({
            agencyId,
            userId: user.id,
            resource: requirement.resource,
            action: requirement.action,
            resourceId: clientId,
            result: 'denied',
            reason: `Missing permission: ${requirement.resource}:${requirement.action}`,
            metadata: {
              path: req.nextUrl.pathname,
              method: req.method,
              roleId: appUser.role_id,
              isOwner: appUser.is_owner,
            },
          }, supabase);

          return NextResponse.json(
            {
              error: 'Forbidden',
              code: 'PERMISSION_DENIED',
              required: `${requirement.resource}:${requirement.action}`,
              message: getPermissionDeniedMessage(requirement, clientId),
            },
            { status: 403 }
          );
        }

        // 4b. TASK-013 Part 2: For client-scoped resources, verify member has access to specific client
        if (clientId && requirement.resource === 'clients') {
          const hasClientAccess = await enforceClientAccess(
            user.id,
            agencyId,
            clientId,
            requirement.action as 'read' | 'write',
            supabase
          );

          if (!hasClientAccess) {
            // Log client access denial to audit_log table (US-015)
            auditService.logClientAccess({
              agencyId,
              userId: user.id,
              clientId,
              action: requirement.action,
              result: 'denied',
              metadata: {
                path: req.nextUrl.pathname,
                method: req.method,
                roleId: appUser.role_id,
              },
            }, supabase);

            return NextResponse.json(
              {
                error: 'Forbidden',
                code: 'CLIENT_ACCESS_DENIED',
                message: `You do not have permission to access this client. Contact your administrator if you believe you should have access.`,
              },
              { status: 403 }
            );
          }

          // Log successful client access to audit_log table (US-015)
          auditService.logClientAccess({
            agencyId,
            userId: user.id,
            clientId,
            action: requirement.action,
            result: 'allowed',
            metadata: {
              path: req.nextUrl.pathname,
              method: req.method,
            },
          }, supabase);
        }

        // 5. Permission granted - attach user to request and call handler
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = {
          id: user.id,
          email: user.email || appUser.email,
          agencyId,
          roleId: appUser.role_id,
          isOwner: appUser.is_owner,
        };

        return await handler(authenticatedReq, ...args);
      } catch (error) {
        console.error('[withPermission] Middleware error:', error);

        return NextResponse.json(
          {
            error: 'Internal Server Error',
            code: 'PERMISSION_CHECK_FAILED',
            message: 'An error occurred while checking permissions',
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Generate user-friendly permission denied messages
 */
function getPermissionDeniedMessage(
  requirement: PermissionRequirement,
  clientId?: string
): string {
  const { resource, action } = requirement;

  // Resource-specific messages
  if (resource === 'clients') {
    if (clientId) {
      return `You do not have permission to ${action} this client. Contact your administrator to request access.`;
    }
    return `You do not have permission to ${action} clients.`;
  }

  if (resource === 'settings') {
    return `You do not have permission to ${action} agency settings. Only administrators can modify settings.`;
  }

  if (resource === 'users') {
    return `You do not have permission to ${action} user accounts. Only administrators can manage users.`;
  }

  if (resource === 'roles') {
    return `You do not have permission to ${action} roles. Only owners can manage roles.`;
  }

  // Generic fallback
  return `You do not have permission to ${action} ${resource}. Contact your administrator if you believe you should have access.`;
}

/**
 * Helper: Create multiple permission requirements (OR logic)
 * User needs ANY ONE of the specified permissions
 *
 * @example
 * ```typescript
 * export const GET = withAnyPermission([
 *   { resource: 'clients', action: 'read' },
 *   { resource: 'clients', action: 'manage' }
 * ])(handler);
 * ```
 */
export function withAnyPermission(requirements: PermissionRequirement[]) {
  return function wrapper<T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ) {
    return async function middleware(
      req: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> {
      const authResult = await authenticateUser();
      if (!authResult.success) {
        return authResult.response;
      }

      const { user, agencyId, appUser, supabase } = authResult;

      const permissions = await permissionService.getUserPermissions(
        user.id,
        agencyId,
        supabase
      );

      // Check if user has ANY of the required permissions
      const hasAnyPermission = requirements.some((req) =>
        permissionService.checkPermission(
          permissions,
          req.resource,
          req.action,
          req.clientId
        )
      );

      if (!hasAnyPermission) {
        console.warn('[withAnyPermission] No matching permissions:', {
          userId: user.id,
          required: requirements.map((r) => `${r.resource}:${r.action}`),
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            code: 'PERMISSION_DENIED',
            message: 'You do not have any of the required permissions',
          },
          { status: 403 }
        );
      }

      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        id: user.id,
        email: user.email || appUser.email,
        agencyId,
        roleId: appUser.role_id,
        isOwner: appUser.is_owner,
      };

      return await handler(authenticatedReq, ...args);
    };
  };
}

/**
 * Helper: Owner-only middleware (shorthand for high-privilege routes)
 *
 * @example
 * ```typescript
 * export const DELETE = withOwnerOnly()(async (req) => {
 *   // Only owners can access this
 * });
 * ```
 */
export function withOwnerOnly() {
  return function wrapper<T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ) {
    return async function middleware(
      req: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> {
      try {
        const authResult = await authenticateUser();
        if (!authResult.success) {
          return authResult.response;
        }

        const { user, agencyId, appUser, supabase } = authResult;

        if (!appUser.is_owner) {
          console.warn('[withOwnerOnly] Access denied - not owner:', {
            userId: user.id,
            email: user.email,
            isOwner: appUser.is_owner,
          });

          return NextResponse.json(
            {
              error: 'Forbidden',
              code: 'OWNER_ONLY',
              message: 'This action can only be performed by the agency owner',
            },
            { status: 403 }
          );
        }

        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = {
          id: user.id,
          email: user.email || appUser.email,
          agencyId,
          roleId: appUser.role_id,
          isOwner: appUser.is_owner,
        };

        return await handler(authenticatedReq, ...args);
      } catch (error) {
        console.error('[withOwnerOnly] Middleware error:', error);

        return NextResponse.json(
          {
            error: 'Internal Server Error',
            code: 'OWNER_CHECK_FAILED',
            message: 'An error occurred while checking owner status',
          },
          { status: 500 }
        );
      }
    };
  };
}
