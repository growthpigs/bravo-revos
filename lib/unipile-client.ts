/**
 * Unipile Client
 * Handles all Unipile API interactions for LinkedIn account management
 *
 * Supports both system-wide (fallback) and per-client Unipile credentials.
 * When client credentials are provided, they take precedence over system-wide env vars.
 */

import crypto from 'crypto';

// Note: We're using REST API calls directly instead of UnipileClient SDK
// because the SDK initialization happens at build-time and fails if UNIPILE_API_KEY is not set

/**
 * Unipile API Credentials
 * Can be either system-wide (from env vars) or per-client (from database)
 */
export interface UnipileCredentials {
  apiKey: string;
  dsn: string;
}

/**
 * Check if mock mode is enabled
 * Mock mode is enabled when UNIPILE_MOCK_MODE is explicitly set to 'true' or '1'
 * This ensures production safety by defaulting to false
 */
function isMockMode(): boolean {
  // Handle string environment variables safely
  // "true" or "1" enables mock mode
  // "false", "0", undefined, or empty disables mock mode
  const envValue = process.env.UNIPILE_MOCK_MODE?.toLowerCase() || '';
  return envValue === 'true' || envValue === '1';
}

/**
 * Get Unipile credentials - either from client config or fallback to system-wide
 * @param clientCredentials - Optional per-client credentials (takes precedence)
 * @returns UnipileCredentials with apiKey and dsn
 */
function getUnipileCredentials(clientCredentials?: UnipileCredentials | null): UnipileCredentials {
  if (clientCredentials?.apiKey && clientCredentials?.dsn) {
    return clientCredentials;
  }

  // Fallback to system-wide credentials from environment variables
  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn = process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211';

  if (!apiKey) {
    throw new Error(
      'Unipile API credentials not configured. ' +
      'Provide per-client credentials via function parameter or set UNIPILE_API_KEY environment variable.'
    );
  }

  return { apiKey, dsn };
}

/**
 * Types for Unipile operations
 */
export interface UnipileAuthResponse {
  account_id: string;
  provider: string;
  status: 'OK' | 'CREDENTIALS' | 'DISCONNECTED';
  name?: string;
  email?: string;
}

export interface UnipileAccountStatus {
  id: string;
  provider: string;
  status: 'OK' | 'CREDENTIALS' | 'DISCONNECTED';
  name: string;
  email: string;
  created_at: string;
  last_update: string;
}

export interface UnipileCheckpointResponse {
  account_id: string;
  status: 'OK' | 'CHECKPOINT_REQUIRED';
  checkpoint_type?: 'OTP' | '2FA' | 'IN_APP_VALIDATION' | 'PHONE_REGISTER' | 'CAPTCHA';
}

export interface UnipileComment {
  id: string;
  text: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    headline?: string;
    profile_url?: string;
    connections_count?: number;
  };
  replies_count?: number;
}

/**
 * Connect LinkedIn account using username/password
 * Returns account_id on success, checkpoint info if checkpoint required
 * Supports mock mode for testing
 * @param username - LinkedIn email
 * @param password - LinkedIn password
 * @param clientCredentials - Optional per-client Unipile credentials (uses system-wide if not provided)
 */
export async function authenticateLinkedinAccount(
  username: string,
  password: string,
  clientCredentials?: UnipileCredentials | null
): Promise<UnipileAuthResponse | UnipileCheckpointResponse> {
  try {
    const credentials = getUnipileCredentials(clientCredentials);

    // DEBUG: Log credentials being used (mask API key for security)
    console.log('[UNIPILE_DEBUG] Credentials being used:', {
      dsn: credentials.dsn,
      apiKey: credentials.apiKey ? `${credentials.apiKey.substring(0, 10)}...` : 'MISSING',
      mockMode: isMockMode(),
      env_UNIPILE_API_KEY: process.env.UNIPILE_API_KEY ? `${process.env.UNIPILE_API_KEY.substring(0, 10)}...` : 'MISSING',
      env_UNIPILE_DSN: process.env.UNIPILE_DSN || 'NOT SET',
      env_UNIPILE_MOCK_MODE: process.env.UNIPILE_MOCK_MODE,
    });

    // Mock mode for testing (when UNIPILE_MOCK_MODE !== 'false')
    if (isMockMode()) {
      console.log('[MOCK] Authenticating LinkedIn account:', username);

      // Simulate slight delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        account_id: `mock_${crypto.randomBytes(9).toString('base64url')}`,
        provider: 'LINKEDIN',
        status: 'OK',
        name: username.split('@')[0].toUpperCase(),
        email: username,
      };
    }

    // Build the payload BEFORE stringifying to check for corruption
    const payload = {
      provider: 'LINKEDIN',
      username,
      password,
    };

    // DIAGNOSTIC: Log exact payload being sent to Unipile
    console.log('[UNIPILE_PAYLOAD] Exact JSON being sent:', JSON.stringify(payload));
    console.log('[UNIPILE_PAYLOAD] Password details:', {
      length: password.length,
      byteLength: Buffer.from(password).length,
      starts: password.slice(0, 3),
      ends: password.slice(-3),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>\[\]+=_-]/.test(password)
    });

    // Log the full request for debugging (mask password in display)
    console.log('[UNIPILE_REQUEST]', {
      url: `${credentials.dsn}/api/v1/accounts`,
      method: 'POST',
      headers: {
        'X-API-KEY': credentials.apiKey ? `${credentials.apiKey.substring(0, 10)}...` : 'MISSING',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: {
        provider: 'LINKEDIN',
        username,
        password: '***MASKED***',
      },
    });

    const response = await fetch(
      `${credentials.dsn}/api/v1/accounts`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      // Try to read error response body for details
      let errorDetails = '';
      try {
        const errorBody = await response.json();
        errorDetails = JSON.stringify(errorBody, null, 2);
        console.error('[UNIPILE_ERROR] Response body:', errorBody);
      } catch (e) {
        // Response might not be JSON
        try {
          const errorText = await response.text();
          errorDetails = errorText;
          console.error('[UNIPILE_ERROR] Response text:', errorText);
        } catch (textError) {
          console.error('[UNIPILE_ERROR] Could not read error response');
        }
      }

      const errorMessage = `Unipile auth failed: ${response.status} ${response.statusText}${errorDetails ? `\nDetails: ${errorDetails}` : ''}`;
      console.error('[UNIPILE_ERROR] Full error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error authenticating LinkedIn account:', error);
    throw error;
  }
}

/**
 * Resolve LinkedIn account checkpoint (2FA, OTP, etc.)
 * @param accountId - Unipile account ID
 * @param code - Verification code
 * @param clientCredentials - Optional per-client Unipile credentials (uses system-wide if not provided)
 */
export async function resolveCheckpoint(
  accountId: string,
  code: string,
  clientCredentials?: UnipileCredentials | null
): Promise<UnipileAuthResponse> {
  try {
    const credentials = getUnipileCredentials(clientCredentials);

    const response = await fetch(
      `${credentials.dsn}/api/v1/accounts/${accountId}/checkpoint`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      }
    );

    if (!response.ok) {
      throw new Error(`Checkpoint resolution failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error resolving checkpoint:', error);
    throw error;
  }
}

/**
 * Get account status from Unipile
 * Supports mock mode for testing
 */
export async function getAccountStatus(accountId: string, clientCredentials?: UnipileCredentials | null): Promise<UnipileAccountStatus> {
  try {
    const credentials = getUnipileCredentials(clientCredentials);

    // Mock mode for testing (when UNIPILE_MOCK_MODE !== 'false')
    if (isMockMode()) {
      console.log('[MOCK] Getting account status:', accountId);
      return {
        id: accountId,
        provider: 'LINKEDIN',
        status: 'OK',
        name: 'Test Account',
        email: 'test@linkedin.com',
        created_at: new Date().toISOString(),
        last_update: new Date().toISOString(),
      };
    }

    const response = await fetch(
      `${credentials.dsn}/api/v1/accounts/${accountId}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get account status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting account status:', error);
    throw error;
  }
}

/**
 * Disconnect account from Unipile
 */
export async function disconnectAccount(accountId: string, clientCredentials?: UnipileCredentials | null): Promise<void> {
  try {
    const credentials = getUnipileCredentials(clientCredentials);

    const response = await fetch(
      `${credentials.dsn}/api/v1/accounts/${accountId}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-KEY': credentials.apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to disconnect account: ${response.status}`);
    }
  } catch (error) {
    console.error('Error disconnecting account:', error);
    throw error;
  }
}

/**
 * List all connected Unipile accounts
 */
export async function listAccounts(): Promise<UnipileAccountStatus[]> {
  try {
    const response = await fetch(
      `${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}/api/v1/accounts`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY || '',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list accounts: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error listing accounts:', error);
    throw error;
  }
}

/**
 * Get all comments for a specific LinkedIn post
 * Used for comment polling to detect trigger words
 */
export async function getAllPostComments(
  accountId: string,
  postId: string
): Promise<UnipileComment[]> {
  try {
    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Fetching comments for post:', postId);
      await new Promise(resolve => setTimeout(resolve, 300));

      return [
        {
          id: `mock_comment_${crypto.randomBytes(9).toString('base64url')}`,
          text: 'SCALE - I would love to get this!',
          created_at: new Date().toISOString(),
          author: {
            id: 'mock_author_1',
            name: 'John Doe',
            headline: 'CEO at Tech Startup',
            profile_url: 'https://linkedin.com/in/johndoe',
            connections_count: 500,
          },
          replies_count: 0,
        },
        {
          id: `mock_comment_${crypto.randomBytes(9).toString('base64url')}`,
          text: 'Great post!',
          created_at: new Date(Date.now() - 60000).toISOString(),
          author: {
            id: 'mock_author_2',
            name: 'LinkedIn Bot',
            headline: 'Marketing bot',
            profile_url: 'https://linkedin.com/in/bot',
            connections_count: 5,
          },
          replies_count: 0,
        },
      ];
    }

    const credentials = getUnipileCredentials();

    // STEP 1: First retrieve the post to get the correct social_id
    // Unipile docs: "You need to retrieve id part in URL... use retrieve post route with this id and take in result social_id"
    // This handles both activity posts and ugcPost formats correctly
    console.log('[UNIPILE_COMMENTS] Step 1: Retrieving post to get social_id:', { accountId, postId });

    let socialId: string;

    try {
      // Try to get the post first to get the correct social_id format
      const postUrl = `${credentials.dsn}/api/v1/posts/${postId}?account_id=${accountId}`;
      console.log('[UNIPILE_COMMENTS] Fetching post from:', postUrl);

      const postResponse = await fetch(postUrl, {
        method: 'GET',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Accept': 'application/json',
        },
      });

      if (postResponse.ok) {
        const postData = await postResponse.json();
        // Use the social_id from the API response - this is the correct format
        socialId = postData.social_id || postData.id || postId;
        console.log('[UNIPILE_COMMENTS] Got social_id from API:', socialId);
      } else {
        // Fallback: construct the URN ourselves (may not work for all post types)
        console.warn('[UNIPILE_COMMENTS] Could not fetch post, using fallback URN format');
        socialId = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
      }
    } catch (postError) {
      // Fallback if post retrieval fails
      console.warn('[UNIPILE_COMMENTS] Post retrieval failed, using fallback:', postError);
      socialId = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
    }

    console.log('[UNIPILE_COMMENTS] Step 2: Fetching comments with social_id:', socialId);

    // CRITICAL FIX: Do NOT URL-encode the social_id
    // The colons in "urn:li:activity:XXX" should NOT be encoded as %3A
    // Unipile expects the raw URN format in the path
    const url = `${credentials.dsn}/api/v1/posts/${socialId}/comments?account_id=${accountId}`;
    console.log('[UNIPILE_COMMENTS] Request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': credentials.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[UNIPILE_COMMENTS] Error response:', response.status, errorBody);
      throw new Error(`Failed to get post comments: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    console.log('[UNIPILE_COMMENTS] Found comments:', data.items?.length || 0);
    return data.items || [];
  } catch (error) {
    console.error('Error getting post comments:', error);
    throw error;
  }
}

/**
 * Send a direct message to a LinkedIn user via Unipile
 * @param accountId - Unipile account ID
 * @param recipientId - LinkedIn user ID to send DM to
 * @param message - Message text to send
 * @returns Response with message ID and status
 */
export async function sendDirectMessage(
  accountId: string,
  recipientId: string,
  message: string
): Promise<{ message_id: string; status: string; chat_id?: string }> {
  try {
    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Sending DM:', {
        accountId,
        recipientId,
        messageLength: message.length,
      });
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

      // Simulate occasional failure (10% chance)
      if (Math.random() < 0.1) {
        throw new Error('MOCK: Simulated rate limit exceeded');
      }

      return {
        message_id: `mock_msg_${crypto.randomBytes(9).toString('base64url')}`,
        status: 'sent',
        chat_id: `mock_chat_${crypto.randomBytes(6).toString('base64url')}`,
      };
    }

    const credentials = getUnipileCredentials();

    console.log('[UNIPILE_DM] Sending message:', { accountId, recipientId, messageLength: message.length });

    // Unipile API: POST /api/v1/chats with attendees_ids array
    // This creates a chat if it doesn't exist, or sends to existing chat
    const response = await fetch(
      `${credentials.dsn}/api/v1/chats`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          account_id: accountId,
          attendees_ids: [recipientId],  // Array of recipient LinkedIn IDs
          text: message,
        }),
      }
    );

    console.log('[UNIPILE_DM] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UNIPILE_DM] Error response:', response.status, errorText);

      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED: LinkedIn daily DM limit reached');
      }

      // Handle "not connected" error - can only DM connections
      if (response.status === 400 && errorText.includes('not connected')) {
        throw new Error('NOT_CONNECTED: Can only send DMs to LinkedIn connections');
      }

      throw new Error(`Failed to send DM: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[UNIPILE_DM] Success:', { chat_id: data.chat_id, provider_id: data.provider_id });

    return {
      message_id: data.provider_id || data.chat_id || data.id,
      status: 'sent',
      chat_id: data.chat_id,
    };
  } catch (error) {
    console.error('[UNIPILE_DM] Error:', error);
    throw error;
  }
}

/**
 * Get latest posts from a LinkedIn user for pod post detection
 * @param accountId - Unipile account ID
 * @param userId - LinkedIn user ID to fetch posts from
 * @returns Array of posts with metadata
 */
export interface UnipilePost {
  id: string;
  text: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  reposts_count?: number;
  author: {
    id: string;
    name: string;
    profile_url?: string;
  };
}

export async function getUserLatestPosts(
  accountId: string,
  userId: string,
  limit: number = 10
): Promise<UnipilePost[]> {
  try {
    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Fetching latest posts from user:', userId);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Return mock posts
      return [
        {
          id: `mock_post_${crypto.randomBytes(9).toString('base64url')}`,
          text: 'Just launched our new product! Excited to share with everyone.',
          created_at: new Date().toISOString(),
          likes_count: 234,
          comments_count: 45,
          reposts_count: 12,
          author: {
            id: userId,
            name: 'Pod Member',
            profile_url: `https://linkedin.com/in/user-${userId}`,
          },
        },
      ];
    }

    const response = await fetch(
      `${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}/api/v1/users/${userId}/posts?account_id=${accountId}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY || '',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get user posts: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error getting user posts:', error);
    throw error;
  }
}

/**
 * Create a LinkedIn post via Unipile
 * @param accountId - Unipile account ID
 * @param text - Post content text
 * @param clientCredentials - Optional per-client Unipile credentials
 * @param timeoutMs - Timeout in milliseconds (default 25000)
 * @returns Created post details with ID and URL
 */
export interface CreatePostResponse {
  id: string;
  url?: string;
  text: string;
  created_at: string;
  status: string;
}

/**
 * Get direct messages from a conversation
 * Used for email extraction from DM replies
 * @param accountId - Unipile account ID
 * @param userId - LinkedIn user ID (conversation partner)
 * @param since - Only return messages after this date
 * @returns Array of messages in the conversation
 */
export interface UnipileMessage {
  id: string;
  text: string;
  created_at: string;
  direction: 'inbound' | 'outbound'; // inbound = user replied to us
  author: {
    id: string;
    name: string;
  };
}

export async function getDirectMessages(
  accountId: string,
  userId: string,
  since?: Date
): Promise<UnipileMessage[]> {
  try {
    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Fetching DM messages from user:', userId);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Return mock DM reply with email
      return [
        {
          id: `mock_dm_${crypto.randomBytes(9).toString('base64url')}`,
          text: 'Sure! My email is john.doe@example.com - looking forward to it!',
          created_at: new Date().toISOString(),
          direction: 'inbound',
          author: {
            id: userId,
            name: 'John Doe',
          },
        },
      ];
    }

    // Build query params
    const params = new URLSearchParams({
      account_id: accountId,
      limit: '100',
    });

    if (since) {
      params.append('since', since.toISOString());
    }

    const response = await fetch(
      `${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}/api/v1/messaging/conversations/${userId}/messages?${params}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY || '',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get DM messages: ${response.status}`);
    }

    const data = await response.json();
    const messages = data.items || data.messages || [];

    // Filter for inbound messages only (user replies, not our outbound DMs)
    return messages.filter((msg: any) => msg.direction === 'inbound');
  } catch (error) {
    console.error('Error getting direct messages:', error);
    throw error;
  }
}

export async function createLinkedInPost(
  accountId: string,
  text: string,
  clientCredentials?: UnipileCredentials | null,
  timeoutMs: number = 25000 // Default 25s timeout (safe for 30s/60s serverless limits)
): Promise<CreatePostResponse> {
  // Setup AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const credentials = getUnipileCredentials(clientCredentials);

    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Creating LinkedIn post:', {
        accountId,
        textLength: text.length,
        preview: text.substring(0, 50),
      });
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        id: `mock_post_${crypto.randomBytes(9).toString('base64url')}`,
        url: `https://www.linkedin.com/feed/update/urn:li:activity:${Date.now()}`,
        text,
        created_at: new Date().toISOString(),
        status: 'published',
      };
    }

    console.log('[UNIPILE_POST] Creating LinkedIn post:', {
      accountId,
      textLength: text.length,
      dsn: credentials.dsn,
      timeout: timeoutMs
    });

    const response = await fetch(
      `${credentials.dsn}/api/v1/posts`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          account_id: accountId,
          text,
          provider: 'LINKEDIN',
        }),
        signal: controller.signal, // Attach abort signal
      }
    );

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorBody = await response.json();
        errorDetails = JSON.stringify(errorBody, null, 2);
        console.error('[UNIPILE_POST_ERROR] Response body:', errorBody);
      } catch (e) {
        try {
          const errorText = await response.text();
          errorDetails = errorText;
          console.error('[UNIPILE_POST_ERROR] Response text:', errorText);
        } catch (textError) {
          console.error('[UNIPILE_POST_ERROR] Could not read error response');
        }
      }

      throw new Error(
        `Failed to create LinkedIn post: ${response.status} ${response.statusText}${errorDetails ? `\nDetails: ${errorDetails}` : ''}`
      );
    }

    const data = await response.json();

    // CRITICAL: Extract the LinkedIn activity ID from share_url for comment retrieval
    // Unipile's post_id is their internal ID, but we need the LinkedIn activity ID
    // Format: https://www.linkedin.com/feed/update/urn:li:activity:7399434743425105920
    // We need: 7399434743425105920 (the activity number)
    let shareUrl = data.share_url || data.url || '';
    let linkedinActivityId: string | null = null;

    // Try to extract from share_url
    const activityMatch = shareUrl.match(/urn:li:(?:activity|ugcPost):(\d+)/);
    if (activityMatch) {
      linkedinActivityId = activityMatch[1];
      console.log('[UNIPILE_POST] Extracted LinkedIn activity ID from URL:', linkedinActivityId);
    }

    // Also check for social_id in response (some Unipile versions return this)
    if (!linkedinActivityId && data.social_id) {
      const socialIdMatch = data.social_id.match(/urn:li:(?:activity|ugcPost):(\d+)/);
      if (socialIdMatch) {
        linkedinActivityId = socialIdMatch[1];
        console.log('[UNIPILE_POST] Extracted LinkedIn activity ID from social_id:', linkedinActivityId);
      }
    }

    // If we still don't have the LinkedIn activity ID, fetch user's recent posts to find it
    // This is needed because Unipile POST /posts doesn't always return share_url or social_id
    if (!linkedinActivityId) {
      console.log('[UNIPILE_POST] share_url/social_id not in response, fetching recent posts to find activity ID...');
      try {
        // Get user profile to get their user ID
        const profileResponse = await fetch(
          `${credentials.dsn}/api/v1/users/me?account_id=${accountId}`,
          {
            method: 'GET',
            headers: {
              'X-API-KEY': credentials.apiKey,
              'Accept': 'application/json',
            },
          }
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const userId = profileData.id || profileData.provider_id;

          if (userId) {
            // Fetch recent posts (limit 5 to find the one we just created)
            const postsResponse = await fetch(
              `${credentials.dsn}/api/v1/users/${userId}/posts?account_id=${accountId}&limit=5`,
              {
                method: 'GET',
                headers: {
                  'X-API-KEY': credentials.apiKey,
                  'Accept': 'application/json',
                },
              }
            );

            if (postsResponse.ok) {
              const postsData = await postsResponse.json();
              const recentPosts = postsData.items || [];

              // Match by content (first 100 chars)
              const contentToMatch = text.substring(0, 100).toLowerCase().trim();
              const matchedPost = recentPosts.find((p: { text?: string }) => {
                const postContent = (p.text || '').substring(0, 100).toLowerCase().trim();
                return postContent === contentToMatch;
              });

              if (matchedPost) {
                // Extract from social_id or share_url
                const matchedSocialId = matchedPost.social_id;
                const matchedShareUrl = matchedPost.share_url || matchedPost.url;

                if (matchedSocialId) {
                  const socialMatch = matchedSocialId.match(/urn:li:(?:activity|ugcPost):(\d+)/);
                  if (socialMatch) {
                    linkedinActivityId = socialMatch[1];
                    shareUrl = matchedShareUrl || shareUrl;
                    console.log('[UNIPILE_POST] Found activity ID from recent posts:', linkedinActivityId);
                  }
                } else if (matchedShareUrl) {
                  const urlMatch = matchedShareUrl.match(/urn:li:(?:activity|ugcPost):(\d+)/);
                  if (urlMatch) {
                    linkedinActivityId = urlMatch[1];
                    shareUrl = matchedShareUrl;
                    console.log('[UNIPILE_POST] Found activity ID from recent posts URL:', linkedinActivityId);
                  }
                }
              } else {
                console.warn('[UNIPILE_POST] Could not find matching post in recent posts');
              }
            }
          }
        }
      } catch (fetchError) {
        console.warn('[UNIPILE_POST] Error fetching recent posts for activity ID:', fetchError);
        // Continue with fallback - don't fail the whole post creation
      }
    }

    // Fallback to Unipile's post_id (may not work for comments API)
    const postId = linkedinActivityId || data.post_id || data.id;

    // CRITICAL FIX: Construct share_url from activity ID if not provided
    // This ensures we always have a valid LinkedIn post URL for campaign tracking
    if (!shareUrl && linkedinActivityId) {
      shareUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${linkedinActivityId}`;
      console.log('[UNIPILE_POST] Constructed share_url from activity ID:', shareUrl);
    }

    console.log('[UNIPILE_POST] Post created successfully:', {
      unipile_internal_id: data.post_id || data.id,
      linkedin_activity_id: linkedinActivityId,
      final_id: postId,
      url: shareUrl,
      social_id: data.social_id,
    });

    return {
      id: postId,
      url: shareUrl || null,  // Return null instead of empty string
      text: data.text || text,
      created_at: data.created_at || data.parsed_datetime || new Date().toISOString(),
      status: data.status || 'published',
    };
  } catch (error: any) {
    // Handle abort error specifically
    if (error.name === 'AbortError') {
      console.error('[UNIPILE_POST_TIMEOUT] Request timed out after', timeoutMs, 'ms');
      throw new Error(`LinkedIn post creation timed out after ${timeoutMs}ms`);
    }
    
    console.error('Error creating LinkedIn post:', error);
    throw error;
  } finally {
    // Clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
  }
}
