import { createClient } from '@supabase/supabase-js'

async function check() {
  const supabase = createClient(
    'https://trdoainmejxanrownbuz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NDkxNSwiZXhwIjoyMDc4MDcwOTE1fQ.-_DnyCrCh_UDEuNwGddPL_LFKDYTocICU4L6Tx-G3Do'
  )

  // Check campaign status
  const { data: campaign } = await supabase
    .from('campaign')
    .select('id, name, status')
    .eq('id', '8c290238-5cc1-4df0-9c38-992c7da1e21e')
    .single()

  console.log('Campaign:', campaign)

  // Check if any posts were created
  const { data: posts } = await supabase
    .from('post')
    .select('id, content, status, published_at, linkedin_url')
    .eq('campaign_id', '8c290238-5cc1-4df0-9c38-992c7da1e21e')
    .order('created_at', { ascending: false })

  console.log('\nPosts for this campaign:', posts?.length || 0)
  if (posts && posts.length > 0) {
    console.log(JSON.stringify(posts, null, 2))
  }
}

check()
