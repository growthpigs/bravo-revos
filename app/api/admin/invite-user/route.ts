/**
 * POST /api/admin/invite-user
 * Create invitation for new user
 * Requires authenticated user (page-level auth guard provides admin protection)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // DIAGNOSTIC: Log request body
    console.log('[INVITE_API_DIAG] Request received');

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('[INVITE_API_DIAG] Auth check:', {
      authenticated: !!user,
      userId: user?.id,
      userEmail: user?.email,
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { email, firstName, lastName, podId } = await request.json();

    console.log('[INVITE_API_DIAG] Request body parsed:', {
      email,
      firstName,
      lastName,
      podId,
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // DIAGNOSTIC: Log insert payload
    const insertPayload = {
      email,
      first_name: firstName,
      last_name: lastName,
      pod_id: podId || null,
      invited_by: user.id,
    };

    console.log('[INVITE_API_DIAG] Insert payload:', insertPayload);

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .insert(insertPayload)
      .select()
      .single();

    // DIAGNOSTIC: Log database response
    console.log('[INVITE_API_DIAG] Database response:', {
      error: error ? { code: error.code, message: error.message } : null,
      invitationReceived: !!invitation,
      invitationKeys: invitation ? Object.keys(invitation) : [],
      invitationData: invitation ? {
        id: invitation.id,
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        invitation_token: invitation.invitation_token,
        status: invitation.status,
        invited_by: invitation.invited_by,
        pod_id: invitation.pod_id,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
      } : null,
    });

    if (error || !invitation) {
      console.error('[INVITE_API_ERROR] Failed to create invitation:', {
        errorCode: error?.code,
        errorMessage: error?.message,
        invitationIsNull: !invitation,
      });
      return NextResponse.json(
        { error: error?.message || 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // DIAGNOSTIC: Log token generation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bravo-revos.vercel.app';
    const inviteUrl = `${appUrl}/onboard?token=${invitation.invitation_token}`;

    console.log('[INVITE_API_DIAG] URL generation:', {
      appUrl,
      hasToken: !!invitation.invitation_token,
      tokenLength: invitation.invitation_token?.length || 0,
      finalUrl: inviteUrl,
    });

    // DIAGNOSTIC: Email delivery service check (PROBLEM #1 Investigation)
    const emailServiceConfigured =
      !!process.env.RESEND_API_KEY ||
      !!process.env.SENDGRID_API_KEY ||
      !!process.env.AWS_SES_ACCESS_KEY;

    console.log('[INVITE_API_DIAG] Email delivery service check (PROBLEM #1 Investigation):', {
      resendConfigured: !!process.env.RESEND_API_KEY,
      sendgridConfigured: !!process.env.SENDGRID_API_KEY,
      sesConfigured: !!process.env.AWS_SES_ACCESS_KEY,
      anyServiceConfigured: emailServiceConfigured,
      severity: emailServiceConfigured ? 'OK' : 'CRITICAL',
      willSendEmail: false,
      status: 'TODO: Send email with invite link',
    });

    // DIAGNOSTIC: What should happen vs what will happen
    console.log('[INVITE_API_DIAG] Email delivery status (PROBLEM #1):', {
      whatShouldHappen: 'Send email to ' + invitation.email + ' with magic link + temp password',
      whatWillHappen: 'No email sent, admin must manually share URL',
      userWillReceive: 'Nothing - NO EMAIL',
      userCanProceed: false,
      status: 'CRITICAL - BLOCKING',
    });

    // TODO: Send email with invite link (PROBLEM #1)
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
      diagnosticWarnings: {
        emailNotImplemented: true,
        userWillNotReceiveEmail: true,
        adminMustShareURLManually: true,
        issue: 'Email service not configured - invitation created but not sent',
      },
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
