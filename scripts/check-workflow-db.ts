import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkWorkflow() {
  console.log('=== CHECKING WRITE WORKFLOW IN DATABASE ===\n');

  const { data, error } = await supabase
    .from('console_workflow')
    .select('id, name, workflow_type, triggers, steps, output_config, prompts, updated_at')
    .eq('name', 'write-linkedin-post')
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('✅ Workflow found:', data.name);
  console.log('📅 Updated:', data.updated_at);
  console.log('\n🎯 Triggers:');
  console.log(JSON.stringify(data.triggers, null, 2));
  console.log('\n📋 Steps:', data.steps.length);
  data.steps.forEach((step: any, idx: number) => {
    console.log(`  ${idx + 1}. ${step.step} - ${step.description}`);
  });
  console.log('\n📤 Output Config:');
  console.log(JSON.stringify(data.output_config, null, 2));
  console.log('\n📝 Prompts (keys):');
  console.log(Object.keys(data.prompts));
}

checkWorkflow();
