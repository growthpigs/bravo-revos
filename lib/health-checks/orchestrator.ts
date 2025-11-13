/**
 * Health Check Orchestrator
 *
 * Runs all health checks in parallel, aggregates results, logs to database
 * This is the main entry point for the health check system
 */

import { createClient } from '@/lib/supabase/server';
import { getRedisClient } from './redis-client';
import { appendFileSync } from 'fs';
import { join } from 'path';
import {
  SystemHealthSnapshot,
  HealthCheckResult,
  HealthStatus,
  DEFAULT_HEALTH_CHECK_CONFIG,
} from './types';
import {
  verifySupabase,
  verifyRedis,
  verifyWebhookWorker,
  verifyEngagementWorker,
  verifyUnipile,
  verifyOpenAI,
  verifyResend,
  verifyEnvironment,
} from './verifiers';
import { verifyGit, getGitInfo } from './git-info';
import {
  getCachedHealthSnapshot,
  cacheHealthSnapshot,
  getCachedServiceHealth,
  cacheServiceHealth,
} from './cache';

/**
 * Run all health checks in parallel
 * @param useCache - If true, return cached results if available (default: true)
 */
export async function runAllHealthChecks(useCache = true): Promise<SystemHealthSnapshot> {
  // Check cache first (if enabled)
  if (useCache) {
    const cached = await getCachedHealthSnapshot();
    if (cached) {
      console.log('[Health] ✓ Returning cached snapshot (5-min TTL)');
      return cached;
    }
  }

  const startTime = Date.now();

  // Run all checks in parallel for speed
  const [
    supabase,
    redis,
    webhookWorker,
    engagementWorker,
    unipile,
    openai,
    resend,
    environment,
    git,
  ] = await Promise.all([
    verifySupabase(),
    verifyRedis(),
    verifyWebhookWorker(),
    verifyEngagementWorker(),
    verifyUnipile(),
    verifyOpenAI(),
    verifyResend(),
    verifyEnvironment(),
    verifyGit(),
  ]);

  // Get git info for snapshot
  const gitInfo = await getGitInfo();

  // Calculate summary statistics
  const services = [
    supabase,
    redis,
    webhookWorker,
    engagementWorker,
    unipile,
    openai,
    resend,
    environment,
    git,
  ];

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const degradedCount = services.filter((s) => s.status === 'degraded').length;
  const unhealthyCount = services.filter((s) => s.status === 'unhealthy').length;
  const unknownCount = services.filter((s) => s.status === 'unknown').length;

  const responseTimes = services
    .map((s) => s.responseTimeMs)
    .filter((t): t is number => t !== null);
  const averageResponseTime =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  // Determine overall status
  let overallStatus: HealthStatus = 'healthy';
  if (unhealthyCount > 0) {
    overallStatus = 'unhealthy';
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
  } else if (unknownCount > 0) {
    overallStatus = 'unknown';
  }

  const snapshot: SystemHealthSnapshot = {
    overallStatus,
    timestamp: new Date().toISOString(),
    gitInfo,
    services: {
      supabase,
      redis,
      webhookWorker,
      engagementWorker,
      unipile,
      openai,
      resend,
      environment,
      git,
    },
    summary: {
      totalServices: services.length,
      healthyCount,
      degradedCount,
      unhealthyCount,
      unknownCount,
      averageResponseTime,
    },
  };

  // Log to database if enabled
  if (DEFAULT_HEALTH_CHECK_CONFIG.logToDatabase) {
    await logHealthCheckResults(services, gitInfo).catch((error) => {
      console.error('[Health] Failed to log to database:', error);
      // Don't fail the health check if logging fails
    });
  }

  console.log(
    `[Health] Check complete in ${Date.now() - startTime}ms - Overall: ${overallStatus}`
  );

  // Cache the snapshot for 5 minutes (if enabled)
  if (useCache) {
    await cacheHealthSnapshot(snapshot).catch((error) => {
      console.error('[Health] Failed to cache snapshot:', error);
      // Don't fail the health check if caching fails
    });
  }

  return snapshot;
}

/**
 * Log health check results to database (immutable audit trail)
 *
 * CRITICAL: Multi-tier fallback to prevent circular dependency
 * If Supabase is down, we still need to log that Supabase is down!
 */
async function logHealthCheckResults(
  results: HealthCheckResult[],
  gitInfo: { branch: string; commit: string }
): Promise<void> {
  // Prepare records for logging
  const records = results.map((result) => ({
    check_timestamp: new Date().toISOString(),
    service_name: result.service,
    status: result.status,
    response_time_ms: result.responseTimeMs,
    diagnostics: result.diagnostics,
    error_message: result.errorMessage || null,
    verified_sources: result.verifiedSources,
    git_commit: gitInfo.commit,
    git_branch: gitInfo.branch,
  }));

  // Tier 1: Try Supabase (primary)
  try {
    const supabase = await createClient({ isServiceRole: true });
    const { error } = await supabase.from('system_health_log').insert(records);

    if (error) {
      throw error;
    }

    console.log(`[Health] ✓ Logged ${records.length} checks to Supabase`);
    return; // Success!
  } catch (supabaseError) {
    console.error('[Health] ⚠️ Supabase logging failed:', supabaseError);

    // Tier 2: Try Redis (fallback)
    try {
      const redis = getRedisClient();
      const logKey = 'health_log_backup';

      // Store as JSON list (LPUSH = prepend)
      await redis.lpush(logKey, JSON.stringify(records));

      // Keep only last 1000 entries
      await redis.ltrim(logKey, 0, 999);

      console.log(`[Health] ✓ Logged ${records.length} checks to Redis (fallback)`);
      return; // Fallback success!
    } catch (redisError) {
      console.error('[Health] ⚠️ Redis fallback failed:', redisError);

      // Tier 3: Filesystem (last resort)
      try {
        const logPath = join(process.cwd(), 'logs', 'health-checks-critical.jsonl');
        const logLine = JSON.stringify({
          timestamp: new Date().toISOString(),
          records,
        }) + '\n';

        appendFileSync(logPath, logLine);

        console.log(`[Health] ✓ Logged ${records.length} checks to filesystem (last resort)`);
        return; // Last resort success!
      } catch (fsError) {
        console.error('[Health] ❌ All logging tiers failed:', fsError);
        // At this point, we've tried everything. Log to console as absolute fallback.
        console.error('[Health] CRITICAL - Health check data (console only):', JSON.stringify(records));
      }
    }
  }
}

/**
 * Run health check for a single service
 * @param serviceName - Name of the service to check
 * @param useCache - If true, return cached results if available (default: true)
 */
export async function runSingleHealthCheck(
  serviceName: string,
  useCache = true
): Promise<HealthCheckResult> {
  // Check cache first (if enabled)
  if (useCache) {
    const cached = await getCachedServiceHealth(serviceName);
    if (cached) {
      console.log(`[Health] ✓ Returning cached ${serviceName} (5-min TTL)`);
      return cached;
    }
  }

  const verifierMap: Record<string, () => Promise<HealthCheckResult>> = {
    supabase: verifySupabase,
    redis: verifyRedis,
    webhook_worker: verifyWebhookWorker,
    engagement_worker: verifyEngagementWorker,
    unipile: verifyUnipile,
    openai: verifyOpenAI,
    resend: verifyResend,
    environment: verifyEnvironment,
    git: verifyGit,
  };

  const verifier = verifierMap[serviceName];
  if (!verifier) {
    throw new Error(`Unknown service: ${serviceName}`);
  }

  const result = await verifier();

  // Log single result to database
  if (DEFAULT_HEALTH_CHECK_CONFIG.logToDatabase) {
    const gitInfo = await getGitInfo();
    await logHealthCheckResults([result], gitInfo);
  }

  // Cache the result for 5 minutes (if enabled)
  if (useCache) {
    await cacheServiceHealth(result).catch((error) => {
      console.error(`[Health] Failed to cache ${serviceName}:`, error);
      // Don't fail the health check if caching fails
    });
  }

  return result;
}

/**
 * Get health check history from database
 */
export async function getHealthCheckHistory(
  serviceName?: string,
  limit = 100
): Promise<HealthCheckResult[]> {
  try {
    const supabase = await createClient({ isServiceRole: true });

    let query = supabase
      .from('system_health_log')
      .select('*')
      .order('check_timestamp', { ascending: false })
      .limit(limit);

    if (serviceName) {
      query = query.eq('service_name', serviceName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Health] Failed to fetch history:', error);
      return [];
    }

    // Transform database records to HealthCheckResult format
    return (data || []).map((record) => ({
      service: record.service_name,
      status: record.status as HealthStatus,
      responseTimeMs: record.response_time_ms,
      verifiedSources: record.verified_sources || [],
      diagnostics: record.diagnostics || {},
      errorMessage: record.error_message || undefined,
      timestamp: record.check_timestamp,
    }));
  } catch (error) {
    console.error('[Health] Failed to get health check history:', error);
    return [];
  }
}

/**
 * Get latest health status for all services (from database)
 */
export async function getLatestHealthStatus(): Promise<Record<string, HealthCheckResult>> {
  try {
    const supabase = await createClient({ isServiceRole: true });

    const { data, error } = await supabase.rpc('get_latest_health_status');

    if (error) {
      console.error('[Health] Failed to get latest status:', error);
      return {};
    }

    // Transform to map of service -> result
    const statusMap: Record<string, HealthCheckResult> = {};
    for (const record of data || []) {
      statusMap[record.service_name] = {
        service: record.service_name,
        status: record.status as HealthStatus,
        responseTimeMs: record.response_time_ms,
        verifiedSources: [], // Not stored in summary function
        diagnostics: {},
        errorMessage: record.error_message || undefined,
        timestamp: record.check_timestamp,
      };
    }

    return statusMap;
  } catch (error) {
    console.error('[Health] Failed to get latest health status:', error);
    return {};
  }
}

/**
 * Calculate service uptime percentage (last 24 hours)
 */
export async function getServiceUptime(
  serviceName: string,
  hours = 24
): Promise<number> {
  try {
    const supabase = await createClient({ isServiceRole: true });

    const { data, error } = await supabase
      .from('system_health_log')
      .select('status')
      .eq('service_name', serviceName)
      .gte(
        'check_timestamp',
        new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      );

    if (error || !data || data.length === 0) {
      return 0;
    }

    const healthyCount = data.filter((r) => r.status === 'healthy').length;
    return Math.round((healthyCount / data.length) * 100);
  } catch (error) {
    console.error('[Health] Failed to calculate uptime:', error);
    return 0;
  }
}

/**
 * Check if health check system itself is operational
 */
export async function checkHealthCheckSystemHealth(): Promise<{
  operational: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Check 1: Database table exists
  try {
    const supabase = await createClient({ isServiceRole: true });
    const { error } = await supabase
      .from('system_health_log')
      .select('id')
      .limit(1);

    if (error) {
      issues.push('Database table not accessible');
    }
  } catch (error) {
    issues.push('Cannot connect to database');
  }

  // Check 2: All verifier functions exist
  const verifiers = [
    verifySupabase,
    verifyRedis,
    verifyWebhookWorker,
    verifyEngagementWorker,
    verifyUnipile,
    verifyOpenAI,
    verifyResend,
    verifyEnvironment,
    verifyGit,
  ];

  const missingVerifiers = verifiers.filter(
    (v) => typeof v !== 'function'
  );
  if (missingVerifiers.length > 0) {
    issues.push(`${missingVerifiers.length} verifiers not implemented`);
  }

  // Check 3: Recent checks exist (< 10 minutes old)
  try {
    const supabase = await createClient({ isServiceRole: true });
    const { data, error } = await supabase
      .from('system_health_log')
      .select('check_timestamp')
      .gte(
        'check_timestamp',
        new Date(Date.now() - 10 * 60 * 1000).toISOString()
      )
      .limit(1);

    if (error || !data || data.length === 0) {
      issues.push('No recent health checks found (last 10 minutes)');
    }
  } catch (error) {
    issues.push('Cannot verify recent checks');
  }

  return {
    operational: issues.length === 0,
    issues,
  };
}
