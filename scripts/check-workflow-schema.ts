import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkWorkflowSchema() {
  console.log('=== CHECKING console_workflows TABLE ===\n');

  // Try to select with actual schema
  const { data, error } = await supabase
    .from('console_workflows')
    .select('id, name, workflow_type, triggers, steps')
    .limit(5);

  if (error) {
    console.log('❌ Error querying console_workflows:', error.message);
    console.log('\n🔍 Table might not exist or migration not applied');
  } else {
    console.log(`✅ console_workflows table exists with ${data?.length || 0} workflows`);
    if (data && data.length > 0) {
      console.log('\nWorkflows found:');
      data.forEach(wf => {
        console.log(`\n📋 ${wf.name} (${wf.workflow_type})`);
        console.log(`   Triggers:`, wf.triggers);
        console.log(`   Steps:`, wf.steps?.length || 0, 'steps');
      });
    }
  }
}

checkWorkflowSchema();
