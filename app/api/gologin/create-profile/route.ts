/**
 * POST /api/gologin/create-profile
 * Create a GoLogin profile for a user to enable repost feature
 *
 * Flow:
 * 1. User enables "repost" toggle in pod settings
 * 2. Frontend calls this endpoint
 * 3. We create GoLogin profile and return cloud browser URL
 * 4. User authenticates LinkedIn in GoLogin browser
 * 5. Session is saved, repost feature now works
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProfile, getCloudBrowserUrl } from '@/lib/gologin/client';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient({ isServiceRole: false });
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { linkedinAccountId } = await request.json();

    if (!linkedinAccountId) {
      return NextResponse.json(
        { error: 'linkedinAccountId is required' },
        { status: 400 }
      );
    }

    // Use service role for database operations
    const supabase = await createClient({ isServiceRole: true });

    // Verify the LinkedIn account belongs to this user
    const { data: linkedinAccount, error: accountError } = await supabase
      .from('linkedin_accounts')
      .select('id, user_id, gologin_profile_id, gologin_status')
      .eq('id', linkedinAccountId)
      .single();

    if (accountError || !linkedinAccount) {
      return NextResponse.json(
        { error: 'LinkedIn account not found' },
        { status: 404 }
      );
    }

    // Check if profile already exists
    if (linkedinAccount.gologin_profile_id) {
      // Return existing profile URL
      const authUrl = await getCloudBrowserUrl(linkedinAccount.gologin_profile_id);
      return NextResponse.json({
        profileId: linkedinAccount.gologin_profile_id,
        authUrl,
        status: linkedinAccount.gologin_status,
        message: 'GoLogin profile already exists. Open authUrl to re-authenticate if needed.'
      });
    }

    // Create new GoLogin profile
    console.log(`[GOLOGIN] Creating profile for user ${user.id}`);
    const profileId = await createProfile(user.id);

    // Get cloud browser URL for authentication
    const authUrl = await getCloudBrowserUrl(profileId);

    // Store profile ID in database (pending until auth completes)
    const { error: updateError } = await supabase
      .from('linkedin_accounts')
      .update({
        gologin_profile_id: profileId,
        gologin_status: 'pending_auth'
      })
      .eq('id', linkedinAccountId);

    if (updateError) {
      console.error('[GOLOGIN] Failed to update linkedin_accounts:', updateError);
      return NextResponse.json(
        { error: 'Failed to save profile ID' },
        { status: 500 }
      );
    }

    console.log(`[GOLOGIN] Profile ${profileId} created for LinkedIn account ${linkedinAccountId}`);

    return NextResponse.json({
      profileId,
      authUrl,
      status: 'pending_auth',
      message: 'GoLogin profile created. Open authUrl in browser to complete LinkedIn authentication.'
    });

  } catch (error: any) {
    console.error('[GOLOGIN] Error creating profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create GoLogin profile' },
      { status: 500 }
    );
  }
}
