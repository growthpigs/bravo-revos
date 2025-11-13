/**
 * Health Check API
 *
 * GET /api/health?public=true - Basic cached status (no auth, rate limited by IP)
 * GET /api/health - Run all health checks (requires auth)
 * GET /api/health?service=redis - Run single service health check (requires auth)
 * GET /api/health?history=true&limit=100 - Get historical health data (requires auth)
 * POST /api/health/verify - Manual "Verify Now" trigger (requires admin auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  runAllHealthChecks,
  runSingleHealthCheck,
  getHealthCheckHistory,
  getLatestHealthStatus,
  getServiceUptime,
  checkHealthCheckSystemHealth,
} from '@/lib/health-checks/orchestrator';
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/rate-limit';

// Public endpoint: Basic cached status (no auth, rate limited by IP)
// Authenticated endpoints: Detailed checks (requires auth, higher rate limits)

/**
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isPublic = searchParams.get('public') === 'true';
    const serviceName = searchParams.get('service');
    const history = searchParams.get('history') === 'true';
    const latest = searchParams.get('latest') === 'true';
    const uptime = searchParams.get('uptime') === 'true';
    const metaCheck = searchParams.get('meta') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // PUBLIC ENDPOINT: Basic cached status (no auth, rate limited by IP)
    if (isPublic) {
      // Rate limit by IP address
      const clientIp = getClientIp(request);
      const rateLimitResult = checkRateLimit({
        ...RATE_LIMITS.PUBLIC_HEALTH,
        identifier: `public_health:${clientIp}`,
      });

      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: 'Too Many Requests',
            message: 'Rate limit exceeded for public health endpoint',
            limit: rateLimitResult.limit,
            reset: new Date(rateLimitResult.reset).toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            },
          }
        );
      }

      // Return basic cached status (latest from database)
      const latestStatus = await getLatestHealthStatus();
      return NextResponse.json(
        { status: 'success', data: latestStatus },
        {
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // AUTHENTICATED ENDPOINTS: Detailed checks (requires auth)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required for detailed health checks',
          hint: 'Use ?public=true for basic cached status without authentication',
        },
        { status: 401 }
      );
    }

    // Rate limit by user ID (higher limits for authenticated users)
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.AUTH_HEALTH,
      identifier: `auth_health:${user.id}`,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded for authenticated health endpoint',
          limit: rateLimitResult.limit,
          reset: new Date(rateLimitResult.reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Meta-health check (health check system health)
    if (metaCheck) {
      const result = await checkHealthCheckSystemHealth();
      return NextResponse.json(result, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      });
    }

    // Historical data
    if (history) {
      const historyData = await getHealthCheckHistory(serviceName || undefined, limit);
      return NextResponse.json(
        {
          service: serviceName || 'all',
          count: historyData.length,
          history: historyData,
        },
        {
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Latest status (from database, no new checks)
    if (latest) {
      const latestStatus = await getLatestHealthStatus();
      return NextResponse.json(latestStatus, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      });
    }

    // Service uptime
    if (uptime && serviceName) {
      const uptimePercent = await getServiceUptime(serviceName);
      return NextResponse.json(
        {
          service: serviceName,
          uptimePercent,
          period: '24 hours',
        },
        {
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Single service check
    if (serviceName) {
      const result = await runSingleHealthCheck(serviceName);
      return NextResponse.json(result, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      });
    }

    // Run all health checks
    const snapshot = await runAllHealthChecks();
    return NextResponse.json(snapshot, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      },
    });
  } catch (error) {
    console.error('[Health API] Error:', error);
    return NextResponse.json(
      {
        error: 'Health check failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/verify
 * Manual "Verify Now" trigger (requires admin auth + rate limited)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Rate limit manual verification (expensive operation)
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.VERIFY,
      identifier: `verify:${user.id}`,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded for manual verification',
          limit: rateLimitResult.limit,
          reset: new Date(rateLimitResult.reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Parse request body (optional: specific service to verify)
    const body = await request.json().catch(() => ({}));
    const serviceName = body.service;

    // Run health check (bypass cache for manual verification)
    const result = serviceName
      ? await runSingleHealthCheck(serviceName, false)
      : await runAllHealthChecks(false);

    return NextResponse.json(
      {
        message: 'Health check completed',
        result,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  } catch (error) {
    console.error('[Health API] Verify error:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/health
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
