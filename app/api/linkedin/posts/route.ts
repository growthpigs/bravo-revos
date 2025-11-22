/**
 * POST /api/linkedin/posts
 * Create a LinkedIn post via Unipile
 *
 * This endpoint handles posting content to LinkedIn through the user's
 * connected Unipile account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLinkedInPost } from '@/lib/unipile-client';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { text, accountId } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }

    console.log('[LINKEDIN_POST_API] Creating post for user:', user.email);

    // If accountId provided, use it; otherwise get user's first active LinkedIn account
    let unipileAccountId = accountId;

    if (!unipileAccountId) {
      // Fetch user's LinkedIn accounts
      const { data: linkedinAccounts, error: accountsError } = await supabase
        .from('linkedin_accounts')
        .select('unipile_account_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (accountsError || !linkedinAccounts || linkedinAccounts.length === 0) {
        return NextResponse.json(
          { error: 'No active LinkedIn account found. Please connect a LinkedIn account first.' },
          { status: 400 }
        );
      }

      unipileAccountId = linkedinAccounts[0].unipile_account_id;
    }

    console.log('[LINKEDIN_POST_API] Using Unipile account:', unipileAccountId);

    // Create the post via Unipile
    const postResult = await createLinkedInPost(unipileAccountId, text);

    // Note: profile_url column doesn't exist yet - skip for now
    const profileUrl = null;

    console.log('[LINKEDIN_POST_API] Post created successfully:', {
      postId: postResult.id,
      url: postResult.url,
      profileUrl,
    });

    return NextResponse.json({
      success: true,
      post: postResult,
      profileUrl,
      message: 'LinkedIn post created successfully',
    });
  } catch (error) {
    console.error('[LINKEDIN_POST_API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create LinkedIn post',
      },
      { status: 500 }
    );
  }
}
