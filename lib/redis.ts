/**
 * Centralized Redis Connection
 * Singleton connection used by all queue modules
 */

import { Redis } from 'ioredis';

let connection: Redis | null = null;

/**
 * Get or create Redis connection
 * Ensures only one connection instance exists
 */
export function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      // Connection retry strategy
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Event handlers for monitoring
    connection.on('error', (err) => {
      console.error('[REDIS] Connection error:', err.message);
    });

    connection.on('connect', () => {
      console.log('[REDIS] Connected to Redis');
    });

    connection.on('disconnect', () => {
      console.log('[REDIS] Disconnected from Redis');
    });
  }

  return connection;
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
    console.log('[REDIS] Connection closed');
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return connection ? connection.status === 'ready' : false;
}

/**
 * Health check for Redis
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const conn = getRedisConnection();
    await conn.ping();
    return true;
  } catch (error) {
    console.error('[REDIS] Health check failed:', error);
    return false;
  }
}
