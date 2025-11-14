import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/campaigns/trigger-pod
 * Manual fallback for triggering pod amplification
 * Used when webhook fails or for testing
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Get campaign and verify ownership
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, pod_id, user_id, client_id, post_template, status')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this campaign
    const { data: userData } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (!userData || userData.client_id !== campaign.client_id) {
      return NextResponse.json(
        { error: 'Unauthorized access to campaign' },
        { status: 403 }
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

    // Update campaign with post URL and status
    const { error: updateError } = await supabase
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

    // Create pod activity for amplification
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 1); // 1 hour window for reshares

    const { data: activity, error: activityError } = await supabase
      .from('pod_activities')
      .insert({
        pod_id: campaign.pod_id,
        post_id: `manual_${Date.now()}`, // Generate unique ID for manual triggers
        post_url: post_url,
        post_content: campaign.post_template?.substring(0, 500) || null,
        posted_by: user.id,
        urgency: 'urgent',
        deadline: deadline.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (activityError) {
      console.error('Error creating pod activity:', activityError);
      return NextResponse.json(
        { error: 'Failed to create pod activity' },
        { status: 500 }
      );
    }

    console.log('Pod activity created manually:', activity.id);

    // Log the manual trigger
    await supabase.from('unipile_webhook_logs').insert({
      event: 'manual_trigger',
      payload: {
        campaign_id,
        post_url,
        triggered_by: user.id,
        trigger_type: 'manual',
      },
      processed: true,
      activity_id: activity.id,
      campaign_id: campaign_id,
    });

    return NextResponse.json({
      success: true,
      activity_id: activity.id,
      pod_id: campaign.pod_id,
      deadline: deadline.toISOString(),
      message: 'Pod amplification triggered successfully',
    });
  } catch (error) {
    console.error('Trigger pod API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
