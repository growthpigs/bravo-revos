import { createClient } from '@/lib/supabase/server';

/**
 * LinkedIn-safe rate limiting
 *
 * Limits:
 * - Posts: 5 per week (Monday-Sunday)
 * - DMs: 50 per day (resets at midnight UTC)
 */

interface RateLimitStatus {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  reason?: string;
  nextAvailable?: Date;
}

/**
 * Check if user can post
 * LinkedIn safe limit: 5 posts per week
 */
export async function canUserPost(userId: string): Promise<RateLimitStatus> {
  const supabase = await createClient();

  // Get week start (Monday)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setUTCHours(0, 0, 0, 0);

  // Count posts published this week
  const { count: postsThisWeek, error } = await supabase
    .from('post')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', weekStart.toISOString())
    .lt('published_at', new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error('[RATE_LIMIT] Error checking posts:', error);
    return {
      allowed: false,
      currentCount: 0,
      maxAllowed: 5,
      reason: 'Failed to check rate limit',
    };
  }

  const MAX_POSTS_PER_WEEK = 5;
  const currentCount = postsThisWeek || 0;
  const allowed = currentCount < MAX_POSTS_PER_WEEK;

  if (!allowed) {
    // Calculate next available time (next Monday)
    const nextMonday = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      allowed: false,
      currentCount,
      maxAllowed: MAX_POSTS_PER_WEEK,
      reason: `Post limit reached (${currentCount}/${MAX_POSTS_PER_WEEK})`,
      nextAvailable: nextMonday,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed: MAX_POSTS_PER_WEEK,
  };
}

/**
 * Check if user can send DM
 * LinkedIn safe limit: 50 DMs per day
 */
export async function canUserSendDM(userId: string): Promise<RateLimitStatus> {
  const supabase = await createClient();

  // Get today (UTC)
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Count DMs sent today
  const { count: dmsToday, error } = await supabase
    .from('dm_delivery')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', dayStart.toISOString());

  if (error) {
    console.error('[RATE_LIMIT] Error checking DMs:', error);
    return {
      allowed: false,
      currentCount: 0,
      maxAllowed: 50,
      reason: 'Failed to check rate limit',
    };
  }

  const MAX_DMS_PER_DAY = 50;
  const currentCount = dmsToday || 0;
  const allowed = currentCount < MAX_DMS_PER_DAY;

  if (!allowed) {
    // Calculate next available time (tomorrow midnight UTC)
    const tomorrow = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return {
      allowed: false,
      currentCount,
      maxAllowed: MAX_DMS_PER_DAY,
      reason: `DM limit reached (${currentCount}/${MAX_DMS_PER_DAY})`,
      nextAvailable: tomorrow,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed: MAX_DMS_PER_DAY,
  };
}

/**
 * Increment activity count (call after successful post/DM)
 */
export async function incrementActivityCount(
  userId: string,
  activityType: 'post' | 'dm'
): Promise<void> {
  const supabase = await createClient();

  if (activityType === 'post') {
    // Update post published_at if needed
    // This is already handled when post status changes to 'published'
  } else if (activityType === 'dm') {
    // This is already handled when dm_deliveries status changes to 'sent'
  }
}

/**
 * Get user's current activity limits
 */
export async function getUserActivityLimits(userId: string) {
  const postStatus = await canUserPost(userId);
  const dmStatus = await canUserSendDM(userId);

  return {
    posts: {
      current: postStatus.currentCount,
      max: postStatus.maxAllowed,
      allowed: postStatus.allowed,
      nextAvailable: postStatus.nextAvailable,
    },
    dms: {
      current: dmStatus.currentCount,
      max: dmStatus.maxAllowed,
      allowed: dmStatus.allowed,
      nextAvailable: dmStatus.nextAvailable,
    },
  };
}

/**
 * Get remaining quota
 */
export async function getQuotaRemaining(userId: string) {
  const limits = await getUserActivityLimits(userId);

  return {
    posts: limits.posts.max - limits.posts.current,
    dms: limits.dms.max - limits.dms.current,
  };
}
