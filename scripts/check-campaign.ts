import { createClient } from '@supabase/supabase-js'

async function check() {
  const supabase = createClient(
    'https://trdoainmejxanrownbuz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NDkxNSwiZXhwIjoyMDc4MDcwOTE1fQ.-_DnyCrCh_UDEuNwGddPL_LFKDYTocICU4L6Tx-G3Do'
  )

  const { data, error } = await supabase
    .from('campaign')
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
