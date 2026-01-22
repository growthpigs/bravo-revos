import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedPodWorkflow() {
  console.log('🌱 Seeding pod amplification workflow...');

  const { data, error } = await supabase
    .from('console_workflow')
    .upsert({
      name: 'trigger-pod-amplification',
      display_name: 'Pod Amplification',
      workflow_type: 'orchestration',
      description: 'Coordinate pod members to amplify a LinkedIn post with AI-optimized timing',
      triggers: ['amplify', 'pod amplify', 'repost', 'boost post'],
      steps: [
        {
          name: 'analyze_post',
          prompt: 'Analyze this LinkedIn post and determine optimal amplification strategy. Consider: 1) Post topic and tone, 2) Best times for engagement, 3) Spacing between reposts (avoid spam detection), 4) Natural variation in timing. Return JSON with: timing_strategy (immediate/staggered/delayed), delay_minutes_min, delay_minutes_max, total_duration_hours.'
        },
        {
          name: 'queue_reposts',
          action: 'trigger_amplification',
          description: 'Queue reposts for pod members based on AI timing strategy'
        }
      ],
      tenant_scope: 'system',
      is_active: true,
      version: 1
    }, {
      onConflict: 'name'
    })
    .select();

  if (error) {
    console.error('❌ Error seeding workflow:', error);
    process.exit(1);
  }

  console.log('✅ Pod amplification workflow created:', data);
  process.exit(0);
}

seedPodWorkflow();
