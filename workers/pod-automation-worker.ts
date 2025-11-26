/**
 * Pod Automation Engine Worker
 *
 * This worker processes pod engagement automation jobs:
 * 1. Schedules like engagements (5-30 minute delays)
 * 2. Schedules comment engagements (1-6 hour delays)
 * 3. Executes engagement activities when scheduled times arrive
 *
 * Usage:
 *   npm run worker:pod-automation
 *   OR
 *   tsx workers/pod-automation-worker.ts
 *
 * Environment variables required:
 *   - REDIS_URL: Redis connection string
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 */

// Load environment variables before any other imports
import dotenv from 'dotenv';
dotenv.config(); // Loads .env from cwd, or uses system env vars on Render

import {
  closePodAutomationQueue,
  closePodAutomationWorker,
  getAutomationQueueStatus,
  getPodAutomationQueue,
  getPodAutomationWorker,
} from '../lib/queues/pod-automation-queue';
import { checkRedisHealth } from '../lib/redis';
import {
  enforceSingleInstance,
  type ReleaseSingleInstance,
} from '../lib/utils/single-instance';

const LOG_PREFIX = '[POD_AUTOMATION_WORKER]';

async function startWorker() {
  console.log(`${LOG_PREFIX} Starting pod automation engine worker...`);

  const singletonPort = Number.parseInt(process.env.POD_AUTOMATION_WORKER_PORT ?? '4731', 10);
  let releaseSingleInstance: ReleaseSingleInstance | undefined;

  try {
    releaseSingleInstance = await enforceSingleInstance({
      id: 'POD_AUTOMATION_WORKER',
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

  console.log(`${LOG_PREFIX} ✅ Redis connection healthy`);

  // Start the worker
  try {
    console.log(`${LOG_PREFIX} Worker started successfully`);
    console.log(`${LOG_PREFIX} Redis: ${process.env.REDIS_URL}`);
    console.log(`${LOG_PREFIX} Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`${LOG_PREFIX} Processing queue: pod-automation`);
    console.log(`${LOG_PREFIX} Listening for jobs...`);

    getPodAutomationWorker();
    getPodAutomationQueue();

    // Get initial queue status
    const status = await getAutomationQueueStatus();
    console.log(`${LOG_PREFIX} Queue status:`, status);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to start worker:`, error);
    process.exit(1);
  }

  // Graceful shutdown
  const releaseAndExit = async (code: number) => {
    try {
      await closePodAutomationWorker();
      await closePodAutomationQueue();
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
