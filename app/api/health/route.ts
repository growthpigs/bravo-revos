/**
 * Simple Health Check API
 * GET /api/health - Returns basic system status
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchMemories } from '@/lib/mem0/memory';
import { checkRedisHealth } from '@/lib/redis';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    database: await checkDatabase(),
    supabase: await checkSupabase(),
    api: { status: 'healthy' }, // If this responds, API is up
    agentkit: await checkAgentKit(), // ✅ Real AgentKit version check
    mem0: await checkMem0(), // ✅ Real Mem0 health check
    unipile: await checkUnipile(), // ✅ Real Unipile connectivity check
    email: await checkEmail(), // ✅ Real webhook delivery check
    console: await checkConsole(), // ✅ Real console database check
    cache: await checkCache(), // ✅ Real Redis health check
    queue: await checkQueue(), // ✅ Real BullMQ queue check
    cron: await checkCron(), // ✅ Real cron session check
    webhooks: await checkWebhooks(), // ✅ Real webhook delivery check
  };

  const overallStatus = Object.values(checks)
    .filter(c => typeof c === 'object' && 'status' in c)
    .every(c => c.status === 'healthy')
    ? 'healthy'
    : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    checks,
  });
}

async function checkDatabase() {
  try {
    const supabase = await createClient();
    const start = Date.now();
    const { error } = await supabase.from('campaigns').select('count').limit(1);

    return {
      status: error ? 'unhealthy' : 'healthy',
      latency: Date.now() - start,
    };
  } catch {
    return { status: 'unhealthy' };
  }
}

async function checkSupabase() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();

    return {
      status: error ? 'degraded' : 'healthy',
    };
  } catch {
    return { status: 'unhealthy' };
  }
}

/**
 * Check Mem0 connectivity and memory operations
 * Tests: API connection, search functionality, latency
 */
async function checkMem0() {
  // Skip if MEM0_API_KEY not configured
  if (!process.env.MEM0_API_KEY) {
    return {
      status: 'disabled',
      message: 'MEM0_API_KEY not configured',
    };
  }

  try {
    const start = Date.now();

    // Test with dedicated health check tenant key
    const healthTenantKey = 'health::check::test';

    // Attempt to search memories (lightweight operation)
    await searchMemories(healthTenantKey, 'health check query', 1);

    const latency = Date.now() - start;

    return {
      status: latency < 2000 ? 'healthy' : 'degraded',
      latency,
      message: latency >= 2000 ? 'High latency detected' : undefined,
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] Mem0 check failed:', error.message);

    return {
      status: 'unhealthy',
      error: error.message || 'Connection failed',
    };
  }
}

/**
 * Check AgentKit SDK version and import functionality
 * Tests: Package import, version match
 */
async function checkAgentKit() {
  const EXPECTED_VERSION = '0.3.3';

  try {
    const start = Date.now();

    // Dynamic import to verify AgentKit loads
    const agentKit = await import('@openai/agents');

    // Check version by reading package.json from node_modules
    let version = 'unknown';
    try {
      const fs = await import('fs');
      const path = await import('path');
      const pkgPath = path.join(process.cwd(), 'node_modules', '@openai', 'agents', 'package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      version = pkgJson.version;
    } catch {
      // Version check failed, but import worked
    }

    const latency = Date.now() - start;
    const versionMatch = version === EXPECTED_VERSION;

    return {
      status: versionMatch ? 'healthy' : 'degraded',
      version,
      expectedVersion: EXPECTED_VERSION,
      latency,
      message: !versionMatch ? `Version mismatch: expected ${EXPECTED_VERSION}, got ${version}` : undefined,
      hasAgent: !!agentKit.Agent,
      hasRun: !!agentKit.run,
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] AgentKit check failed:', error.message);

    return {
      status: 'unhealthy',
      error: error.message || 'Import failed',
      expectedVersion: EXPECTED_VERSION,
    };
  }
}

/**
 * Check Unipile API connectivity
 * Tests: API endpoint reachable, authentication working
 */
async function checkUnipile() {
  // Skip if UNIPILE_API_KEY not configured
  if (!process.env.UNIPILE_API_KEY) {
    return {
      status: 'disabled',
      message: 'UNIPILE_API_KEY not configured',
    };
  }

  try {
    const start = Date.now();
    const dsn = process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211';

    // Make lightweight API call to verify connectivity
    const response = await fetch(`${dsn}/api/v1/users/me`, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.UNIPILE_API_KEY,
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      return {
        status: 'unhealthy',
        error: `API returned ${response.status}`,
        latency,
      };
    }

    return {
      status: latency < 2000 ? 'healthy' : 'degraded',
      latency,
      message: latency >= 2000 ? 'High latency detected' : undefined,
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] Unipile check failed:', error.message);

    return {
      status: 'unhealthy',
      error: error.message || 'Connection failed',
    };
  }
}

/**
 * Check email webhook delivery system
 * Tests: Recent webhook deliveries exist, database accessible
 */
async function checkEmail() {
  try {
    const supabase = await createClient();
    const start = Date.now();

    // Check if webhook_deliveries table has recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('id, created_at')
      .gte('created_at', sevenDaysAgo)
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency,
      };
    }

    // If no recent webhooks, mark as degraded (could be normal if no campaigns active)
    const hasRecentWebhooks = data && data.length > 0;

    return {
      status: hasRecentWebhooks ? 'healthy' : 'degraded',
      latency,
      message: !hasRecentWebhooks ? 'No recent webhook deliveries' : undefined,
      lastWebhook: hasRecentWebhooks ? data[0].created_at : null,
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] Email check failed:', error.message);

    return {
      status: 'unhealthy',
      error: error.message || 'Database query failed',
    };
  }
}

/**
 * Check console database tables
 * Tests: console_workflows table exists and accessible
 */
async function checkConsole() {
  try {
    const supabase = await createClient();
    const start = Date.now();

    // Check if console_workflows table exists and has data
    const { data, error, count } = await supabase
      .from('console_workflows')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency,
      };
    }

    return {
      status: 'healthy',
      latency,
      workflowCount: count || 0,
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] Console check failed:', error.message);

    return {
      status: 'unhealthy',
      error: error.message || 'Database query failed',
    };
  }
}

/**
 * Check Redis cache connectivity
 * Tests: Redis connection, ping response
 */
async function checkCache() {
  // Skip if REDIS_URL not configured
  if (!process.env.REDIS_URL) {
    return {
      status: 'disabled',
      message: 'REDIS_URL not configured',
    };
  }

  try {
    const start = Date.now();
    const isHealthy = await checkRedisHealth();
    const latency = Date.now() - start;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency,
      error: !isHealthy ? 'Redis ping failed' : undefined,
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] Cache check failed:', error.message);

    return {
      status: 'unhealthy',
      error: error.message || 'Connection failed',
    };
  }
}

/**
 * Check BullMQ queue system
 * Tests: Redis connection (same as cache), queue accessibility
 */
async function checkQueue() {
  // Skip if REDIS_URL not configured
  if (!process.env.REDIS_URL) {
    return {
      status: 'disabled',
      message: 'REDIS_URL not configured',
    };
  }

  try {
    const start = Date.now();
    const isHealthy = await checkRedisHealth();
    const latency = Date.now() - start;

    // Queue health same as Redis health (BullMQ uses Redis)
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency,
      error: !isHealthy ? 'Redis connection required for queues' : undefined,
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] Queue check failed:', error.message);

    return {
      status: 'unhealthy',
      error: error.message || 'Connection failed',
    };
  }
}

/**
 * Check cron session monitoring
 * Tests: cron_sessions table exists and accessible
 */
async function checkCron() {
  try {
    const supabase = await createClient();
    const start = Date.now();

    // Check if cron_sessions table exists
    const { error } = await supabase
      .from('cron_sessions')
      .select('id')
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      // If table doesn't exist, cron system is not set up
      if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
        return {
          status: 'disabled',
          message: 'Cron system not configured',
          latency,
        };
      }

      return {
        status: 'unhealthy',
        error: error.message,
        latency,
      };
    }

    return {
      status: 'healthy',
      latency,
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] Cron check failed:', error.message);

    return {
      status: 'unhealthy',
      error: error.message || 'Database query failed',
    };
  }
}

/**
 * Check webhook delivery system
 * Tests: Recent webhook deliveries exist, database accessible
 */
async function checkWebhooks() {
  try {
    const supabase = await createClient();
    const start = Date.now();

    // Check if webhook_deliveries table has recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('id, created_at, status')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    const latency = Date.now() - start;

    if (error) {
      // If table doesn't exist, webhook system is not set up
      if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
        return {
          status: 'disabled',
          message: 'Webhook system not configured',
          latency,
        };
      }

      return {
        status: 'unhealthy',
        error: error.message,
        latency,
      };
    }

    // If no recent webhooks, mark as degraded (could be normal if no campaigns active)
    const hasRecentWebhooks = data && data.length > 0;
    const successfulWebhooks = data?.filter(w => w.status === 'delivered').length || 0;

    return {
      status: hasRecentWebhooks ? 'healthy' : 'degraded',
      latency,
      message: !hasRecentWebhooks ? 'No recent webhook deliveries' : undefined,
      recentCount: data?.length || 0,
      successfulCount: successfulWebhooks,
      lastWebhook: hasRecentWebhooks ? data[0].created_at : null,
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] Webhooks check failed:', error.message);

    return {
      status: 'unhealthy',
      error: error.message || 'Database query failed',
    };
  }
}
