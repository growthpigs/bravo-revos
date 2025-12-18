import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const POD_ID = '799aad28-33d2-406b-9ed2-77c1cb18048c';
const UNIPILE_ACCOUNT_ID = 'pJj4DVePS3umF9iJwSmx7w'; // Roderic's Unipile account

async function setup() {
  console.log('=== Setting up Test Pod ===\n');

  // 1. Add Roderic to admin_users
  console.log('1. Adding Roderic to admin_users...');
  const { error: adminErr } = await supabase
    .from('admin_users')
    .upsert({
      user_id: '3890275f-23ba-4450-8a1a-bcd3468c64a6',
      email: 'rodericandrews@gmail.com',
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (adminErr) {
    console.log('Admin insert error:', adminErr.message);
  } else {
    console.log('✅ Roderic added to admin_users');
  }

  // 2. Add Chase as pod member
  console.log('\n2. Adding Chase as pod member...');
  const { error: chaseErr } = await supabase
    .from('pod_members')
    .upsert({
      pod_id: POD_ID,
      user_id: '2ff58721-39b6-4f5d-8c07-0f6e1d8ab948',
      name: 'Chase (Diiiploy)',
      unipile_account_id: UNIPILE_ACCOUNT_ID, // Using Roderic's for testing
      status: 'active',
      role: 'member',
      is_active: true,
      onboarding_status: 'completed',
      participation_score: 0
    }, { onConflict: 'pod_id,user_id' });

  if (chaseErr) {
    console.log('Chase insert error:', chaseErr.message);
  } else {
    console.log('✅ Chase added to pod');
  }

  // 3. Add Brent as pod member
  console.log('\n3. Adding Brent as pod member...');
  const { error: brentErr } = await supabase
    .from('pod_members')
    .upsert({
      pod_id: POD_ID,
      user_id: '89d9cabb-5c6e-49c7-bd1f-7399b4b513e8',
      name: 'Brent (Diiiploy)',
      unipile_account_id: UNIPILE_ACCOUNT_ID, // Using Roderic's for testing
      status: 'active',
      role: 'member',
      is_active: true,
      onboarding_status: 'completed',
      participation_score: 0
    }, { onConflict: 'pod_id,user_id' });

  if (brentErr) {
    console.log('Brent insert error:', brentErr.message);
  } else {
    console.log('✅ Brent added to pod');
  }

  // 4. Rename the pod
  console.log('\n4. Renaming pod to "Diiiploy Test Pod"...');
  const { error: renameErr } = await supabase
    .from('pods')
    .update({ name: 'Diiiploy Test Pod', description: 'Test pod for E-05 validation' })
    .eq('id', POD_ID);

  if (renameErr) {
    console.log('Rename error:', renameErr.message);
  } else {
    console.log('✅ Pod renamed');
  }

  // 5. Verify setup
  console.log('\n=== Verification ===');

  const { data: members } = await supabase
    .from('pod_members')
    .select('name, status, unipile_account_id')
    .eq('pod_id', POD_ID);

  console.log('\nPod members:', JSON.stringify(members, null, 2));

  const { data: admins } = await supabase
    .from('admin_users')
    .select('*');

  console.log('\nAdmin users:', JSON.stringify(admins, null, 2));

  console.log('\n✅ Setup complete! Now:');
  console.log('1. Refresh the browser');
  console.log('2. Try /admin/pods - should work now');
  console.log('3. Go to a Campaign → Click "Trigger Pod Amplification"');
  console.log('4. Check /dashboard/pod-activity for new activities');
}

setup().catch(console.error);
