/**
 * Production-Safe Health Check API
 * GET /api/health - Returns system status for monitoring
 *
 * CRITICAL: This endpoint is called by automated monitors (Render, Vercel)
 * without authentication. All checks must work without user sessions.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRedisHealth } from '@/lib/redis';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    database: await checkDatabase(),
    queue: await checkQueue(),
    agentkit: await checkAgentKit(),
    mem0: checkMem0(),
    unipile: checkUnipile(),
  };

  // System is healthy only if critical services (DB + Queue) are up
  const isHealthy =
    checks.database.status === 'healthy' &&
    checks.queue.status === 'healthy';

  const overallStatus = isHealthy ? 'healthy' : 'degraded';

  // Return 503 if degraded (tells monitoring systems we're having issues)
  return NextResponse.json(
    {
      status: overallStatus,
      checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}

/**
 * Check Database (Critical)
 * Uses simple query that requires no authentication
 */
async function checkDatabase() {
  try {
    const supabase = await createClient();
    const start = Date.now();

    // Simple query - no auth required
    const { error } = await supabase
      .from('campaigns')
      .select('count')
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return {
        status: 'unhealthy' as const,
        error: error.message,
        latency,
      };
    }

    return {
      status: 'healthy' as const,
      latency,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy' as const,
      error: error.message || 'Database connection failed',
    };
  }
}

/**
 * Check Redis Queue (Critical for Pods/DMs)
 * Uses existing health check function from lib/redis.ts
 */
async function checkQueue() {
  if (!process.env.REDIS_URL) {
    return {
      status: 'disabled' as const,
      message: 'REDIS_URL not configured',
    };
  }

  try {
    const start = Date.now();
    const isHealthy = await checkRedisHealth();
    const latency = Date.now() - start;

    return {
      status: isHealthy ? ('healthy' as const) : ('unhealthy' as const),
      latency,
      message: isHealthy ? undefined : 'Redis ping failed',
    };
  } catch (error: any) {
    return {
      status: 'unhealthy' as const,
      error: error.message || 'Redis connection failed',
    };
  }
}

/**
 * Check AgentKit SDK (Non-Critical)
 * Only verifies module loads - no file system reads
 */
async function checkAgentKit() {
  try {
    // Just check if the module loads
    const agentKit = await import('@openai/agents');

    return {
      status: 'healthy' as const,
      message: 'AgentKit SDK loaded successfully',
      hasAgent: !!agentKit.Agent,
      hasRun: !!agentKit.run,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy' as const,
      error: error.message || 'Failed to import AgentKit',
    };
  }
}

/**
 * Check Mem0 Configuration (Non-Critical)
 * Only checks if API key is configured - doesn't burn API credits
 */
function checkMem0() {
  if (!process.env.MEM0_API_KEY) {
    return {
      status: 'disabled' as const,
      message: 'MEM0_API_KEY not configured',
    };
  }

  return {
    status: 'healthy' as const,
    message: 'Mem0 API key configured',
  };
}

/**
 * Check Unipile Configuration (Non-Critical)
 * Only checks if API key is configured - doesn't burn API credits
 */
function checkUnipile() {
  if (!process.env.UNIPILE_API_KEY) {
    return {
      status: 'disabled' as const,
      message: 'UNIPILE_API_KEY not configured',
    };
  }

  return {
    status: 'healthy' as const,
    message: 'Unipile API key configured',
  };
}
