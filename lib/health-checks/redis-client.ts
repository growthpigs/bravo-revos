/**
 * Redis Connection Pool - Singleton Pattern
 *
 * CRITICAL: Reuses Redis connection instead of creating new one on every health check
 * Prevents connection exhaustion and reduces latency by 50-200ms per check
 */

import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client singleton
 * Safe to call multiple times - always returns same instance
 */
export function getRedisClient(): Redis {
  if (!redisClient && process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false, // Fail fast if Redis is down
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 100, 1000); // Exponential backoff (100ms, 200ms, 300ms...)
      },
    });

    // Handle connection errors
    redisClient.on('error', (error) => {
      console.error('[Redis Client] Connection error:', error.message);
    });

    // Log successful connection
    redisClient.on('connect', () => {
      console.log('[Redis Client] Connected successfully');
    });
  }

  if (!redisClient) {
    throw new Error('Redis client cannot be created: REDIS_URL not set');
  }

  return redisClient;
}

/**
 * Close Redis connection gracefully
 * Should only be called during app shutdown
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis Client] Connection closed');
  }
}

/**
 * Check if Redis client is connected
 */
export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}
