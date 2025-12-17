/**
 * Pod Engagement Executor Worker (E-05)
 *
 * This worker executes scheduled engagement activities via Unipile API:
 * 1. Processes 'like' engagements
 * 2. Processes 'comment' engagements (with voice cartridge)
 * 3. Handles retries and dead-letter queue for failures
 *
 * Usage:
 *   npm run worker:pod-engagement
 *   OR
 *   tsx workers/pod-engagement-worker.ts
 *
 * Environment variables required:
 *   - REDIS_URL: Redis connection string
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 *   - UNIPILE_API_KEY: Unipile API key
 *   - UNIPILE_DSN: Unipile API base URL
 */

// Load environment variables before any other imports
import dotenv from 'dotenv';
dotenv.config(); // Loads .env from cwd, or uses system env vars on Render

import {
  getEngagementQueue,
  initializeEngagementWorker,
  getEngagementQueueStats,
  getEngagementWorkerHealth,
  shutdownEngagementWorker,
} from '../lib/queues/pod-engagement-worker';
import { checkRedisHealth } from '../lib/redis';
import {
  enforceSingleInstance,
  type ReleaseSingleInstance,
} from '../lib/utils/single-instance';

const LOG_PREFIX = '[POD_ENGAGEMENT_WORKER]';

async function startWorker() {
  console.log(`${LOG_PREFIX} Starting pod engagement executor worker (E-05)...`);

  const singletonPort = Number.parseInt(process.env.POD_ENGAGEMENT_WORKER_PORT ?? '4732', 10);
  let releaseSingleInstance: ReleaseSingleInstance | undefined;

  try {
    releaseSingleInstance = await enforceSingleInstance({
      id: 'POD_ENGAGEMENT_WORKER',
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
    'UNIPILE_API_KEY',
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

  console.log(`${LOG_PREFIX} ✅ Redis connection healthy`);

  // Start the worker
  try {
    console.log(`${LOG_PREFIX} Worker starting...`);
    console.log(`${LOG_PREFIX} Redis: ${process.env.REDIS_URL?.replace(/:[^:]*@/, ':****@')}`);
    console.log(`${LOG_PREFIX} Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`${LOG_PREFIX} Unipile DSN: ${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}`);
    console.log(`${LOG_PREFIX} Processing queue: pod-engagement`);
    console.log(`${LOG_PREFIX} Listening for jobs...`);

    // Initialize worker and queue
    await initializeEngagementWorker();
    getEngagementQueue();

    // Get initial queue status
    const stats = await getEngagementQueueStats();
    console.log(`${LOG_PREFIX} Queue status:`, stats);

    // Get worker health
    const health = await getEngagementWorkerHealth();
    console.log(`${LOG_PREFIX} Worker health:`, health);

    console.log(`${LOG_PREFIX} ✅ Worker started successfully`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to start worker:`, error);
    process.exit(1);
  }

  // Graceful shutdown
  const releaseAndExit = async (code: number) => {
    try {
      console.log(`${LOG_PREFIX} Shutting down worker...`);
      await shutdownEngagementWorker();
      console.log(`${LOG_PREFIX} ✅ Worker closed successfully`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error during shutdown:`, error);
      code = 1;
    } finally {
      if (releaseSingleInstance) {
        releaseSingleInstance();
        releaseSingleInstance = undefined;
      }
      process.exit(code);
    }
  };

  process.on('SIGTERM', async () => {
    console.log(`${LOG_PREFIX} Received SIGTERM signal, shutting down gracefully...`);
    await releaseAndExit(0);
  });

  process.on('SIGINT', async () => {
    console.log(`${LOG_PREFIX} Received SIGINT signal, shutting down gracefully...`);
    await releaseAndExit(0);
  });
}

// Start the worker
startWorker();
