/**
 * Workflow Toggle API
 * PATCH /api/v1/workflows/{id}/toggle - Enable/disable automation
 *
 * RBAC: Requires automations:manage permission
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withCsrfProtection } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { toggleWorkflow } from '@/lib/audienceos/workflows'

type RouteContext = { params: Promise<{ id: string }> }

export const PATCH = withPermission({ resource: 'automations', action: 'manage' })(
  async (request: AuthenticatedRequest, context: RouteContext) => {
    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await context.params
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      const body = await request.json()
      const { enabled } = body

      if (typeof enabled !== 'boolean') {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: 'enabled must be a boolean',
            details: { field: 'enabled' },
          },
          { status: 400 }
        )
      }

      const { data, error } = await toggleWorkflow(supabase, id, agencyId, enabled)

      if (error) {
        return NextResponse.json(
          { error: 'internal_error', message: error.message },
          { status: 500 }
        )
      }

      if (!data) {
        return NextResponse.json(
          { error: 'not_found', message: 'Workflow not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        id: data.id,
        is_active: data.is_active,
        message: data.is_active ? 'Automation enabled' : 'Automation disabled',
      })
    } catch (error) {
      console.error('PATCH /api/v1/workflows/[id]/toggle error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: 'An unexpected error occurred' },
        { status: 500 }
      )
    }
  }
)
