/**
 * Webhook Delivery Background Worker
 *
 * This worker processes queued webhook deliveries with automatic retry logic.
 *
 * Usage:
 *   npm run worker:webhook
 *   OR
 *   tsx workers/webhook-delivery-worker.ts
 *
 * Environment variables required:
 *   - REDIS_URL: Redis connection string
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 */

// Load environment variables before any other imports
import dotenv from 'dotenv';
dotenv.config(); // Loads .env from cwd, or uses system env vars on Render

import { createWebhookQueue, createWebhookWorker } from '../lib/queue/webhook-delivery-queue';
import { checkRedisHealth } from '../lib/redis';
import {
  enforceSingleInstance,
  type ReleaseSingleInstance,
} from '../lib/utils/single-instance';

const LOG_PREFIX = '[WEBHOOK_WORKER]';

async function startWorker() {
  console.log(`${LOG_PREFIX} Starting webhook delivery worker...`);

  const singletonPort = Number.parseInt(process.env.WEBHOOK_WORKER_PORT ?? '4732', 10);
  let releaseSingleInstance: ReleaseSingleInstance | undefined;

  try {
    releaseSingleInstance = await enforceSingleInstance({
      id: 'WEBHOOK_WORKER',
      port: singletonPort,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Validate required environment variables
  const requiredEnvVars = [
    'REDIS_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(`${LOG_PREFIX} Missing required environment variables:`);
    missingVars.forEach((varName) => {
      console.error(`  - ${varName}`);
    });
    process.exit(1);
  }

  // Check Redis health before starting
  console.log(`${LOG_PREFIX} Checking Redis connection...`);
  const redisHealthy = await checkRedisHealth();

  if (!redisHealthy) {
    console.error(`${LOG_PREFIX} Redis health check failed`);
    console.error(`${LOG_PREFIX} Verify REDIS_URL: ${process.env.REDIS_URL}`);
    process.exit(1);
  }

  console.log(`${LOG_PREFIX} Redis connection healthy`);

  // Create queue and worker
  const queue = createWebhookQueue();
  const worker = createWebhookWorker();

  console.log(`${LOG_PREFIX} Worker started successfully`);
  console.log(`${LOG_PREFIX} Redis: ${process.env.REDIS_URL}`);
  console.log(`${LOG_PREFIX} Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`${LOG_PREFIX} Processing queue: webhook-delivery`);
  console.log(`${LOG_PREFIX} Concurrency: 5 workers`);
  console.log(`${LOG_PREFIX} Rate limit: 50 jobs/second`);
  console.log(`${LOG_PREFIX} Listening for jobs...`);

  // Graceful shutdown handler
  const shutdown = async (signal: string, exitCode = 0) => {
    console.log(`\n${LOG_PREFIX} Received ${signal}, shutting down gracefully...`);

    try {
      console.log(`${LOG_PREFIX} Closing worker...`);
      await worker.close();
      console.log(`${LOG_PREFIX} Closing queue...`);
      await queue.close();
      console.log(`${LOG_PREFIX} Shutdown complete`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error during shutdown:`, error);
      exitCode = 1;
    } finally {
      if (releaseSingleInstance) {
        releaseSingleInstance();
        releaseSingleInstance = undefined;
      }
      process.exit(exitCode);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  // Keep process alive
  process.stdin.resume();
}

// Start the worker
startWorker().catch((error) => {
  console.error(`${LOG_PREFIX} Fatal error:`, error);
  process.exit(1);
});
