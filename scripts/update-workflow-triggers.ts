/**
 * Update Write Workflow Triggers
 *
 * Adds multiple trigger keywords for the write workflow:
 * - write
 * - post
 * - create
 * - content
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateWorkflowTriggers() {
  console.log('🔍 Checking current workflow triggers...');

  // Get current workflow
  const { data: workflow, error: fetchError } = await supabase
    .from('console_workflow')
    .select('*')
    .eq('name', 'write-linkedin-post')
    .single();

  if (fetchError) {
    console.error('❌ Error fetching workflow:', fetchError);
    return;
  }

  console.log('📋 Current workflow:', {
    name: workflow.name,
    triggers: workflow.triggers,
  });

  // Update triggers to include multiple keywords
  const updatedTriggers = {
    commands: ['write', 'post', 'create', 'content'],
    case_insensitive: true,
  };

  console.log('✏️  Updating triggers to:', updatedTriggers);

  const { data: updated, error: updateError } = await supabase
    .from('console_workflow')
    .update({ triggers: updatedTriggers })
    .eq('name', 'write-linkedin-post')
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating workflow:', updateError);
    return;
  }

  console.log('✅ Workflow triggers updated successfully!');
  console.log('📋 New triggers:', updated.triggers);
  console.log('\n✨ Now you can use any of these keywords to trigger the write workflow:');
  console.log('   - write');
  console.log('   - post');
  console.log('   - create');
  console.log('   - content');
}

updateWorkflowTriggers().catch(console.error);
