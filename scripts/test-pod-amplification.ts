import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { queueRepost } from '../lib/queues/pod-queue';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testPodAmplification() {
  console.log('🧪 Testing Pod Amplification...');

  // 1. Get pod with members
  const { data: pods } = await supabase
    .from('pods')
    .select('id, name')
    .limit(1)
    .single();

  if (!pods) {
    console.log('❌ No pods found');
    return;
  }

  console.log('📦 Using pod:', pods.name, '(', pods.id, ')');

  // 2. Get members
  const { data: members } = await supabase
    .from('pod_members')
    .select('id, user_id, unipile_account_id, status')
    .eq('pod_id', pods.id)
    .eq('status', 'active');

  console.log('👥 Found', members?.length || 0, 'active members');
  
  if (!members || members.length === 0) {
    console.log('❌ No active members in pod');
    return;
  }

  // 3. Check for members with unipile_account_id
  const connectedMembers = members.filter(m => m.unipile_account_id);
  console.log('🔗 Members with LinkedIn connected:', connectedMembers.length);

  if (connectedMembers.length === 0) {
    console.log('');
    console.log('⚠️  No members have LinkedIn connected!');
    console.log('');
    console.log('To test with mock data, run:');
    console.log('npx tsx scripts/test-pod-with-mock.ts');
    return;
  }

  // 4. Test queuing a job
  const testMember = connectedMembers[0];
  const testPostUrl = 'https://www.linkedin.com/posts/test-post-12345';
  
  console.log('');
  console.log('📤 Queuing test repost job...');
  const jobId = await queueRepost({
    member_id: testMember.id,
    post_url: testPostUrl,
    unipile_account_id: testMember.unipile_account_id,
    pod_id: pods.id,
  }, 0); // No delay for testing

  console.log('✅ Job queued:', jobId);
  console.log('');
  console.log('🔍 Start workers to process: npm run workers');
}

testPodAmplification().catch(console.error);
