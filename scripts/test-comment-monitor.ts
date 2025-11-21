/**
 * Test script for comment monitor
 * Run with: npx tsx scripts/test-comment-monitor.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Force mock mode for testing
process.env.UNIPILE_MOCK_MODE = 'true';

import { pollAllCampaigns } from '../lib/workers/comment-monitor';

async function main() {
  console.log('=== Comment Monitor Test ===\n');
  console.log('Environment:');
  console.log('  UNIPILE_MOCK_MODE:', process.env.UNIPILE_MOCK_MODE || 'not set (defaults to mock)');
  console.log('  REDIS_URL:', process.env.REDIS_URL ? 'set' : 'not set');
  console.log('');

  try {
    console.log('Running pollAllCampaigns()...\n');
    const result = await pollAllCampaigns();

    console.log('\n=== Results ===');
    console.log('Campaigns processed:', result.campaigns_processed);
    console.log('DMs queued:', result.dms_queued);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    } else {
      console.log('Errors: none');
    }

    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }

  // Exit after test
  process.exit(0);
}

main();
