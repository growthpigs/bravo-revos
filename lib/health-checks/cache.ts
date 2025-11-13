/**
 * Health Check Caching Layer
 *
 * Server-side Redis caching with 5-minute TTL
 * Reduces load and improves response times
 */

import { getRedisClient } from './redis-client';
import type { SystemHealthSnapshot, HealthCheckResult } from './types';

const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
const CACHE_KEY_PREFIX = 'health_check:';

/**
 * Get cached health snapshot
 * Returns null if not cached or expired
 */
export async function getCachedHealthSnapshot(): Promise<SystemHealthSnapshot | null> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_KEY_PREFIX}snapshot:latest`;
    const cached = await redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as SystemHealthSnapshot;
  } catch (error) {
    console.error('[Health Cache] Failed to get cached snapshot:', error);
    return null;
  }
}

/**
 * Cache health snapshot for 5 minutes
 */
export async function cacheHealthSnapshot(snapshot: SystemHealthSnapshot): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_KEY_PREFIX}snapshot:latest`;

    await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(snapshot));

    console.log('[Health Cache] ✓ Cached snapshot for 5 minutes');
  } catch (error) {
    console.error('[Health Cache] Failed to cache snapshot:', error);
    // Don't throw - caching failure shouldn't break health checks
  }
}

/**
 * Get cached single service health check
 * Returns null if not cached or expired
 */
export async function getCachedServiceHealth(
  serviceName: string
): Promise<HealthCheckResult | null> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_KEY_PREFIX}service:${serviceName}`;
    const cached = await redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as HealthCheckResult;
  } catch (error) {
    console.error(`[Health Cache] Failed to get cached service ${serviceName}:`, error);
    return null;
  }
}

/**
 * Cache single service health check for 5 minutes
 */
export async function cacheServiceHealth(result: HealthCheckResult): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_KEY_PREFIX}service:${result.service}`;

    await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(result));

    console.log(`[Health Cache] ✓ Cached ${result.service} for 5 minutes`);
  } catch (error) {
    console.error(`[Health Cache] Failed to cache service ${result.service}:`, error);
    // Don't throw - caching failure shouldn't break health checks
  }
}

/**
 * Invalidate all health check caches
 * Useful for manual "Verify Now" operations
 */
export async function invalidateHealthCache(): Promise<void> {
  try {
    const redis = getRedisClient();

    // Get all health check cache keys
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);

    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Health Cache] ✓ Invalidated ${keys.length} cache entries`);
    }
  } catch (error) {
    console.error('[Health Cache] Failed to invalidate cache:', error);
    // Don't throw - cache invalidation failure is not critical
  }
}

/**
 * Get cache TTL (time to live) for a specific key
 * Returns seconds remaining, or null if not cached
 */
export async function getCacheTTL(serviceName?: string): Promise<number | null> {
  try {
    const redis = getRedisClient();
    const key = serviceName
      ? `${CACHE_KEY_PREFIX}service:${serviceName}`
      : `${CACHE_KEY_PREFIX}snapshot:latest`;

    const ttl = await redis.ttl(key);

    // -2 = key doesn't exist, -1 = key exists but no expiry
    if (ttl < 0) {
      return null;
    }

    return ttl;
  } catch (error) {
    console.error('[Health Cache] Failed to get cache TTL:', error);
    return null;
  }
}
