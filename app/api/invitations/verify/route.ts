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

    if (!token) {
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

    if (error || !invitation) {
      console.log('[INVITE_VERIFY] Token not found:', token);
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      console.log('[INVITE_VERIFY] Token expired:', token);
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Check if already accepted
    if (invitation.status !== 'pending') {
      console.log('[INVITE_VERIFY] Invitation already processed:', invitation.status);
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status}` },
        { status: 409 }
      );
    }

    console.log('[INVITE_VERIFY] Valid invitation:', {
      email: invitation.email,
      status: invitation.status,
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
    console.error('[INVITE_VERIFY] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
