/**
 * Simple Health Check API
 * GET /api/health - Returns basic system status
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    database: await checkDatabase(),
    supabase: await checkSupabase(),
    api: { status: 'healthy' }, // If this responds, API is up
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
