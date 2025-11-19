/**
 * GET /api/invitations/verify?token=...
 * Verify invitation token and get invitation details
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    console.log('[INVITE_VERIFY] Request received:', {
      tokenLength: token?.length || 0,
      tokenExists: !!token,
      timestamp: new Date().toISOString(),
    });

    if (!token) {
      console.log('[INVITE_VERIFY] ❌ No token provided in query params');
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS for invitation lookup
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[INVITE_VERIFY] Looking up invitation token in database');

    // Fetch invitation
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        pod_id,
        status,
        expires_at,
        created_at
      `
      )
      .eq('invitation_token', token)
      .single();

    if (error) {
      console.error('[INVITE_VERIFY] ❌ Database query error:', {
        code: error.code,
        message: error.message,
        hint: error.hint,
      });
    }

    if (!invitation) {
      console.log('[INVITE_VERIFY] ❌ Token not found in database:', {
        tokenPrefix: token.substring(0, 8),
        dbError: error?.message,
      });
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    console.log('[INVITE_VERIFY] ✅ Token found:', {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expires_at,
    });

    // Check if invitation is expired
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    const isExpired = now > expiresAt;

    console.log('[INVITE_VERIFY] Expiration check:', {
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
      isExpired: isExpired,
      daysRemaining: Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    });

    if (isExpired) {
      console.log('[INVITE_VERIFY] ❌ Invitation expired');
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Check if already accepted
    const isAlreadyProcessed = invitation.status !== 'pending';

    console.log('[INVITE_VERIFY] Status check:', {
      status: invitation.status,
      isPending: invitation.status === 'pending',
      isAlreadyProcessed: isAlreadyProcessed,
    });

    if (isAlreadyProcessed) {
      console.log('[INVITE_VERIFY] ❌ Invitation already processed:', {
        status: invitation.status,
      });
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status}` },
        { status: 409 }
      );
    }

    console.log('[INVITE_VERIFY] ✅ Valid invitation ready for acceptance:', {
      email: invitation.email,
      status: invitation.status,
      hasFirstName: !!invitation.first_name,
      hasLastName: !!invitation.last_name,
      hasPodId: !!invitation.pod_id,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        podId: invitation.pod_id,
        status: invitation.status,
      },
    });
  } catch (error) {
    console.error('[INVITE_VERIFY] ❌ Unexpected error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
