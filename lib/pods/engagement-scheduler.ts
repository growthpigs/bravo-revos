/**
 * Pod Automation Engine - Engagement Scheduler
 * Schedules like and comment jobs for pod members to engage with detected posts
 */

import { createClient } from '@/lib/supabase/server';
import { POD_AUTOMATION_CONFIG, LOGGING_CONFIG } from '@/lib/config';

const LOG_PREFIX = LOGGING_CONFIG.PREFIX_POD_AUTOMATION;

export interface EngagementActivity {
  id: string;
  pod_id: string;
  post_id: string;
  member_id: string;
  engagement_type: 'like' | 'comment' | 'repost';
  status: 'pending' | 'scheduled' | 'executed' | 'failed';
  scheduled_for: string;
  executed_at?: string;
}

export interface ScheduledJob {
  activityId: string;
  memberId: string;
  postId: string;
  engagementType: 'like' | 'comment';
  scheduledFor: Date;
  delayMs: number;
  jobId: string;
}

/**
 * Get pending activities ready for scheduling
 */
export async function getPendingActivities(
  podId: string,
  limit: number = 100
): Promise<EngagementActivity[]> {
  const supabase = await createClient();

  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('pod_activities')
      .select(
        'id, pod_id, post_id, member_id, engagement_type, status, scheduled_for, executed_at'
      )
      .eq('pod_id', podId)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) {
      console.error(
        `${LOG_PREFIX} Failed to fetch pending activities:`,
        error
      );
      return [];
    }

    console.log(
      `${LOG_PREFIX} Found ${data?.length || 0} pending activities for pod ${podId}`
    );
    return data || [];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching pending activities:`, error);
    return [];
  }
}

/**
 * Calculate random delay for like engagement (5-30 minutes)
 * Staggered to prevent all members engaging at once
 */
export function calculateLikeDelay(
  memberIndex: number,
  totalMembers: number
): { delayMs: number; scheduledFor: Date } {
  // Base delay: 5 minutes minimum, 30 minutes maximum
  const minDelayMs = POD_AUTOMATION_CONFIG.LIKE_MIN_DELAY_MS;
  const maxDelayMs = POD_AUTOMATION_CONFIG.LIKE_MAX_DELAY_MS;

  // Stagger: Distribute members across time window
  // If 10 members, spread them across 30 minutes
  const staggerWindow = (maxDelayMs - minDelayMs) * (memberIndex / Math.max(totalMembers - 1, 1));
  const randomVariation = Math.random() * (maxDelayMs - minDelayMs) * 0.2; // ±10% variation
  const delayMs = Math.floor(minDelayMs + staggerWindow + randomVariation);

  const scheduledFor = new Date(Date.now() + delayMs);

  return { delayMs, scheduledFor };
}

/**
 * Calculate random delay for comment engagement (1-6 hours)
 * Much longer delay to appear organic
 */
export function calculateCommentDelay(
  memberIndex: number,
  totalMembers: number
): { delayMs: number; scheduledFor: Date } {
  // Base delay: 1 hour minimum, 6 hours maximum
  const minDelayMs = POD_AUTOMATION_CONFIG.COMMENT_MIN_DELAY_MS;
  const maxDelayMs = POD_AUTOMATION_CONFIG.COMMENT_MAX_DELAY_MS;

  // More random variation for comments (they're less frequent)
  const staggerWindow = (maxDelayMs - minDelayMs) * (memberIndex / Math.max(totalMembers - 1, 1));
  const randomVariation = Math.random() * (maxDelayMs - minDelayMs) * 0.3; // ±15% variation
  const delayMs = Math.floor(minDelayMs + staggerWindow + randomVariation);

  const scheduledFor = new Date(Date.now() + delayMs);

  return { delayMs, scheduledFor };
}

/**
 * Schedule like activities for pod members
 * Max 3 members within first hour (staggered engagement)
 */
export async function scheduleLikeActivities(
  activities: EngagementActivity[],
  maxMembersPerHour: number = 3
): Promise<ScheduledJob[]> {
  const supabase = await createClient();
  const scheduledJobs: ScheduledJob[] = [];

  // Group by post to apply staggering per post
  const activitiesByPost = new Map<string, EngagementActivity[]>();
  for (const activity of activities) {
    if (!activitiesByPost.has(activity.post_id)) {
      activitiesByPost.set(activity.post_id, []);
    }
    activitiesByPost.get(activity.post_id)!.push(activity);
  }

  // Process each post's activities
  for (const [postId, postActivities] of Array.from(activitiesByPost.entries())) {
    // Limit members per hour
    const activitiesToSchedule = postActivities.slice(0, maxMembersPerHour);

    for (let i = 0; i < activitiesToSchedule.length; i++) {
      const activity = activitiesToSchedule[i];
      const { delayMs, scheduledFor } = calculateLikeDelay(
        i,
        activitiesToSchedule.length
      );

      try {
        // Update activity with scheduled timestamp
        const { error } = await supabase
          .from('pod_activities')
          .update({
            status: 'scheduled',
            scheduled_for: scheduledFor.toISOString(),
          })
          .eq('id', activity.id);

        if (error) {
          console.error(
            `${LOG_PREFIX} Failed to schedule like activity ${activity.id}:`,
            error
          );
          continue;
        }

        console.log(
          `${LOG_PREFIX} ✅ Scheduled like for member ${activity.member_id} in ${delayMs}ms`
        );

        scheduledJobs.push({
          activityId: activity.id,
          memberId: activity.member_id,
          postId: activity.post_id,
          engagementType: 'like',
          scheduledFor,
          delayMs,
          jobId: `like-${activity.id}`,
        });
      } catch (error) {
        console.error(`${LOG_PREFIX} Error scheduling like activity:`, error);
      }
    }
  }

  return scheduledJobs;
}

/**
 * Schedule comment activities (requires additional processing)
 * Fetches comment templates and applies voice cartridge
 */
export async function scheduleCommentActivities(
  activities: EngagementActivity[]
): Promise<ScheduledJob[]> {
  const supabase = await createClient();
  const scheduledJobs: ScheduledJob[] = [];

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    const { delayMs, scheduledFor } = calculateCommentDelay(i, activities.length);

    try {
      // Update activity with scheduled timestamp and mark as scheduled
      const { error } = await supabase
        .from('pod_activities')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor.toISOString(),
        })
        .eq('id', activity.id);

      if (error) {
        console.error(
          `${LOG_PREFIX} Failed to schedule comment activity ${activity.id}:`,
          error
        );
        continue;
      }

      console.log(
        `${LOG_PREFIX} ✅ Scheduled comment for member ${activity.member_id} in ${delayMs}ms`
      );

      // FUTURE: E-05 will fetch comment template and apply voice cartridge
      scheduledJobs.push({
        activityId: activity.id,
        memberId: activity.member_id,
        postId: activity.post_id,
        engagementType: 'comment',
        scheduledFor,
        delayMs,
        jobId: `comment-${activity.id}`,
      });
    } catch (error) {
      console.error(`${LOG_PREFIX} Error scheduling comment activity:`, error);
    }
  }

  return scheduledJobs;
}

/**
 * Mark engagement activity as executed
 */
export async function markActivityExecuted(
  activityId: string,
  success: boolean = true
): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('pod_activities')
      .update({
        status: success ? 'executed' : 'failed',
        executed_at: new Date().toISOString(),
      })
      .eq('id', activityId);

    if (error) {
      console.error(
        `${LOG_PREFIX} Failed to mark activity ${activityId} as executed:`,
        error
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error marking activity executed:`, error);
    return false;
  }
}

/**
 * Update pod member engagement metrics
 */
export async function updateMemberEngagementMetrics(
  memberId: string,
  engagementsCount: number = 1
): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc('increment_member_engagement', {
      member_id: memberId,
      count: engagementsCount,
    });

    if (error) {
      console.error(
        `${LOG_PREFIX} Failed to update metrics for member ${memberId}:`,
        error
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating member metrics:`, error);
    return false;
  }
}

/**
 * Get pod engagement statistics
 */
export async function getPodEngagementStats(podId: string): Promise<{
  totalActivities: number;
  pendingActivities: number;
  scheduledActivities: number;
  executedActivities: number;
  failedActivities: number;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('pod_activities')
      .select('status')
      .eq('pod_id', podId);

    if (error) {
      console.error(`${LOG_PREFIX} Failed to fetch pod stats:`, error);
      return {
        totalActivities: 0,
        pendingActivities: 0,
        scheduledActivities: 0,
        executedActivities: 0,
        failedActivities: 0,
      };
    }

    const activities = data || [];
    const stats = {
      totalActivities: activities.length,
      pendingActivities: activities.filter((a) => a.status === 'pending').length,
      scheduledActivities: activities.filter((a) => a.status === 'scheduled')
        .length,
      executedActivities: activities.filter((a) => a.status === 'executed')
        .length,
      failedActivities: activities.filter((a) => a.status === 'failed').length,
    };

    console.log(`${LOG_PREFIX} Pod ${podId} stats:`, stats);
    return stats;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching pod stats:`, error);
    return {
      totalActivities: 0,
      pendingActivities: 0,
      scheduledActivities: 0,
      executedActivities: 0,
      failedActivities: 0,
    };
  }
}
