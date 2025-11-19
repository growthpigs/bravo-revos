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
    // ⚠️ DIAGNOSTIC: Log the role value (PROBLEM #1 Investigation)
    const roleValue = null; // CRITICAL: Role from invitation is NOT being set!
    console.log('[INVITE_ACCEPT] User creation payload:', {
      id: userId,
      email: invitation.email,
      first_name: invitation.first_name,
      last_name: invitation.last_name,
      roleValue: roleValue, // ❌ THIS IS NULL - PROBLEM #1 CONFIRMED
      invitationHasRole: 'invitation.role field' in invitation ? 'YES' : 'NO (missing)',
    });

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        // ⚠️ CRITICAL: Role is NOT being assigned from invitation!
        // role: invitation.role, // <-- This line is MISSING
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

    console.log('[INVITE_ACCEPT] User created successfully:', {
      userId,
      email: userData.email,
      createdRole: userData.role || null, // ⚠️ Should log the actual role
    });

    // Add to pod if specified in invitation
    if (invitation.pod_id) {
      console.log('[INVITE_ACCEPT] Attempting pod membership creation:', {
        userId,
        podId: invitation.pod_id,
      });

      const { error: podError } = await supabase.from('pod_memberships').insert({
        user_id: userId,
        pod_id: invitation.pod_id,
        is_active: true,
      });

      if (podError) {
        // ⚠️ PROBLEM #7: Silent failure - user created but NOT in pod!
        console.error('[INVITE_ACCEPT] ⚠️ Pod membership creation FAILED:', {
          userId,
          podId: invitation.pod_id,
          errorCode: podError.code,
          errorMessage: podError.message,
          severity: 'HIGH - User created but not added to pod!',
        });
        // Don't fail the whole invitation just because pod membership failed
        // User can be added to pod later
      } else {
        console.log('[INVITE_ACCEPT] Pod membership created successfully:', {
          userId,
          podId: invitation.pod_id,
        });
      }
    } else {
      console.log('[INVITE_ACCEPT] No pod_id in invitation, skipping pod membership');
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('user_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('[INVITE_ACCEPT] Failed to mark invitation as accepted:', updateError);
    }

    console.log('[INVITE_ACCEPT] Invitation accepted successfully:', {
      email: invitation.email,
      userId,
      status: 'accepted',
    });

    // ⚠️ PROBLEM #2: Email delivery NOT implemented!
    console.log('[INVITE_ACCEPT] ⚠️ EMAIL DELIVERY PROBLEM:', {
      severity: 'CRITICAL',
      issue: 'User password is generated but NEVER sent via email',
      email: invitation.email,
      tempPassword: tempPassword, // User has NO WAY to get this!
      emailServiceStatus: 'NOT_CONFIGURED',
      nextSteps: 'Implement email delivery OR give user password on this endpoint',
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
