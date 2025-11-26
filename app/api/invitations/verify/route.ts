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

    console.log('[INVITE_VERIFY] ==================== REQUEST START ====================');
    console.log('[INVITE_VERIFY] Request received:', {
      fullUrl: request.url,
      tokenLength: token?.length || 0,
      tokenExists: !!token,
      tokenValue: token || 'NULL',
      tokenChars: token ? Array.from(token).map(c => c.charCodeAt(0)).join(',') : 'NULL',
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

    console.log('[INVITE_VERIFY] Looking up invitation token in database using RPC');

    // Fetch invitation - use RPC to handle UUID type casting properly
    console.log('[INVITE_VERIFY] RPC call details:', {
      functionName: 'get_invitation_by_token',
      paramName: 'p_token',
      paramValue: token,
      paramLength: token?.length,
    });

    const { data: invitations, error, status } = await supabase
      .rpc('get_invitation_by_token', {
        p_token: token
      });

    console.log('[INVITE_VERIFY] RPC response received:', {
      status: status,
      dataType: typeof invitations,
      isArray: Array.isArray(invitations),
      dataLength: Array.isArray(invitations) ? invitations.length : 'N/A',
      dataValue: JSON.stringify(invitations),
      errorExists: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorHint: error?.hint,
      errorStatus: (error as any)?.status,
    });

    const invitation = Array.isArray(invitations) && invitations.length > 0
      ? invitations[0]
      : null;

    if (error) {
      console.error('[INVITE_VERIFY] ❌ RPC query error - DETAILED:', {
        code: error.code,
        message: error.message,
        hint: error.hint,
        status: (error as any).status,
        details: JSON.stringify(error),
      });
    }

    if (!invitation) {
      console.log('[INVITE_VERIFY] ❌ Token not found in database:', {
        tokenPrefix: token.substring(0, 8),
        dbError: error?.message,
        returning404: true,
      });
      console.log('[INVITE_VERIFY] ==================== RETURNING 404 ====================');
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

    console.log('[INVITE_VERIFY] ==================== RETURNING 200 SUCCESS ====================');
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
    console.error('[INVITE_VERIFY] ❌ Unexpected error caught:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
    });
    console.log('[INVITE_VERIFY] ==================== RETURNING 500 ERROR ====================');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

