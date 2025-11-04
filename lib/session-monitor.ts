/**
 * LinkedIn Session Monitor
 * Monitors session expiry and handles auto-reconnect logic
 */

import { createClient } from '@/lib/supabase/server';
import { getAccountStatus } from '@/lib/unipile-client';

export interface SessionCheckResult {
  account_id: string;
  status: 'active' | 'expiring_soon' | 'expired';
  days_until_expiry?: number;
  message: string;
}

/**
 * Check if a session is expired or expiring soon
 */
export async function checkSessionStatus(accountId: string): Promise<SessionCheckResult> {
  const supabase = await createClient();

  // Get account from database
  const { data: account, error } = await supabase
    .from('linkedin_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    return {
      account_id: accountId,
      status: 'expired',
      message: 'Account not found in database',
    };
  }

  // Check Unipile status
  try {
    const unipileStatus = await getAccountStatus(account.unipile_account_id);

    if (unipileStatus.status === 'CREDENTIALS') {
      // Update database status
      await supabase
        .from('linkedin_accounts')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      return {
        account_id: accountId,
        status: 'expired',
        message: 'Session expired - credentials need refresh (CREDENTIALS status from Unipile)',
      };
    }

    if (unipileStatus.status === 'DISCONNECTED') {
      // Update database status
      await supabase
        .from('linkedin_accounts')
        .update({
          status: 'error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      return {
        account_id: accountId,
        status: 'expired',
        message: 'Account disconnected from Unipile',
      };
    }
  } catch (error) {
    console.warn(`Could not check Unipile status for account ${accountId}:`, error);
    // Continue with database check
  }

  // Check local expiry
  const now = new Date();
  const expiryDate = new Date(account.session_expires_at);
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) {
    // Expired
    await supabase
      .from('linkedin_accounts')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    return {
      account_id: accountId,
      status: 'expired',
      days_until_expiry: daysUntilExpiry,
      message: 'Session expired - needs reauthentication',
    };
  }

  if (daysUntilExpiry < 7) {
    // Expiring soon (within 7 days)
    return {
      account_id: accountId,
      status: 'expiring_soon',
      days_until_expiry: daysUntilExpiry,
      message: `Session expiring in ${daysUntilExpiry} days`,
    };
  }

  // Active
  return {
    account_id: accountId,
    status: 'active',
    days_until_expiry: daysUntilExpiry,
    message: 'Session is active',
  };
}

/**
 * Monitor all accounts for session expiry
 * Returns list of accounts that need attention
 */
export async function monitorAllSessions(): Promise<SessionCheckResult[]> {
  const supabase = await createClient();

  // Get all active accounts
  const { data: accounts, error } = await supabase
    .from('linkedin_accounts')
    .select('id')
    .eq('status', 'active')
    .order('last_sync_at', { ascending: true });

  if (error || !accounts) {
    console.error('Error fetching accounts for monitoring:', error);
    return [];
  }

  // Check status for each account
  const results = await Promise.all(
    accounts.map((account) => checkSessionStatus(account.id))
  );

  return results;
}

/**
 * Get accounts that need attention (expired or expiring soon)
 */
export async function getAccountsNeedingAttention(): Promise<SessionCheckResult[]> {
  const results = await monitorAllSessions();
  return results.filter((r) => r.status !== 'active');
}

/**
 * Log session check results for monitoring/debugging
 */
export function logSessionCheckResults(results: SessionCheckResult[]): void {
  const summary = {
    total: results.length,
    active: results.filter((r) => r.status === 'active').length,
    expiring_soon: results.filter((r) => r.status === 'expiring_soon').length,
    expired: results.filter((r) => r.status === 'expired').length,
  };

  console.log('Session Monitor Summary:', summary);

  // Log accounts needing attention
  results.forEach((result) => {
    if (result.status !== 'active') {
      console.warn(`⚠️  [${result.status.toUpperCase()}] ${result.account_id}: ${result.message}`);
    }
  });
}

/**
 * Scheduled job handler for monitoring sessions
 * Call this periodically (e.g., every hour) to check all sessions
 */
export async function runSessionMonitoringJob(): Promise<{
  checked: number;
  expired: number;
  expiring_soon: number;
  errors: string[];
}> {
  try {
    const results = await monitorAllSessions();
    logSessionCheckResults(results);

    const summary = {
      checked: results.length,
      expired: results.filter((r) => r.status === 'expired').length,
      expiring_soon: results.filter((r) => r.status === 'expiring_soon').length,
      errors: results.filter((r) => r.status === 'expired').map((r) => r.message),
    };

    console.log('✅ Session monitoring job completed:', summary);
    return summary;
  } catch (error) {
    console.error('❌ Session monitoring job failed:', error);
    return {
      checked: 0,
      expired: 0,
      expiring_soon: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
