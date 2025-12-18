import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== Admin Users ===');
const { data: admins } = await supabase.from('admin_users').select('*');
console.log(JSON.stringify(admins, null, 2));

console.log('\n=== Users ===');
const { data: users } = await supabase.from('users').select('id, email, agency_id').limit(10);
console.log(JSON.stringify(users, null, 2));

console.log('\n=== LinkedIn Accounts with Unipile ===');
const { data: li } = await supabase.from('linkedin_accounts').select('id, unipile_account_id, user_id, profile_name').not('unipile_account_id', 'is', null);
console.log(JSON.stringify(li, null, 2));

console.log('\n=== Pods ===');
const { data: pods } = await supabase.from('pods').select('*');
console.log(JSON.stringify(pods, null, 2));

console.log('\n=== Pod Members ===');
const { data: members } = await supabase.from('pod_members').select('*');
console.log(JSON.stringify(members, null, 2));
