/**
 * Trigger Types API
 * GET /api/v1/workflows/triggers/types - Available trigger types with schemas
 *
 * RBAC: Requires automations:read permission
 */

import { NextResponse } from 'next/server'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { getTriggerTypes, COMMON_SCHEDULES, AVAILABLE_TIMEZONES } from '@/lib/audienceos/workflows'

export const GET = withPermission({ resource: 'automations', action: 'read' })(
  async (_request: AuthenticatedRequest) => {
    const triggerTypes = getTriggerTypes()

    return NextResponse.json({
      types: triggerTypes,
      schedules: COMMON_SCHEDULES,
      timezones: AVAILABLE_TIMEZONES,
    })
  }
)
