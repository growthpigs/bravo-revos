/**
 * POST /api/test/poll-comments
 * Manual trigger for comment polling - FOR TESTING ONLY
 *
 * This endpoint allows immediate comment checking without waiting for cron.
 * Use this during development/testing to verify DM automation works.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pollAllCampaigns } from '@/lib/workers/comment-monitor';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  console.log('[TEST_POLL_COMMENTS] ========================================');
  console.log('[TEST_POLL_COMMENTS] Manual poll trigger received');
  console.log('[TEST_POLL_COMMENTS] ========================================');

  try {
    // Verify user is authenticated (basic auth check)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TEST_POLL_COMMENTS] User:', user.email);

    // Optional: Get specific scrape_job_id from request body
    const body = await request.json().catch(() => ({}));
    const { scrapeJobId } = body;

    if (scrapeJobId) {
      console.log('[TEST_POLL_COMMENTS] Polling specific job:', scrapeJobId);
      // TODO: Add single job polling if needed
    }

    // Run the comment poll
    console.log('[TEST_POLL_COMMENTS] Starting poll...');
    const startTime = Date.now();
    const result = await pollAllCampaigns();
    const duration = Date.now() - startTime;

    console.log('[TEST_POLL_COMMENTS] Poll complete:', result);

    return NextResponse.json({
      success: true,
      message: 'Comment poll completed',
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TEST_POLL_COMMENTS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Poll failed',
      },
      { status: 500 }
    );
  }
}

// Also allow GET for easy browser testing
export async function GET(request: NextRequest) {
  return POST(request);
}
