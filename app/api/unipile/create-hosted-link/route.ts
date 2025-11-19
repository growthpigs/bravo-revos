import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/unipile/create-hosted-link
 *
 * Generate UniPile Hosted Auth link for connecting accounts
 * This is the CORRECT flow according to UniPile documentation
 *
 * Request body:
 * {
 *   provider: 'linkedin' | 'whatsapp' | 'instagram' | 'telegram' | 'messenger' | 'twitter' | 'email' | 'calendar' | 'all'
 * }
 *
 * Response (Success):
 * {
 *   authUrl: 'https://account.unipile.com/...'
 * }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Get UniPile credentials from environment variables (more reliable)
    const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
    const UNIPILE_DSN = process.env.UNIPILE_DSN || 'https://api3.unipile.com:13344';
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!UNIPILE_API_KEY) {
      return NextResponse.json({
        error: 'UNIPILE_NOT_CONFIGURED',
        message: 'UniPile API key not configured. Please contact your administrator.'
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { provider, podMemberId, onboarding } = body;

    // Validate provider
    const validProviders = ['linkedin', 'whatsapp', 'instagram', 'telegram', 'messenger', 'twitter', 'email', 'calendar', 'all'];
    if (!provider || !validProviders.includes(provider.toLowerCase())) {
      return NextResponse.json(
        { error: 'INVALID_PROVIDER', message: 'Invalid provider specified' },
        { status: 400 }
      );
    }

    // Prepare providers array
    const providers = provider === 'all' ? '*' : [provider.toUpperCase()];

    // Determine success URL and name based on context
    let successUrl = `${APP_URL}/dashboard/settings?tab=connections&success=true`;
    let name = user.id; // Default: user ID for regular users

    // If new user onboarding (magic link flow), use onboarding success URL
    if (onboarding) {
      successUrl = `${APP_URL}/onboard-new?step=linkedin-success`;
      name = `onboarding:${user.id}`; // Format: onboarding:{user_id} for identification
    }
    // If pod member onboarding, use different success URL and identifier
    else if (podMemberId) {
      successUrl = `${APP_URL}/onboarding/pending-activation`;
      name = `pod_member:${podMemberId}`; // Format: pod_member:{id} for identification
    }

    // Create hosted auth link via UniPile API
    const response = await fetch(`${UNIPILE_DSN}/api/v1/hosted/accounts/link`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        type: 'create',
        providers: providers,
        api_url: UNIPILE_DSN,
        expiresOn: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        notify_url: `${APP_URL}/api/unipile/notify`,
        success_url: successUrl,
        name: name // Store identifier so we know who this account belongs to
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UniPile Create Link] API error:', errorText);
      return NextResponse.json({
        error: 'UNIPILE_API_ERROR',
        message: 'Failed to create hosted auth link'
      }, { status: 500 });
    }

    const data = await response.json();

    // Return the hosted auth URL
    return NextResponse.json({
      authUrl: data.url // This is UniPile's hosted connection page
    });

  } catch (error) {
    console.error('[UniPile Create Link] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
