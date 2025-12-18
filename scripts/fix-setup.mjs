import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const POD_ID = '799aad28-33d2-406b-9ed2-77c1cb18048c';
const UNIPILE_ACCOUNT_ID = 'pJj4DVePS3umF9iJwSmx7w';

async function setup() {
  console.log('=== Adding Pod Members ===\n');

  // 1. Add Chase as pod member
  console.log('1. Adding Chase as pod member...');

  const { data: existingChase } = await supabase
    .from('pod_members')
    .select('id')
    .eq('user_id', '2ff58721-39b6-4f5d-8c07-0f6e1d8ab948')
    .eq('pod_id', POD_ID)
    .maybeSingle();

  if (existingChase) {
    console.log('Chase already in pod, updating unipile_account_id...');
    const { error } = await supabase
      .from('pod_members')
      .update({ unipile_account_id: UNIPILE_ACCOUNT_ID, status: 'active' })
      .eq('id', existingChase.id);
    if (error) console.log('Update error:', error.message);
    else console.log('✅ Chase updated');
  } else {
    const { error: chaseErr } = await supabase
      .from('pod_members')
      .insert({
        pod_id: POD_ID,
        user_id: '2ff58721-39b6-4f5d-8c07-0f6e1d8ab948',
        name: 'Chase (Diiiploy)',
        unipile_account_id: UNIPILE_ACCOUNT_ID,
        status: 'active',
        role: 'member',
        is_active: true,
        onboarding_status: 'completed',
        participation_score: 0
      });
    if (chaseErr) console.log('Chase error:', chaseErr.message);
    else console.log('✅ Chase added');
  }

  // 2. Add Brent
  console.log('\n2. Adding Brent as pod member...');

  const { data: existingBrent } = await supabase
    .from('pod_members')
    .select('id')
    .eq('user_id', '89d9cabb-5c6e-49c7-bd1f-7399b4b513e8')
    .eq('pod_id', POD_ID)
    .maybeSingle();

  if (existingBrent) {
    console.log('Brent already in pod, updating unipile_account_id...');
    const { error } = await supabase
      .from('pod_members')
      .update({ unipile_account_id: UNIPILE_ACCOUNT_ID, status: 'active' })
      .eq('id', existingBrent.id);
    if (error) console.log('Update error:', error.message);
    else console.log('✅ Brent updated');
  } else {
    const { error: brentErr } = await supabase
      .from('pod_members')
      .insert({
        pod_id: POD_ID,
        user_id: '89d9cabb-5c6e-49c7-bd1f-7399b4b513e8',
        name: 'Brent (Diiiploy)',
        unipile_account_id: UNIPILE_ACCOUNT_ID,
        status: 'active',
        role: 'member',
        is_active: true,
        onboarding_status: 'completed',
        participation_score: 0
      });
    if (brentErr) console.log('Brent error:', brentErr.message);
    else console.log('✅ Brent added');
  }

  // 3. Verify
  console.log('\n=== Verification ===');
  const { data: members } = await supabase
    .from('pod_members')
    .select('name, status, unipile_account_id')
    .eq('pod_id', POD_ID);

  console.log('\nPod members:');
  members?.forEach(m => {
    console.log(`  - ${m.name} (${m.status}) - Unipile: ${m.unipile_account_id ? '✅' : '❌'}`);
  });
  console.log(`\nTotal: ${members?.length || 0} members`);

  console.log('\n---');
  console.log('⚠️  For admin access, run this SQL in Supabase dashboard:');
  console.log('https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new');
  console.log(`
-- Create admin_users table if needed
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Roderic as admin
INSERT INTO public.admin_users (user_id, email)
VALUES ('3890275f-23ba-4450-8a1a-bcd3468c64a6', 'rodericandrews@gmail.com')
ON CONFLICT (user_id) DO NOTHING;
  `);
}

setup().catch(console.error);
