import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  authenticateLinkedinAccount,
  resolveCheckpoint,
  getAccountStatus,
} from '@/lib/unipile-client';

/**
 * POST /api/pods/members/auth
 * Authenticate pod member's LinkedIn account via invitation token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token, username, password, accountId, code, accountName } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing invitation token' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify invitation token
    const { data: podMember, error: memberError } = await supabase
      .from('pod_members')
      .select(`
        id,
        user_id,
        pod_id,
        linkedin_account_id,
        invitation_token,
        invitation_expires_at,
        pods (
          id,
          name,
          client_id
        ),
        users (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('invitation_token', token)
      .single();

    if (memberError || !podMember) {
      console.error('[POD_AUTH_API] Invalid token:', memberError);
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 401 }
      );
    }

    // Check if token expired
    if (new Date(podMember.invitation_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation token has expired. Please request a new invitation.' },
        { status: 401 }
      );
    }

    // Check if member already has LinkedIn connected
    if (podMember.linkedin_account_id) {
      return NextResponse.json(
        { error: 'LinkedIn account already connected' },
        { status: 400 }
      );
    }

    const userId = podMember.user_id;
    const podId = podMember.pod_id;
    const clientId = (podMember.pods as any).client_id;

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

      // Store in linkedin_accounts table
      const { data: linkedinAccount, error: insertError } = await supabase
        .from('linkedin_accounts')
        .insert({
          user_id: userId,
          client_id: clientId,
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
        console.error('[POD_AUTH_API] Error storing LinkedIn account:', insertError);
        return NextResponse.json(
          { error: 'Failed to store LinkedIn account' },
          { status: 500 }
        );
      }

      // Link LinkedIn account to pod member
      const { error: linkError } = await supabase
        .from('pod_members')
        .update({
          linkedin_account_id: linkedinAccount.id,
          invitation_token: null, // Clear token after successful auth
          invitation_expires_at: null,
        })
        .eq('id', podMember.id);

      if (linkError) {
        console.error('[POD_AUTH_API] Failed to link LinkedIn account:', linkError);
        return NextResponse.json(
          { error: 'Failed to link account to pod member' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: 'success',
        account: linkedinAccount,
        pod_id: podId,
        message: 'LinkedIn account connected successfully to pod',
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
          client_id: clientId,
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
        console.error('[POD_AUTH_API] Error updating LinkedIn account:', updateError);
        return NextResponse.json(
          { error: 'Failed to update LinkedIn account' },
          { status: 500 }
        );
      }

      // Link LinkedIn account to pod member
      const { error: linkError } = await supabase
        .from('pod_members')
        .update({
          linkedin_account_id: linkedinAccount.id,
          invitation_token: null, // Clear token after successful auth
          invitation_expires_at: null,
        })
        .eq('id', podMember.id);

      if (linkError) {
        console.error('[POD_AUTH_API] Failed to link LinkedIn account:', linkError);
        return NextResponse.json(
          { error: 'Failed to link account to pod member' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: 'success',
        account: linkedinAccount,
        pod_id: podId,
        message: 'LinkedIn account verified and connected to pod',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "authenticate" or "resolve_checkpoint".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[POD_AUTH_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pods/members/auth?token=xxx
 * Verify invitation token and get pod/member details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing invitation token' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify invitation token
    const { data: podMember, error: memberError } = await supabase
      .from('pod_members')
      .select(`
        id,
        linkedin_account_id,
        invitation_expires_at,
        pods (
          id,
          name,
          clients (name)
        ),
        users (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('invitation_token', token)
      .single();

    if (memberError || !podMember) {
      console.error('[POD_AUTH_API] Invalid token:', memberError);
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 401 }
      );
    }

    // Check if token expired
    if (new Date(podMember.invitation_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation token has expired' },
        { status: 401 }
      );
    }

    // Check if already connected
    if (podMember.linkedin_account_id) {
      return NextResponse.json(
        { error: 'LinkedIn account already connected' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: 'valid',
      pod_name: (podMember.pods as any).name,
      client_name: (podMember.pods as any).clients.name,
      member_name: `${(podMember.users as any).first_name} ${(podMember.users as any).last_name}`,
      member_email: (podMember.users as any).email,
      expires_at: podMember.invitation_expires_at,
    });
  } catch (error) {
    console.error('[POD_AUTH_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
