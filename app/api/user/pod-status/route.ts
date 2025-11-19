/**
 * GET /api/user/pod-status
 * Check if authenticated user is in a pod
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for active pod memberships
    const { data: memberships, error } = await supabase
      .from('pod_members')
      .select('id, pod_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('[POD_STATUS_API] Error checking memberships:', error);
      return NextResponse.json(
        { error: 'Failed to check pod status' },
        { status: 500 }
      );
    }

    const hasPod = (memberships?.length || 0) > 0;
    const podCount = memberships?.length || 0;

    return NextResponse.json({
      success: true,
      hasPod,
      podCount,
      pods: memberships?.map((m) => ({ id: m.pod_id })) || [],
    });
  } catch (error) {
    console.error('[POD_STATUS_API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
