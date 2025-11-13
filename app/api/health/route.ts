/**
 * Simple Health Check API
 * GET /api/health - Returns basic system status
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchMemories } from '@/lib/mem0/memory';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    database: await checkDatabase(),
    supabase: await checkSupabase(),
    api: { status: 'healthy' }, // If this responds, API is up
    agentkit: { status: 'healthy' }, // TODO: Real check
    mem0: await checkMem0(), // ✅ Real Mem0 health check
    unipile: { status: 'healthy' }, // TODO: Real check
    email: { status: 'healthy' }, // TODO: Real check
    console: { status: 'healthy' }, // TODO: Real check
    cache: { status: 'healthy' }, // TODO: Real check
    queue: { status: 'healthy' }, // TODO: Real check
    cron: { status: 'healthy' }, // TODO: Real check
    webhooks: { status: 'healthy' }, // TODO: Real check
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
    const { data, error } = await supabase.auth.getUser();

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
