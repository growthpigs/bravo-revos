/**
 * Cron Health Check - Automated Monitoring
 * Runs every 6 hours to verify system health
 *
 * If any check fails, logs error (could be extended to send alerts)
 */

import { NextResponse } from 'next/server';

// Vercel cron authorization
export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Verify this is a Vercel cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development without secret
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Get the base URL for the health endpoint
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Fetch health status
    const healthResponse = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const healthData = await healthResponse.json();

    // Check for failures
    const failures: string[] = [];

    if (healthData.checks) {
      for (const [name, check] of Object.entries(healthData.checks)) {
        if (typeof check === 'object' && check !== null && 'status' in check) {
          const status = (check as { status: string }).status;
          if (status === 'unhealthy') {
            failures.push(name);
          }
        }
      }
    }

    // Log results
    if (failures.length > 0) {
      console.error(`[CRON_HEALTH] ❌ FAILURES: ${failures.join(', ')}`);
      console.error('[CRON_HEALTH] Full health data:', JSON.stringify(healthData, null, 2));

      // TODO: Send alert via Resend/Twilio
      // await sendAlert('RevOS Health Check Failed', { failures, healthData });
    } else {
      console.log('[CRON_HEALTH] ✅ All systems healthy');
    }

    return NextResponse.json({
      checked: true,
      timestamp: new Date().toISOString(),
      status: failures.length > 0 ? 'failures_detected' : 'all_healthy',
      failures,
      healthData,
    });

  } catch (error: any) {
    console.error('[CRON_HEALTH] ❌ Health check failed:', error.message);

    return NextResponse.json({
      checked: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
