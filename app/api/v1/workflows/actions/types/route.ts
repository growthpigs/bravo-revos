/**
 * Action Types API
 * GET /api/v1/workflows/actions/types - Available action types with schemas
 *
 * RBAC: Requires automations:read permission
 */

import { NextResponse } from 'next/server'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { getActionTypes, AVAILABLE_VARIABLES, DELAY_PRESETS } from '@/lib/audienceos/workflows'

export const GET = withPermission({ resource: 'automations', action: 'read' })(
  async (_request: AuthenticatedRequest) => {
    const actionTypes = getActionTypes()

    return NextResponse.json({
      types: actionTypes,
      variables: AVAILABLE_VARIABLES,
      delayPresets: DELAY_PRESETS,
    })
  }
)
