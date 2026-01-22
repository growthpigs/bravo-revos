// Quick script to check if user exists in database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  const email = 'rodericandrews@gmail.com';

  console.log('Checking for user:', email);

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (error) {
    console.log('❌ Database error:');
    console.log('Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ User NOT found in database');
    console.log('Email searched:', email);
    return;
  }

  console.log(`✅ Found ${data.length} user(s) in database:`);
  console.log(JSON.stringify(data, null, 2));
}

checkUser().catch(console.error);
