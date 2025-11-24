/**
 * Unipile Client
 * Handles all Unipile API interactions for LinkedIn account management
 *
 * Supports both system-wide (fallback) and per-client Unipile credentials.
 * When client credentials are provided, they take precedence over system-wide env vars.
 */

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
 * Mock mode is enabled when UNIPILE_MOCK_MODE is NOT explicitly set to 'false'
 * This provides a consistent way to check mock mode across all files
 */
function isMockMode(): boolean {
  // Safety: Default to FALSE (Real Mode) unless explicitly enabled.
  // Previous default of true caused silent failures in production.
  return process.env.UNIPILE_MOCK_MODE === 'true';
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
        account_id: `mock_${Math.random().toString(36).substr(2, 9)}`,
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
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>\\/[\]+=_-]/.test(password)
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
          id: `mock_comment_${Math.random().toString(36).substr(2, 9)}`,
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
          id: `mock_comment_${Math.random().toString(36).substr(2, 9)}`,
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

    const response = await fetch(
      `${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}/api/v1/posts/${postId}/comments?account_id=${accountId}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY || '',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get post comments: ${response.status}`);
    }

    const data = await response.json();
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
): Promise<{ message_id: string; status: string }> {
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
        message_id: `mock_msg_${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent',
      };
    }

    const response = await fetch(
      `${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}/api/v1/messages`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY || '',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          account_id: accountId,
          recipient_id: recipientId,
          text: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED: LinkedIn daily DM limit reached');
      }

      throw new Error(
        `Failed to send DM: ${response.status} - ${errorData.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    return {
      message_id: data.id || data.message_id,
      status: data.status || 'sent',
    };
  } catch (error) {
    console.error('Error sending direct message:', error);
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
          id: `mock_post_${Math.random().toString(36).substr(2, 9)}`,
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
          id: `mock_dm_${Math.random().toString(36).substr(2, 9)}`,
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
  clientCredentials?: UnipileCredentials | null
): Promise<CreatePostResponse> {
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
        id: `mock_post_${Math.random().toString(36).substr(2, 9)}`,
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

    // Unipile returns different field names: post_id (on create) vs id (on get)
    const postId = data.post_id || data.id;

    console.log('[UNIPILE_POST] Post created successfully:', {
      id: postId,
      url: data.share_url || data.url,
    });

    return {
      id: postId,
      url: data.share_url || data.url,
      text: data.text || text,
      created_at: data.created_at || data.parsed_datetime || new Date().toISOString(),
      status: data.status || 'published',
    };
  } catch (error) {
    console.error('Error creating LinkedIn post:', error);
    throw error;
  }
}
