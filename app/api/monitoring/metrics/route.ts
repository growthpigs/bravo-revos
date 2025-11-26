/**
 * G-01: Monitoring Metrics API
 * GET /api/monitoring/metrics - Get current dashboard metrics
 * GET /api/monitoring/metrics/historical - Get historical data for charts
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getDashboardMetrics,
  getHistoricalMetrics,
} from '@/lib/monitoring/metrics';
import { safeParseQueryParam } from '@/lib/utils/safe-parse';
import { QUERY_PARAM_DEFAULTS } from '@/lib/config';

/**
 * GET /api/monitoring/metrics
 * Returns current engagement, pod, and system health metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'current';
    const hours = safeParseQueryParam(searchParams, 'hours', QUERY_PARAM_DEFAULTS.DEFAULT_HOURS, { min: 1, max: 168 });

    if (action === 'historical') {
      const data = await getHistoricalMetrics(hours);
      return NextResponse.json({
        status: 'success',
        action: 'historical',
        hours,
        data,
        count: data.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Default: current metrics
    const metrics = await getDashboardMetrics();

    return NextResponse.json({
      status: 'success',
      action: 'current',
      metrics,
      timestamp: metrics.timestamp,
    });
  } catch (error) {
    console.error('[MONITORING_API] Error fetching metrics:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
