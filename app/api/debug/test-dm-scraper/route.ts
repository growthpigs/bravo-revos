import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllPostComments } from '@/lib/unipile-client'

/**
 * GET /api/debug/test-dm-scraper
 * Diagnostic endpoint that mimics dm-scraper step by step
 * Returns detailed info about each step to identify crash points
 */
export async function GET(request: NextRequest) {
  const steps: { step: string; status: string; data?: unknown; error?: string }[] = []
  const startTime = Date.now()

  try {
    // Step 1: Create Supabase client
    steps.push({ step: '1_create_client', status: 'starting' })
    const supabase = await createClient()
    steps[steps.length - 1].status = 'success'

    // Step 2: Query scrape jobs
    steps.push({ step: '2_query_jobs', status: 'starting' })
    const { data: jobs, error: queryError } = await supabase
      .from('scrape_jobs')
      .select(`
        id,
        campaign_id,
        post_id,
        unipile_post_id,
        unipile_account_id,
        trigger_word,
        poll_interval_minutes,
        comments_scanned,
        trigger_words_found,
        dms_sent,
        emails_captured,
        error_count
      `)
      .in('status', ['scheduled', 'running'])
      .order('next_check', { ascending: true })
      .limit(1)

    if (queryError) {
      steps[steps.length - 1].status = 'error'
      steps[steps.length - 1].error = queryError.message
      return NextResponse.json({ steps, duration: Date.now() - startTime })
    }
    steps[steps.length - 1].status = 'success'
    steps[steps.length - 1].data = { jobCount: jobs?.length || 0 }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        steps,
        message: 'No jobs to process',
        duration: Date.now() - startTime
      })
    }

    const job = jobs[0]
    steps.push({ step: '3_job_details', status: 'success', data: {
      id: job.id,
      trigger_word: job.trigger_word,
      unipile_post_id: job.unipile_post_id,
      unipile_account_id: job.unipile_account_id
    }})

    // Step 4: Get comments from Unipile
    steps.push({ step: '4_get_comments', status: 'starting' })
    let comments: any[] = []
    try {
      comments = await getAllPostComments(job.unipile_account_id, job.unipile_post_id)
      steps[steps.length - 1].status = 'success'
      steps[steps.length - 1].data = {
        commentCount: comments.length,
        rawComments: comments.map(c => ({
          id: c.id,
          hasAuthor: !!c.author,
          authorId: c.author?.id,
          authorName: c.author?.name,
          text: c.text?.substring(0, 50)
        }))
      }
    } catch (e: any) {
      steps[steps.length - 1].status = 'error'
      steps[steps.length - 1].error = e.message
      return NextResponse.json({ steps, duration: Date.now() - startTime })
    }

    // Step 5: Query linkedin_accounts
    steps.push({ step: '5_get_owner', status: 'starting' })
    const { data: postOwner, error: ownerError } = await supabase
      .from('linkedin_accounts')
      .select('profile_url')
      .eq('unipile_account_id', job.unipile_account_id)
      .single()

    if (ownerError) {
      steps[steps.length - 1].status = 'error'
      steps[steps.length - 1].error = ownerError.message
    } else {
      steps[steps.length - 1].status = 'success'
      steps[steps.length - 1].data = { profile_url: postOwner?.profile_url }
    }

    const ownerProfileUrl = postOwner?.profile_url?.toLowerCase() || ''

    // Step 6: Filter comments
    steps.push({ step: '6_filter_comments', status: 'starting' })
    const triggerWord = job.trigger_word?.toLowerCase() || ''

    const filterResults = comments.map((comment, i) => {
      const hasAuthor = !!comment.author
      const hasAuthorId = !!comment.author?.id
      const hasTrigger = comment.text?.toLowerCase().includes(triggerWord)
      return {
        index: i,
        commentId: comment.id,
        hasAuthor,
        hasAuthorId,
        hasTrigger,
        wouldPass: hasAuthor && hasAuthorId && hasTrigger
      }
    })

    const triggeredComments = comments.filter((comment) => {
      if (!comment.author || !comment.author.id) {
        return false
      }
      const hasTriggerWord = comment.text?.toLowerCase().includes(triggerWord)
      return hasTriggerWord
    })

    steps[steps.length - 1].status = 'success'
    steps[steps.length - 1].data = {
      triggerWord,
      filterResults,
      triggeredCount: triggeredComments.length
    }

    // Step 7: Query dm_sequences
    steps.push({ step: '7_get_dm_sequence', status: 'starting' })
    const { data: dmSequence, error: seqError } = await supabase
      .from('dm_sequences')
      .select('*')
      .eq('campaign_id', job.campaign_id)
      .eq('status', 'active')
      .maybeSingle()

    if (seqError) {
      steps[steps.length - 1].status = 'error'
      steps[steps.length - 1].error = seqError.message
    } else {
      steps[steps.length - 1].status = 'success'
      steps[steps.length - 1].data = { hasSequence: !!dmSequence }
    }

    // Step 8: Would process comments (don't actually send DMs)
    steps.push({ step: '8_would_process', status: 'success', data: {
      triggeredCommentsToProcess: triggeredComments.length,
      note: 'Not actually processing - this is diagnostic only'
    }})

    // Step 9: Would update job metrics
    steps.push({ step: '9_would_update', status: 'success', data: {
      newCommentsScanned: job.comments_scanned + comments.length,
      newTriggerWordsFound: job.trigger_words_found + triggeredComments.length
    }})

    return NextResponse.json({
      success: true,
      steps,
      summary: {
        jobId: job.id,
        commentsFound: comments.length,
        commentsWithAuthor: comments.filter(c => c.author?.id).length,
        triggeredComments: triggeredComments.length,
        wouldComplete: true
      },
      duration: Date.now() - startTime
    })

  } catch (error: any) {
    steps.push({
      step: 'FATAL_ERROR',
      status: 'error',
      error: error.message,
      data: { stack: error.stack?.substring(0, 500) }
    })
    return NextResponse.json({
      success: false,
      steps,
      duration: Date.now() - startTime
    }, { status: 500 })
  }
}
