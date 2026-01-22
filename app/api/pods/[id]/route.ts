import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/pods/[id]
 * Get detailed information about a specific pod
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const { data: pod, error } = await supabase
      .from('pod')
      .select(`
        id,
        client_id,
        name,
        description,
        min_members,
        max_members,
        participation_threshold,
        suspension_threshold,
        status,
        created_at,
        updated_at,
        clients (id, name),
        pod_members (
          id,
          user_id,
          linkedin_account_id,
          role,
          participation_score,
          total_engagements,
          completed_engagements,
          missed_engagements,
          status,
          joined_at,
          last_activity_at,
          users (id, email, full_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pod not found' },
          { status: 404 }
        );
      }

      console.error('[PODS_API] Error fetching pod:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pod', details: error.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const activeMembers = pod.pod_members?.filter((m: any) => m.status === 'active') || [];
    const avgParticipation = activeMembers.length > 0
      ? activeMembers.reduce((sum: number, m: any) => sum + parseFloat(m.participation_score || '0'), 0) / activeMembers.length
      : 0;

    return NextResponse.json({
      status: 'success',
      pod: {
        ...pod,
        member_count: activeMembers.length,
        total_members: pod.pod_members?.length || 0,
        avg_participation: Math.round(avgParticipation * 100) / 100,
      },
    });
  } catch (error) {
    console.error('[PODS_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pods/[id]
 * Update a pod's settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;
    const body = await request.json();

    const {
      name,
      description,
      minMembers,
      maxMembers,
      participationThreshold,
      suspensionThreshold,
      status,
    } = body;

    // Build update object with only provided fields
    const updates: any = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (minMembers !== undefined) {
      if (minMembers < 3) {
        return NextResponse.json(
          { error: 'Minimum 3 members required for a pod' },
          { status: 400 }
        );
      }
      updates.min_members = minMembers;
    }
    if (maxMembers !== undefined) updates.max_members = maxMembers;
    if (participationThreshold !== undefined) {
      if (participationThreshold < 0 || participationThreshold > 1) {
        return NextResponse.json(
          { error: 'Participation threshold must be between 0 and 1' },
          { status: 400 }
        );
      }
      updates.participation_threshold = participationThreshold;
    }
    if (suspensionThreshold !== undefined) {
      if (suspensionThreshold < 0 || suspensionThreshold > 1) {
        return NextResponse.json(
          { error: 'Suspension threshold must be between 0 and 1' },
          { status: 400 }
        );
      }
      updates.suspension_threshold = suspensionThreshold;
    }
    if (status !== undefined) {
      if (!['active', 'paused', 'archived'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be: active, paused, or archived' },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: pod, error } = await supabase
      .from('pod')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pod not found' },
          { status: 404 }
        );
      }

      console.error('[PODS_API] Error updating pod:', error);
      return NextResponse.json(
        { error: 'Failed to update pod', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      pod,
    });
  } catch (error) {
    console.error('[PODS_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pods/[id]
 * Delete a pod (cascades to members and activities)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const { error } = await supabase
      .from('pod')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pod not found' },
          { status: 404 }
        );
      }

      console.error('[PODS_API] Error deleting pod:', error);
      return NextResponse.json(
        { error: 'Failed to delete pod', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      message: 'Pod deleted successfully',
    });
  } catch (error) {
    console.error('[PODS_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
