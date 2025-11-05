import { NextRequest, NextResponse } from 'next/server';
import { monitorSessionExpiry } from '@/lib/cron/session-expiry-monitor';

/**
 * POST /api/cron/session-monitor
 * Triggers session expiry monitoring
 * Called by cron job or manual trigger
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[SESSION_MONITOR_API] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[SESSION_MONITOR_API] Starting session expiry check...');

    const result = await monitorSessionExpiry();

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Session monitoring failed',
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      alerts_processed: result.alerts_processed,
      sent: result.sent,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SESSION_MONITOR_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/session-monitor
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'session-expiry-monitor',
    timestamp: new Date().toISOString(),
  });
}
