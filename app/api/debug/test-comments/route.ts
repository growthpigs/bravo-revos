import { NextRequest, NextResponse } from 'next/server'
import { getAllPostComments } from '@/lib/unipile-client'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/debug/test-comments
 * Test endpoint to diagnose Unipile comments API
 *
 * Query params:
 * - postId: The LinkedIn post ID to check
 * - accountId: The Unipile account ID (optional, will use first active account)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('[TEST_COMMENTS] ========================================')
  console.log('[TEST_COMMENTS] Starting test endpoint')

  try {
    const searchParams = request.nextUrl.searchParams
    let postId = searchParams.get('postId')
    let accountId = searchParams.get('accountId')

    // If no postId, get the most recent scrape job
    if (!postId) {
      const supabase = await createClient()
      const { data: recentJob } = await supabase
        .from('scrape_jobs')
        .select('unipile_post_id, unipile_account_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (recentJob) {
        postId = recentJob.unipile_post_id
        accountId = accountId || recentJob.unipile_account_id
        console.log('[TEST_COMMENTS] Using most recent scrape job:', { postId, accountId })
      }
    }

    if (!postId || !accountId) {
      return NextResponse.json({
        error: 'Missing postId or accountId',
        usage: '/api/debug/test-comments?postId=XXX&accountId=YYY'
      }, { status: 400 })
    }

    console.log('[TEST_COMMENTS] Testing with:', { postId, accountId })

    // Call getAllPostComments and capture the result
    const comments = await getAllPostComments(accountId, postId)

    const duration = Date.now() - startTime
    console.log('[TEST_COMMENTS] Test completed in', duration, 'ms')
    console.log('[TEST_COMMENTS] Comments found:', comments.length)

    return NextResponse.json({
      success: true,
      duration,
      postId,
      accountId,
      commentsCount: comments.length,
      comments: comments.map(c => ({
        id: c.id,
        author: c.author?.name,
        authorUrl: c.author?.profile_url,
        text: c.text?.substring(0, 100),
        createdAt: c.created_at
      }))
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('[TEST_COMMENTS] Error:', error.message || error)

    return NextResponse.json({
      success: false,
      duration,
      error: error.message || 'Unknown error',
      stack: error.stack?.substring(0, 500)
    }, { status: 500 })
  }
}
