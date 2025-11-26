/**
 * Unipile Post Test Endpoint
 * Tests creating a post and inspects the full response from Unipile
 *
 * GET /api/test/unipile-post-test?account_id=XXX
 *
 * This is a diagnostic endpoint to understand what Unipile returns
 * when creating a LinkedIn post, specifically to find the correct
 * post ID format for comment retrieval.
 */

import { NextRequest, NextResponse } from 'next/server';

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

  // Create a test post
  const testText = `[TEST POST - PLEASE IGNORE] Testing LinkedIn API integration at ${new Date().toISOString()}`;

  console.log('[POST_TEST] Creating test post...');

  try {
    const response = await fetch(
      `${dsn}/api/v1/posts`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          account_id: accountId,
          text: testText,
          provider: 'LINKEDIN',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `Failed to create post: ${response.status}`,
        errorDetails: errorText,
      }, { status: response.status });
    }

    const data = await response.json();

    console.log('[POST_TEST] Full response from Unipile:', JSON.stringify(data, null, 2));

    // Return ALL fields from the response for inspection
    return NextResponse.json({
      success: true,
      message: 'Post created - inspect all fields below',
      fullResponse: data,
      keyFields: {
        id: data.id,
        post_id: data.post_id,
        social_id: data.social_id,
        provider_id: data.provider_id,
        share_url: data.share_url,
        url: data.url,
        permalink: data.permalink,
      },
      recommendation: 'The field to use for comment retrieval should be social_id or the ID extracted from share_url',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
