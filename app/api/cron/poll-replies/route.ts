import { NextResponse } from 'next/server';
import { pollAllReplies } from '../../../../lib/workers/reply-monitor';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for cron job

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('[POLL_REPLIES] Starting reply poll cycle');
    const startTime = Date.now();

    const result = await pollAllReplies();

    const duration = Date.now() - startTime;
    console.log(`[POLL_REPLIES] Completed in ${duration}ms`, result);

    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[POLL_REPLIES] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
