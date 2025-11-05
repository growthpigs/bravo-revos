import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/pods
 * List all pods for the authenticated user's clients
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    let query = supabase
      .from('pods')
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
        clients (name),
        pod_members (
          id,
          user_id,
          role,
          status,
          participation_score
        )
      `)
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: pods, error } = await query;

    if (error) {
      console.error('[PODS_API] Error fetching pods:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pods', details: error.message },
        { status: 500 }
      );
    }

    // Calculate member counts
    const podsWithCounts = (pods || []).map((pod: any) => ({
      ...pod,
      member_count: pod.pod_members?.filter((m: any) => m.status === 'active').length || 0,
      total_members: pod.pod_members?.length || 0,
      pod_members: undefined, // Remove detailed member info from list view
    }));

    return NextResponse.json({
      status: 'success',
      pods: podsWithCounts,
      total: podsWithCounts.length,
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
 * POST /api/pods
 * Create a new engagement pod
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      clientId,
      name,
      description,
      minMembers = 3,
      maxMembers = 20,
      participationThreshold = 0.80,
      suspensionThreshold = 0.50,
    } = body;

    // Validate required fields
    if (!clientId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, name' },
        { status: 400 }
      );
    }

    // Validate thresholds
    if (minMembers < 3) {
      return NextResponse.json(
        { error: 'Minimum 3 members required for a pod' },
        { status: 400 }
      );
    }

    if (participationThreshold < 0 || participationThreshold > 1) {
      return NextResponse.json(
        { error: 'Participation threshold must be between 0 and 1' },
        { status: 400 }
      );
    }

    if (suspensionThreshold < 0 || suspensionThreshold > 1) {
      return NextResponse.json(
        { error: 'Suspension threshold must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Create pod
    const { data: pod, error: podError } = await supabase
      .from('pods')
      .insert({
        client_id: clientId,
        name,
        description,
        min_members: minMembers,
        max_members: maxMembers,
        participation_threshold: participationThreshold,
        suspension_threshold: suspensionThreshold,
        status: 'active',
      })
      .select()
      .single();

    if (podError) {
      console.error('[PODS_API] Error creating pod:', podError);

      if (podError.code === '23505') {
        return NextResponse.json(
          { error: 'Pod with this name already exists for this client' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create pod', details: podError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      pod,
    }, { status: 201 });
  } catch (error) {
    console.error('[PODS_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
