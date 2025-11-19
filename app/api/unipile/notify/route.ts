import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/unipile/notify
 *
 * UniPile callback endpoint - called when user completes account connection
 * This is the CORRECT flow according to UniPile documentation
 *
 * UniPile sends:
 * {
 *   "status": "CREATION_SUCCESS",
 *   "account_id": "e54m8LR22bA7G5qsAc8w",
 *   "name": "user_id_we_sent"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[UniPile Notify] Received callback:', JSON.stringify(body, null, 2));

    // Check if connection was successful
    if (body.status !== 'CREATION_SUCCESS') {
      console.log('[UniPile Notify] Status was not CREATION_SUCCESS:', body.status);
      return NextResponse.json({ received: true });
    }

    const identifier = body.name; // This is the identifier we sent in the create-hosted-link request
    const accountId = body.account_id;

    if (!identifier || !accountId) {
      console.error('[UniPile Notify] Missing identifier or accountId');
      return NextResponse.json({ received: true });
    }

    // Get UniPile credentials
    const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
    const UNIPILE_DSN = process.env.UNIPILE_DSN || 'https://api3.unipile.com:13344';

    if (!UNIPILE_API_KEY) {
      console.error('[UniPile Notify] API key not configured');
      return NextResponse.json({ received: true });
    }

    // Fetch account details from UniPile
    const accountResponse = await fetch(`${UNIPILE_DSN}/api/v1/accounts/${accountId}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'accept': 'application/json'
      }
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('[UniPile Notify] Failed to fetch account details:', errorText);
      return NextResponse.json({ received: true });
    }

    const account = await accountResponse.json();
    console.log('[UniPile Notify] Account details:', JSON.stringify(account, null, 2));

    // Store connection in database
    const supabase = await createClient();

    // Check if this is an onboarding connection (format: onboarding:{user_id})
    if (identifier.startsWith('onboarding:')) {
      const userId = identifier.replace('onboarding:', '');
      console.log('[UniPile Notify] Onboarding user connection:', userId);

      // Update users table with Unipile account ID
      const { error: updateError } = await supabase
        .from('users')
        .update({
          unipile_account_id: accountId,
          // linkedin_connected will be auto-updated by trigger
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[UniPile Notify] Failed to update user:', updateError);
      } else {
        console.log('[UniPile Notify] Successfully updated onboarding user:', userId);
      }

    }
    // Check if this is a pod member connection (format: pod_member:{id})
    else if (identifier.startsWith('pod_member:')) {
      const podMemberId = identifier.replace('pod_member:', '');
      console.log('[UniPile Notify] Pod member connection:', podMemberId);

      // Update pod_member record with Unipile account ID
      const { error: updateError } = await supabase
        .from('pod_members')
        .update({
          unipile_account_id: accountId,
          onboarding_status: 'unipile_connected',
        })
        .eq('id', podMemberId);

      if (updateError) {
        console.error('[UniPile Notify] Failed to update pod member:', updateError);
      } else {
        console.log('[UniPile Notify] Successfully updated pod member:', podMemberId);
      }

    } else {
      // Regular user connection - store in connected_accounts table
      const userId = identifier;

      const { error: insertError } = await supabase
        .from('connected_accounts')
        .upsert({
          user_id: userId,
          provider: account.type?.toLowerCase() || 'unknown',
          account_id: accountId,
          account_name: account.name || 'Unknown Account',
          status: 'active',
          last_sync_at: new Date().toISOString()
        }, {
          onConflict: 'account_id',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error('[UniPile Notify] Failed to store connection:', insertError);
      } else {
        console.log('[UniPile Notify] Successfully stored connection for user:', userId);
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[UniPile Notify] Error:', error);
    return NextResponse.json({ received: true }); // Always return success to UniPile
  }
}
