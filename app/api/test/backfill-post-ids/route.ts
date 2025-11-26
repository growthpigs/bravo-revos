/**
 * Backfill Post IDs Endpoint
 * Fetches user's recent LinkedIn posts and updates scrape_jobs with correct social_id
 *
 * GET /api/test/backfill-post-ids?account_id=XXX
 *
 * This endpoint:
 * 1. Fetches user's recent posts from Unipile
 * 2. Matches posts by content to find the correct LinkedIn social_id
 * 3. Updates scrape_jobs with the correct unipile_post_id
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id');

  if (!accountId) {
    return NextResponse.json({ error: 'account_id required' }, { status: 400 });
  }

  const dsn = process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211';
  const apiKey = process.env.UNIPILE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'UNIPILE_API_KEY not configured' }, { status: 500 });
  }

  console.log('[BACKFILL] Starting backfill for account:', accountId);

  try {
    const supabase = await createClient();

    // Step 1: Get user's profile to find their user ID
    const profileUrl = `${dsn}/api/v1/users/me?account_id=${accountId}`;
    const profileResponse = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      return NextResponse.json({
        error: 'Failed to fetch user profile',
        status: profileResponse.status
      }, { status: 500 });
    }

    const profileData = await profileResponse.json();
    const userId = profileData.id || profileData.provider_id;

    if (!userId) {
      return NextResponse.json({ error: 'Could not determine user ID' }, { status: 500 });
    }

    console.log('[BACKFILL] User ID:', userId);

    // Step 2: Fetch user's recent posts (limit 20 to find today's posts)
    const postsUrl = `${dsn}/api/v1/users/${userId}/posts?account_id=${accountId}&limit=20`;
    const postsResponse = await fetch(postsUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!postsResponse.ok) {
      return NextResponse.json({
        error: 'Failed to fetch user posts',
        status: postsResponse.status
      }, { status: 500 });
    }

    const postsData = await postsResponse.json();
    const linkedinPosts = postsData.items || [];

    console.log('[BACKFILL] Found', linkedinPosts.length, 'LinkedIn posts');

    // Step 3: Get scrape_jobs that need backfilling (post_url is null)
    const { data: scrapeJobs, error: jobsError } = await supabase
      .from('scrape_jobs')
      .select(`
        id,
        unipile_post_id,
        post_id,
        posts (
          id,
          content,
          post_url
        )
      `)
      .eq('unipile_account_id', accountId)
      .in('status', ['scheduled', 'running']);

    if (jobsError) {
      return NextResponse.json({ error: 'Failed to fetch scrape jobs', details: jobsError }, { status: 500 });
    }

    console.log('[BACKFILL] Found', scrapeJobs?.length || 0, 'scrape jobs to check');

    // Step 4: Match posts by content and update
    const updates: Array<{
      job_id: string;
      old_post_id: string;
      new_social_id: string | null;
      matched_by: string;
      post_url: string | null;
    }> = [];

    for (const job of scrapeJobs || []) {
      const postRecord = job.posts as { id: string; content: string; post_url: string | null } | null;

      if (!postRecord?.content) {
        console.log('[BACKFILL] Skipping job', job.id, '- no post content');
        continue;
      }

      // Try to find matching LinkedIn post by content
      // We'll match on the first 100 chars of content
      const contentToMatch = postRecord.content.substring(0, 100).toLowerCase().trim();

      const matchedPost = linkedinPosts.find((lp: { text?: string }) => {
        const lpContent = (lp.text || '').substring(0, 100).toLowerCase().trim();
        return lpContent === contentToMatch;
      });

      if (matchedPost) {
        // Extract numeric ID from social_id for the unipile_post_id
        const socialId = matchedPost.social_id;
        const shareUrl = matchedPost.share_url || matchedPost.url;

        // Extract numeric ID (e.g., from "urn:li:activity:7393998878594998272" get "7393998878594998272")
        const numericIdMatch = socialId?.match(/urn:li:(?:activity|ugcPost):(\d+)/);
        const numericId = numericIdMatch ? numericIdMatch[1] : matchedPost.id;

        console.log('[BACKFILL] Matched job', job.id, ':', job.unipile_post_id, '->', numericId);

        // Update scrape_job
        await supabase
          .from('scrape_jobs')
          .update({ unipile_post_id: numericId })
          .eq('id', job.id);

        // Update post record with post_url if available
        if (shareUrl && postRecord.id) {
          await supabase
            .from('posts')
            .update({ post_url: shareUrl })
            .eq('id', postRecord.id);
        }

        updates.push({
          job_id: job.id,
          old_post_id: job.unipile_post_id,
          new_social_id: numericId,
          matched_by: 'content',
          post_url: shareUrl,
        });
      } else {
        console.log('[BACKFILL] No match found for job', job.id);
        updates.push({
          job_id: job.id,
          old_post_id: job.unipile_post_id,
          new_social_id: null,
          matched_by: 'no_match',
          post_url: null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${updates.filter(u => u.new_social_id).length} updated, ${updates.filter(u => !u.new_social_id).length} not matched`,
      linkedin_posts: linkedinPosts.map((p: { id: string; social_id: string; share_url?: string; text?: string; created_at?: string }) => ({
        id: p.id,
        social_id: p.social_id,
        share_url: p.share_url,
        text_preview: p.text?.substring(0, 80),
        created_at: p.created_at,
      })),
      updates,
    });
  } catch (error) {
    console.error('[BACKFILL] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
