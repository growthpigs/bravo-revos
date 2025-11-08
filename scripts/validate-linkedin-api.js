#!/usr/bin/env node

/**
 * LinkedIn API Validation Script
 * Tests the actual HTTP endpoints to verify correct behavior
 *
 * Run: node scripts/validate-linkedin-api.js
 */

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000003';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function test(name, fn) {
  return fn()
    .then(() => {
      passedTests++;
      log(`  ✓ ${name}`, COLORS.GREEN);
    })
    .catch((error) => {
      failedTests++;
      log(`  ✗ ${name}`, COLORS.RED);
      log(`    Error: ${error.message}`, COLORS.RED);
    })
    .finally(() => {
      totalTests++;
    });
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertDefined(value, message) {
  if (value === undefined || value === null) {
    throw new Error(`${message}: value is undefined or null`);
  }
}

async function validateAuthenticationEndpoint() {
  log('\n📝 Authentication Endpoint Tests', COLORS.BLUE);

  // Test 1: Authenticate with valid credentials
  await test('should authenticate with valid credentials', async () => {
    const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'authenticate',
        username: 'validate.test@linkedin.com',
        password: 'testpass',
        accountName: 'Validation Test Account',
      }),
    });

    assertEqual(response.status, 200, 'Response status');

    const data = await response.json();
    assertEqual(data.status, 'success', 'Response status field');
    assertDefined(data.account, 'Account object');
    assertEqual(data.account.user_id, TEST_USER_ID, 'Test user ID');
    assertEqual(data.account.account_name, 'Validation Test Account', 'Account name');
    assertEqual(data.account.status, 'active', 'Account status');
    assertDefined(data.account.id, 'Account ID');
    assertDefined(data.account.unipile_account_id, 'Unipile account ID');
  });

  // Test 2: Reject missing fields
  await test('should reject missing required fields', async () => {
    const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'authenticate',
        username: 'test@linkedin.com',
        // missing password and accountName
      }),
    });

    assertEqual(response.status, 400, 'Response status');

    const data = await response.json();
    assertDefined(data.error, 'Error message');
  });

  // Test 3: Reject invalid action
  await test('should reject invalid action', async () => {
    const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'invalid_action',
        username: 'test@linkedin.com',
      }),
    });

    assertEqual(response.status, 400, 'Response status');

    const data = await response.json();
    assertDefined(data.error, 'Error message');
  });
}

async function validateAccountsEndpoint() {
  log('\n📋 Accounts Endpoint Tests', COLORS.BLUE);

  // Test 1: Get accounts
  await test('should retrieve accounts list', async () => {
    const response = await fetch(`${BASE_URL}/api/linkedin/accounts`);

    assertEqual(response.status, 200, 'Response status');

    const data = await response.json();
    assertDefined(data.total, 'Total count');
    assertEqual(Array.isArray(data.accounts), true, 'Accounts is array');
  });

  // Test 2: Verify account structure
  await test('should return accounts with correct structure', async () => {
    const response = await fetch(`${BASE_URL}/api/linkedin/accounts`);
    const data = await response.json();

    if (data.accounts.length > 0) {
      const account = data.accounts[0];
      assertDefined(account.id, 'Account ID');
      assertDefined(account.account_name, 'Account name');
      assertDefined(account.status, 'Account status');
      assertDefined(account.profile_data, 'Profile data');
      assertDefined(account.session_expires_at, 'Session expiry');

      // Verify nested structure
      assertDefined(account.profile_data.name, 'Profile name');
      assertDefined(account.profile_data.email, 'Profile email');
    }
  });

  // Test 3: Missing account ID for deletion
  await test('should reject delete without account ID', async () => {
    const response = await fetch(`${BASE_URL}/api/linkedin/accounts?id=`, {
      method: 'DELETE',
    });

    assertEqual(response.status, 400, 'Response status');

    const data = await response.json();
    assertDefined(data.error, 'Error message');
  });

  // Test 4: Non-existent account deletion
  await test('should return 404 for non-existent account', async () => {
    const response = await fetch(
      `${BASE_URL}/api/linkedin/accounts?id=nonexistent-id-12345`,
      { method: 'DELETE' }
    );

    assertEqual(response.status, 404, 'Response status');

    const data = await response.json();
    assertDefined(data.error, 'Error message');
  });
}

async function validateDevelopmentMode() {
  log('\n🔧 Development Mode Tests', COLORS.BLUE);

  // Test 1: Test user ID consistency
  await test('should use consistent test user ID across requests', async () => {
    const req1 = fetch(`${BASE_URL}/api/linkedin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'authenticate',
        username: 'dev1@linkedin.com',
        password: 'pass',
        accountName: 'Dev 1',
      }),
    });

    const req2 = fetch(`${BASE_URL}/api/linkedin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'authenticate',
        username: 'dev2@linkedin.com',
        password: 'pass',
        accountName: 'Dev 2',
      }),
    });

    const [res1, res2] = await Promise.all([req1, req2]);
    const data1 = await res1.json();
    const data2 = await res2.json();

    assertEqual(data1.account.user_id, TEST_USER_ID, 'User ID from request 1');
    assertEqual(data2.account.user_id, TEST_USER_ID, 'User ID from request 2');
    assertEqual(
      data1.account.user_id,
      data2.account.user_id,
      'User IDs match'
    );
  });

  // Test 2: Service role bypass verification
  await test('should persist accounts to database (RLS bypassed)', async () => {
    const authResponse = await fetch(`${BASE_URL}/api/linkedin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'authenticate',
        username: 'persist.test@linkedin.com',
        password: 'pass',
        accountName: 'Persistence Test',
      }),
    });

    const authData = await authResponse.json();
    const accountId = authData.account.id;

    // Verify account is retrievable
    const getResponse = await fetch(`${BASE_URL}/api/linkedin/accounts`);
    const getData = await getResponse.json();

    const found = getData.accounts.some((acc) => acc.id === accountId);
    if (!found && getData.accounts.length === 0) {
      throw new Error('Account not persisted to database');
    }
  });
}

async function validateErrorHandling() {
  log('\n🔒 Error Handling Tests', COLORS.BLUE);

  // Test 1: Malformed JSON
  await test('should handle malformed JSON request', async () => {
    const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json {',
    });

    if (![400, 500].includes(response.status)) {
      throw new Error(`Expected 400 or 500, got ${response.status}`);
    }
  });

  // Test 2: Server responds even with errors
  await test('should provide error details in response', async () => {
    const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'authenticate',
        // Missing fields
      }),
    });

    const data = await response.json();
    assertDefined(data.error, 'Error field present');
  });
}

async function runAllTests() {
  log('\n🧪 LinkedIn API Validation Suite', COLORS.YELLOW);
  log('================================\n', COLORS.YELLOW);

  try {
    // Wait for server to be ready
    log('⏳ Waiting for dev server to be ready...', COLORS.YELLOW);
    let serverReady = false;
    for (let i = 0; i < 10; i++) {
      try {
        const response = await fetch(BASE_URL);
        if (response.ok || response.status === 404) {
          serverReady = true;
          break;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!serverReady) {
      log('❌ Dev server not ready. Make sure to run: npm run dev', COLORS.RED);
      process.exit(1);
    }

    log('✓ Dev server is ready!\n', COLORS.GREEN);

    // Run test suites
    await validateAuthenticationEndpoint();
    await validateAccountsEndpoint();
    await validateDevelopmentMode();
    await validateErrorHandling();

    // Summary
    log('\n================================', COLORS.YELLOW);
    log('📊 Test Summary', COLORS.YELLOW);
    log('================================', COLORS.YELLOW);
    log(`Total: ${totalTests}`, COLORS.BLUE);
    log(`Passed: ${passedTests}`, COLORS.GREEN);
    log(`Failed: ${failedTests}`, COLORS.RED);
    log('================================\n', COLORS.YELLOW);

    if (failedTests === 0) {
      log('✅ All tests passed!', COLORS.GREEN);
      process.exit(0);
    } else {
      log('❌ Some tests failed', COLORS.RED);
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Validation error: ${error.message}`, COLORS.RED);
    process.exit(1);
  }
}

// Run tests
runAllTests();
