import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { DashboardTrends, TrendDataPoint, TimePeriod } from '@/types/dashboard'

/**
 * GET /api/v1/dashboard/trends
 * Get dashboard trend data for charts
 */
export const GET = withPermission({ resource: 'analytics', action: 'read' })(
  async (request: AuthenticatedRequest) => {
  // Rate limit: 60 requests per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 60, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  const searchParams = request.nextUrl.searchParams
  const periodParam = searchParams.get('period')
  const period: TimePeriod = periodParam === '7' ? 7 : periodParam === '90' ? 90 : 30

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { agencyId } = request.user

    // Get date range
    const now = new Date()
    const startDate = new Date(now.getTime() - period * 24 * 60 * 60 * 1000)

    // Fetch clients created in period
    const { data: newClients } = await supabase
      .from('client')
      .select('id, created_at')
      .eq('agency_id', agencyId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Fetch clients that were last updated in period (proxy for "went live")
    const { data: completedInstalls } = await supabase
      .from('client')
      .select('id, updated_at')
      .eq('agency_id', agencyId)
      .gte('updated_at', startDate.toISOString())
      .order('updated_at', { ascending: true })

    // Group by date
    const dateMap = new Map<string, TrendDataPoint>()

    // Initialize all dates in range
    for (let i = 0; i < period; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      dateMap.set(dateStr, {
        date: dateStr,
        newClients: 0,
        completedInstalls: 0,
      })
    }

    // Count new clients per day
    for (const client of newClients || []) {
      const dateStr = client.created_at.split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        entry.newClients++
      }
    }

    // Count completed installs per day
    for (const client of completedInstalls || []) {
      const dateStr = client.updated_at.split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        entry.completedInstalls++
      }
    }

    // Convert to array and sort by date
    const data: TrendDataPoint[] = Array.from(dateMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    )

    const trends: DashboardTrends = {
      data,
      period,
      lastUpdated: now.toISOString(),
    }

    return NextResponse.json({ data: trends })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching dashboard trends:', error)
    }
    return createErrorResponse(500, 'Internal server error')
  }
})
