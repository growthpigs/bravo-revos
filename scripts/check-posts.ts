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

  // Check campaign status
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, status')
    .eq('id', '8c290238-5cc1-4df0-9c38-992c7da1e21e')
    .single()

  console.log('Campaign:', campaign)

  // Check if any posts were created
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, status, published_at, linkedin_url')
    .eq('campaign_id', '8c290238-5cc1-4df0-9c38-992c7da1e21e')
    .order('created_at', { ascending: false })

  console.log('\nPosts for this campaign:', posts?.length || 0)
  if (posts && posts.length > 0) {
    console.log(JSON.stringify(posts, null, 2))
  }
}

check()
