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

// Unipile API returns author as string + author_details object
// Mock mode uses author as object for backwards compatibility
export interface UnipileComment {
  id: string;
  text: string;
  created_at?: string;
  date?: string; // Unipile uses 'date' field
  post_id?: string;
  post_urn?: string;
  // Real API: author is string name, author_details has id/profile
  // Mock mode: author is object with id/name/etc
  author: string | {
    id: string;
    name: string;
    headline?: string;
    profile_url?: string;
    connections_count?: number;
  };
  author_details?: {
    id: string;
    is_company?: boolean;
    headline?: string;
    profile_url?: string;
    network_distance?: string;
  };
  replies_count?: number;
}

/**
 * Extract author info from a UnipileComment (handles both real API and mock formats)
 * Real API: author is string, author_details has {id, profile_url, etc}
 * Mock mode: author is object {id, name, headline, etc}
 */
export function extractCommentAuthor(comment: UnipileComment): {
  id: string | undefined;
  name: string;
  headline?: string;
  profile_url?: string;
  connections_count?: number;
} {
  if (typeof comment.author === 'object' && comment.author?.id) {
    // Mock mode format: author is object with id/name
    return {
      id: comment.author.id,
      name: comment.author.name || 'Unknown User',
      headline: comment.author.headline,
      profile_url: comment.author.profile_url,
      connections_count: comment.author.connections_count,
    };
  } else if (comment.author_details?.id) {
    // Real API format: author is string, author_details has id
    return {
      id: comment.author_details.id,
      name: typeof comment.author === 'string' ? comment.author : 'Unknown User',
      headline: comment.author_details.headline,
      profile_url: comment.author_details.profile_url,
    };
  }
  // Fallback
  return {
    id: undefined,
    name: typeof comment.author === 'string' ? comment.author : 'Unknown User',
  };
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
  const startTime = Date.now();
  console.log('[UNIPILE_COMMENTS] ========================================');
  console.log('[UNIPILE_COMMENTS] Starting getAllPostComments');
  console.log('[UNIPILE_COMMENTS] Input:', { accountId, postId });

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
    const FETCH_TIMEOUT = 15000; // 15 second timeout for API calls

    // STEP 1: First retrieve the post to get the correct social_id
    // Unipile docs: "You need to retrieve id part in URL... use retrieve post route with this id and take in result social_id"
    // This handles both activity posts and ugcPost formats correctly
    console.log('[UNIPILE_COMMENTS] Step 1: Retrieving post to get social_id:', { accountId, postId });

    let socialId: string;

    // CRITICAL FIX: The postId stored in scrape_jobs is the raw activity number (e.g., "7402329422785269760")
    // But Unipile's GET /posts/{id} endpoint requires the FULL URN format
    // We need to construct the URN before making the API call
    const postIdForApi = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
    console.log('[UNIPILE_COMMENTS] Converted postId to URN format:', postIdForApi);

    try {
      // Try to get the post first to get the correct social_id format
      const postUrl = `${credentials.dsn}/api/v1/posts/${postIdForApi}?account_id=${accountId}`;
      console.log('[UNIPILE_COMMENTS] Fetching post from:', postUrl);

      const postController = new AbortController();
      const postTimeoutId = setTimeout(() => postController.abort(), FETCH_TIMEOUT);

      const postResponse = await fetch(postUrl, {
        method: 'GET',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Accept': 'application/json',
        },
        signal: postController.signal,
      });

      clearTimeout(postTimeoutId);
      console.log('[UNIPILE_COMMENTS] Post retrieval response status:', postResponse.status);

      if (postResponse.ok) {
        const postData = await postResponse.json();
        console.log('[UNIPILE_COMMENTS] Post data received:', JSON.stringify(postData).substring(0, 500));
        // Use the social_id from the API response - this is the correct format
        socialId = postData.social_id || postData.id || postId;
        console.log('[UNIPILE_COMMENTS] Got social_id from API:', socialId);
      } else {
        const errorText = await postResponse.text();
        console.warn('[UNIPILE_COMMENTS] Post retrieval failed with status:', postResponse.status, errorText.substring(0, 200));
        // Fallback: construct the URN ourselves (may not work for all post types)
        socialId = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
        console.log('[UNIPILE_COMMENTS] Using fallback social_id:', socialId);
      }
    } catch (postError: any) {
      // Fallback if post retrieval fails
      console.warn('[UNIPILE_COMMENTS] Post retrieval exception:', postError.message || postError);
      socialId = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
      console.log('[UNIPILE_COMMENTS] Using fallback social_id after error:', socialId);
    }

    console.log('[UNIPILE_COMMENTS] Step 2: Fetching comments with social_id:', socialId);

    // NOTE: Do NOT URL-encode the social_id - Unipile expects raw URN format
    // The colons in "urn:li:activity:XXX" should remain as-is in the path
    const url = `${credentials.dsn}/api/v1/posts/${socialId}/comments?account_id=${accountId}`;
    console.log('[UNIPILE_COMMENTS] Request URL:', url);

    const commentsController = new AbortController();
    const commentsTimeoutId = setTimeout(() => commentsController.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': credentials.apiKey,
        'Accept': 'application/json',
      },
      signal: commentsController.signal,
    });

    clearTimeout(commentsTimeoutId);
    const elapsed = Date.now() - startTime;
    console.log('[UNIPILE_COMMENTS] Comments API response status:', response.status, `(${elapsed}ms)`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[UNIPILE_COMMENTS] Error response:', response.status, errorBody.substring(0, 500));
      throw new Error(`Failed to get post comments: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    console.log('[UNIPILE_COMMENTS] Raw response data:', JSON.stringify(data).substring(0, 500));

    // Handle different possible response formats
    const comments = data.items || data.comments || (Array.isArray(data) ? data : []);
    console.log('[UNIPILE_COMMENTS] Found comments:', comments.length, `(total time: ${Date.now() - startTime}ms)`);
    console.log('[UNIPILE_COMMENTS] ========================================');
    return comments;
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

/**
 * Reply to a comment on a LinkedIn post
 * Supports both top-level comments and nested replies to specific comments
 * @param accountId - Unipile account ID
 * @param postId - LinkedIn post ID (activity ID)
 * @param text - Comment text to post
 * @param commentId - Optional: specific comment ID to reply to (creates nested reply)
 *                    If omitted, posts a top-level comment on the post
 * @returns Response with comment status
 */
export async function replyToComment(
  accountId: string,
  postId: string,
  text: string,
  commentId?: string
): Promise<{ status: string; comment_id?: string }> {
  try {
    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Replying to comment on post:', {
        accountId,
        postId,
        textLength: text.length,
        replyingToCommentId: commentId || 'top-level',
      });
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        status: 'sent',
        comment_id: `mock_comment_${crypto.randomBytes(9).toString('base64url')}`,
      };
    }

    const credentials = getUnipileCredentials();
    const FETCH_TIMEOUT = 15000; // 15 second timeout

    console.log('[UNIPILE_COMMENT] ========================================');
    console.log('[UNIPILE_COMMENT] Posting comment reply:', { accountId, postId, textLength: text.length });

    // STEP 1: Resolve the correct social_id format (same as getAllPostComments)
    // Unipile requires the URN format like "urn:li:activity:XXX" for the API path
    let socialId: string;

    // CRITICAL FIX: Convert postId to URN format before API call
    // The postId passed in is the raw activity number, but Unipile's API requires URN format
    const postIdForApi = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
    console.log('[UNIPILE_COMMENT] Converted postId to URN format:', postIdForApi);

    try {
      const postUrl = `${credentials.dsn}/api/v1/posts/${postIdForApi}?account_id=${accountId}`;
      console.log('[UNIPILE_COMMENT] Step 1: Retrieving post to get social_id:', postUrl);

      const postController = new AbortController();
      const postTimeoutId = setTimeout(() => postController.abort(), FETCH_TIMEOUT);

      const postResponse = await fetch(postUrl, {
        method: 'GET',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Accept': 'application/json',
        },
        signal: postController.signal,
      });

      clearTimeout(postTimeoutId);
      console.log('[UNIPILE_COMMENT] Post retrieval response status:', postResponse.status);

      if (postResponse.ok) {
        const postData = await postResponse.json();
        console.log('[UNIPILE_COMMENT] Post data received:', JSON.stringify(postData).substring(0, 300));
        socialId = postData.social_id || postData.id || postId;
        console.log('[UNIPILE_COMMENT] Got social_id from API:', socialId);
      } else {
        const errorText = await postResponse.text();
        console.warn('[UNIPILE_COMMENT] Post retrieval failed:', postResponse.status, errorText.substring(0, 200));
        // Fallback: construct URN format
        socialId = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
        console.log('[UNIPILE_COMMENT] Using fallback social_id:', socialId);
      }
    } catch (postError: any) {
      console.warn('[UNIPILE_COMMENT] Post retrieval exception:', postError.message || postError);
      socialId = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
      console.log('[UNIPILE_COMMENT] Using fallback social_id after error:', socialId);
    }

    // STEP 2: Post the comment using the social_id
    console.log('[UNIPILE_COMMENT] Step 2: Posting comment with social_id:', socialId);
    console.log('[UNIPILE_COMMENT] Comment type:', commentId ? `nested reply to comment ${commentId}` : 'top-level comment');

    const url = `${credentials.dsn}/api/v1/posts/${socialId}/comments`;
    console.log('[UNIPILE_COMMENT] Request URL:', url);

    // Build request body - include comment_id for nested replies
    const requestBody: any = {
      account_id: accountId,
      text,
    };

    if (commentId) {
      requestBody.comment_id = commentId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-KEY': credentials.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[UNIPILE_COMMENT] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UNIPILE_COMMENT] Error response:', response.status, errorText);
      throw new Error(`Failed to post comment: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[UNIPILE_COMMENT] Success:', data);
    console.log('[UNIPILE_COMMENT] ========================================');

    return {
      status: 'sent',
      comment_id: data.comment_id || data.id,
    };
  } catch (error) {
    console.error('[UNIPILE_COMMENT] Error:', error);
    throw error;
  }
}

/**
 * Send a LinkedIn connection request to a user
 * @param accountId - Unipile account ID
 * @param targetUserId - LinkedIn provider ID of the user to connect with
 * @param message - Optional personalized message (max 300 chars)
 * @returns Response with invitation status and ID
 */
export async function sendConnectionRequest(
  accountId: string,
  targetUserId: string,
  message?: string
): Promise<{ status: string; invitation_id?: string }> {
  try {
    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Sending connection request:', {
        accountId,
        targetUserId,
        hasMessage: !!message,
      });
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        status: 'sent',
        invitation_id: `mock_invite_${crypto.randomBytes(9).toString('base64url')}`,
      };
    }

    const credentials = getUnipileCredentials();

    console.log('[UNIPILE_INVITE] Sending connection request:', { accountId, targetUserId, hasMessage: !!message });

    // Unipile API: POST /api/v1/users/invite
    const body: { account_id: string; provider_id: string; message?: string } = {
      account_id: accountId,
      provider_id: targetUserId,
    };

    if (message) {
      // LinkedIn limits connection request messages to 300 characters
      body.message = message.substring(0, 300);
    }

    const response = await fetch(
      `${credentials.dsn}/api/v1/users/invite`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    console.log('[UNIPILE_INVITE] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UNIPILE_INVITE] Error response:', response.status, errorText);

      // Handle specific error cases
      if (response.status === 400 && errorText.includes('already connected')) {
        return { status: 'already_connected' };
      }
      if (response.status === 400 && errorText.includes('pending')) {
        return { status: 'pending_invitation' };
      }

      throw new Error(`Failed to send connection request: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[UNIPILE_INVITE] Success:', data);

    return {
      status: 'sent',
      invitation_id: data.invitation_id,
    };
  } catch (error) {
    console.error('[UNIPILE_INVITE] Error:', error);
    throw error;
  }
}

/**
 * Check connection status with a LinkedIn user
 * Returns network_distance: FIRST_DEGREE (connected), SECOND_DEGREE, THIRD_DEGREE, OUT_OF_NETWORK
 * @param accountId - Unipile account ID
 * @param targetUserId - LinkedIn provider ID of the user to check
 * @returns Connection status with network distance
 */
export async function checkConnectionStatus(
  accountId: string,
  targetUserId: string
): Promise<{
  isConnected: boolean;
  networkDistance?: 'FIRST_DEGREE' | 'SECOND_DEGREE' | 'THIRD_DEGREE' | 'OUT_OF_NETWORK';
  hasPendingInvitation?: boolean;
  invitationType?: 'SENT' | 'RECEIVED';
}> {
  try {
    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Checking connection status:', { accountId, targetUserId });
      await new Promise(resolve => setTimeout(resolve, 300));

      // Simulate random connection status for testing
      const isConnected = Math.random() < 0.5;
      return {
        isConnected,
        networkDistance: isConnected ? 'FIRST_DEGREE' : 'SECOND_DEGREE',
      };
    }

    const credentials = getUnipileCredentials();

    console.log('[UNIPILE_CONNECTION] Checking status:', { accountId, targetUserId });

    // Unipile API: GET /api/v1/users/{identifier}?account_id=...
    const response = await fetch(
      `${credentials.dsn}/api/v1/users/${targetUserId}?account_id=${accountId}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Accept': 'application/json',
        },
      }
    );

    console.log('[UNIPILE_CONNECTION] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UNIPILE_CONNECTION] Error response:', response.status, errorText);

      // If user not found, they're definitely not connected
      if (response.status === 404) {
        return { isConnected: false, networkDistance: 'OUT_OF_NETWORK' };
      }

      throw new Error(`Failed to check connection status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[UNIPILE_CONNECTION] Profile data:', {
      network_distance: data.network_distance,
      invitation: data.invitation,
    });

    const networkDistance = data.network_distance as 'FIRST_DEGREE' | 'SECOND_DEGREE' | 'THIRD_DEGREE' | 'OUT_OF_NETWORK';
    const isConnected = networkDistance === 'FIRST_DEGREE';

    // Check for pending invitation
    let hasPendingInvitation = false;
    let invitationType: 'SENT' | 'RECEIVED' | undefined;

    if (data.invitation && data.invitation.status === 'PENDING') {
      hasPendingInvitation = true;
      invitationType = data.invitation.type;
    }

    return {
      isConnected,
      networkDistance,
      hasPendingInvitation,
      invitationType,
    };
  } catch (error) {
    console.error('[UNIPILE_CONNECTION] Error:', error);
    throw error;
  }
}

/**
 * Get received connection invitations (pending incoming requests)
 * Used to extract email from connection note before auto-accept
 * @param accountId - Unipile account ID
 * @returns Array of received invitations with sender info and note
 */
export interface ReceivedInvitation {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_profile_url?: string;
  sender_headline?: string;
  message?: string; // Connection note with potential email
  received_at: string;
}

export async function getReceivedInvitations(
  accountId: string
): Promise<ReceivedInvitation[]> {
  try {
    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Fetching received invitations for account:', accountId);
      await new Promise(resolve => setTimeout(resolve, 300));

      return [
        {
          id: `mock_invite_${crypto.randomBytes(9).toString('base64url')}`,
          sender_id: 'mock_sender_123',
          sender_name: 'John Doe',
          sender_profile_url: 'https://linkedin.com/in/johndoe',
          sender_headline: 'CEO at Startup',
          message: 'Hey! Would love to connect. My email is john@startup.com',
          received_at: new Date().toISOString(),
        },
      ];
    }

    const credentials = getUnipileCredentials();

    console.log('[UNIPILE_INVITES] Fetching received invitations:', { accountId });

    // Unipile API: GET /api/v1/users/invite/received
    const response = await fetch(
      `${credentials.dsn}/api/v1/users/invite/received?account_id=${accountId}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Accept': 'application/json',
        },
      }
    );

    console.log('[UNIPILE_INVITES] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UNIPILE_INVITES] Error response:', response.status, errorText);
      throw new Error(`Failed to get received invitations: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const invitations = data.items || data.invitations || [];

    console.log('[UNIPILE_INVITES] Found invitations:', invitations.length);

    // Map to our interface
    return invitations.map((inv: any) => ({
      id: inv.id || inv.invitation_id,
      sender_id: inv.sender?.id || inv.from?.id || inv.provider_id,
      sender_name: inv.sender?.name || inv.from?.name || 'Unknown',
      sender_profile_url: inv.sender?.profile_url || inv.from?.profile_url,
      sender_headline: inv.sender?.headline || inv.from?.headline,
      message: inv.message || inv.note || inv.custom_message,
      received_at: inv.received_at || inv.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[UNIPILE_INVITES] Error:', error);
    throw error;
  }
}

/**
 * Accept a received connection invitation
 * @param accountId - Unipile account ID
 * @param invitationId - The invitation ID to accept
 * @returns Success status
 */
export async function acceptInvitation(
  accountId: string,
  invitationId: string
): Promise<{ status: string }> {
  try {
    // Mock mode for testing
    if (isMockMode()) {
      console.log('[MOCK] Accepting invitation:', { accountId, invitationId });
      await new Promise(resolve => setTimeout(resolve, 300));
      return { status: 'accepted' };
    }

    const credentials = getUnipileCredentials();

    console.log('[UNIPILE_ACCEPT] Accepting invitation:', { accountId, invitationId });

    // Unipile API: POST /api/v1/users/invite/{invitation_id}/accept
    const response = await fetch(
      `${credentials.dsn}/api/v1/users/invite/${invitationId}/accept`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ account_id: accountId }),
      }
    );

    console.log('[UNIPILE_ACCEPT] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UNIPILE_ACCEPT] Error response:', response.status, errorText);
      throw new Error(`Failed to accept invitation: ${response.status} - ${errorText}`);
    }

    return { status: 'accepted' };
  } catch (error) {
    console.error('[UNIPILE_ACCEPT] Error:', error);
    throw error;
  }
}

export async function createLinkedInPost(
  accountId: string,
  text: string,
  clientCredentials?: UnipileCredentials | null,
  timeoutMs: number = 25000, // Default 25s timeout (safe for 30s/60s serverless limits)
  profileUrl?: string | null // Optional: user's LinkedIn profile URL for constructing post URLs
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

    // DEBUG: Log the full response to identify correct activity ID field
    console.log('[UNIPILE_POST] Full response data:', JSON.stringify(data, null, 2));

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

              console.log('[UNIPILE_POST] Recent posts fetched:', {
                count: recentPosts.length,
                firstPostKeys: recentPosts[0] ? Object.keys(recentPosts[0]) : 'N/A',
              });

              // Match by content (first 100 chars)
              const contentToMatch = text.substring(0, 100).toLowerCase().trim();
              const matchedPost = recentPosts.find((p: any) => {
                const postContent = (p.text || '').substring(0, 100).toLowerCase().trim();
                return postContent === contentToMatch;
              });

              if (matchedPost) {
                console.log('[UNIPILE_POST] Found matching post, extracting activity ID...');
                // Extract from social_id or share_url
                const matchedSocialId = matchedPost.social_id;
                const matchedShareUrl = matchedPost.share_url || matchedPost.url;

                if (matchedSocialId) {
                  const socialMatch = matchedSocialId.match(/urn:li:(?:activity|ugcPost):(\d+)/);
                  if (socialMatch) {
                    linkedinActivityId = socialMatch[1];
                    shareUrl = matchedShareUrl || shareUrl;
                    console.log('[UNIPILE_POST] Found activity ID from recent posts social_id:', linkedinActivityId);
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
                console.warn('[UNIPILE_POST] Could not find matching post in recent posts by content');
                // Try matching by post_id instead
                if (data.post_id && recentPosts.length > 0) {
                  console.log('[UNIPILE_POST] Trying to match by post_id:', data.post_id);
                  const postIdMatch = recentPosts.find((p: any) => p.id === data.post_id || p.post_id === data.post_id);
                  if (postIdMatch) {
                    console.log('[UNIPILE_POST] Found post by ID, extracting activity ID...');
                    const matchedSocialId = postIdMatch.social_id;
                    const matchedShareUrl = postIdMatch.share_url || postIdMatch.url;
                    if (matchedSocialId) {
                      const socialMatch = matchedSocialId.match(/urn:li:(?:activity|ugcPost):(\d+)/);
                      if (socialMatch) {
                        linkedinActivityId = socialMatch[1];
                        shareUrl = matchedShareUrl || shareUrl;
                        console.log('[UNIPILE_POST] Found activity ID from post ID match:', linkedinActivityId);
                      }
                    } else if (matchedShareUrl) {
                      const urlMatch = matchedShareUrl.match(/urn:li:(?:activity|ugcPost):(\d+)/);
                      if (urlMatch) {
                        linkedinActivityId = urlMatch[1];
                        shareUrl = matchedShareUrl;
                        console.log('[UNIPILE_POST] Found activity ID from post ID match URL:', linkedinActivityId);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (fetchError) {
        console.warn('[UNIPILE_POST] Error fetching recent posts for activity ID:', fetchError);
        // Continue with fallback - don't fail the whole post creation
      }
    }

    // CRITICAL: Must use linkedinActivityId for comments API to work
    // If we couldn't extract it from share_url/social_id/recent_posts, use data.post_id as fallback
    // NOTE: This is a FALLBACK and may not be the actual LinkedIn activity ID
    if (!linkedinActivityId) {
      console.warn('[UNIPILE_POST] ⚠️ Could not extract from any source, using data.post_id as fallback');
      console.warn('[UNIPILE_POST] This may not be the actual LinkedIn activity ID - please check logs above');
      // data.post_id from Unipile POST /posts response (may not be the LinkedIn activity number)
      linkedinActivityId = data.post_id || data.id;
      console.log('[UNIPILE_POST] Using data.post_id as activity ID:', linkedinActivityId);
      console.log('[UNIPILE_POST] WARNING: This ID may be incorrect. Check /dashboard to see actual post URL.');
    }

    // Validate we have a post ID - throw if not (should never happen with valid Unipile response)
    if (!linkedinActivityId) {
      console.error('[UNIPILE_POST] CRITICAL: No post ID available from any source');
      throw new Error('Failed to get LinkedIn post ID from Unipile response');
    }
    const postId: string = linkedinActivityId;

    // CRITICAL FIX: Construct proper LinkedIn post URL using profile username
    // Always override Unipile's shareUrl because it uses the URN format which is not ideal for sharing
    if (postId && profileUrl) {
      // Extract username from profile URL
      // Format: https://www.linkedin.com/in/{username}/ or /in/{username}
      const usernameMatch = profileUrl.match(/\/in\/([^\/]+)/);
      if (usernameMatch) {
        const username = usernameMatch[1];
        // Construct a working post URL using username and activity ID
        // Format: /posts/{username}_post-activity-{ACTIVITY_ID}
        const constructedUrl = `https://www.linkedin.com/posts/${username}_post-activity-${postId}`;
        shareUrl = constructedUrl;
        console.log('[UNIPILE_POST] Constructed proper post URL:', constructedUrl);
      } else {
        console.warn('[UNIPILE_POST] Could not extract username from profile URL, keeping Unipile URL');
      }
    } else if (postId && !profileUrl) {
      console.warn('[UNIPILE_POST] No profile URL provided, cannot construct proper post URL');
    }

    console.log('[UNIPILE_POST] Post created successfully:', {
      unipile_internal_id: data.post_id || data.id,
      linkedin_activity_id: linkedinActivityId,
      final_id: postId,
      url: shareUrl,
      social_id: data.social_id,
      has_activity_id: !!linkedinActivityId,
    });

    return {
      id: postId,
      url: shareUrl || undefined,  // Return undefined for optional field (matches interface)
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
