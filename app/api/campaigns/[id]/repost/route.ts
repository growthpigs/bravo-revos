/**
 * Campaign Repost API
 * POST /api/campaigns/[id]/repost
 *
 * Reposts campaign content to LinkedIn without going through the full wizard.
 * Creates a new post and scrape_job for comment monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLinkedInPost } from '@/lib/unipile-client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const campaignId = params.id;

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's client_id
    const { data: userData } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (!userData?.client_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch campaign with multi-tenant check
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('client_id', userData.client_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Verify campaign has post content
    if (!campaign.post_template) {
      return NextResponse.json({
        error: 'Campaign has no post content. Create post content first.'
      }, { status: 400 });
    }

    // Get user's active LinkedIn account
    const { data: linkedinAccounts, error: accountsError } = await supabase
      .from('linkedin_accounts')
      .select('id, account_name, unipile_account_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (accountsError || !linkedinAccounts || linkedinAccounts.length === 0) {
      return NextResponse.json({
        error: 'No active LinkedIn account. Please connect your LinkedIn account first.'
      }, { status: 400 });
    }

    // For now, use the first active account
    // TODO: Support account selection in request body
    const linkedinAccount = linkedinAccounts[0];

    console.log('[REPOST] Starting repost for campaign:', {
      campaignId,
      accountName: linkedinAccount.account_name,
      triggerWord: campaign.trigger_word || 'guide',
    });

    // 1. Create pending post record in database
    const { data: dbPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        campaign_id: campaignId,
        linkedin_account_id: linkedinAccount.id,
        content: campaign.post_template,
        status: 'draft',
        user_id: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[REPOST] Failed to create post record:', insertError);
      return NextResponse.json({
        error: `Database error: ${insertError.message}`
      }, { status: 500 });
    }

    // 2. Post to LinkedIn via Unipile
    console.log('[REPOST] Posting to LinkedIn...');
    let post;
    try {
      post = await createLinkedInPost(linkedinAccount.unipile_account_id, campaign.post_template);
    } catch (postError: any) {
      // Mark post as failed
      await supabase
        .from('posts')
        .update({ status: 'failed', metrics: { error: postError.message } })
        .eq('id', dbPost.id);

      console.error('[REPOST] LinkedIn post failed:', postError);
      return NextResponse.json({
        error: `LinkedIn posting failed: ${postError.message}`
      }, { status: 500 });
    }

    console.log('[REPOST] Post created on LinkedIn:', {
      id: post.id,
      url: post.url,
    });

    // 3. Update post record with LinkedIn details
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        unipile_post_id: post.id,
        status: 'published',
        published_at: new Date().toISOString(),
        post_url: post.url,
      })
      .eq('id', dbPost.id);

    if (updateError) {
      console.error('[REPOST] Failed to update post status:', updateError);
      // Post is live but DB update failed - log but continue
    }

    // 4. Update campaign's last_post_url
    await supabase
      .from('campaigns')
      .update({ last_post_url: post.url })
      .eq('id', campaignId);

    // 5. Create scrape_job for comment monitoring
    const triggerWord = campaign.trigger_word || 'guide';
    const { data: scrapeJob, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        campaign_id: campaignId,
        post_id: dbPost.id,
        unipile_post_id: post.id,
        unipile_account_id: linkedinAccount.unipile_account_id,
        trigger_word: triggerWord,
        status: 'scheduled',
        poll_interval_minutes: 5,
        next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        user_id: user.id,
      })
      .select()
      .single();

    if (jobError) {
      console.error('[REPOST] Failed to create scrape job:', jobError);
      // Post is live, just no monitoring - log but don't fail
    }

    console.log('[REPOST] Repost complete:', {
      postId: dbPost.id,
      linkedinUrl: post.url,
      scrapeJobId: scrapeJob?.id,
      triggerWord,
    });

    return NextResponse.json({
      success: true,
      post: {
        id: dbPost.id,
        url: post.url,
        status: 'published',
      },
      scrapeJob: scrapeJob ? {
        id: scrapeJob.id,
        triggerWord,
        nextCheck: scrapeJob.next_check,
      } : null,
      message: `Post published to LinkedIn! Monitoring for "${triggerWord}" comments.`,
    });

  } catch (error: any) {
    console.error('[REPOST] Unexpected error:', error);
    return NextResponse.json({
      error: error.message || 'Unexpected error'
    }, { status: 500 });
  }
}
