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
