/**
 * Unipile Diagnostic Endpoint
 * Tests Unipile API connectivity and validates post/comments API
 *
 * GET /api/test/unipile-diagnostic?account_id=XXX&post_id=YYY
 *
 * Tests:
 * 1. Account status check
 * 2. Post retrieval (to get correct social_id)
 * 3. Comments retrieval
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'skipped';
  data?: any;
  error?: string;
  url?: string;
  duration_ms?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id');
  const postId = searchParams.get('post_id');

  console.log('[UNIPILE_DIAGNOSTIC] Starting diagnostic...');
  console.log('[UNIPILE_DIAGNOSTIC] Params:', { accountId, postId });

  const results: DiagnosticResult[] = [];
  const dsn = process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211';
  const apiKey = process.env.UNIPILE_API_KEY;

  // Check environment
  results.push({
    step: 'environment',
    status: apiKey ? 'success' : 'error',
    data: {
      UNIPILE_API_KEY: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING',
      UNIPILE_DSN: dsn,
      UNIPILE_MOCK_MODE: process.env.UNIPILE_MOCK_MODE || 'not set',
    },
    error: apiKey ? undefined : 'UNIPILE_API_KEY is not set',
  });

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      message: 'UNIPILE_API_KEY not configured',
      results,
    }, { status: 500 });
  }

  // Test 1: Account Status
  if (accountId) {
    const startTime = Date.now();
    try {
      const url = `${dsn}/api/v1/accounts/${accountId}`;
      console.log('[UNIPILE_DIAGNOSTIC] Testing account status:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
        },
      });

      const data = response.ok ? await response.json() : await response.text();

      results.push({
        step: 'account_status',
        status: response.ok ? 'success' : 'error',
        url,
        duration_ms: Date.now() - startTime,
        data: response.ok ? {
          id: data.id,
          provider: data.provider,
          status: data.status,
          name: data.name,
        } : undefined,
        error: response.ok ? undefined : `${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
      });
    } catch (error: any) {
      results.push({
        step: 'account_status',
        status: 'error',
        duration_ms: Date.now() - startTime,
        error: error.message,
      });
    }
  } else {
    results.push({
      step: 'account_status',
      status: 'skipped',
      error: 'No account_id provided',
    });
  }

  // Test 2: Post Retrieval
  let socialId: string | null = null;
  if (accountId && postId) {
    const startTime = Date.now();
    try {
      const url = `${dsn}/api/v1/posts/${postId}?account_id=${accountId}`;
      console.log('[UNIPILE_DIAGNOSTIC] Testing post retrieval:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
        },
      });

      const data = response.ok ? await response.json() : await response.text();

      if (response.ok) {
        socialId = data.social_id || data.id;
      }

      results.push({
        step: 'post_retrieval',
        status: response.ok ? 'success' : 'error',
        url,
        duration_ms: Date.now() - startTime,
        data: response.ok ? {
          id: data.id,
          social_id: data.social_id,
          text_preview: data.text?.substring(0, 100),
          author: data.author?.name,
          created_at: data.created_at,
        } : undefined,
        error: response.ok ? undefined : `${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
      });
    } catch (error: any) {
      results.push({
        step: 'post_retrieval',
        status: 'error',
        duration_ms: Date.now() - startTime,
        error: error.message,
      });
    }
  } else {
    results.push({
      step: 'post_retrieval',
      status: 'skipped',
      error: 'No account_id or post_id provided',
    });
  }

  // Test 3: Comments Retrieval (using social_id from post, or fallback to raw postId)
  if (accountId && postId) {
    const startTime = Date.now();
    const commentsSocialId = socialId || (postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`);

    try {
      // Test WITHOUT URL encoding (this is the fix)
      const url = `${dsn}/api/v1/posts/${commentsSocialId}/comments?account_id=${accountId}`;
      console.log('[UNIPILE_DIAGNOSTIC] Testing comments (no encoding):', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
        },
      });

      const data = response.ok ? await response.json() : await response.text();

      results.push({
        step: 'comments_retrieval',
        status: response.ok ? 'success' : 'error',
        url,
        duration_ms: Date.now() - startTime,
        data: response.ok ? {
          social_id_used: commentsSocialId,
          from_post_api: !!socialId,
          total_comments: data.items?.length || 0,
          comments: (data.items || []).slice(0, 3).map((c: any) => ({
            id: c.id,
            text_preview: c.text?.substring(0, 50),
            author: c.author?.name,
          })),
        } : undefined,
        error: response.ok ? undefined : `${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
      });
    } catch (error: any) {
      results.push({
        step: 'comments_retrieval',
        status: 'error',
        duration_ms: Date.now() - startTime,
        error: error.message,
      });
    }

    // Also test WITH URL encoding to show the difference (for debugging)
    const startTime2 = Date.now();
    try {
      const encodedSocialId = encodeURIComponent(commentsSocialId);
      const url = `${dsn}/api/v1/posts/${encodedSocialId}/comments?account_id=${accountId}`;
      console.log('[UNIPILE_DIAGNOSTIC] Testing comments (WITH encoding):', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
        },
      });

      const data = response.ok ? await response.json() : await response.text();

      results.push({
        step: 'comments_retrieval_encoded',
        status: response.ok ? 'success' : 'error',
        url,
        duration_ms: Date.now() - startTime2,
        data: response.ok ? {
          social_id_used: encodedSocialId,
          note: 'This test uses URL encoding (the old broken way)',
          total_comments: data.items?.length || 0,
        } : undefined,
        error: response.ok ? undefined : `${response.status}: This is expected to fail - demonstrates the bug`,
      });
    } catch (error: any) {
      results.push({
        step: 'comments_retrieval_encoded',
        status: 'error',
        duration_ms: Date.now() - startTime2,
        error: `${error.message} (This is expected - URL encoding breaks the API)`,
      });
    }
  } else {
    results.push({
      step: 'comments_retrieval',
      status: 'skipped',
      error: 'No account_id or post_id provided',
    });
  }

  // Summary
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  console.log('[UNIPILE_DIAGNOSTIC] Complete:', { successCount, errorCount, skippedCount });

  return NextResponse.json({
    success: errorCount === 0 || (errorCount === 1 && results.find(r => r.step === 'comments_retrieval_encoded')?.status === 'error'),
    message: `Diagnostic complete: ${successCount} passed, ${errorCount} failed, ${skippedCount} skipped`,
    summary: {
      account_id: accountId,
      post_id: postId,
      social_id_from_api: socialId,
    },
    results,
    recommendation: results.find(r => r.step === 'comments_retrieval')?.status === 'success'
      ? '✅ Comments API is working! The fix has been applied.'
      : '❌ Comments API still failing. Check the error details above.',
  });
}
