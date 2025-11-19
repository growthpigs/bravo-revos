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
    // DIAGNOSTIC: Check for role field in invitation (PROBLEM #2 Investigation)
    console.log('[INVITE_ACCEPT] Invitation data available:', {
      invitationId: invitation.id,
      invitationEmail: invitation.email,
      invitationKeys: Object.keys(invitation),
      hasRoleField: 'role' in invitation,
      roleValue: ('role' in invitation) ? invitation.role : 'MISSING',
      firstNameExists: !!invitation.first_name,
      lastNameExists: !!invitation.last_name,
      podIdExists: !!invitation.pod_id,
    });

    // DIAGNOSTIC: Extract role (PROBLEM #2 - Role not being applied)
    const roleValue = ('role' in invitation) ? invitation.role : null;
    const validRoles = ['admin', 'manager', 'member'];
    const isValidRole = roleValue && validRoles.includes(roleValue);

    console.log('[INVITE_ACCEPT] Role validation (PROBLEM #5 Investigation):', {
      extractedRole: roleValue,
      isValidRole: isValidRole,
      validRoles: validRoles,
      willApplyRole: !!roleValue && isValidRole,
      severity: roleValue ? 'MEDIUM' : 'CRITICAL',
      issue: roleValue ? 'Role value might not match schema' : 'Role field missing from invitation',
    });

    // DIAGNOSTIC: Log complete user creation payload (PROBLEM #2 Investigation)
    const userPayload = {
      id: userId,
      email: invitation.email,
      first_name: invitation.first_name,
      last_name: invitation.last_name,
      ...(roleValue && isValidRole ? { role: roleValue } : {}),
    };

    console.log('[INVITE_ACCEPT] User creation payload:', {
      ...userPayload,
      note: 'Role is ' + (roleValue ? (isValidRole ? 'included' : 'INVALID') : 'MISSING'),
      severity: roleValue ? 'OK' : 'CRITICAL',
    });

    // Create app user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert(userPayload)
      .select()
      .single();

    // DIAGNOSTIC: Check auth/app user linking (PROBLEM #3 Investigation)
    const authAppUserMatch = authData.user?.id === userData?.id;
    console.log('[INVITE_ACCEPT] Auth/App user linking check (PROBLEM #3):', {
      authUserCreated: !!authData.user,
      authUserId: authData.user?.id,
      appUserCreated: !!userData,
      appUserId: userData?.id,
      idsMatch: authAppUserMatch,
      severity: authAppUserMatch ? 'OK' : 'HIGH',
      issue: authAppUserMatch ? 'None' : 'User IDs do not match!',
    });

    if (userError) {
      console.error('[INVITE_ACCEPT] User creation failed:', {
        errorCode: userError.code,
        errorMessage: userError.message,
        errorHint: userError.hint,
        severity: 'CRITICAL',
      });

      // DIAGNOSTIC: Log rollback attempt (PROBLEM #3 Investigation)
      console.log('[INVITE_ACCEPT] Attempting rollback of auth user:', {
        userIdToDelete: userId,
        reason: 'App user creation failed',
      });

      // Rollback auth user creation (optional - depends on requirements)
      const { error: rollbackError } = await supabase.auth.admin.deleteUser(userId);

      console.error('[INVITE_ACCEPT] Rollback result:', {
        rollbackSucceeded: !rollbackError,
        rollbackError: rollbackError?.message,
        orphanedUserIfFailed: rollbackError ? 'YES - ORPHANED AUTH USER' : 'NO',
        severity: rollbackError ? 'HIGH' : 'OK',
      });

      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    console.log('[INVITE_ACCEPT] User created successfully:', {
      userId,
      email: userData.email,
      createdRole: userData.role || null,
      roleWasApplied: !!userData.role,
      severity: userData.role ? 'OK' : 'CRITICAL',
      issue: userData.role ? 'None' : 'Role is NULL after creation',
    });

    // Add to pod if specified in invitation (PROBLEM #4 Investigation)
    if (invitation.pod_id) {
      console.log('[INVITE_ACCEPT] Pod membership attempt (PROBLEM #4 Investigation):', {
        userId,
        podId: invitation.pod_id,
        creationAttempted: true,
        severity: 'HIGH',
      });

      const { error: podError } = await supabase.from('pod_memberships').insert({
        user_id: userId,
        pod_id: invitation.pod_id,
        is_active: true,
      });

      if (podError) {
        // PROBLEM #4: Silent failure - user created but NOT in pod!
        console.error('[INVITE_ACCEPT] Pod membership creation FAILED (PROBLEM #4):', {
          userId,
          podId: invitation.pod_id,
          errorCode: podError.code,
          errorMessage: podError.message,
          errorHint: podError.hint,
          severity: 'HIGH',
          impact: 'User created but NOT in pod_memberships table',
          silentlyIgnored: true,
          adminNotified: false,
          userNotified: false,
          canBeFixedLater: true,
        });
        // Don't fail the whole invitation just because pod membership failed
        // User can be added to pod later
      } else {
        console.log('[INVITE_ACCEPT] Pod membership created successfully:', {
          userId,
          podId: invitation.pod_id,
          severity: 'OK',
        });
      }
    } else {
      console.log('[INVITE_ACCEPT] No pod_id in invitation:', {
        podIdExists: false,
        note: 'User not being added to any pod',
      });
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('user_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('[INVITE_ACCEPT] Failed to mark invitation as accepted:', updateError);
    }

    console.log('[INVITE_ACCEPT] Invitation status update:', {
      email: invitation.email,
      userId,
      invitationId: invitation.id,
      newStatus: 'accepted',
      updateError: updateError ? updateError.message : 'none',
    });

    // DIAGNOSTIC: Complete password transmission analysis (PROBLEM #6 Investigation)
    console.log('[INVITE_ACCEPT] Password transmission analysis (PROBLEM #6 Investigation):', {
      tempPassword: {
        generated: !!tempPassword,
        length: tempPassword?.length,
        visible: '[REDACTED]',
      },
      transmission: {
        sentViaEmail: false,
        returnedInResponse: false,
        displayedOnPage: false,
        loggedToConsole: true,
      },
      userCanAccess: {
        viaEmail: false,
        viaResponse: false,
        viaConsole: false,
        viaUI: false,
      },
      passwordStatus: 'CRITICAL',
      severity: 'CRITICAL',
      issue: 'User has NO WAY to retrieve their password',
    });

    // DIAGNOSTIC: Email delivery check (PROBLEM #1 Investigation)
    const emailServiceConfigured =
      !!process.env.RESEND_API_KEY ||
      !!process.env.SENDGRID_API_KEY ||
      !!process.env.AWS_SES_ACCESS_KEY;

    console.log('[INVITE_ACCEPT] Email delivery service check (PROBLEM #1 Investigation):', {
      resendConfigured: !!process.env.RESEND_API_KEY,
      sendgridConfigured: !!process.env.SENDGRID_API_KEY,
      sesConfigured: !!process.env.AWS_SES_ACCESS_KEY,
      anyEmailServiceConfigured: emailServiceConfigured,
      severity: 'CRITICAL',
      issue: 'Email delivery not implemented',
      what_should_happen: 'Email with magic link + password should be sent',
      what_actually_happens: 'No email sent, user has no way to get password',
      todo: 'Integrate Resend/SendGrid and send password via email',
    });

    // COMPLETE DIAGNOSTIC SUMMARY
    console.log('[INVITE_ACCEPT] ============================================');
    console.log('[INVITE_ACCEPT] COMPLETE INVITATION ACCEPTANCE DIAGNOSTIC:');
    console.log('[INVITE_ACCEPT] ============================================');
    console.log('[INVITE_ACCEPT] User Account Status:', {
      accountCreated: !!userData,
      authUserCreated: !!authData.user,
      appUserCreated: !!userData,
      roleApplied: !!userData.role,
      inPod: invitation.pod_id ? 'ATTEMPTED' : 'NOT_REQUIRED',
    });
    console.log('[INVITE_ACCEPT] Critical Issues Found:', {
      PROBLEM_1_EmailNotSent: 'YES - CRITICAL',
      PROBLEM_2_RoleNotApplied: userData.role ? 'NO' : 'YES - CRITICAL',
      PROBLEM_3_TransactionSafety: 'CHECK_LOGS',
      PROBLEM_4_PodMembershipSilentFail: invitation.pod_id ? 'POSSIBLE - CHECK_LOGS' : 'N/A',
      PROBLEM_5_RoleValidation: roleValue ? (isValidRole ? 'OK' : 'INVALID') : 'N/A',
      PROBLEM_6_PasswordNotTransmitted: 'YES - CRITICAL',
      PROBLEM_7_OnboardingIncomplete: 'YES - REDIRECTS_TO_LOGIN',
    });
    console.log('[INVITE_ACCEPT] ============================================');
    console.log('[INVITE_ACCEPT] Filter browser console by [INVITE_ACCEPT] to see all diagnostics');
    console.log('[INVITE_ACCEPT] ============================================');

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role || null,
      },
      message: userData.role
        ? 'Account created successfully. Please check your email for login instructions.'
        : 'Account created but ROLE IS NULL - User will have no permissions!',
      diagnosticWarnings: {
        roleIsNull: !userData.role,
        emailNotSent: true,
        passwordNotTransmitted: true,
        linkedinNotConnected: true,
      },
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
