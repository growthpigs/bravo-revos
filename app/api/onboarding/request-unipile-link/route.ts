/**
 * POST /api/onboarding/request-unipile-link
 * Request Unipile OAuth link during user onboarding
 *
 * Body: { token: invitation_token }
 * Response: { authUrl: "https://account.unipile.com/..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      console.log('[ONBOARDING_LINK] ❌ No token provided');
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Use service role to access invitations and create sessions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify invitation exists using RPC (handles UUID casting)
    const { data: invitations, error: invError } = await supabase.rpc(
      'get_invitation_by_token',
      { p_token: token }
    );

    const invitation = Array.isArray(invitations) && invitations.length > 0
      ? invitations[0]
      : null;

    if (invError || !invitation) {
      console.log('[ONBOARDING_LINK] ❌ Invalid invitation token');
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'pending') {
      console.log('[ONBOARDING_LINK] ❌ Invitation already processed');
      return NextResponse.json(
        { error: 'Invitation already used' },
        { status: 409 }
      );
    }

    // Generate CSRF prevention state
    const oauthState = randomBytes(32).toString('hex');

    // Create onboarding session
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .insert({
        invitation_token: token,
        oauth_state: oauthState,
        status: 'pending',
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('[ONBOARDING_LINK] ❌ Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow' },
        { status: 500 }
      );
    }

    // Request hosted auth link from Unipile
    const unipileResponse = await fetch(
      `${process.env.UNIPILE_DSN}/api/v1/hosted/accounts/link`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UNIPILE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'linkedin',
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/oauth-success?state=${oauthState}`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/unipile/notify-onboarding`,
          name: `onboarding:${token}`, // Identifier for webhook
        }),
      }
    );

    if (!unipileResponse.ok) {
      const error = await unipileResponse.text();
      console.error('[ONBOARDING_LINK] ❌ Unipile error:', error);
      return NextResponse.json(
        { error: 'Failed to create auth link' },
        { status: 500 }
      );
    }

    const { url: authUrl } = await unipileResponse.json();

    console.log('[ONBOARDING_LINK] ✅ OAuth link created:', {
      invitationEmail: invitation.email,
      sessionId: session.id,
      authUrlHost: new URL(authUrl).host,
    });

    return NextResponse.json({
      success: true,
      authUrl,
      state: oauthState, // For frontend CSRF verification
    });
  } catch (error) {
    console.error('[ONBOARDING_LINK] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
