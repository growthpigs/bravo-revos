import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkWriteWorkflow() {
  console.log('=== CHECKING "WRITE" WORKFLOW TRIGGER ===\n');

  // Get the write workflow
  const { data, error } = await supabase
    .from('console_workflows')
    .select('*')
    .eq('name', 'write-linkedin-post')
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('✅ Workflow found:', data.name);
  console.log('   Type:', data.workflow_type);
  console.log('   Active:', data.is_active);
  console.log('\n📋 Triggers:', JSON.stringify(data.triggers, null, 2));
  console.log('\n📝 Steps:', data.steps.length, 'steps');
  console.log('\nStep details:');
  data.steps.forEach((step: any, idx: number) => {
    console.log(`  ${idx + 1}. ${step.step} - ${step.description}`);
  });

  console.log('\n🔍 TESTING TRIGGER MATCHING:');
  const testMessages = [
    'write',
    'Write',
    'WRITE',
    'write about AI',
    'Write about marketing',
    'campaign',
  ];

  for (const msg of testMessages) {
    const triggers = data.triggers;
    let matched = false;

    // Check command triggers
    if (triggers.commands) {
      const messageToCheck = triggers.case_insensitive
        ? msg.toLowerCase().trim()
        : msg.trim();

      for (const command of triggers.commands) {
        const commandToCheck = triggers.case_insensitive
          ? command.toLowerCase()
          : command;

        if (messageToCheck === commandToCheck) {
          matched = true;
          break;
        }
      }
    }

    console.log(`  "${msg}" → ${matched ? '✅ MATCH' : '❌ no match'}`);
  }
}

checkWriteWorkflow();
