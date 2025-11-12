import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/unipile/callback
 *
 * Handle OAuth callback from UniPile
 *
 * Query params:
 * - code: OAuth authorization code
 * - state: State token (format: "PROVIDER_user_id")
 *
 * Process:
 * 1. Validate state token
 * 2. Exchange code for UniPile account credentials
 * 3. Fetch account profile data
 * 4. Store in connected_accounts table
 * 5. Return HTML that closes popup and notifies parent
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return new Response(
        getErrorHTML('Missing OAuth parameters. Please try again.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Parse state: "PROVIDER_user_id"
    const stateParts = state.split('_');
    if (stateParts.length !== 2) {
      return new Response(
        getErrorHTML('Invalid state parameter. Please try again.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const [provider, user_id] = stateParts;

    // Validate provider
    const validProviders = ['WHATSAPP', 'LINKEDIN', 'INSTAGRAM', 'TELEGRAM', 'MESSENGER', 'TWITTER', 'EMAIL', 'CALENDAR'];
    if (!validProviders.includes(provider)) {
      return new Response(
        getErrorHTML('Invalid provider. Please try again.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS for OAuth callback)
    const supabase = await createClient({ isServiceRole: true });

    // Get user's client configuration
    const { data: profile } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user_id)
      .single();

    if (!profile?.client_id) {
      return new Response(
        getErrorHTML('User profile not found. Please try again.'),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const { data: client } = await supabase
      .from('clients')
      .select('unipile_api_key, unipile_dsn')
      .eq('id', profile.client_id)
      .single();

    if (!client?.unipile_api_key || !client?.unipile_dsn) {
      return new Response(
        getErrorHTML('UniPile not configured for your organization.'),
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Exchange authorization code for UniPile account credentials
    // NOTE: This is a mock implementation - actual UniPile API may differ
    const tokenResponse = await fetch(`${client.unipile_dsn}/api/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': client.unipile_api_key
      },
      body: JSON.stringify({
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/unipile/callback`
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[UniPile Callback] Token exchange failed:', error);
      return new Response(
        getErrorHTML('Failed to complete OAuth flow. Please try again.'),
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const { account_id, access_token } = tokenData;

    if (!account_id) {
      return new Response(
        getErrorHTML('Invalid response from UniPile. Please try again.'),
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Fetch account profile data from UniPile
    const profileResponse = await fetch(`${client.unipile_dsn}/api/v1/accounts/${account_id}/profile`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-API-KEY': client.unipile_api_key
      }
    });

    let profile_data = {};
    let account_name = 'Unknown Account';
    let capabilities: string[] = [];

    if (profileResponse.ok) {
      profile_data = await profileResponse.json();
      // Extract account name based on provider
      account_name = extractAccountName(provider, profile_data);
      capabilities = extractCapabilities(provider, profile_data);
    }

    // Store in connected_accounts table
    const { error: insertError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id,
        provider,
        account_id,
        account_name,
        profile_data,
        capabilities,
        status: 'active',
        last_sync_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,provider,account_id'
      });

    if (insertError) {
      console.error('[UniPile Callback] Insert error:', insertError);
      return new Response(
        getErrorHTML('Failed to save connection. Please try again.'),
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Return success HTML that closes popup
    return new Response(getSuccessHTML(provider), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('[UniPile Callback] Error:', error);
    return new Response(
      getErrorHTML('An unexpected error occurred. Please try again.'),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/**
 * Extract human-readable account name from profile data
 */
function extractAccountName(provider: string, profile: any): string {
  switch (provider) {
    case 'WHATSAPP':
    case 'TELEGRAM':
      return profile.phone || profile.name || 'Unknown';
    case 'EMAIL':
      return profile.email || 'Unknown';
    case 'LINKEDIN':
    case 'INSTAGRAM':
    case 'TWITTER':
      return profile.name || profile.username || profile.handle || 'Unknown';
    case 'MESSENGER':
      return profile.name || 'Unknown';
    case 'CALENDAR':
      return profile.email || profile.name || 'Unknown';
    default:
      return 'Unknown Account';
  }
}

/**
 * Extract capabilities from profile data
 */
function extractCapabilities(provider: string, profile: any): string[] {
  // Return provider-specific capabilities
  const defaultCapabilities: Record<string, string[]> = {
    'WHATSAPP': ['MESSAGING', 'GROUPS', 'MEDIA'],
    'TELEGRAM': ['MESSAGING', 'GROUPS', 'CHANNELS', 'BOTS'],
    'MESSENGER': ['MESSAGING', 'GROUPS', 'CALLS'],
    'LINKEDIN': ['MESSAGING', 'POSTING', 'ENGAGEMENT'],
    'INSTAGRAM': ['MESSAGING', 'POSTING', 'STORIES'],
    'TWITTER': ['MESSAGING', 'POSTING', 'REPLIES'],
    'EMAIL': ['SENDING', 'RECEIVING', 'TEMPLATES'],
    'CALENDAR': ['EVENTS', 'SCHEDULING', 'REMINDERS']
  };

  return profile.capabilities || defaultCapabilities[provider] || ['MESSAGING'];
}

/**
 * Success HTML page - closes popup and notifies parent
 */
function getSuccessHTML(provider: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Connection Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .checkmark {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: white;
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
    }
    h1 { margin: 0 0 0.5rem; font-size: 28px; }
    p { margin: 0; opacity: 0.9; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>Connection Successful!</h1>
    <p>Your ${provider.toLowerCase()} account has been connected.</p>
    <p style="margin-top: 1rem; font-size: 14px;">This window will close automatically...</p>
  </div>
  <script>
    // Notify parent window
    if (window.opener) {
      window.opener.postMessage({
        type: 'UNIPILE_CONNECTED',
        provider: '${provider}'
      }, '*');
    }
    // Close popup after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
  </script>
</body>
</html>
  `.trim();
}

/**
 * Error HTML page - shows error and closes popup
 */
function getErrorHTML(message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Connection Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: white;
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
    }
    h1 { margin: 0 0 0.5rem; font-size: 28px; }
    p { margin: 0; opacity: 0.9; font-size: 16px; line-height: 1.5; }
    button {
      margin-top: 1.5rem;
      padding: 0.75rem 2rem;
      background: white;
      color: #f5576c;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✗</div>
    <h1>Connection Failed</h1>
    <p>${message}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    // Notify parent window of failure
    if (window.opener) {
      window.opener.postMessage({
        type: 'UNIPILE_ERROR',
        error: '${message}'
      }, '*');
    }
  </script>
</body>
</html>
  `.trim();
}
