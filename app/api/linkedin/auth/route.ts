/**
 * POST /api/linkedin/auth
 * Authenticate a LinkedIn account via Unipile
 * Supports username/password and checkpoint resolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  authenticateLinkedinAccount,
  resolveCheckpoint,
  getAccountStatus,
} from '@/lib/unipile-client';
import { encryptData } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username, password, accountId, code, accountName } = body;

    // Check mock mode flag - if explicitly false, use production mode even in dev environment
    // If flag is true or NODE_ENV is development (without explicit false), use development mode
    const isDevelopment = process.env.UNIPILE_MOCK_MODE !== 'false';

    let userId: string;
    let clientId: string;
    // Use service role to bypass RLS policies for LinkedIn account management
    let supabase = await createClient({ isServiceRole: true });

    if (isDevelopment) {
      // Use fixed test user IDs for development (created by migration 013)
      userId = '00000000-0000-0000-0000-000000000003';
      clientId = '00000000-0000-0000-0000-000000000002';
      console.log('[DEBUG_LINKEDIN_API] Development mode: Using test user and client IDs from migration 013');
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
        .select('id, client_id')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        console.error('[DEBUG_LINKEDIN_API] User lookup failed:', userError);
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        );
      }

      userId = userData.id;
      clientId = userData.client_id;
    }

    // STEP 1: Initial authentication
    if (action === 'authenticate') {
      if (!username || !password || !accountName) {
        return NextResponse.json(
          { error: 'Missing required fields: username, password, accountName' },
          { status: 400 }
        );
      }

      const authResult = await authenticateLinkedinAccount(username, password);

      // Check if checkpoint is required
      if ('checkpoint_type' in authResult && authResult.checkpoint_type) {
        return NextResponse.json({
          status: 'checkpoint_required',
          checkpoint_type: authResult.checkpoint_type,
          account_id: authResult.account_id,
          message: `Please provide ${authResult.checkpoint_type} code to complete authentication.`,
        });
      }

      if (authResult.status !== 'OK') {
        return NextResponse.json(
          { error: `Authentication failed: ${authResult.status}` },
          { status: 400 }
        );
      }

      const unipileAccountId = authResult.account_id;

      // Get account status from Unipile
      const accountStatus = await getAccountStatus(unipileAccountId);

      // Calculate session expiry (typically 90 days from Unipile)
      const sessionExpiresAt = new Date();
      sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 90);

      // Store in database
      const { data: linkedinAccount, error: insertError } = await supabase
        .from('linkedin_accounts')
        .insert({
          user_id: userId,
          account_name: accountName,
          unipile_account_id: unipileAccountId,
          unipile_session: {
            created_at: new Date().toISOString(),
            auth_method: 'username_password',
            checkpoint_resolved: true,
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
        console.error('Error storing LinkedIn account:', insertError);
        // In development, still return success with mock data
        if (isDevelopment) {
          const mockAccount = {
            id: 'dev-' + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            account_name: accountName,
            unipile_account_id: unipileAccountId,
            unipile_session: {
              created_at: new Date().toISOString(),
              auth_method: 'username_password',
              checkpoint_resolved: true,
            },
            session_expires_at: sessionExpiresAt.toISOString(),
            profile_data: {
              name: accountStatus.name,
              email: accountStatus.email,
            },
            status: 'active',
            last_sync_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return NextResponse.json({
            status: 'success',
            account: mockAccount,
            message: 'LinkedIn account connected successfully (dev mock)',
          });
        }
        return NextResponse.json(
          { error: 'Failed to store LinkedIn account' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: 'success',
        account: linkedinAccount,
        message: 'LinkedIn account connected successfully',
      });
    }

    // STEP 2: Resolve checkpoint (2FA, OTP, etc.)
    if (action === 'resolve_checkpoint') {
      if (!accountId || !code) {
        return NextResponse.json(
          { error: 'Missing required fields: accountId, code' },
          { status: 400 }
        );
      }

      const checkpointResult = await resolveCheckpoint(accountId, code);

      if (checkpointResult.status !== 'OK') {
        return NextResponse.json(
          { error: `Checkpoint resolution failed: ${checkpointResult.status}` },
          { status: 400 }
        );
      }

      const accountStatus = await getAccountStatus(accountId);

      // Update database with resolved account
      const sessionExpiresAt = new Date();
      sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 90);

      const { data: linkedinAccount, error: updateError } = await supabase
        .from('linkedin_accounts')
        .upsert({
          unipile_account_id: accountId,
          user_id: userId,
          unipile_session: {
            checkpoint_resolved: true,
            resolved_at: new Date().toISOString(),
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

      if (updateError) {
        console.error('Error updating LinkedIn account:', updateError);
        // In development, still return success with mock data
        if (isDevelopment) {
          const mockAccount = {
            id: 'dev-' + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            account_name: 'Resolved Account',
            unipile_account_id: accountId,
            unipile_session: {
              checkpoint_resolved: true,
              resolved_at: new Date().toISOString(),
            },
            session_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            profile_data: {
              name: accountStatus.name,
              email: accountStatus.email,
            },
            status: 'active',
            last_sync_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return NextResponse.json({
            status: 'success',
            account: mockAccount,
            message: 'LinkedIn account checkpoint resolved successfully (dev mock)',
          });
        }
        return NextResponse.json(
          { error: 'Failed to update LinkedIn account' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: 'success',
        account: linkedinAccount,
        message: 'LinkedIn account checkpoint resolved successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "authenticate" or "resolve_checkpoint"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    );
  }
}
