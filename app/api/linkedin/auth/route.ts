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

    console.log('[DEBUG_LINKEDIN] ===== LinkedIn Auth Request =====');
    console.log('[DEBUG_LINKEDIN] Action:', action);
    console.log('[DEBUG_LINKEDIN] Username:', username);
    console.log('[DEBUG_LINKEDIN] Account Name:', accountName);
    console.log('[DEBUG_LINKEDIN] UNIPILE_MOCK_MODE env:', process.env.UNIPILE_MOCK_MODE);

    // DIAGNOSTIC: Log received credentials to check for corruption
    if (password) {
      console.log('[AUTH_DEBUG] Received credentials:', {
        username,
        password: `[${password.length} chars] starts:"${password.slice(0,3)}" ends:"${password.slice(-3)}"`,
        passwordHasSpecialChars: /[!@#$%^&*(),.?":{}|<>\\/[\]+=_-]/.test(password),
        passwordBytes: Array.from(password).map((c: string) => c.charCodeAt(0))
      });
    }

    // Check mock mode flag - if explicitly false, use production mode even in dev environment
    // If flag is true or NODE_ENV is development (without explicit false), use development mode
    const isDevelopment = process.env.UNIPILE_MOCK_MODE !== 'false';
    console.log('[DEBUG_LINKEDIN] isDevelopment:', isDevelopment);

    let userId: string;
    let clientId: string;

    // Use service role for database operations (bypasses RLS)
    const supabaseAdmin = await createClient({ isServiceRole: true });

    if (isDevelopment) {
      // Use fixed test user IDs for development (created by migration 013)
      userId = '00000000-0000-0000-0000-000000000003';
      clientId = '00000000-0000-0000-0000-000000000002';
      console.log('[DEBUG_LINKEDIN] Development mode: Using test user and client IDs from migration 013');
      console.log('[DEBUG_LINKEDIN] Test userId:', userId);
      console.log('[DEBUG_LINKEDIN] Test clientId:', clientId);
    } else {
      console.log('[DEBUG_LINKEDIN] Production mode: Checking authenticated user...');
      // Use regular client to check authentication
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log('[DEBUG_LINKEDIN] Auth user result:', user ? { id: user.id, email: user.email } : null);

      if (!user) {
        console.error('[DEBUG_LINKEDIN] ❌ No authenticated user found!');
        return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
      }

      console.log('[DEBUG_LINKEDIN] ✅ User authenticated:', user.email);

      // Get user's client info using admin client
      console.log('[DEBUG_LINKEDIN] Looking up user in database:', user.email);
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, client_id, email, full_name')
        .eq('email', user.email)
        .single();

      console.log('[DEBUG_LINKEDIN] User lookup result:', { userData, error: userError });

      if (userError || !userData) {
        console.error('[DEBUG_LINKEDIN] ❌ User lookup failed!');
        console.error('[DEBUG_LINKEDIN] Error:', userError);
        console.error('[DEBUG_LINKEDIN] Email searched:', user.email);
        return NextResponse.json(
          { error: `User profile not found for ${user.email}. Please contact support.` },
          { status: 404 }
        );
      }

      console.log('[DEBUG_LINKEDIN] ✅ User found in database');
      userId = userData.id;
      clientId = userData.client_id;
      console.log('[DEBUG_LINKEDIN] userId:', userId);
      console.log('[DEBUG_LINKEDIN] clientId:', clientId);
    }

    // Fetch client's Unipile credentials
    console.log('[DEBUG_LINKEDIN] Looking up client configuration:', clientId);
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('unipile_api_key, unipile_dsn, unipile_enabled, name')
      .eq('id', clientId)
      .single();

    console.log('[DEBUG_LINKEDIN] Client lookup result:', {
      found: !!clientData,
      enabled: clientData?.unipile_enabled,
      hasApiKey: !!clientData?.unipile_api_key,
      error: clientError
    });

    if (clientError) {
      console.error('[DEBUG_LINKEDIN] ❌ Client lookup failed:', clientError);
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

    console.log('[DEBUG_LINKEDIN] Using credentials:', clientCredentials ? 'Client-specific' : 'System-wide fallback');
    console.log('[DEBUG_LINKEDIN] System UNIPILE_API_KEY present:', !!process.env.UNIPILE_API_KEY);

    // STEP 1: Initial authentication
    if (action === 'authenticate') {
      if (!username || !password || !accountName) {
        console.error('[DEBUG_LINKEDIN] ❌ Missing required fields');
        return NextResponse.json(
          { error: 'Missing required fields: username, password, accountName' },
          { status: 400 }
        );
      }

      console.log('[DEBUG_LINKEDIN] Calling Unipile API to authenticate account...');
      console.log('[DEBUG_LINKEDIN] Using', clientCredentials ? 'client credentials' : 'system credentials');

      const authResult = await authenticateLinkedinAccount(username, password, clientCredentials);

      console.log('[DEBUG_LINKEDIN] Unipile auth result:', {
        status: authResult.status,
        hasAccountId: !!authResult.account_id,
        hasCheckpoint: 'checkpoint_type' in authResult && !!authResult.checkpoint_type
      });

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
      console.log('[DEBUG_LINKEDIN] Unipile account ID:', unipileAccountId);

      // Get account status from Unipile
      console.log('[DEBUG_LINKEDIN] Fetching account status from Unipile...');
      const accountStatus = await getAccountStatus(unipileAccountId);
      console.log('[DEBUG_LINKEDIN] Account status:', { name: accountStatus.name, email: accountStatus.email });

      // Calculate session expiry (typically 90 days from Unipile)
      const sessionExpiresAt = new Date();
      sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 90);

      // Store in database
      console.log('[DEBUG_LINKEDIN] Storing LinkedIn account in database...');
      console.log('[DEBUG_LINKEDIN] Insert data:', {
        userId,
        accountName,
        unipileAccountId
      });

      const { data: linkedinAccount, error: insertError } = await supabaseAdmin
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
        console.error('[DEBUG_LINKEDIN] ❌ Database insert failed!');
        console.error('[DEBUG_LINKEDIN] Error storing LinkedIn account:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          userId,
          accountName,
          unipileAccountId,
        });
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

      console.log('[DEBUG_LINKEDIN] ✅ Successfully stored LinkedIn account!');
      console.log('[DEBUG_LINKEDIN] Account ID:', linkedinAccount?.id);

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

      const checkpointResult = await resolveCheckpoint(accountId, code, clientCredentials);

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

      const { data: linkedinAccount, error: updateError } = await supabaseAdmin
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
