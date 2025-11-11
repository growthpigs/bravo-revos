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
    const allHeaders = Object.fromEntries(request.headers.entries());

    console.log('[DEBUG_LINKEDIN_API] GET request received:', {
      isDevelopment,
      url: request.url,
      method: request.method,
      headers: {
        authorization: request.headers.get('authorization') ? 'present' : 'missing',
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
      },
      allHeaders,
    });

    let userId: string;
    let clientId: string;

    if (isDevelopment) {
      // Use test user from migration 013
      userId = '00000000-0000-0000-0000-000000000003';
      clientId = '00000000-0000-0000-0000-000000000002';
      console.log('[DEBUG_LINKEDIN_API] Development mode: Using test user and client IDs');
    } else {
      // Get authenticated user in production - use regular client to access session
      const authSupabase = await createClient({ isServiceRole: false });
      const {
        data: { user },
      } = await authSupabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Now use service role for database queries that bypass RLS
      const supabase = await createClient({ isServiceRole: true });

      // Get user's client info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, client_id')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      userId = userData.id;
      clientId = userData.client_id;
    }

    // Use service role to bypass RLS policies for LinkedIn account management
    const supabase = await createClient({ isServiceRole: true });

    // Fetch client's Unipile credentials
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('unipile_api_key, unipile_dsn, unipile_enabled')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('[DEBUG_LINKEDIN_API] Client lookup failed:', clientError);
      return NextResponse.json(
        { error: 'Client configuration not found' },
        { status: 404 }
      );
    }

    // Use client-specific credentials if configured, otherwise fall back to system-wide
    const clientCredentials = clientData?.unipile_enabled && clientData?.unipile_api_key
      ? {
          apiKey: clientData.unipile_api_key,
          dsn: clientData.unipile_dsn || 'https://api3.unipile.com:13344',
        }
      : null;

    // Get all LinkedIn accounts for this user
    console.log('[DEBUG_LINKEDIN_API] Querying accounts with userId:', userId);
    const { data: accounts, error: accountsError } = await supabase
      .from('linkedin_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('[DEBUG_LINKEDIN_API] Query result:', {
      accountsCount: accounts?.length,
      error: accountsError?.message,
      userId,
      accountsDebug: accounts?.map(a => ({ id: a.id, user_id: a.user_id, account_name: a.account_name })),
    });

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
          const unipileStatus = await getAccountStatus(account.unipile_account_id, clientCredentials);

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

    console.log('[DEBUG_LINKEDIN_API] Final response:', {
      accountsCount: accountsWithStatus.length,
      statusCheckDetails: accountsWithStatus.map(a => ({
        id: a.id,
        account_name: a.account_name,
        status: a.status,
        unipile_status: a.unipile_status,
      })),
    });

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

    let userId: string;
    let clientId: string;

    if (isDevelopment) {
      // Use test user from migration 013
      userId = '00000000-0000-0000-0000-000000000003';
      clientId = '00000000-0000-0000-0000-000000000002';
      console.log('[DEBUG_LINKEDIN_API] DELETE Development mode: Using test user ID');
    } else {
      // Get authenticated user in production - use regular client to access session
      const authSupabase = await createClient({ isServiceRole: false });
      const {
        data: { user },
      } = await authSupabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Now use service role for database queries that bypass RLS
      const supabase = await createClient({ isServiceRole: true });

      // Get user ID and client ID from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, client_id')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      userId = userData.id;
      clientId = userData.client_id;
    }

    // Use service role to bypass RLS policies for LinkedIn account management
    const supabase = await createClient({ isServiceRole: true });

    // Fetch client's Unipile credentials
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('unipile_api_key, unipile_dsn, unipile_enabled')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('[DEBUG_LINKEDIN_API] Client lookup failed:', clientError);
      return NextResponse.json(
        { error: 'Client configuration not found' },
        { status: 404 }
      );
    }

    // Use client-specific credentials if configured, otherwise fall back to system-wide
    const clientCredentials = clientData?.unipile_enabled && clientData?.unipile_api_key
      ? {
          apiKey: clientData.unipile_api_key,
          dsn: clientData.unipile_dsn || 'https://api3.unipile.com:13344',
        }
      : null;

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
      await disconnectAccount(account.unipile_account_id, clientCredentials);
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
