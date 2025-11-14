import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * UniPile Webhook Endpoint
 * Handles post.published, post.failed, and comment.received events
 * Automatically creates pod activities for amplification
 */

// Verify webhook signature from UniPile
function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.UNIPILE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('UNIPILE_WEBHOOK_SECRET not configured');
    return false;
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Prevent DoS attacks with large payloads
    const MAX_PAYLOAD_SIZE = 1024 * 100; // 100KB
    if (rawBody.length > MAX_PAYLOAD_SIZE) {
      console.error('Webhook payload too large:', rawBody.length);
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const signature = request.headers.get('x-unipile-signature');

    // Verify webhook is from UniPile
    if (!signature || !verifySignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(rawBody);
    console.log('UniPile webhook received:', data.event);

    // Handle different webhook events
    switch (data.event) {
      case 'post.published':
        return handlePostPublished(data);
      case 'post.failed':
        return handlePostFailed(data);
      case 'comment.received':
        return handleCommentReceived(data);
      default:
        console.log('Unhandled webhook event:', data.event);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handlePostPublished(data: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    post_id,
    post_url,
    post_content,
    campaign_id,
    account_id,
    published_at
  } = data.payload;

  console.log('Processing post.published:', { campaign_id, post_url });

  // 1. Update campaign status
  const { error: updateError } = await supabase
    .from('campaigns')
    .update({
      status: 'active',
      last_post_url: post_url,
      last_post_at: published_at
    })
    .eq('id', campaign_id);

  if (updateError) {
    console.error('Error updating campaign:', updateError);
  }

  // 2. Get campaign's associated pod
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('pod_id, user_id, name')
    .eq('id', campaign_id)
    .single();

  if (campaignError || !campaign) {
    console.error('Error fetching campaign:', campaignError);
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (!campaign.pod_id) {
    console.log('No pod associated with campaign:', campaign_id);
    return NextResponse.json({
      received: true,
      note: 'No pod associated with campaign'
    });
  }

  // 3. Create pod activity for amplification
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + 1); // 1 hour window for reshares

  const { data: activity, error: activityError } = await supabase
    .from('pod_activities')
    .insert({
      pod_id: campaign.pod_id,
      post_id: post_id,
      post_url: post_url,
      post_content: post_content?.substring(0, 500), // First 500 chars
      posted_by: campaign.user_id,
      urgency: 'urgent', // New posts are always urgent
      deadline: deadline.toISOString(),
      status: 'pending'
    })
    .select()
    .single();

  if (activityError) {
    console.error('Error creating pod activity:', activityError);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }

  console.log('Pod activity created:', activity.id);

  // 4. Notify pod members (placeholder - implement later)
  await notifyPodMembers(campaign.pod_id, activity.id, post_url, campaign.name);

  // 5. Log webhook processing
  await supabase
    .from('unipile_webhook_logs')
    .insert({
      event: 'post.published',
      payload: data,
      processed: true,
      activity_id: activity.id,
      campaign_id: campaign_id
    });

  return NextResponse.json({
    received: true,
    activity_created: activity.id,
    pod_id: campaign.pod_id
  });
}

async function handleCommentReceived(data: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { comment_text, post_id, commenter_profile } = data.payload;

  console.log('Comment received:', { post_id, comment_text });

  // Check if comment contains trigger keyword
  const triggerWords = ['guide', 'interested', 'more info', 'download', 'send me'];
  const containsTrigger = triggerWords.some(word =>
    comment_text.toLowerCase().includes(word)
  );

  if (containsTrigger) {
    console.log('Trigger keyword detected:', comment_text);

    // Log the triggered comment for later processing
    await supabase
      .from('triggered_comments')
      .insert({
        post_id,
        comment_text,
        commenter_profile,
        trigger_detected: true,
        processed: false
      });

    // TODO: Trigger DM automation via DMScraperChip
    // This will be implemented in the lead magnet delivery system
  }

  return NextResponse.json({ received: true, trigger_detected: containsTrigger });
}

async function handlePostFailed(data: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { campaign_id, error } = data.payload;

  console.error('Post failed for campaign:', campaign_id, error);

  // Update campaign status to failed
  await supabase
    .from('campaigns')
    .update({
      status: 'failed',
      error_message: error
    })
    .eq('id', campaign_id);

  // Log webhook processing
  await supabase
    .from('unipile_webhook_logs')
    .insert({
      event: 'post.failed',
      payload: data,
      processed: true,
      campaign_id: campaign_id
    });

  return NextResponse.json({ received: true });
}

async function notifyPodMembers(
  podId: string,
  activityId: string,
  postUrl: string,
  campaignName: string
) {
  // TODO: Implement notification system
  // Options:
  // 1. Email via SendGrid/Resend
  // 2. Push notifications
  // 3. In-app notifications via Supabase realtime
  // 4. Slack/Discord webhooks

  console.log(`[Notification] Pod ${podId} - Activity ${activityId}`);
  console.log(`Campaign "${campaignName}" published: ${postUrl}`);
  console.log('Pod members should be notified to amplify within 1 hour');

  // Placeholder: In production, fetch pod members and send notifications
  // const { data: members } = await supabase
  //   .from('pod_members')
  //   .select('user_id, users(email, full_name)')
  //   .eq('pod_id', podId)
  //   .eq('status', 'active');

  // await sendNotifications(members, activityId, postUrl);
}
