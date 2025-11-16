/**
 * Admin Set User Password API
 *
 * Securely sets password during pod member onboarding
 * Validates invite token to prevent unauthorized password changes
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, password, inviteToken } = body;

    if (!userId || !password || !inviteToken) {
      return NextResponse.json(
        { error: 'userId, password, and inviteToken are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // ✅ SECURITY: Validate invite token belongs to this user and is in correct state
    const { data: member, error: tokenError } = await supabase
      .from('pod_members')
      .select('user_id, onboarding_status, invite_sent_at')
      .eq('invite_token', inviteToken)
      .eq('user_id', userId)
      .single();

    if (tokenError || !member) {
      console.error('[SET_PASSWORD] Invalid token:', tokenError);
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 403 }
      );
    }

    // ✅ SECURITY: Only allow password setting if in 'invited' state
    if (member.onboarding_status !== 'invited') {
      return NextResponse.json(
        { error: 'Invite token already used or expired' },
        { status: 403 }
      );
    }

    // ✅ SECURITY: Check token expiration (7 days)
    if (member.invite_sent_at) {
      const inviteSentAt = new Date(member.invite_sent_at);
      const expiresAt = new Date(inviteSentAt.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (new Date() > expiresAt) {
        return NextResponse.json(
          { error: 'Invite token expired. Please request a new invitation.' },
          { status: 403 }
        );
      }
    }

    // ✅ SECURITY: Update password AND confirm email in one atomic operation
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true, // Confirm email when password is set
    });

    if (updateError) {
      console.error('[SET_PASSWORD] Admin API error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 500 }
      );
    }

    console.log('[SET_PASSWORD] Password updated successfully for user:', userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SET_PASSWORD] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
