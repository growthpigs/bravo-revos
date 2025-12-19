import { GologinApi } from 'gologin';
import type { Browser } from 'puppeteer-core';

// GoLogin API client for browser profile management
// Used for LinkedIn repost automation (Unipile doesn't have repost API)

const GOLOGIN_API_TOKEN = process.env.GOLOGIN_API_TOKEN;

if (!GOLOGIN_API_TOKEN) {
  console.warn('[GOLOGIN] GOLOGIN_API_TOKEN not set - repost feature will not work');
}

// Type for the GoLogin API instance
type GologinApiInstance = ReturnType<typeof GologinApi>;

/**
 * Create a new GoLogin profile for a user
 * Called when user enables repost feature in pod settings
 */
export async function createProfile(userId: string): Promise<string> {
  if (!GOLOGIN_API_TOKEN) {
    throw new Error('GOLOGIN_API_TOKEN is not configured');
  }

  const gl = GologinApi({ token: GOLOGIN_API_TOKEN });

  // Create profile with random fingerprint
  const profile = await gl.createProfileRandomFingerprint(`revos-${userId}`);

  return profile.id;
}

/**
 * Get cloud browser URL for user to authenticate LinkedIn
 * Returns URL that opens GoLogin cloud browser with the profile
 */
export async function getCloudBrowserUrl(profileId: string): Promise<string> {
  if (!GOLOGIN_API_TOKEN) {
    throw new Error('GOLOGIN_API_TOKEN is not configured');
  }

  // GoLogin cloud browser URL format
  // User opens this in browser to authenticate LinkedIn
  return `https://cloudbrowser.gologin.com/connect?token=${GOLOGIN_API_TOKEN}&profile=${profileId}`;
}

/**
 * Launch GoLogin profile for automation
 * Used by repost worker to execute browser automation
 *
 * @param profileId - GoLogin profile ID
 * @returns Puppeteer browser instance and GoLogin API instance for cleanup
 */
export async function launchProfile(profileId: string): Promise<{ browser: Browser; gl: GologinApiInstance }> {
  if (!GOLOGIN_API_TOKEN) {
    throw new Error('GOLOGIN_API_TOKEN is not configured');
  }

  const gl = GologinApi({ token: GOLOGIN_API_TOKEN });

  // Launch profile in cloud mode
  const { browser } = await gl.launch({
    profileId,
    cloud: true,
  });

  return { browser, gl };
}

/**
 * Stop GoLogin profile and save session
 * CRITICAL: Must be called after automation to persist LinkedIn session
 */
export async function stopProfile(gl: GologinApiInstance): Promise<void> {
  try {
    await gl.exit();
  } catch (error) {
    console.error('[GOLOGIN] Error stopping profile:', error);
    throw error;
  }
}

/**
 * Delete a GoLogin profile
 * Called when user disconnects their LinkedIn repost capability
 */
export async function deleteProfile(profileId: string): Promise<void> {
  if (!GOLOGIN_API_TOKEN) {
    throw new Error('GOLOGIN_API_TOKEN is not configured');
  }

  const gl = GologinApi({ token: GOLOGIN_API_TOKEN });
  await gl.deleteProfile(profileId);
}
