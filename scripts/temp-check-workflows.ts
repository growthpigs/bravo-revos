import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from('console_workflows')
    .select('name, triggers')
    .order('name');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Console Workflows:');
    data.forEach((w: any) => {
      console.log('  -', w.name, '→ triggers:', JSON.stringify(w.triggers));
    });
  }
}

main();
