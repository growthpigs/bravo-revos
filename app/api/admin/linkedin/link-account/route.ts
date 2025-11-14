/**
 * POST /api/admin/linkedin/link-account
 * Admin endpoint to link a Unipile LinkedIn account to a user
 *
 * This is called by admins during onboarding calls to pre-connect LinkedIn accounts.
 * Users never see the auth form - accounts are managed by support team.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccountStatus } from '@/lib/unipile-client';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = await createClient({ isServiceRole: true });

    // Get authenticated admin user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, unipileAccountId, accountName } = body;

    if (!userId || !unipileAccountId || !accountName) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, unipileAccountId, accountName' },
        { status: 400 }
      );
    }

    console.log('[ADMIN_LINK] Linking Unipile account to user:', {
      userId,
      unipileAccountId,
      accountName,
    });

    // Verify the Unipile account exists and is active
    const accountStatus = await getAccountStatus(unipileAccountId);

    if (accountStatus.status !== 'OK') {
      return NextResponse.json(
        { error: `Account not active. Status: ${accountStatus.status}` },
        { status: 400 }
      );
    }

    console.log('[ADMIN_LINK] Account verified:', {
      name: accountStatus.name,
      email: accountStatus.email,
      status: accountStatus.status,
    });

    // Calculate session expiry (90 days)
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 90);

    // Store in database
    const { data: linkedinAccount, error: insertError } = await supabaseAdmin
      .from('linkedin_accounts')
      .insert({
        user_id: userId,
        account_name: accountName,
        unipile_account_id: unipileAccountId,
        unipile_session: {
          created_at: new Date().toISOString(),
          auth_method: 'admin_linked',
          managed_by_admin: true,
        },
        session_expires_at: sessionExpiresAt.toISOString(),
        profile_data: {
          name: accountStatus.name,
          email: accountStatus.email,
        },
        status: 'active',
        last_sync_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ADMIN_LINK] Database insert failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to link account', details: insertError.message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_LINK] ✅ Successfully linked account!');

    return NextResponse.json({
      success: true,
      account: linkedinAccount,
      message: `LinkedIn account "${accountName}" successfully linked to user`,
    });
  } catch (error) {
    console.error('[ADMIN_LINK] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to link account' },
      { status: 500 }
    );
  }
}
