import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUnipileAccounts() {
  console.log('\n=== CHECKING UNIPILE ACCOUNT IDs ===\n');

  const { data, error } = await supabase
    .from('pod_members')
    .select('id, name, unipile_account_id, is_active')
    .eq('is_active', true);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total pod members:', data?.length || 0);
  console.log('\nUnipile Account IDs:\n');

  const fakeAccounts: any[] = [];
  const realAccounts: any[] = [];

  data?.forEach(m => {
    if (m.unipile_account_id?.includes('TEST') ||
        m.unipile_account_id?.includes('YOUR_REAL') ||
        m.unipile_account_id?.includes('PLACEHOLDER')) {
      fakeAccounts.push(m);
    } else {
      realAccounts.push(m);
    }
  });

  if (realAccounts.length > 0) {
    console.log('✅ REAL Unipile Accounts:');
    realAccounts.forEach(m => {
      console.log(`  - ${m.name}: ${m.unipile_account_id}`);
    });
  } else {
    console.log('❌ NO REAL Unipile Accounts found');
  }

  if (fakeAccounts.length > 0) {
    console.log('\n⚠️  FAKE/TEST Unipile Accounts:');
    fakeAccounts.forEach(m => {
      console.log(`  - ${m.name}: ${m.unipile_account_id}`);
    });
  }

  console.log('\n=== VERDICT ===');
  if (realAccounts.length > 0) {
    console.log('✅ You have REAL Unipile accounts configured');
    console.log('   Workers will attempt ACTUAL LinkedIn posting');
  } else {
    console.log('❌ All accounts are FAKE/TEST placeholders');
    console.log('   Workers will FAIL when trying to fetch LinkedIn sessions');
    console.log('   This is currently just testing the QUEUE INFRASTRUCTURE');
  }
}

checkUnipileAccounts();
