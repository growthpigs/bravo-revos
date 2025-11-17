import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
  console.log('=== 6. DATABASE SCHEMA CHECK ===\n');

  // Check console_prompts table
  console.log('Checking console_prompts table...');
  const { data: consolePrompts, error: cpError } = await supabase
    .from('console_prompts')
    .select('id, name')
    .limit(5);

  if (cpError) {
    console.log('❌ console_prompts table:', cpError.message);
  } else {
    console.log('✅ console_prompts entries:', consolePrompts?.length || 0);
    console.table(consolePrompts);
  }

  // Check console_workflows
  console.log('\nChecking console_workflows table...');
  const { data: workflows, error: wfError } = await supabase
    .from('console_workflows')
    .select('id, name, console_id')
    .limit(5);

  if (wfError) {
    console.log('❌ console_workflows table:', wfError.message);
  } else {
    console.log('✅ console_workflows entries:', workflows?.length || 0);
    console.table(workflows);
  }
}

checkTables();
