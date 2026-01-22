import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/hgc/pods
 * Get pod engagement analysis for HGC agent
 * Query params: pod_id (required)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const podId = searchParams.get('pod_id')

    if (!podId) {
      return NextResponse.json(
        { error: 'pod_id query parameter is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch pod with members and activity (RLS enforces user access via pod_members)
    const { data: pod, error: podError } = await supabase
      .from('pod')
      .select(`
        id,
        name,
        description,
        status,
        min_members,
        max_members,
        participation_threshold,
        suspension_threshold,
        created_at,
        pod_members (
          id,
          user_id,
          role,
          status,
          participation_score,
          last_activity_at,
          users (
            id,
            email
          )
        )
      `)
      .eq('id', podId)
      .single()

    if (podError) {
      return NextResponse.json(
        { error: `Failed to fetch pod: ${podError.message}` },
        { status: 400 }
      )
    }

    // Calculate engagement metrics
    const activeMembers = pod.pod_members?.filter(
      (m: any) => m.status === 'active'
    ) || []

    const suspendedMembers = pod.pod_members?.filter(
      (m: any) => m.status === 'suspended'
    ) || []

    const avgParticipation = activeMembers.length > 0
      ? activeMembers.reduce((sum: number, m: any) => sum + (m.participation_score || 0), 0) / activeMembers.length
      : 0

    // Get recent pod activities
    const { data: activities } = await supabase
      .from('pod_activity')
      .select('id, action_type, status, created_at, executed_at')
      .eq('pod_id', podId)
      .order('created_at', { ascending: false })
      .limit(10)

    const engagement = {
      pod_name: pod.name,
      total_members: pod.pod_members?.length || 0,
      active_members: activeMembers.length,
      suspended_members: suspendedMembers.length,
      avg_participation_score: Math.round(avgParticipation * 100) / 100,
      participation_threshold: pod.participation_threshold,
      suspension_threshold: pod.suspension_threshold,
      status: pod.status,
      recent_activities: activities || [],
      health_status: avgParticipation >= pod.participation_threshold ? 'healthy' : 'needs_attention'
    }

    return NextResponse.json({
      success: true,
      engagement,
    })
  } catch (error) {
    console.error('[HGC_PODS_API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
