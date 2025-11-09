import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

/**
 * POST /api/pods/:id/members/:memberId/invite
 * Generate invitation link for pod member to authenticate LinkedIn
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const supabase = await createClient();
    const { podId, memberId } = { podId: params.id, memberId: params.memberId };

    // Get pod member details
    const { data: podMember, error: memberError } = await supabase
      .from('pod_members')
      .select(`
        id,
        user_id,
        linkedin_account_id,
        pod_id,
        pods (
          id,
          name,
          client_id,
          clients (name)
        ),
        users (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', memberId)
      .eq('pod_id', podId)
      .single();

    if (memberError || !podMember) {
      console.error('[INVITE_API] Pod member not found:', memberError);
      return NextResponse.json(
        { error: 'Pod member not found' },
        { status: 404 }
      );
    }

    // Check if member already has LinkedIn connected
    if (podMember.linkedin_account_id) {
      return NextResponse.json(
        { error: 'Member already has LinkedIn account connected' },
        { status: 400 }
      );
    }

    // Generate secure invitation token (24 chars, URL-safe)
    const invitationToken = nanoid(24);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Expires in 48 hours

    // Store invitation token in pod_members
    const { error: updateError } = await supabase
      .from('pod_members')
      .update({
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
        invitation_sent_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (updateError) {
      console.error('[INVITE_API] Failed to store invitation token:', updateError);
      return NextResponse.json(
        { error: 'Failed to generate invitation' },
        { status: 500 }
      );
    }

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/pod-member/auth?token=${invitationToken}`;

    // FUTURE: Send email to member with invitation link
    // For now, just return the URL

    return NextResponse.json({
      status: 'success',
      invitation_url: invitationUrl,
      expires_at: expiresAt.toISOString(),
      member_email: (podMember.users as any).email,
      pod_name: (podMember.pods as any).name,
    });
  } catch (error) {
    console.error('[INVITE_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
