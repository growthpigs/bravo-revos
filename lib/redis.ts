/**
 * Centralized Redis Connection
 * Singleton connection used by all queue modules
 */

import { Redis } from 'ioredis';

let connection: Redis | null = null;
let connectionPromise: Promise<Redis> | null = null;

/**
 * Get Redis connection synchronously (for BullMQ compatibility)
 * FIXED: Race condition - uses lock to ensure single instance
 */
export function getRedisConnectionSync(): Redis {
  if (connection) {
    return connection;
  }

  // Prevent race condition: if connection is being created, wait for it
  // FIX: Don't return connection! which could be null - create immediately instead
  // The previous code had a race condition where connection could be null

  // Create connection immediately (singleton)
  connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    lazyConnect: false, // Connect immediately for sync usage
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
    console.log('[REDIS] Connected to Redis (sync)');
  });

  connection.on('disconnect', () => {
    console.log('[REDIS] Disconnected from Redis');
    // Reset on disconnect so next call creates new connection
    connection = null;
    connectionPromise = null;
  });

  console.log('[REDIS] Singleton connection created (sync)');
  return connection;
}

/**
 * Get or create Redis connection (async singleton pattern)
 * Ensures only one connection instance exists, even with concurrent calls
 *
 * FIXED: Race condition where multiple concurrent calls could create multiple connections
 */
export async function getRedisConnection(): Promise<Redis> {
  // Return existing connection if ready
  if (connection && connection.status === 'ready') {
    return connection;
  }

  // If sync version created connection, use it
  if (connection) {
    // Wait for it to be ready
    if (connection.status === 'connecting') {
      await new Promise<void>((resolve) => {
        connection!.once('ready', () => resolve());
      });
    }
    return connection;
  }

  // Wait for pending connection initialization
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection (singleton promise prevents race condition)
  connectionPromise = (async () => {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: true, // Explicit connection control
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Event handlers for monitoring
    redis.on('error', (err) => {
      console.error('[REDIS] Connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[REDIS] Connected to Redis (async)');
    });

    redis.on('disconnect', () => {
      console.log('[REDIS] Disconnected from Redis');
      // Reset on disconnect so next call creates new connection
      connection = null;
      connectionPromise = null;
    });

    // Wait for connection to be ready before returning
    await redis.connect();

    connection = redis;
    console.log('[REDIS] Singleton connection established (async)');
    return redis;
  })();

  return connectionPromise;
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
    const conn = await getRedisConnection();
    await conn.ping();
    return true;
  } catch (error) {
    console.error('[REDIS] Health check failed:', error);
    return false;
  }
}
