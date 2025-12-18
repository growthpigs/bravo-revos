import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/campaigns/trigger-pod
 * Manual fallback for triggering pod amplification
 * Used when webhook fails or for testing
 */

export async function POST(request: NextRequest) {
  try {
    // Use regular client for auth check
    const supabase = await createClient();
    // Use service role client for database operations (bypasses RLS)
    const supabaseAdmin = await createClient({ isServiceRole: true });

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { campaign_id, post_url } = body;

    // Validation
    if (!campaign_id || typeof campaign_id !== 'string') {
      return NextResponse.json(
        { error: 'campaign_id is required and must be a string' },
        { status: 400 }
      );
    }

    if (!post_url || typeof post_url !== 'string') {
      return NextResponse.json(
        { error: 'post_url is required and must be a string' },
        { status: 400 }
      );
    }

    // Get campaign - RLS ensures user can only access their own campaigns
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, pod_id, user_id, post_template, status')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError);
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Check if campaign has a pod
    if (!campaign.pod_id) {
      return NextResponse.json(
        { error: 'No pod associated with this campaign' },
        { status: 400 }
      );
    }

    console.log('Manual pod trigger requested:', {
      campaign_id,
      post_url,
      pod_id: campaign.pod_id,
    });

    // Update campaign with post URL and status (use admin to bypass RLS)
    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        last_post_url: post_url,
        last_post_at: new Date().toISOString(),
        status: campaign.status === 'draft' ? 'active' : campaign.status,
      })
      .eq('id', campaign_id);

    if (updateError) {
      console.error('Error updating campaign:', updateError);
      // Continue anyway - not critical
    }

    // Get pod members to create activities for (excluding the triggering user)
    const { data: podMembers, error: membersError } = await supabaseAdmin
      .from('pod_members')
      .select('id, name, unipile_account_id')
      .eq('pod_id', campaign.pod_id)
      .eq('status', 'active')
      .neq('user_id', user.id); // Exclude the poster

    if (membersError) {
      console.error('Error fetching pod members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch pod members' },
        { status: 500 }
      );
    }

    if (!podMembers || podMembers.length === 0) {
      return NextResponse.json(
        { error: 'No other pod members to amplify with' },
        { status: 400 }
      );
    }

    // Create pod activity for amplification - one for each member
    const scheduledFor = new Date();
    scheduledFor.setHours(scheduledFor.getHours() + 1); // 1 hour window for engagement

    const activitiesToCreate = podMembers.map((member) => ({
      pod_id: campaign.pod_id,
      post_id: `manual_${Date.now()}`,
      post_url: post_url,
      member_id: member.id,
      unipile_account_id: member.unipile_account_id,
      activity_type: 'like', // Default to like, can be extended
      action: 'like',
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',
      campaign_id: campaign_id,
    }));

    const { data: activities, error: activityError } = await supabaseAdmin
      .from('pod_activities')
      .insert(activitiesToCreate)
      .select();

    if (activityError) {
      console.error('Error creating pod activities:', activityError);
      return NextResponse.json(
        { error: 'Failed to create pod activities' },
        { status: 500 }
      );
    }

    console.log(`Pod activities created manually: ${activities?.length} activities for ${podMembers.length} members`);

    // Log the manual trigger
    await supabaseAdmin.from('unipile_webhook_logs').insert({
      event: 'manual_trigger',
      payload: {
        campaign_id,
        post_url,
        triggered_by: user.id,
        trigger_type: 'manual',
        activity_count: activities?.length || 0,
      },
      processed: true,
      campaign_id: campaign_id,
    });

    return NextResponse.json({
      success: true,
      activity_count: activities?.length || 0,
      activity_ids: activities?.map((a) => a.id) || [],
      pod_id: campaign.pod_id,
      scheduled_for: scheduledFor.toISOString(),
      message: `Pod amplification triggered for ${activities?.length || 0} members`,
    });
  } catch (error) {
    console.error('Trigger pod API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
