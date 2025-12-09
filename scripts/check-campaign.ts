import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

async function check() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, status, created_at')
    .ilike('name', '%Future of AI%')
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    console.log('Error:', error)
  } else {
    console.log('Campaigns found:', data?.length || 0)
    console.log(JSON.stringify(data, null, 2))
  }
}

check()
