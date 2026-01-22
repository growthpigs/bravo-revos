/**
 * Pod Post Detection System
 * Detects new posts from pod members and queues engagement activities
 */

import { createClient } from '@/lib/supabase/server';
import { UnipilePost } from '@/lib/unipile-client';
import { POD_POST_CONFIG, LOGGING_CONFIG } from '@/lib/config';

const LOG_PREFIX = LOGGING_CONFIG.PREFIX_POD_POST;

export interface DetectedPost {
  unipile_post_id: string;
  memberId: string;
  text: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
}

/**
 * Save detected post to database and create engagement activities
 */
export async function saveDetectedPost(
  podId: string,
  accountId: string,
  linkedinAccountId: string,
  post: UnipilePost,
  podMemberIds: string[]
): Promise<{
  postId: string;
  activitiesCreated: number;
  error?: string;
}> {
  const supabase = await createClient({ isServiceRole: true });

  try {
    // Check if post already exists
    const { data: existingPost } = await supabase
      .from('post')
      .select('id')
      .eq('unipile_post_id', post.id)
      .maybeSingle();

    if (existingPost) {
      console.log(`${LOG_PREFIX} Post already exists: ${post.id}`);
      return {
        postId: existingPost.id,
        activitiesCreated: 0,
      };
    }

    // Insert post into database
    const { data: newPost, error: postError } = await supabase
      .from('post')
      .insert({
        linkedin_account_id: linkedinAccountId,
        unipile_post_id: post.id,
        content: post.text,
        published_at: post.created_at,
        status: 'published',
        metrics: {
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          reposts: post.reposts_count || 0,
        },
        last_polled_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (postError) {
      console.error(`${LOG_PREFIX} Failed to save post:`, postError);
      return {
        postId: '',
        activitiesCreated: 0,
        error: postError.message,
      };
    }

    console.log(`${LOG_PREFIX} ✅ Post saved: ${newPost.id}`);

    // Get all active pod members with linkedin accounts
    const { data: podMembers, error: membersError } = await supabase
      .from('pod_member')
      .select('id, linkedin_account_id')
      .eq('pod_id', podId)
      .eq('status', 'active')
      .in('linkedin_account_id', podMemberIds);

    if (membersError) {
      console.error(`${LOG_PREFIX} Failed to fetch pod members:`, membersError);
      return {
        postId: newPost.id,
        activitiesCreated: 0,
        error: membersError.message,
      };
    }

    // Create engagement activities for all pod members
    const activities = podMembers.map((member) => ({
      pod_id: podId,
      post_id: newPost.id,
      post_url: `https://linkedin.com/feed/update/${post.id}`,
      post_author_id: member.id,
      member_id: member.id,
      engagement_type: 'like' as const,
      status: 'pending' as const,
      scheduled_for: new Date().toISOString(),
    }));

    if (activities.length === 0) {
      console.warn(`${LOG_PREFIX} No active pod members found for engagement`);
      return {
        postId: newPost.id,
        activitiesCreated: 0,
      };
    }

    const { data: createdActivities, error: activitiesError } = await supabase
      .from('pod_activity')
      .insert(activities)
      .select('id');

    if (activitiesError) {
      console.error(`${LOG_PREFIX} Failed to create activities:`, activitiesError);
      return {
        postId: newPost.id,
        activitiesCreated: 0,
        error: activitiesError.message,
      };
    }

    console.log(
      `${LOG_PREFIX} ✅ Created ${createdActivities.length} engagement activities`
    );

    return {
      postId: newPost.id,
      activitiesCreated: createdActivities.length,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error saving detected post:`, error);
    return {
      postId: '',
      activitiesCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get pod member by LinkedIn account database ID
 */
export async function getPodMemberByLinkedInAccountId(
  podId: string,
  linkedinAccountDatabaseId: string
): Promise<string | null> {
  try {
    const supabase = await createClient({ isServiceRole: true });

    const { data, error } = await supabase
      .from('pod_member')
      .select('id')
      .eq('pod_id', podId)
      .eq('linkedin_account_id', linkedinAccountDatabaseId)
      .maybeSingle();

    if (error) {
      console.error(`${LOG_PREFIX} Failed to get pod member:`, error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching pod member:`, error);
    return null;
  }
}

/**
 * Get pod members with their LinkedIn account details
 */
export async function getPodMembersWithAccounts(
  podId: string
): Promise<Array<{ id: string; linkedin_account_id: string }>> {
  const supabase = await createClient({ isServiceRole: true });

  try {
    const { data, error } = await supabase
      .from('pod_member')
      .select('id, linkedin_account_id')
      .eq('pod_id', podId)
      .eq('status', 'active');

    if (error) {
      console.error(`${LOG_PREFIX} Failed to get pod members:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching pod members:`, error);
    return [];
  }
}

/**
 * Update last poll time for a post
 */
export async function updateLastPolledTime(postId: string): Promise<void> {
  const supabase = await createClient({ isServiceRole: true });

  try {
    await supabase
      .from('post')
      .update({
        last_polled_at: new Date().toISOString(),
      })
      .eq('id', postId);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to update last polled time:`, error);
  }
}
