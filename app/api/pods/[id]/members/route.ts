import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/pods/[id]/members
 * Add a member to a pod
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = params;
    const body = await request.json();

    const { userId, linkedInAccountId, role = 'member' } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['owner', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: owner or member' },
        { status: 400 }
      );
    }

    // Check if pod exists and get current member count
    const { data: pod, error: podError } = await supabase
      .from('pods')
      .select('id, max_members, min_members')
      .eq('id', podId)
      .single();

    if (podError || !pod) {
      return NextResponse.json(
        { error: 'Pod not found' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('pod_members')
      .select('id, status')
      .eq('pod_id', podId)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      if (existingMember.status === 'left') {
        // Reactivate member
        const { data: member, error } = await supabase
          .from('pod_members')
          .update({
            status: 'active',
            suspended_at: null,
            suspension_reason: null,
            joined_at: new Date().toISOString(),
          })
          .eq('id', existingMember.id)
          .select()
          .single();

        if (error) {
          console.error('[POD_MEMBERS_API] Error reactivating member:', error);
          return NextResponse.json(
            { error: 'Failed to reactivate member', details: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          status: 'success',
          member,
          message: 'Member reactivated successfully',
        });
      }

      return NextResponse.json(
        { error: 'User is already a member of this pod' },
        { status: 409 }
      );
    }

    // Check max members limit
    const { count: memberCount } = await supabase
      .from('pod_members')
      .select('*', { count: 'exact', head: true })
      .eq('pod_id', podId)
      .eq('status', 'active');

    if (memberCount && memberCount >= pod.max_members) {
      return NextResponse.json(
        { error: `Pod is full (max ${pod.max_members} members)` },
        { status: 400 }
      );
    }

    // Add member
    const { data: member, error: memberError } = await supabase
      .from('pod_members')
      .insert({
        pod_id: podId,
        user_id: userId,
        linkedin_account_id: linkedInAccountId,
        role,
        status: 'active',
        participation_score: 1.00,
      })
      .select(`
        id,
        pod_id,
        user_id,
        linkedin_account_id,
        role,
        participation_score,
        total_engagements,
        completed_engagements,
        missed_engagements,
        status,
        joined_at,
        users (id, email, full_name)
      `)
      .single();

    if (memberError) {
      console.error('[POD_MEMBERS_API] Error adding member:', memberError);

      if (memberError.code === '23505') {
        return NextResponse.json(
          { error: 'User is already a member of this pod' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to add member', details: memberError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      member,
    }, { status: 201 });
  } catch (error) {
    console.error('[POD_MEMBERS_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
