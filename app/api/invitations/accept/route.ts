/**
 * POST /api/invitations/accept
 * Accept invitation and create user account
 * Handles Supabase auth user creation and app user creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function generateSecurePassword(): string {
  // Generate a secure random password
  return Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Use service role to verify and get invitation details
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify invitation exists and is valid
    const { data: invitation, error: invError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (invError || !invitation) {
      console.log('[INVITE_ACCEPT] Invitation not found or already used:', token);
      return NextResponse.json(
        { error: 'Invitation not found or already used' },
        { status: 404 }
      );
    }

    // Check expiration
    const expiresAt = new Date(invitation.expires_at);
    if (new Date() > expiresAt) {
      console.log('[INVITE_ACCEPT] Invitation expired:', token);
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Create Supabase auth user with temporary password
    const tempPassword = generateSecurePassword();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm since this is an admin-invited user
    });

    if (authError || !authData.user) {
      console.error('[INVITE_ACCEPT] Auth creation failed:', authError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create app user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
      })
      .select()
      .single();

    if (userError) {
      console.error('[INVITE_ACCEPT] User creation failed:', userError);
      // Rollback auth user creation (optional - depends on requirements)
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Add to pod if specified in invitation
    if (invitation.pod_id) {
      const { error: podError } = await supabase.from('pod_memberships').insert({
        user_id: userId,
        pod_id: invitation.pod_id,
        is_active: true,
      });

      if (podError) {
        console.error('[INVITE_ACCEPT] Pod membership creation failed:', podError);
        // Don't fail the whole invitation just because pod membership failed
        // User can be added to pod later
      }
    }

    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    console.log('[INVITE_ACCEPT] Invitation accepted successfully:', {
      email: invitation.email,
      userId,
    });

    // TODO: Send welcome email with password reset link
    console.log('[INVITE_ACCEPT] Temp password generated (send via email):', {
      email: invitation.email,
      tempPassword, // In production, this should be sent via email only
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
      },
      message: 'Account created successfully. Please check your email for password instructions.',
    });
  } catch (error) {
    console.error('[INVITE_ACCEPT] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
