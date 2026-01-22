/**
 * Dashboard KPIs API
 * GET /api/v1/dashboard/kpis - Get dashboard KPI metrics
 *
 * RBAC: Requires analytics:read permission
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/audienceos/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'
// Note: withPermission not yet applied to this route
import type { DashboardKPIs, TrendDirection } from '@/types/dashboard'

/**
 * GET /api/v1/dashboard/kpis
 * Get dashboard KPIs with aggregated metrics
 */
export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 60, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Get date ranges
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Query active onboardings (clients in Onboarding/Implementation stages)
    const onboardingStages = ['Onboarding', 'Implementation']
    const { count: activeOnboardingsCount, error: _onboardingError } = await supabase
      .from('client')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .in('stage', onboardingStages)

    // Previous period onboardings
    const { count: prevOnboardingsCount } = await supabase
      .from('client')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .in('stage', onboardingStages)
      .lt('created_at', thirtyDaysAgo.toISOString())
      .gte('created_at', sixtyDaysAgo.toISOString())

    // Query at-risk clients (health_status = 'red' or 'yellow')
    const { count: atRiskCount, error: _riskError } = await supabase
      .from('client')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .in('health_status', ['red', 'yellow'])
      .eq('is_active', true)

    const { count: prevAtRiskCount } = await supabase
      .from('client')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .in('health_status', ['red', 'yellow'])
      .eq('is_active', true)
      .lt('updated_at', sevenDaysAgo.toISOString())

    // Query support hours this week (from ticket time_spent_minutes)
    const { data: ticketsThisWeek } = await supabase
      .from('ticket')
      .select('time_spent_minutes')
      .eq('agency_id', agencyId)
      .gte('created_at', sevenDaysAgo.toISOString())

    const supportMinutesWeek = (ticketsThisWeek || []).reduce(
      (sum, t) => sum + (t.time_spent_minutes || 0),
      0
    )
    const supportHoursWeek = Math.round(supportMinutesWeek / 60 * 10) / 10

    const { data: ticketsLastWeek } = await supabase
      .from('ticket')
      .select('time_spent_minutes')
      .eq('agency_id', agencyId)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    const prevSupportMinutesWeek = (ticketsLastWeek || []).reduce(
      (sum, t) => sum + (t.time_spent_minutes || 0),
      0
    )
    const prevSupportHoursWeek = Math.round(prevSupportMinutesWeek / 60 * 10) / 10

    // Calculate avg install time (days from creation to last update)
    const { data: recentCompletions } = await supabase
      .from('client')
      .select('created_at, updated_at')
      .eq('agency_id', agencyId)
      .eq('stage', 'Live')
      .gte('updated_at', thirtyDaysAgo.toISOString())

    let avgInstallDays = 0
    if (recentCompletions && recentCompletions.length > 0) {
      const totalDays = recentCompletions.reduce((sum, c) => {
        const start = new Date(c.created_at).getTime()
        const end = new Date(c.updated_at).getTime()
        return sum + (end - start) / (24 * 60 * 60 * 1000)
      }, 0)
      avgInstallDays = Math.round(totalDays / recentCompletions.length * 10) / 10
    }

    const { data: prevCompletions } = await supabase
      .from('client')
      .select('created_at, updated_at')
      .eq('agency_id', agencyId)
      .eq('stage', 'Live')
      .gte('updated_at', sixtyDaysAgo.toISOString())
      .lt('updated_at', thirtyDaysAgo.toISOString())

    let prevAvgInstallDays = 0
    if (prevCompletions && prevCompletions.length > 0) {
      const totalDays = prevCompletions.reduce((sum, c) => {
        const start = new Date(c.created_at).getTime()
        const end = new Date(c.updated_at).getTime()
        return sum + (end - start) / (24 * 60 * 60 * 1000)
      }, 0)
      prevAvgInstallDays = Math.round(totalDays / prevCompletions.length * 10) / 10
    }

    // Clients needing attention (unanswered communications)
    const { count: needsAttentionCount } = await supabase
      .from('communication')
      .select('client_id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('needs_reply', true)

    // Helper to calculate trend
    const calculateTrend = (current: number, previous: number): { direction: TrendDirection; percent: number } => {
      if (previous === 0) {
        return { direction: current > 0 ? 'up' : 'stable', percent: current > 0 ? 100 : 0 }
      }
      const percent = Math.round(((current - previous) / previous) * 100)
      const direction: TrendDirection = percent > 0 ? 'up' : percent < 0 ? 'down' : 'stable'
      return { direction, percent: Math.abs(percent) }
    }

    const now_iso = now.toISOString()

    // Build KPIs response
    const activeOnboardingsTrend = calculateTrend(activeOnboardingsCount || 0, prevOnboardingsCount || 0)
    const atRiskTrend = calculateTrend(atRiskCount || 0, prevAtRiskCount || 0)
    const supportTrend = calculateTrend(supportHoursWeek, prevSupportHoursWeek)
    const installTrend = calculateTrend(avgInstallDays, prevAvgInstallDays)

    const kpis: DashboardKPIs = {
      activeOnboardings: {
        id: 'active_onboardings',
        label: 'Active Onboardings',
        value: activeOnboardingsCount || 0,
        displayValue: `${activeOnboardingsCount || 0}`,
        trend: activeOnboardingsTrend.direction,
        changePercent: activeOnboardingsTrend.percent,
        previousValue: prevOnboardingsCount || 0,
        drillDownUrl: '/?stage=onboarding',
        lastUpdated: now_iso,
      },
      atRiskClients: {
        id: 'at_risk_clients',
        label: 'At-Risk Clients',
        value: atRiskCount || 0,
        displayValue: `${atRiskCount || 0}`,
        trend: atRiskTrend.direction,
        changePercent: atRiskTrend.percent,
        previousValue: prevAtRiskCount || 0,
        drillDownUrl: '/?health=at_risk',
        lastUpdated: now_iso,
      },
      supportHoursWeek: {
        id: 'support_hours',
        label: 'Support Hours (Week)',
        value: supportHoursWeek,
        displayValue: `${supportHoursWeek}h`,
        trend: supportTrend.direction,
        changePercent: supportTrend.percent,
        previousValue: prevSupportHoursWeek,
        drillDownUrl: '/tickets',
        lastUpdated: now_iso,
      },
      avgInstallTime: {
        id: 'avg_install_time',
        label: 'Avg Install Time',
        value: avgInstallDays,
        displayValue: `${avgInstallDays} Days`,
        trend: installTrend.direction === 'down' ? 'up' : installTrend.direction === 'up' ? 'down' : 'stable', // Lower is better
        changePercent: installTrend.percent,
        previousValue: prevAvgInstallDays,
        drillDownUrl: null,
        lastUpdated: now_iso,
      },
      clientsNeedingAttention: {
        id: 'clients_needing_attention',
        label: 'Needs Attention',
        value: needsAttentionCount || 0,
        displayValue: `${needsAttentionCount || 0}`,
        trend: 'stable', // No historical comparison for this
        changePercent: 0,
        previousValue: 0,
        drillDownUrl: '/communications?filter=needs_reply',
        lastUpdated: now_iso,
      },
    }

    return NextResponse.json({ data: kpis })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching dashboard KPIs:', error)
    }
    return createErrorResponse(500, 'Internal server error')
  }
}
