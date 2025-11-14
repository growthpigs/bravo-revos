// Test script to verify cartridge authentication and database access
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kvjcidxbyimoswntpjcp.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2amNpZHhieWltb3N3bnRwamNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEyMzc0MywiZXhwIjoyMDc2Njk5NzQzfQ.42jDkJvFkrSkHWitgnTTc_58Hq1H378LPdB0u8-aGfI';

async function testCartridgeTables() {
  console.log('\n========== CARTRIDGE TABLE VERIFICATION ==========\n');

  const supabase = createClient(supabaseUrl, serviceKey);

  const tables = [
    'brand_cartridges',
    'style_cartridges',
    'preferences_cartridges',
    'instruction_cartridges'
  ];

  for (const table of tables) {
    console.log(`\nChecking table: ${table}`);
    console.log('-'.repeat(40));

    try {
      // Test 1: Check if table exists and is accessible
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`❌ ERROR accessing ${table}:`, error.message);
        console.error('   Error code:', error.code);
        console.error('   Error details:', error.details);
      } else {
        console.log(`✅ Table ${table} exists and is accessible`);
        console.log(`   Total rows: ${count || 0}`);
      }

      // Test 2: Check table schema
      const { data: schemaData, error: schemaError } = await supabase
        .from(table)
        .select()
        .limit(0);

      if (!schemaError) {
        console.log(`✅ Schema is valid`);
      }

      // Test 3: Check if we can query with user_id filter
      const testUserId = '00000000-0000-0000-0000-000000000000';
      const { error: filterError } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', testUserId);

      if (!filterError) {
        console.log(`✅ Can query with user_id filter`);
      } else {
        console.error(`❌ Cannot query with user_id filter:`, filterError.message);
      }

    } catch (err) {
      console.error(`❌ CRITICAL ERROR with ${table}:`, err.message);
    }
  }

  console.log('\n========== RLS POLICY CHECK ==========\n');

  // Test with anon key to check RLS
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2amNpZHhieWltb3N3bnRwamNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMjM3NDMsImV4cCI6MjA3NjY5OTc0M30.42jDkJvFkrSkHWitgnTTc_58Hq1H378LPdB0u8-aGfI';
  const anonSupabase = createClient(supabaseUrl, anonKey);

  for (const table of tables) {
    const { data, error } = await anonSupabase
      .from(table)
      .select('*')
      .limit(1);

    if (error && error.message.includes('row-level')) {
      console.log(`✅ RLS is active on ${table}`);
    } else if (!error) {
      console.log(`⚠️  WARNING: ${table} might not have RLS properly configured`);
    } else {
      console.log(`❓ ${table} RLS status unclear:`, error.message);
    }
  }

  console.log('\n========== SUMMARY ==========\n');
  console.log('If you see any ❌ errors above, those need to be fixed.');
  console.log('Common issues:');
  console.log('1. Table name typos (e.g., preference_cartridges vs preferences_cartridges)');
  console.log('2. Missing TypeScript type definitions');
  console.log('3. RLS policies blocking access');
  console.log('4. Schema cache not updated');
}

testCartridgeTables().catch(console.error);