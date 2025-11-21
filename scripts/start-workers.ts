// Load environment variables FIRST
require('dotenv').config();

console.log('🚀 Starting workers...');
console.log('📡 REDIS_URL:', process.env.REDIS_URL ? process.env.REDIS_URL.substring(0, 30) + '...' : 'NOT SET');

// Use dynamic imports to ensure env vars are loaded before modules
async function main() {
  const { RepostWorker } = await import('../lib/workers/repost-worker');
  const { dmWorker } = await import('../lib/workers/dm-worker');

  const repostWorker = new RepostWorker();
  // dmWorker initializes on import via getWorker() call

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
}

main().catch((error) => {
  console.error('❌ Failed to start workers:', error);
  process.exit(1);
});
