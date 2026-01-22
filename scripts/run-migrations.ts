/**
 * Quick migration runner
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigrations() {
  console.log('🔧 Running migrations...\n');

  // Migration 1: Fix Roderic's agency_id
  console.log('Migration 1: Fixing agency_id...');
  const { data: userData, error: userError } = await supabase
    .from('user')
    .update({ agency_id: 'c3ae8595-ba0a-44c8-aa44-db0bdfc3f951' })
    .eq('email', 'rodericandrews@icloud.com')
    .select();

  if (userError) {
    console.error('❌ Migration 1 failed:', userError);
  } else {
    console.log('✅ Migration 1 complete:', userData);
  }

  // Migration 2: Update pod_activities table
  console.log('\nMigration 2: Updating pod_activities schema...');

  const sql = `
    ALTER TABLE pod_activities
    ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES clients(id),
    ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES pod_members(id),
    ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'repost',
    ADD COLUMN IF NOT EXISTS post_url TEXT,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

    ALTER TABLE pod_activities
    DROP CONSTRAINT IF EXISTS pod_activities_status_check;

    ALTER TABLE pod_activities
    ADD CONSTRAINT pod_activities_status_check
    CHECK (status IN ('pending', 'queued', 'processing', 'success', 'failed'));

    CREATE INDEX IF NOT EXISTS idx_pod_activities_status ON pod_activities(status);
    CREATE INDEX IF NOT EXISTS idx_pod_activities_pod_id ON pod_activities(pod_id);
  `;

  const { error: sqlError } = await supabase.rpc('exec_sql', { sql });

  if (sqlError) {
    console.log('⚠️  Migration 2 needs manual execution (RPC not available)');
    console.log('Run this SQL in Supabase dashboard:\n');
    console.log(sql);
  } else {
    console.log('✅ Migration 2 complete');
  }

  console.log('\n✅ Migrations complete!');
}

runMigrations().catch(console.error);
