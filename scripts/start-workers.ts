import { RepostWorker } from '../lib/workers/repost-worker';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('🚀 Starting pod amplification workers...');

const repostWorker = new RepostWorker();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down workers...');
  repostWorker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down workers...');
  repostWorker.stop();
  process.exit(0);
});

console.log('✅ Workers started. Press Ctrl+C to stop.');
