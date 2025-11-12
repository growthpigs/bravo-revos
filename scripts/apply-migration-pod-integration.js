#!/usr/bin/env node

/**
 * Apply Pod Campaign Integration Migration
 * Runs the SQL migration file against Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Applying Pod Campaign Integration migration...\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251113_pod_campaign_integration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute SQL via RPC or direct query
    // Note: Supabase JS client doesn't support direct SQL execution
    // We'll use the REST API directly

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // If exec_sql doesn't exist, we need to execute statements individually
      console.log('⚠️  exec_sql RPC not available, trying alternative method...\n');

      // Split SQL into individual statements (basic split on semicolons)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📝 Found ${statements.length} SQL statements\n`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.includes('CREATE TABLE') || statement.includes('ALTER TABLE') ||
            statement.includes('CREATE INDEX') || statement.includes('CREATE POLICY') ||
            statement.includes('COMMENT ON') || statement.includes('GRANT')) {

          console.log(`Executing statement ${i + 1}/${statements.length}...`);

          // Use supabase.rpc or direct query
          const { error } = await supabase.rpc('exec', { sql: statement });

          if (error) {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        }
      }
    } else {
      console.log('✅ Migration applied successfully via exec_sql');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 Migration application complete!\n');

  // Verify changes
  console.log('🔍 Verifying migration...');

  // Check if pod_id column was added to campaigns
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, name, pod_id')
    .limit(1);

  if (campaignsError) {
    console.error('❌ Verification failed:', campaignsError.message);
  } else {
    console.log('✅ campaigns.pod_id column exists');
  }

  // Check if webhook_logs table exists
  const { data: webhookLogs, error: webhookError } = await supabase
    .from('webhook_logs')
    .select('count')
    .limit(1);

  if (webhookError) {
    console.error('⚠️  webhook_logs table may not exist:', webhookError.message);
  } else {
    console.log('✅ webhook_logs table exists');
  }

  // Check if triggered_comments table exists
  const { data: triggeredComments, error: commentsError } = await supabase
    .from('triggered_comments')
    .select('count')
    .limit(1);

  if (commentsError) {
    console.error('⚠️  triggered_comments table may not exist:', commentsError.message);
  } else {
    console.log('✅ triggered_comments table exists');
  }

  console.log('\n✅ Migration verification complete!');
}

applyMigration().catch(console.error);
