/**
 * Admin Script: Link LinkedIn Account to User
 *
 * Usage:
 *   npx tsx scripts/link-linkedin-account.ts <user_email> <unipile_account_id> <account_name>
 *
 * Example:
 *   npx tsx scripts/link-linkedin-account.ts rodericandrews@gmail.com pJj4DVePS3umF9iJwSmx7w "Roderic Andrews"
 *
 * Process:
 * 1. During onboarding call, customer shares LinkedIn credentials
 * 2. You connect via Unipile dashboard (https://dashboard.unipile.com)
 * 3. Copy the account_id from Unipile
 * 4. Run this script to link the Unipile account to the user in your database
 */

import { createClient } from '@supabase/supabase-js';
import { getAccountStatus } from '../lib/unipile-client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function linkLinkedInAccount(
  userEmail: string,
  unipileAccountId: string,
  accountName: string
) {
  console.log('==========================================');
  console.log('ADMIN: Link LinkedIn Account');
  console.log('==========================================');
  console.log('');
  console.log('User Email:', userEmail);
  console.log('Account ID:', unipileAccountId);
  console.log('Account Name:', accountName);
  console.log('');

  // 1. Get user_id from email
  console.log('Looking up user...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('email', userEmail)
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', userEmail);
    console.error('Error:', userError?.message);
    process.exit(1);
  }

  console.log('✓ Found user:', user.full_name, `(${user.id})`);
  console.log('');

  // 2. Verify Unipile account
  console.log('Verifying Unipile account...');
  try {
    const accountStatus = await getAccountStatus(unipileAccountId);

    if (accountStatus.status !== 'OK') {
      console.error(`❌ Unipile account status is not OK: ${accountStatus.status}`);
      console.error('Account must be active before linking.');
      process.exit(1);
    }

    console.log('✓ Unipile account verified:');
    console.log('  Name:', accountStatus.name);
    console.log('  Email:', accountStatus.email);
    console.log('  Status:', accountStatus.status);
    console.log('');

    // 3. Link account in database
    console.log('Linking account in database...');

    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 90);

    const { data: linkedAccount, error: insertError } = await supabase
      .from('linkedin_accounts')
      .insert({
        user_id: user.id,
        account_name: accountName,
        unipile_account_id: unipileAccountId,
        unipile_session: {
          created_at: new Date().toISOString(),
          auth_method: 'admin_linked',
          managed_by_admin: true,
        },
        session_expires_at: sessionExpiresAt.toISOString(),
        profile_data: {
          name: accountStatus.name,
          email: accountStatus.email,
        },
        status: 'active',
        last_sync_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to link account:', insertError.message);
      console.error('Details:', insertError);
      process.exit(1);
    }

    console.log('✅ SUCCESS! LinkedIn account linked to user.');
    console.log('');
    console.log('Account Details:');
    console.log('  ID:', linkedAccount.id);
    console.log('  Name:', linkedAccount.account_name);
    console.log('  User:', user.email);
    console.log('  Expires:', new Date(linkedAccount.session_expires_at).toLocaleDateString());
    console.log('');
    console.log('User can now see their connection at:');
    console.log('  https://your-app.com/dashboard/linkedin');
    console.log('==========================================');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 3) {
  console.log('Usage: npx tsx scripts/link-linkedin-account.ts <user_email> <unipile_account_id> <account_name>');
  console.log('');
  console.log('Example:');
  console.log('  npx tsx scripts/link-linkedin-account.ts customer@example.com pJj4DVePS3umF9iJwSmx7w "John Doe"');
  process.exit(1);
}

const [userEmail, unipileAccountId, accountName] = args;

linkLinkedInAccount(userEmail, unipileAccountId, accountName);
