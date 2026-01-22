/**
 * POST /api/unipile/notify-onboarding
 * Unipile webhook callback for onboarding OAuth completion
 *
 * Creates user account after successful LinkedIn authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function generateSecurePassword(): string {
  return Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, account_id, name } = body;

    console.log('[ONBOARDING_WEBHOOK] Received:', {
      status,
      accountId: account_id,
      identifier: name,
    });

    if (status !== 'CREATION_SUCCESS') {
      console.log('[ONBOARDING_WEBHOOK] ❌ OAuth failed:', { status });
      return NextResponse.json({ error: 'OAuth failed' }, { status: 400 });
    }

    // Parse identifier: "onboarding:invitation_token"
    if (!name || !name.startsWith('onboarding:')) {
      console.log('[ONBOARDING_WEBHOOK] ❌ Invalid identifier:', { name });
      return NextResponse.json({ error: 'Invalid identifier' }, { status: 400 });
    }

    const invitationToken = name.substring('onboarding:'.length);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get invitation and session details
    const { data: invitations, error: invError } = await supabase.rpc(
      'get_invitation_by_token',
      { p_token: invitationToken }
    );

    const invitation = Array.isArray(invitations) && invitations.length > 0
      ? invitations[0]
      : null;

    if (invError || !invitation) {
      console.log('[ONBOARDING_WEBHOOK] ❌ Invitation not found');
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Get Unipile account details
    const unipileAccountResponse = await fetch(
      `${process.env.UNIPILE_DSN}/api/v1/accounts/${account_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.UNIPILE_API_KEY}`,
        },
      }
    );

    let unipileAccount = { name: invitation.email };
    if (unipileAccountResponse.ok) {
      unipileAccount = await unipileAccountResponse.json();
    }

    // Create Supabase auth user
    const tempPassword = generateSecurePassword();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error('[ONBOARDING_WEBHOOK] ❌ Auth creation failed:', authError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create app user with Unipile account
    const { data: userData, error: userError } = await supabase
      .from('user')
      .insert({
        id: userId,
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        unipile_account_id: account_id,
        unipile_provider: 'linkedin',
      })
      .select()
      .single();

    if (userError) {
      console.error('[ONBOARDING_WEBHOOK] ❌ User creation failed:', userError);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Add to pod if specified
    if (invitation.pod_id) {
      const { error: podError } = await supabase
        .from('pod_member')
        .insert({
          user_id: userId,
          pod_id: invitation.pod_id,
        });

      if (podError) {
        console.error('[ONBOARDING_WEBHOOK] ⚠️ Pod membership failed:', podError);
      }
    }

    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    // Update session status
    await supabase
      .from('onboarding_sessions')
      .update({
        status: 'success',
        unipile_account_id: account_id,
      })
      .eq('invitation_token', invitationToken);

    console.log('[ONBOARDING_WEBHOOK] ✅ Account created:', {
      userId,
      email: invitation.email,
      unipileAccountId: account_id,
      addedToPod: !!invitation.pod_id,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[ONBOARDING_WEBHOOK] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
