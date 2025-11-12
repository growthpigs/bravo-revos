import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/unipile/status
 *
 * Check UniPile connection status directly from API
 * Uses environment variables instead of database
 */
export async function GET() {
  try {
    const UNIPILE_DSN = process.env.UNIPILE_DSN || 'https://api3.unipile.com:13344';
    const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

    if (!UNIPILE_API_KEY) {
      return NextResponse.json({
        connected: false,
        error: 'UNIPILE_NOT_CONFIGURED',
        message: 'UniPile API key not set in environment variables'
      });
    }

    // Call UniPile API to get accounts
    const response = await fetch(`${UNIPILE_DSN}/api/v1/accounts`, {
      method: 'GET',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[UniPile Status] API error:', error);
      return NextResponse.json({
        connected: false,
        error: 'UNIPILE_API_ERROR',
        message: 'Failed to connect to UniPile API'
      });
    }

    const data = await response.json();

    // Extract accounts
    const accounts = data.items || [];

    // Find LinkedIn account
    const linkedInAccount = accounts.find((acc: any) => acc.type === 'LINKEDIN');

    if (linkedInAccount) {
      return NextResponse.json({
        connected: true,
        provider: 'LINKEDIN',
        account_id: linkedInAccount.id,
        account_name: linkedInAccount.name || 'LinkedIn Account',
        username: linkedInAccount.connection_params?.im?.username || linkedInAccount.name,
        public_identifier: linkedInAccount.connection_params?.im?.publicIdentifier,
        status: linkedInAccount.sources?.[0]?.status || 'UNKNOWN',
        created_at: linkedInAccount.created_at,
        organizations: linkedInAccount.connection_params?.im?.organizations || []
      });
    }

    return NextResponse.json({
      connected: false,
      accounts: accounts.map((acc: any) => ({
        type: acc.type,
        name: acc.name,
        id: acc.id
      })),
      message: 'No LinkedIn account found'
    });

  } catch (error) {
    console.error('[UniPile Status] Error:', error);
    return NextResponse.json({
      connected: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }, { status: 500 });
  }
}
