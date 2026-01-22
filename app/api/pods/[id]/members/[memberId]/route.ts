import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/pods/[id]/members/[memberId]
 * Remove a member from a pod
 * Note: Triggers validation to ensure minimum member count is maintained
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const supabase = await createClient();
    const { id: podId, memberId } = params;

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from('pod_member')
      .select('id, pod_id, user_id, status')
      .eq('id', memberId)
      .eq('pod_id', podId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found in this pod' },
        { status: 404 }
      );
    }

    // Check current active member count
    const { count: activeMemberCount } = await supabase
      .from('pod_member')
      .select('*', { count: 'exact', head: true })
      .eq('pod_id', podId)
      .eq('status', 'active');

    // Get pod minimum members requirement
    const { data: pod } = await supabase
      .from('pod')
      .select('min_members')
      .eq('id', podId)
      .single();

    const minMembers = pod?.min_members || 3;

    // Check if removing this member would violate minimum
    if (activeMemberCount && activeMemberCount <= minMembers) {
      return NextResponse.json(
        {
          error: `Cannot remove member: Pod must have at least ${minMembers} active members`,
          current_count: activeMemberCount,
          min_required: minMembers,
        },
        { status: 400 }
      );
    }

    // Mark member as 'left' instead of deleting
    // This preserves historical activity data
    const { error: updateError } = await supabase
      .from('pod_member')
      .update({
        status: 'left',
      })
      .eq('id', memberId);

    if (updateError) {
      console.error('[POD_MEMBERS_API] Error removing member:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove member', details: updateError.message },
        { status: 500 }
      );
    }

    // Update pod_activities to set member_id to NULL for this member's future activities
    // (keeps historical record but won't assign future tasks)
    await supabase
      .from('pod_activity')
      .update({ member_id: null })
      .eq('member_id', memberId)
      .eq('status', 'pending');

    return NextResponse.json({
      status: 'success',
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('[POD_MEMBERS_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pods/[id]/members/[memberId]
 * Update a pod member's status or role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const supabase = await createClient();
    const { id: podId, memberId } = params;
    const body = await request.json();

    const { status, role, suspensionReason } = body;

    // Build update object
    const updates: any = {};

    if (status !== undefined) {
      if (!['active', 'suspended', 'left'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be: active, suspended, or left' },
          { status: 400 }
        );
      }
      updates.status = status;

      if (status === 'suspended') {
        updates.suspended_at = new Date().toISOString();
        if (suspensionReason) {
          updates.suspension_reason = suspensionReason;
        }
      } else if (status === 'active') {
        updates.suspended_at = null;
        updates.suspension_reason = null;
      }
    }

    if (role !== undefined) {
      if (!['owner', 'member'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be: owner or member' },
          { status: 400 }
        );
      }
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: member, error } = await supabase
      .from('pod_member')
      .update(updates)
      .eq('id', memberId)
      .eq('pod_id', podId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Member not found in this pod' },
          { status: 404 }
        );
      }

      console.error('[POD_MEMBERS_API] Error updating member:', error);
      return NextResponse.json(
        { error: 'Failed to update member', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      member,
    });
  } catch (error) {
    console.error('[POD_MEMBERS_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
