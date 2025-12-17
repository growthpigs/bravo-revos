import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Check pods
  const { data: pods } = await supabase.from('pods').select('id, name').limit(5);
  console.log('Pods:', JSON.stringify(pods, null, 2));

  // Check pod_members with linkedin
  const { data: members } = await supabase
    .from('pod_members')
    .select('id, pod_id, linkedin_account_id')
    .not('linkedin_account_id', 'is', null)
    .limit(5);
  console.log('\nMembers with LinkedIn:', JSON.stringify(members, null, 2));

  // Check linkedin_accounts with unipile
  const { data: accounts } = await supabase
    .from('linkedin_accounts')
    .select('id, unipile_account_id, name')
    .not('unipile_account_id', 'is', null)
    .limit(5);
  console.log('\nLinkedIn accounts with Unipile:', JSON.stringify(accounts, null, 2));

  // Check all pod_members
  const { data: allMembers } = await supabase
    .from('pod_members')
    .select('id, pod_id, linkedin_account_id, user_id')
    .limit(10);
  console.log('\nAll pod members:', JSON.stringify(allMembers, null, 2));
}

check();
