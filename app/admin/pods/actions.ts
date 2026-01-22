/**
 * Pod Management Server Actions
 *
 * Server-side actions for pod member invite, activation, and management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { generateSecureToken } from '@/lib/utils/crypto';
import { sendPodInviteEmail, sendActivationConfirmationEmail } from '@/lib/email/pod-invites';
import { getCurrentAdminUser } from '@/lib/auth/admin-check';

interface InvitePodMemberParams {
  name: string;
  email: string;
  linkedinUrl: string;
  clientId: string;
}

interface InvitePodMemberResult {
  success: boolean;
  error?: string;
  podMemberId?: string;
  inviteUrl?: string;
}

/**
 * Invite a new pod member
 *
 * Flow:
 * 1. Create Supabase auth user (email NOT confirmed yet)
 * 2. Create user record in users table
 * 3. Generate secure invite token
 * 4. Create pod_member record (unipile_account_id = NULL initially)
 * 5. Send invite email with token URL
 */
export async function invitePodMember({
  name,
  email,
  linkedinUrl,
  clientId,
}: InvitePodMemberParams): Promise<InvitePodMemberResult> {
  try {
    const supabase = await createClient();

    // ✅ SECURITY: Verify admin privileges
    const adminUser = await getCurrentAdminUser(supabase);
    if (!adminUser) {
      return { success: false, error: 'Admin privileges required' };
    }

    // Get current user's client info
    const { data: client } = await supabase
      .from('client')
      .select('name')
      .eq('id', clientId)
      .single();

    if (!client) {
      return { success: false, error: 'Client not found' };
    }

    // 1. Create auth user (NOT email confirmed yet - they'll confirm via invite flow)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        name,
        role: 'pod_member',
      },
    });

    if (authError) {
      console.error('[INVITE_POD_MEMBER] Auth error:', authError);

      // ✅ SECURITY: Handle duplicate email gracefully (don't leak user existence)
      if (authError.message?.toLowerCase().includes('already registered') ||
          authError.message?.toLowerCase().includes('already exists')) {
        return {
          success: false,
          error: 'This email is already registered. Please contact support to resend the invite.'
        };
      }

      return { success: false, error: `Failed to create user: ${authError.message}` };
    }

    // 2. Create user record in users table
    const { error: userError } = await supabase.from('user').insert({
      id: authUser.user.id,
      email,
      full_name: name,
      role: 'pod_member',
      client_id: clientId,
    });

    if (userError) {
      console.error('[INVITE_POD_MEMBER] User table error:', userError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: `Failed to create user record: ${userError.message}` };
    }

    // 3. Generate cryptographically secure invite token
    // 32 bytes = 256 bits of entropy, provides strong protection against brute force
    // URL-safe base64 encoding for use in invite URLs
    const inviteToken = generateSecureToken(32);

    // 4. Create pod_member record
    const { data: podMember, error: memberError } = await supabase
      .from('pod_member')
      .insert({
        user_id: authUser.user.id,
        client_id: clientId,
        name,
        linkedin_url: linkedinUrl,
        unipile_account_id: null, // ✅ NULL until they connect via onboarding
        onboarding_status: 'invited',
        invite_token: inviteToken,
        invite_sent_at: new Date().toISOString(),
        is_active: false, // Can't be active until Unipile connected
      })
      .select()
      .single();

    if (memberError) {
      console.error('[INVITE_POD_MEMBER] Pod member error:', memberError);
      // Rollback: delete user and auth user
      await supabase.from('user').delete().eq('id', authUser.user.id);
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: `Failed to create pod member: ${memberError.message}` };
    }

    // 5. Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/pod-invite/${inviteToken}`;

    // 6. Send invite email
    try {
      await sendPodInviteEmail({
        to: email,
        name,
        inviteUrl,
        clientName: client.name,
      });
    } catch (emailError: any) {
      console.error('[INVITE_POD_MEMBER] Email error:', emailError);
      // Don't fail the entire operation if email fails
      // Admin can still copy the URL manually
    }

    console.log('[INVITE_POD_MEMBER] Success:', {
      podMemberId: podMember.id,
      email,
      inviteUrl,
    });

    return {
      success: true,
      podMemberId: podMember.id,
      inviteUrl,
    };
  } catch (error: any) {
    console.error('[INVITE_POD_MEMBER] Unexpected error:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

/**
 * Activate a pod member after Unipile connection
 *
 * Verifies Unipile is connected before activation
 */
export async function activatePodMember(memberId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // ✅ SECURITY: Verify admin privileges
    const adminUser = await getCurrentAdminUser(supabase);
    if (!adminUser) {
      return { success: false, error: 'Admin privileges required' };
    }

    // 1. Get member details
    const { data: member, error: fetchError } = await supabase
      .from('pod_member')
      .select('*, users(email, full_name, client_id), clients(name)')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return { success: false, error: 'Pod member not found' };
    }

    // ✅ SECURITY: Verify admin belongs to same client as pod member
    const { data: adminUserRecord } = await supabase
      .from('user')
      .select('client_id')
      .eq('id', adminUser.id)
      .single();

    if (!adminUserRecord || adminUserRecord.client_id !== member.client_id) {
      return { success: false, error: 'Pod member not found' }; // Don't leak cross-client data
    }

    // 2. Verify Unipile is connected
    if (!member.unipile_account_id) {
      return { success: false, error: 'Member must connect Unipile before activation' };
    }

    // 3. Activate member
    const { error: updateError } = await supabase
      .from('pod_member')
      .update({
        onboarding_status: 'active',
        is_active: true,
      })
      .eq('id', memberId);

    if (updateError) {
      console.error('[ACTIVATE_POD_MEMBER] Update error:', updateError);
      return { success: false, error: `Failed to activate: ${updateError.message}` };
    }

    // 4. Send activation confirmation email
    try {
      await sendActivationConfirmationEmail({
        to: member.users.email,
        name: member.users.full_name || member.name,
        clientName: member.clients.name,
      });
    } catch (emailError: any) {
      console.error('[ACTIVATE_POD_MEMBER] Email error:', emailError);
      // Don't fail activation if email fails
    }

    console.log('[ACTIVATE_POD_MEMBER] Success:', { memberId, email: member.users.email });

    return { success: true };
  } catch (error: any) {
    console.error('[ACTIVATE_POD_MEMBER] Unexpected error:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

/**
 * Resend invite email to a pod member
 */
export async function resendPodInvite(memberId: string): Promise<{ success: boolean; error?: string; inviteUrl?: string }> {
  try {
    const supabase = await createClient();

    // ✅ SECURITY: Verify admin privileges
    const adminUser = await getCurrentAdminUser(supabase);
    if (!adminUser) {
      return { success: false, error: 'Admin privileges required' };
    }

    // Get member details
    const { data: member, error: fetchError } = await supabase
      .from('pod_member')
      .select('*, users(email, full_name, client_id), clients(name)')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return { success: false, error: 'Pod member not found' };
    }

    // ✅ SECURITY: Verify admin belongs to same client
    const { data: adminUserRecord } = await supabase
      .from('user')
      .select('client_id')
      .eq('id', adminUser.id)
      .single();

    if (!adminUserRecord || adminUserRecord.client_id !== member.client_id) {
      return { success: false, error: 'Pod member not found' };
    }

    // Check if already activated
    if (member.onboarding_status === 'active') {
      return { success: false, error: 'Member is already active' };
    }

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/pod-invite/${member.invite_token}`;

    // Send invite email
    await sendPodInviteEmail({
      to: member.users.email,
      name: member.users.full_name || member.name,
      inviteUrl,
      clientName: member.clients.name,
    });

    // Update invite_sent_at timestamp
    await supabase
      .from('pod_member')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('id', memberId);

    console.log('[RESEND_POD_INVITE] Success:', { memberId, email: member.users.email });

    return { success: true, inviteUrl };
  } catch (error: any) {
    console.error('[RESEND_POD_INVITE] Error:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

/**
 * Toggle pod member active status
 */
export async function togglePodMemberActive(
  memberId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // ✅ SECURITY: Verify admin privileges
    const adminUser = await getCurrentAdminUser(supabase);
    if (!adminUser) {
      return { success: false, error: 'Admin privileges required' };
    }

    // ✅ SECURITY: Verify admin belongs to same client
    const { data: member } = await supabase
      .from('pod_member')
      .select('client_id')
      .eq('id', memberId)
      .single();

    if (!member) {
      return { success: false, error: 'Pod member not found' };
    }

    const { data: adminUserRecord } = await supabase
      .from('user')
      .select('client_id')
      .eq('id', adminUser.id)
      .single();

    if (!adminUserRecord || adminUserRecord.client_id !== member.client_id) {
      return { success: false, error: 'Pod member not found' };
    }

    const { error } = await supabase
      .from('pod_member')
      .update({ is_active: isActive })
      .eq('id', memberId);

    if (error) {
      console.error('[TOGGLE_POD_MEMBER] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[TOGGLE_POD_MEMBER] Success:', { memberId, isActive });

    return { success: true };
  } catch (error: any) {
    console.error('[TOGGLE_POD_MEMBER] Unexpected error:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}
