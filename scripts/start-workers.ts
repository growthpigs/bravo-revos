import { RepostWorker } from '../lib/workers/repost-worker';
import { dmWorker } from '../lib/workers/dm-worker';
import * as dotenv from 'dotenv';

dotenv.config(); // Loads .env from cwd, or uses system env vars on Render

console.log('🚀 Starting workers...');

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
