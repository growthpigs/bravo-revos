import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserActivityLimits } from '@/lib/rate-limiting/linkedin-limits';

/**
 * GET /api/rate-limit/status
 * Get current user's activity limits and usage
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's activity limits
    const limits = await getUserActivityLimits(user.id);

    return NextResponse.json({
      success: true,
      posts: {
        current: limits.posts.current,
        max: limits.posts.max,
        allowed: limits.posts.allowed,
        percentUsed: Math.round((limits.posts.current / limits.posts.max) * 100),
        nextAvailable: limits.posts.nextAvailable,
      },
      dms: {
        current: limits.dms.current,
        max: limits.dms.max,
        allowed: limits.dms.allowed,
        percentUsed: Math.round((limits.dms.current / limits.dms.max) * 100),
        nextAvailable: limits.dms.nextAvailable,
      },
    });
  } catch (error) {
    console.error('[RATE_LIMIT_STATUS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
