import { createClient } from '@/lib/supabase/server';

/**
 * Send activity alert for pod repost success/failure
 *
 * Creates in-app notification for the user when a pod member
 * successfully reposts or fails to repost a LinkedIn post.
 *
 * @param params - Alert parameters
 */
export async function sendActivityAlert(params: {
  activityId: string;
  memberId: string;
  postUrl: string;
  status: 'success' | 'failed';
  repostUrl?: string;
  error?: string;
  executedAt: Date;
}): Promise<void> {
  const supabase = await createClient({ isServiceRole: true });

  console.log('[PodAlerts] Sending activity alert:', {
    activityId: params.activityId,
    status: params.status
  });

  // Get member and user details
  const { data: member, error: memberError } = await supabase
    .from('pod_member')
    .select('*, users(*)')
    .eq('id', params.memberId)
    .single();

  if (memberError || !member) {
    console.error('[PodAlerts] Failed to get member details:', memberError);
    return;
  }

  // Create in-app notification
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: member.user_id,
      type: 'pod_activity',
      title: params.status === 'success'
        ? '✅ Pod Repost Successful'
        : '❌ Pod Repost Failed',
      message: params.status === 'success'
        ? `${member.name} successfully reposted: ${params.postUrl}`
        : `Failed to repost for ${member.name}: ${params.error || 'Unknown error'}`,
      metadata: {
        activity_id: params.activityId,
        member_id: params.memberId,
        post_url: params.postUrl,
        repost_url: params.repostUrl,
        status: params.status,
        error: params.error,
        executed_at: params.executedAt.toISOString()
      },
      read: false,
      created_at: new Date().toISOString()
    });

  if (notificationError) {
    console.error('[PodAlerts] Failed to create notification:', notificationError);
    return;
  }

  console.log('[PodAlerts] Alert sent successfully');
}
