/**
 * Test script to verify E-05 worker is processing jobs
 */
import { createClient } from '@supabase/supabase-js';
import { addEngagementJob, getEngagementQueueStats } from '../lib/queues/pod-engagement-worker';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function test() {
  console.log('[TEST] Creating test activity for worker verification...');

  // Find existing pod and member
  const { data: member } = await supabase
    .from('pod_members')
    .select('id, pod_id, unipile_account_id')
    .not('unipile_account_id', 'is', null)
    .limit(1)
    .single();

  if (!member) {
    console.error('[TEST] No pod member with Unipile account found');
    process.exit(1);
  }

  console.log('[TEST] Using member:', member.id.slice(0, 8) + '...');

  // Create test activity with UUID post_id
  const testPostId = randomUUID();
  const { data: activity, error } = await supabase
    .from('pod_activities')
    .insert({
      pod_id: member.pod_id,
      member_id: member.id,
      activity_type: 'like',
      post_id: testPostId,
      status: 'scheduled',
      scheduled_for: new Date().toISOString(),
      unipile_account_id: member.unipile_account_id,
    })
    .select()
    .single();

  if (error) {
    console.error('[TEST] Failed to create activity:', error.message);
    process.exit(1);
  }

  console.log('[TEST] ✅ Created activity:', activity.id);

  // Queue the job
  const job = await addEngagementJob({
    podId: member.pod_id,
    activityId: activity.id,
    engagementType: 'like',
    postId: testPostId,
    profileId: member.unipile_account_id,
    scheduledFor: activity.scheduled_for,
  });

  console.log('[TEST] ✅ Queued job:', job.id);

  // Check queue stats
  const stats = await getEngagementQueueStats();
  console.log('[TEST] Queue stats:', JSON.stringify(stats));

  console.log('[TEST]');
  console.log('[TEST] 🔍 Activity ID:', activity.id);
  console.log('[TEST] 🔍 Job ID:', job.id);
  console.log('[TEST]');
  console.log('[TEST] Waiting 25 seconds to check if worker processes it...');

  await new Promise(r => setTimeout(r, 25000));

  // Check if activity status changed
  const { data: updated } = await supabase
    .from('pod_activities')
    .select('status, executed_at, last_error')
    .eq('id', activity.id)
    .single();

  console.log('[TEST]');
  console.log('[TEST] === RESULT ===');
  console.log('[TEST] Status:', updated?.status);
  console.log('[TEST] Executed at:', updated?.executed_at || 'not yet');
  console.log('[TEST] Error:', updated?.last_error || 'none');

  if (updated?.status === 'scheduled') {
    console.log('[TEST] ⚠️ Still scheduled - worker may not be processing');
  } else if (updated?.status === 'failed') {
    console.log('[TEST] ✅ Worker processed it (failed as expected - fake post_id)');
  } else if (updated?.status === 'completed') {
    console.log('[TEST] ✅ Worker processed it successfully!');
  }

  // Cleanup
  await supabase.from('pod_activities').delete().eq('id', activity.id);
  console.log('[TEST] Cleaned up test activity');

  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
