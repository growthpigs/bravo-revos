/**
 * POST /api/admin/invite-user
 * Create invitation for new user
 * Admin only endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/auth/admin-check';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(user.id, supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Parse request body
    const { email, firstName, lastName, podId } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        pod_id: podId,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error || !invitation) {
      console.error('[INVITE_API] Error creating invitation:', error);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Generate invite URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bravo-revos.vercel.app';
    const inviteUrl = `${appUrl}/onboard?token=${invitation.invitation_token}`;

    console.log('[INVITE_API] Invitation created:', {
      email,
      invitationId: invitation.id,
      inviteUrl,
    });

    // TODO: Send email with invite link
    // For now, just return the URL in response

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at,
      },
      inviteUrl, // Include for easy testing
    });
  } catch (error) {
    console.error('[INVITE_API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
