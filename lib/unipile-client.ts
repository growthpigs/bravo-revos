/**
 * Unipile Client
 * Handles all Unipile API interactions for LinkedIn account management
 */

// Note: We're using REST API calls directly instead of UnipileClient SDK
// because the SDK initialization happens at build-time and fails if UNIPILE_API_KEY is not set

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
 */
export async function authenticateLinkedinAccount(
  username: string,
  password: string
): Promise<UnipileAuthResponse | UnipileCheckpointResponse> {
  try {
    // Mock mode for testing (when UNIPILE_MOCK_MODE=true)
    if (process.env.UNIPILE_MOCK_MODE === 'true') {
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

    const response = await fetch(
      `${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}/api/v1/accounts`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'LINKEDIN',
          username,
          password,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Unipile auth failed: ${response.status} ${response.statusText}`);
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
 */
export async function resolveCheckpoint(
  accountId: string,
  code: string
): Promise<UnipileAuthResponse> {
  try {
    const response = await fetch(
      `${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}/api/v1/accounts/${accountId}/checkpoint`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY || '',
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
export async function getAccountStatus(accountId: string): Promise<UnipileAccountStatus> {
  try {
    // Mock mode for testing
    if (process.env.UNIPILE_MOCK_MODE === 'true') {
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
      `${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}/api/v1/accounts/${accountId}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY || '',
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
export async function disconnectAccount(accountId: string): Promise<void> {
  try {
    const response = await fetch(
      `${process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211'}/api/v1/accounts/${accountId}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY || '',
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
    if (process.env.UNIPILE_MOCK_MODE === 'true') {
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
    if (process.env.UNIPILE_MOCK_MODE === 'true') {
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
