// Load environment variables FIRST - before any imports that use them
// Must use require() to avoid ES module import hoisting
require('dotenv').config();

import { RepostWorker } from '../lib/workers/repost-worker';
import { dmWorker } from '../lib/workers/dm-worker';

console.log('🚀 Starting workers...');
console.log('📡 Redis URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');

const repostWorker = new RepostWorker();
// dmWorker auto-starts on import

console.log('✅ RepostWorker started');
console.log('✅ DM Worker started (listening on dm-delivery queue)');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down workers...');
  repostWorker.stop();
  await dmWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down workers...');
  repostWorker.stop();
  await dmWorker.close();
  process.exit(0);
});

console.log('✅ All workers started. Press Ctrl+C to stop.');
