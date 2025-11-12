import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/unipile/auth
 *
 * Generate OAuth URL for a UniPile provider
 *
 * Request body:
 * {
 *   provider: 'WHATSAPP' | 'LINKEDIN' | 'INSTAGRAM' | 'TELEGRAM' | 'MESSENGER' | 'TWITTER' | 'EMAIL' | 'CALENDAR'
 * }
 *
 * Response (Success):
 * {
 *   oauth_url: 'https://api.unipile.com/v1/oauth/...'
 * }
 *
 * Response (Error - Client Not Configured):
 * {
 *   error: 'UNIPILE_NOT_CONFIGURED',
 *   message: 'Your organization has not configured UniPile integration.'
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

    // Get user's client
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: 'USER_PROFILE_ERROR', message: 'Could not load user profile' },
        { status: 500 }
      );
    }

    // Check client configuration
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('unipile_enabled, unipile_api_key, unipile_dsn')
      .eq('id', profile.client_id)
      .single();

    if (clientError) {
      return NextResponse.json(
        { error: 'CLIENT_ERROR', message: 'Could not load client configuration' },
        { status: 500 }
      );
    }

    // Verify UniPile is enabled and configured for this client
    if (!client?.unipile_enabled || !client?.unipile_api_key) {
      return NextResponse.json({
        error: 'UNIPILE_NOT_CONFIGURED',
        message: 'Your organization has not configured UniPile integration. Please contact your administrator.'
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { provider } = body;

    // Validate provider
    const validProviders = ['WHATSAPP', 'LINKEDIN', 'INSTAGRAM', 'TELEGRAM', 'MESSENGER', 'TWITTER', 'EMAIL', 'CALENDAR'];
    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'INVALID_PROVIDER', message: 'Invalid provider specified' },
        { status: 400 }
      );
    }

    // Generate state token (CSRF protection)
    const state = `${provider}_${user.id}`;

    // Build OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/unipile/callback`;

    const oauth_url = `https://api.unipile.com/v1/oauth/${provider.toLowerCase()}?` +
      `client_id=${encodeURIComponent(client.unipile_api_key)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${encodeURIComponent(state)}`;

    return NextResponse.json({ oauth_url });

  } catch (error) {
    console.error('[UniPile Auth] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
