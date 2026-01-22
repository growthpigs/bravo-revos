/**
 * Workflow Runs API
 * GET /api/v1/workflows/{id}/runs - Execution history with filtering
 *
 * RBAC: Requires automations:read permission
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { getWorkflowRuns, getWorkflowAnalytics } from '@/lib/audienceos/workflows'

type RouteContext = { params: Promise<{ id: string }> }

export const GET = withPermission({ resource: 'automations', action: 'read' })(
  async (request: AuthenticatedRequest, context: RouteContext) => {
    try {
      const { id } = await context.params
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      // Parse query params
      const { searchParams } = new URL(request.url)
      const statusParam = searchParams.get('status')
      const startDate = searchParams.get('start') || undefined
      const endDate = searchParams.get('end') || undefined
      const limit = parseInt(searchParams.get('limit') || '50', 10)
      const includeAnalytics = searchParams.get('analytics') === 'true'

      const filters = {
        status: statusParam
          ? (statusParam.split(',') as ('running' | 'completed' | 'failed')[])
          : undefined,
        startDate,
        endDate,
        limit: Math.min(limit, 100),
      }

      const { data, error, count } = await getWorkflowRuns(supabase, id, agencyId, filters)

      if (error) {
        return NextResponse.json(
          { error: 'internal_error', message: error.message },
          { status: 500 }
        )
      }

      // Optionally include analytics
      let analytics = null
      if (includeAnalytics) {
        const analyticsResult = await getWorkflowAnalytics(supabase, id, agencyId)
        if (analyticsResult.data) {
          analytics = analyticsResult.data
        }
      }

      return NextResponse.json({
        items: data,
        pagination: {
          total: count,
          has_more: (data?.length ?? 0) < count,
        },
        analytics,
      })
    } catch (error) {
      console.error('GET /api/v1/workflows/[id]/runs error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: 'An unexpected error occurred' },
        { status: 500 }
      )
    }
  }
)
