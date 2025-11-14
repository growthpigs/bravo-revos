#!/usr/bin/env node

/**
 * Diagnostic script to check user data in database
 * Run with: node scripts/check-user-data.js
 */

const { createClient } = require('@supabase/supabase-js');

async function checkUserData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('\n=== Checking User Database ===\n');

  // Get all users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, client_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching users:', error);
    process.exit(1);
  }

  console.log(`Found ${users.length} users:\n`);

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Full Name: ${user.full_name || '❌ NOT SET'}`);
    console.log(`   Client ID: ${user.client_id}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });

  // Check for users missing full_name
  const usersWithoutName = users.filter(u => !u.full_name);
  if (usersWithoutName.length > 0) {
    console.log(`\n⚠️  ${usersWithoutName.length} users missing full_name:`);
    usersWithoutName.forEach(u => console.log(`   - ${u.email}`));
  }
}

checkUserData().catch(console.error);
