/**
 * OAuth Token Provider for Chat Functions
 *
 * Provides access to user's OAuth tokens for calling external APIs
 * (Gmail, Calendar, Drive, Slack, etc.) from within chat functions.
 *
 * SECURITY:
 * - Tokens decrypted only when needed
 * - Tokens never logged
 * - Access scoped to user's own tokens only (RLS enforced)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptToken, deserializeEncryptedToken } from '@/lib/crypto';

/**
 * OAuth integration types supported
 */
export type OAuthIntegrationType =
  | 'gmail'
  | 'google-calendar'
  | 'google-drive'
  | 'slack';

/**
 * Decrypted OAuth credentials
 */
export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * OAuth credential status
 */
export interface OAuthStatus {
  connected: boolean;
  type: OAuthIntegrationType;
  lastSyncAt?: Date;
  errorMessage?: string;
}

/**
 * Get OAuth credentials for a user's integration
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @param type - Integration type (gmail, slack, etc.)
 * @returns Decrypted OAuth credentials or null if not connected
 */
export async function getOAuthCredentials(
  supabase: SupabaseClient,
  userId: string,
  type: OAuthIntegrationType
): Promise<OAuthCredentials | null> {
  try {
    // Fetch encrypted tokens from database
    const { data, error } = await supabase
      .from('user_oauth_credential')
      .select('access_token, refresh_token, expires_at, is_connected')
      .eq('user_id', userId)
      .eq('type', type)
      .single();

    if (error || !data || !data.is_connected) {
      // Not connected - do not log userId
      return null;
    }

    // Decrypt access token
    const encryptedToken = deserializeEncryptedToken(data.access_token);
    if (!encryptedToken) {
      console.error(`[OAuth] Failed to deserialize ${type} token`);
      return null;
    }

    const accessToken = decryptToken(encryptedToken);
    if (!accessToken) {
      console.error(`[OAuth] Failed to decrypt ${type} token`);
      return null;
    }

    // Decrypt refresh token if present
    let refreshToken: string | undefined;
    if (data.refresh_token) {
      const encryptedRefresh = deserializeEncryptedToken(data.refresh_token);
      if (encryptedRefresh) {
        refreshToken = decryptToken(encryptedRefresh) || undefined;
      }
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    };
  } catch (error) {
    console.error(`[OAuth] Error fetching ${type} credentials:`, error);
    return null;
  }
}

/**
 * Get OAuth status for all integrations for a user
 */
export async function getAllOAuthStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<OAuthStatus[]> {
  try {
    const { data, error } = await supabase
      .from('user_oauth_credential')
      .select('type, is_connected, last_sync_at, error_message')
      .eq('user_id', userId);

    if (error || !data) {
      return [];
    }

    return data.map(cred => ({
      type: cred.type as OAuthIntegrationType,
      connected: cred.is_connected || false,
      lastSyncAt: cred.last_sync_at ? new Date(cred.last_sync_at) : undefined,
      errorMessage: cred.error_message || undefined,
    }));
  } catch (error) {
    console.error('[OAuth] Error fetching all OAuth status:', error);
    return [];
  }
}

/**
 * Check if a specific integration is connected
 */
export async function isIntegrationConnected(
  supabase: SupabaseClient,
  userId: string,
  type: OAuthIntegrationType
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_oauth_credential')
      .select('is_connected')
      .eq('user_id', userId)
      .eq('type', type)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_connected || false;
  } catch (error) {
    console.error(`[OAuth] Error checking ${type} connection:`, error);
    return false;
  }
}

/**
 * Mark integration as disconnected (e.g., after token expiry)
 */
export async function markIntegrationDisconnected(
  supabase: SupabaseClient,
  userId: string,
  type: OAuthIntegrationType,
  errorMessage: string
): Promise<void> {
  try {
    await supabase
      .from('user_oauth_credential')
      .update({
        is_connected: false,
        error_message: errorMessage,
      })
      .eq('user_id', userId)
      .eq('type', type);
  } catch (error) {
    console.error(`[OAuth] Error marking ${type} as disconnected:`, error);
  }
}

/**
 * Get Google OAuth credentials (for Gmail, Calendar, Drive)
 * These all use the same Google OAuth flow, so credentials are shared
 */
export async function getGoogleCredentials(
  supabase: SupabaseClient,
  userId: string
): Promise<OAuthCredentials | null> {
  // Try gmail first (most common)
  const gmailCreds = await getOAuthCredentials(supabase, userId, 'gmail');
  if (gmailCreds) return gmailCreds;

  // Fall back to calendar or drive if configured
  const calendarCreds = await getOAuthCredentials(supabase, userId, 'google-calendar');
  if (calendarCreds) return calendarCreds;

  const driveCreds = await getOAuthCredentials(supabase, userId, 'google-drive');
  if (driveCreds) return driveCreds;

  return null;
}

/**
 * Integration context for chat functions
 */
export interface ChatFunctionOAuthContext {
  /** User's Google OAuth credentials (Gmail/Calendar/Drive) */
  google?: OAuthCredentials;
  /** User's Slack OAuth credentials */
  slack?: OAuthCredentials;
  /** Status of all integrations */
  integrationStatus: OAuthStatus[];
}

/**
 * Load OAuth context for chat functions
 * Call this once at the start of chat processing
 */
export async function loadChatFunctionOAuthContext(
  supabase: SupabaseClient,
  userId: string
): Promise<ChatFunctionOAuthContext> {
  const [google, slack, integrationStatus] = await Promise.all([
    getGoogleCredentials(supabase, userId),
    getOAuthCredentials(supabase, userId, 'slack'),
    getAllOAuthStatus(supabase, userId),
  ]);

  return {
    google: google || undefined,
    slack: slack || undefined,
    integrationStatus,
  };
}
