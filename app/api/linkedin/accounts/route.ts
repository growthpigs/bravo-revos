/**
 * GET/DELETE /api/linkedin/accounts
 * Get user's LinkedIn accounts or delete a specific account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { disconnectAccount, getAccountStatus } from '@/lib/unipile-client';

// GET - Retrieve all LinkedIn accounts for user
export async function GET(request: NextRequest) {
  try {
    const isDevelopment = process.env.UNIPILE_MOCK_MODE !== 'false';
    // Use service role to bypass RLS policies for LinkedIn account management
    const supabase = await createClient({ isServiceRole: true });

    let userId: string;

    if (isDevelopment) {
      // Use test user from migration 013
      userId = '00000000-0000-0000-0000-000000000003';
      console.log('[DEBUG_LINKEDIN_API] Development mode: Using test user ID');
    } else {
      // Get authenticated user in production
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get user's client info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      userId = userData.id;
    }

    // Get all LinkedIn accounts for this user
    const { data: accounts, error: accountsError } = await supabase
      .from('linkedin_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    // Check session status for each account
    const accountsWithStatus = await Promise.all(
      (accounts || []).map(async (account) => {
        try {
          // Get current status from Unipile
          const unipileStatus = await getAccountStatus(account.unipile_account_id);

          // Map Unipile status to our status
          let dbStatus = account.status;
          if (unipileStatus.status === 'CREDENTIALS') {
            dbStatus = 'expired';
          } else if (unipileStatus.status === 'DISCONNECTED') {
            dbStatus = 'error';
          }

          // Update database if status changed
          if (dbStatus !== account.status) {
            await supabase
              .from('linkedin_accounts')
              .update({ status: dbStatus })
              .eq('id', account.id);
          }

          return {
            ...account,
            status: dbStatus,
            unipile_status: unipileStatus.status,
            profile_data: {
              ...account.profile_data,
              name: unipileStatus.name,
              email: unipileStatus.email,
            },
          };
        } catch (error) {
          // If we can't reach Unipile, return current cached status
          console.warn(`Warning: Could not check status for account ${account.id}`);
          return account;
        }
      })
    );

    return NextResponse.json({
      accounts: accountsWithStatus,
      total: accountsWithStatus.length,
    });
  } catch (error) {
    console.error('LinkedIn accounts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect a LinkedIn account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing account ID' },
        { status: 400 }
      );
    }

    const isDevelopment = process.env.UNIPILE_MOCK_MODE !== 'false';
    // Use service role to bypass RLS policies for LinkedIn account management
    const supabase = await createClient({ isServiceRole: true });

    let userId: string;

    if (isDevelopment) {
      // Use test user from migration 013
      userId = '00000000-0000-0000-0000-000000000003';
      console.log('[DEBUG_LINKEDIN_API] DELETE Development mode: Using test user ID');
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get user ID from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      userId = userData.id;
    }

    // Get the account to verify ownership
    const { data: account, error: fetchError } = await supabase
      .from('linkedin_accounts')
      .select('id, user_id, unipile_account_id')
      .eq('id', accountId)
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Verify user owns this account
    if (account.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Account does not belong to user' },
        { status: 403 }
      );
    }

    // Disconnect from Unipile
    try {
      await disconnectAccount(account.unipile_account_id);
    } catch (error) {
      console.warn('Could not disconnect from Unipile:', error);
      // Continue with local deletion even if Unipile disconnect fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('linkedin_accounts')
      .delete()
      .eq('id', accountId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      message: 'LinkedIn account disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}
