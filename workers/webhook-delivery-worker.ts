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

import { createWebhookWorker } from '../lib/queue/webhook-delivery-queue';

const LOG_PREFIX = '[WEBHOOK_WORKER]';

async function startWorker() {
  console.log(`${LOG_PREFIX} Starting webhook delivery worker...`);

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

  // Create and start worker
  const worker = createWebhookWorker();

  console.log(`${LOG_PREFIX} Worker started successfully`);
  console.log(`${LOG_PREFIX} Redis: ${process.env.REDIS_URL}`);
  console.log(`${LOG_PREFIX} Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`${LOG_PREFIX} Processing queue: webhook-delivery`);
  console.log(`${LOG_PREFIX} Concurrency: 5 workers`);
  console.log(`${LOG_PREFIX} Rate limit: 50 jobs/second`);
  console.log(`${LOG_PREFIX} Listening for jobs...`);

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n${LOG_PREFIX} Received ${signal}, shutting down gracefully...`);

    try {
      await worker.close();
      console.log(`${LOG_PREFIX} Worker closed successfully`);
      process.exit(0);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error during shutdown:`, error);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep process alive
  process.stdin.resume();
}

// Start the worker
startWorker().catch((error) => {
  console.error(`${LOG_PREFIX} Fatal error:`, error);
  process.exit(1);
});
