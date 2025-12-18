import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/pods/activities
 * Fetch pod activities for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check with regular client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role for queries to bypass RLS
    const supabaseAdmin = await createClient({ isServiceRole: true });

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Get user's pod memberships
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from('pod_members')
      .select('id, pod_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (memberError) {
      console.error('Error fetching memberships:', memberError);
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ activities: [], count: 0 });
    }

    const podIds = memberships.map(m => m.pod_id);

    // Build query for activities
    let query = supabaseAdmin
      .from('pod_activities')
      .select(`
        *,
        pods(name, client_id)
      `)
      .in('pod_id', podIds)
      .order('scheduled_for', { ascending: true });

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: activities, error: activityError } = await query;

    if (activityError) {
      console.error('Error fetching activities:', activityError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    // Transform data
    const transformedActivities = (activities || []).map((activity: any) => ({
      id: activity.id,
      pod_id: activity.pod_id,
      pod_name: activity.pods?.name || 'Unknown Pod',
      post_id: activity.post_id,
      post_url: activity.post_url,
      engagement_type: activity.activity_type || 'like',
      scheduled_for: activity.scheduled_for,
      status: activity.status,
      created_at: activity.created_at,
      execution_attempts: activity.execution_attempts || 0,
      last_error: activity.last_error,
    }));

    return NextResponse.json({
      activities: transformedActivities,
      count: transformedActivities.length,
    });
  } catch (error) {
    console.error('Pod activities API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
