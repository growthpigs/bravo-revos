import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/unipile/disconnect
 *
 * Disconnect a connected account
 *
 * Request body:
 * {
 *   account_id: 'uuid-of-connected-account'
 * }
 *
 * Response (Success):
 * {
 *   success: true
 * }
 *
 * Response (Error):
 * {
 *   error: 'ERROR_CODE',
 *   message: 'Error description'
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

    // Parse request body
    const body = await request.json();
    const { account_id } = body;

    if (!account_id) {
      return NextResponse.json(
        { error: 'MISSING_ACCOUNT_ID', message: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership and delete (RLS policy ensures user can only delete their own)
    const { error: deleteError } = await supabase
      .from('connected_accounts')
      .delete()
      .eq('id', account_id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[UniPile Disconnect] Error:', deleteError);
      return NextResponse.json(
        { error: 'DELETE_FAILED', message: 'Failed to disconnect account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[UniPile Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
