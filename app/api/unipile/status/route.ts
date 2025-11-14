import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/unipile/status
 *
 * Check if UniPile is configured and return connection status
 * Used by frontend to determine if UniPile features should be enabled
 */
export async function GET() {
  try {
    const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
    const UNIPILE_DSN = process.env.UNIPILE_DSN || 'https://api3.unipile.com:13344';

    // If API key is not configured, UniPile is not available
    if (!UNIPILE_API_KEY) {
      return NextResponse.json({
        configured: false,
        message: 'UniPile API key not configured'
      }, { status: 200 });
    }

    // UniPile is configured - return success
    return NextResponse.json({
      configured: true,
      dsn: UNIPILE_DSN,
      message: 'UniPile is configured and ready'
    }, { status: 200 });

  } catch (error) {
    console.error('[UniPile Status] Error:', error);
    return NextResponse.json({
      configured: false,
      message: 'Error checking UniPile status'
    }, { status: 500 });
  }
}
