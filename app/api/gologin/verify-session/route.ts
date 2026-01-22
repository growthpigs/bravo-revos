/**
 * POST /api/gologin/verify-session
 * Verify that a GoLogin profile has a valid LinkedIn session
 *
 * Called after user completes authentication in GoLogin cloud browser
 * Launches the profile, checks if LinkedIn is logged in, updates status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { launchProfile, stopProfile } from '@/lib/gologin/client';

// Helper function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient({ isServiceRole: false });
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { linkedinAccountId, profileId } = await request.json();

    if (!linkedinAccountId || !profileId) {
      return NextResponse.json(
        { error: 'linkedinAccountId and profileId are required' },
        { status: 400 }
      );
    }

    // Use service role for database operations
    const supabase = await createClient({ isServiceRole: true });

    // Verify the LinkedIn account exists and has the expected profile
    const { data: linkedinAccount, error: accountError } = await supabase
      .from('linkedin_account')
      .select('id, gologin_profile_id, gologin_status')
      .eq('id', linkedinAccountId)
      .single();

    if (accountError || !linkedinAccount) {
      return NextResponse.json(
        { error: 'LinkedIn account not found' },
        { status: 404 }
      );
    }

    if (linkedinAccount.gologin_profile_id !== profileId) {
      return NextResponse.json(
        { error: 'Profile ID mismatch' },
        { status: 400 }
      );
    }

    console.log(`[GOLOGIN] Verifying session for profile ${profileId}`);

    // Launch the GoLogin profile and check LinkedIn login status
    let browser;
    let gl;
    let isLoggedIn = false;

    try {
      const result = await launchProfile(profileId);
      browser = result.browser;
      gl = result.gl;

      const page = await browser.newPage();

      // Navigate to LinkedIn feed to check login status
      await page.goto('https://www.linkedin.com/feed/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait a bit for page to load
      await delay(3000);

      // Check if we're on the feed (logged in) or login page
      // Feed has posts, login page has sign-in form
      const feedPosts = await page.$('.feed-shared-update-v2');
      const loginForm = await page.$('form.login__form');

      isLoggedIn = feedPosts !== null && loginForm === null;

      console.log(`[GOLOGIN] Session check result: ${isLoggedIn ? 'LOGGED_IN' : 'NOT_LOGGED_IN'}`);

      await page.close();
    } catch (launchError: any) {
      console.error('[GOLOGIN] Error launching profile:', launchError);
      return NextResponse.json({
        success: false,
        status: 'error',
        error: launchError.message || 'Failed to launch GoLogin profile'
      }, { status: 500 });
    } finally {
      // CRITICAL: Always stop the profile to save session and release resources
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('[GOLOGIN] Browser close error:', e);
        }
      }
      if (gl) {
        try {
          await stopProfile(gl);
        } catch (e) {
          console.error('[GOLOGIN] Profile stop error:', e);
        }
      }
    }

    // Update status based on result
    const newStatus = isLoggedIn ? 'active' : 'pending_auth';

    const { error: updateError } = await supabase
      .from('linkedin_account')
      .update({ gologin_status: newStatus })
      .eq('id', linkedinAccountId);

    if (updateError) {
      console.error('[GOLOGIN] Failed to update status:', updateError);
    }

    return NextResponse.json({
      success: isLoggedIn,
      status: newStatus,
      message: isLoggedIn
        ? 'LinkedIn session verified. Repost feature is now active.'
        : 'LinkedIn session not found. Please authenticate in the GoLogin browser.'
    });

  } catch (error: any) {
    console.error('[GOLOGIN] Error verifying session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify session' },
      { status: 500 }
    );
  }
}
