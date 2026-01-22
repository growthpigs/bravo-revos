/**
 * Single Workflow API - Get, Update, Delete
 * GET /api/v1/workflows/{id} - Get automation details
 * PATCH /api/v1/workflows/{id} - Update automation
 * DELETE /api/v1/workflows/{id} - Soft-delete automation
 *
 * RBAC: Requires automations:read (GET) or automations:manage (PATCH/DELETE)
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import {
  getWorkflowWithStats,
  updateWorkflow,
  deleteWorkflow,
  validateTriggerConfig,
  validateActionConfig,
} from '@/lib/audienceos/workflows'
import type { WorkflowTrigger, WorkflowAction } from '@/types/workflow'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================================
// GET /api/v1/workflows/{id}
// ============================================================================

export const GET = withPermission({ resource: 'automations', action: 'read' })(
  async (request: AuthenticatedRequest, context: RouteContext) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id } = await context.params

      // Validate UUID format
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid workflow ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      const { data, error } = await getWorkflowWithStats(supabase, id, agencyId)

      if (error) {
        return createErrorResponse(500, 'Failed to fetch workflow')
      }

      if (!data) {
        return createErrorResponse(404, 'Workflow not found')
      }

      return NextResponse.json(data)
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// ============================================================================
// PATCH /api/v1/workflows/{id}
// ============================================================================

export const PATCH = withPermission({ resource: 'automations', action: 'manage' })(
  async (request: AuthenticatedRequest, context: RouteContext) => {
    // Rate limit: 50 updates per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 50, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await context.params

      // Validate UUID format
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid workflow ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { name, description, triggers, actions, isActive } = body

    // Sanitize name and description
    const sanitizedName =
      typeof name === 'string' ? sanitizeString(name).slice(0, 200) : undefined
    const sanitizedDescription =
      typeof description === 'string' ? sanitizeString(description).slice(0, 1000) : undefined

    // Validate if triggers provided
    if (triggers !== undefined) {
      if (!Array.isArray(triggers) || triggers.length === 0) {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: 'At least one trigger is required',
            details: { field: 'triggers' },
          },
          { status: 400 }
        )
      }

      if (triggers.length > 2) {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: 'Maximum 2 triggers allowed',
            details: { field: 'triggers' },
          },
          { status: 400 }
        )
      }

      const triggerErrors: string[] = []
      for (const trigger of triggers as WorkflowTrigger[]) {
        const validation = validateTriggerConfig(trigger)
        if (!validation.valid) {
          triggerErrors.push(...validation.errors)
        }
      }

      if (triggerErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: 'Invalid trigger configuration',
            details: { field: 'triggers', errors: triggerErrors },
          },
          { status: 400 }
        )
      }
    }

    // Validate if actions provided
    if (actions !== undefined) {
      if (!Array.isArray(actions) || actions.length === 0) {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: 'At least one action is required',
            details: { field: 'actions' },
          },
          { status: 400 }
        )
      }

      if (actions.length > 10) {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: 'Maximum 10 actions allowed',
            details: { field: 'actions' },
          },
          { status: 400 }
        )
      }

      const actionErrors: string[] = []
      for (const action of actions as WorkflowAction[]) {
        const validation = validateActionConfig(action)
        if (!validation.valid) {
          actionErrors.push(...validation.errors)
        }
      }

      if (actionErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: 'Invalid action configuration',
            details: { field: 'actions', errors: actionErrors },
          },
          { status: 400 }
        )
      }
    }

    const { data, error } = await updateWorkflow(supabase, id, agencyId, {
      name: sanitizedName,
      description: sanitizedDescription,
      triggers,
      actions,
      isActive: typeof isActive === 'boolean' ? isActive : undefined,
    })

    if (error) {
      return createErrorResponse(500, 'Failed to update workflow')
    }

    if (!data) {
      return createErrorResponse(404, 'Workflow not found')
    }

      return NextResponse.json(data)
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// ============================================================================
// DELETE /api/v1/workflows/{id}
// ============================================================================

export const DELETE = withPermission({ resource: 'automations', action: 'manage' })(
  async (request: AuthenticatedRequest, context: RouteContext) => {
    // Rate limit: 20 deletes per minute (stricter for destructive ops)
    const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await context.params

      // Validate UUID format
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid workflow ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      const { error } = await deleteWorkflow(supabase, id, agencyId)

      if (error) {
        return createErrorResponse(500, 'Failed to delete workflow')
      }

      return new NextResponse(null, { status: 204 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
