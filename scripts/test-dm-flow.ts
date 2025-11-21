/**
 * Test LinkedIn DM Flow End-to-End
 *
 * Run with: npx tsx scripts/test-dm-flow.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root (project uses .env not .env.local)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMPAIGN_ID = 'c2a0f108-6ae9-4da4-ba8c-1b03f1791a49';
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('🧪 LinkedIn DM Flow Test\n');

  // 1. Check campaign status
  console.log('1️⃣ Checking campaign setup...');
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select(`
      id, name, status, trigger_word, last_post_url, created_by,
      lead_magnets!lead_magnet_id (name),
      users!created_by (email, unipile_account_id)
    `)
    .eq('id', CAMPAIGN_ID)
    .single();

  if (campError || !campaign) {
    console.error('❌ Campaign not found:', campError);
    process.exit(1);
  }

  const user = Array.isArray(campaign.users) ? campaign.users[0] : campaign.users;
  const leadMagnet = Array.isArray(campaign.lead_magnets) ? campaign.lead_magnets[0] : campaign.lead_magnets;

  console.log(`   Campaign: ${campaign.name}`);
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Trigger Word: ${campaign.trigger_word}`);
  console.log(`   Lead Magnet: ${leadMagnet?.name || 'None'}`);
  console.log(`   Created By: ${user?.email || 'None'}`);
  console.log(`   Unipile Account: ${user?.unipile_account_id || 'None'}`);
  console.log(`   Last Post URL: ${campaign.last_post_url || 'None'}`);

  if (!user?.unipile_account_id) {
    console.error('\n❌ User has no unipile_account_id - cannot poll comments');
    process.exit(1);
  }

  if (!campaign.last_post_url) {
    console.log('\n⚠️  No last_post_url set. After posting to LinkedIn:');
    console.log(`   UPDATE campaigns SET last_post_url = 'YOUR_POST_URL' WHERE id = '${CAMPAIGN_ID}';`);
  }

  // 2. Test poll-comments endpoint
  console.log('\n2️⃣ Testing poll-comments endpoint...');
  try {
    const pollRes = await fetch(`${BASE_URL}/api/cron/poll-comments`);
    const pollData = await pollRes.json();

    if (pollRes.ok) {
      console.log('   ✅ poll-comments working');
      console.log(`   Campaigns processed: ${pollData.campaigns_processed}`);
      console.log(`   DMs queued: ${pollData.dms_queued}`);
      if (pollData.errors?.length > 0) {
        console.log(`   Errors: ${pollData.errors.join(', ')}`);
      }
    } else {
      console.log(`   ❌ poll-comments failed: ${pollData.error}`);
    }
  } catch (err) {
    console.log(`   ❌ Could not reach endpoint: ${err}`);
  }

  // 3. Test poll-replies endpoint
  console.log('\n3️⃣ Testing poll-replies endpoint...');
  try {
    const replyRes = await fetch(`${BASE_URL}/api/cron/poll-replies`);
    const replyData = await replyRes.json();

    if (replyRes.ok) {
      console.log('   ✅ poll-replies working');
      console.log(`   Leads checked: ${replyData.leads_checked}`);
      console.log(`   Emails captured: ${replyData.emails_captured}`);
      if (replyData.errors?.length > 0) {
        console.log(`   Errors: ${replyData.errors.join(', ')}`);
      }
    } else {
      console.log(`   ❌ poll-replies failed: ${replyData.error}`);
    }
  } catch (err) {
    console.log(`   ❌ Could not reach endpoint: ${err}`);
  }

  // 4. Check Redis connection (for BullMQ queues)
  console.log('\n4️⃣ Checking queue status...');
  const { data: activities } = await supabase
    .from('pod_activities')
    .select('action, status, created_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('created_at', { ascending: false })
    .limit(5);

  if (activities && activities.length > 0) {
    console.log('   Recent activities:');
    activities.forEach(a => {
      console.log(`   - ${a.action}: ${a.status} (${new Date(a.created_at).toLocaleString()})`);
    });
  } else {
    console.log('   No activities yet for this campaign');
  }

  // 5. Check processed comments
  console.log('\n5️⃣ Checking processed comments...');
  const { data: processed, count } = await supabase
    .from('processed_comments')
    .select('*', { count: 'exact' })
    .eq('campaign_id', CAMPAIGN_ID);

  console.log(`   Total processed comments: ${count || 0}`);
  if (processed && processed.length > 0) {
    const withTrigger = processed.filter(p => p.dm_queued);
    console.log(`   With trigger word (DM queued): ${withTrigger.length}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 TEST FLOW SUMMARY');
  console.log('='.repeat(50));

  console.log('\n✅ READY TO TEST:');
  console.log('1. Start workers: npx tsx scripts/start-workers.ts');
  console.log('2. Post to LinkedIn (use "write" command in chat)');
  console.log('3. Copy the LinkedIn post URL');
  console.log(`4. Update campaign: UPDATE campaigns SET last_post_url = 'URL' WHERE id = '${CAMPAIGN_ID}';`);
  console.log(`5. Comment on post with: ${campaign.trigger_word}`);
  console.log('6. Wait or trigger: curl http://localhost:3000/api/cron/poll-comments');
  console.log('7. Check pod_activities table for dm_sent');
  console.log('8. Reply to DM with email address');
  console.log('9. Trigger: curl http://localhost:3000/api/cron/poll-replies');
  console.log('10. Check for email_captured activity');

  console.log('\n');
}

main().catch(console.error);
