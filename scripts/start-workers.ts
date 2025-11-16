/**
 * Start Workers Script
 *
 * Starts all background workers for pod amplification.
 * Run with: npm run workers
 */

import podAmplificationWorker from '../lib/workers/pod-amplification-worker';
import repostWorker from '../lib/workers/repost-worker';

console.log('🚀 Starting Pod Amplification Workers...');
console.log('  - Pod Amplification Worker: Running');
console.log('  - Repost Worker (Playwright): Running');
console.log('\nPress Ctrl+C to stop workers\n');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⏹️  Shutting down workers...');
  await podAmplificationWorker.close();
  await repostWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down workers...');
  await podAmplificationWorker.close();
  await repostWorker.close();
  process.exit(0);
});

// Keep process alive
process.stdin.resume();
