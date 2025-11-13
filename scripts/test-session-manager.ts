/**
 * Session Manager Integration Test Script
 *
 * Tests the session manager against the REAL Supabase database
 * Uses environment variables for authentication
 *
 * Run with: npx tsx scripts/test-session-manager.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  getOrCreateSession,
  getConversationHistory,
  saveMessage,
  saveMessages,
  endSession,
  getActiveSessions,
} from '@/lib/session-manager';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TEST_USER_ID = 'test-user-' + Date.now(); // Unique test user per run

let testsPassed = 0;
let testsFailed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    console.log(`\n📝 ${name}`);
    await fn();
    console.log(`   ✅ PASSED`);
    testsPassed++;
  } catch (error: any) {
    console.error(`   ❌ FAILED: ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Session Manager Integration Tests (Real Database)');
  console.log('='.repeat(60));
  console.log(`\n🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`👤 Test User ID: ${TEST_USER_ID}\n`);

  let sessionId: string;
  let sessionId2: string;

  // Test 1: Create a session
  await test('Create new session', async () => {
    const session = await getOrCreateSession(supabase, TEST_USER_ID);

    if (!session.id) throw new Error('Session ID not returned');
    if (session.user_id !== TEST_USER_ID) throw new Error('User ID mismatch');
    if (session.ended_at !== null) throw new Error('New session should not be ended');

    sessionId = session.id;
    console.log(`     Session ID: ${sessionId}`);
  });

  // Test 2: Retrieve existing session
  await test('Retrieve existing session by ID', async () => {
    const retrieved = await getOrCreateSession(
      supabase,
      TEST_USER_ID,
      sessionId
    );

    if (retrieved.id !== sessionId) throw new Error('Session ID mismatch on retrieval');
    if (retrieved.user_id !== TEST_USER_ID) throw new Error('User ID mismatch on retrieval');
  });

  // Test 3: Save single message
  await test('Save single message to session', async () => {
    const message = await saveMessage(supabase, sessionId, {
      role: 'user',
      content: 'Hello, this is a test message',
    });

    if (!message.id) throw new Error('Message ID not returned');
    if (message.session_id !== sessionId) throw new Error('Session ID mismatch');
    if (message.role !== 'user') throw new Error('Role mismatch');
    if (message.content !== 'Hello, this is a test message') throw new Error('Content mismatch');

    console.log(`     Message ID: ${message.id}`);
  });

  // Test 4: Save multiple messages in bulk
  await test('Save multiple messages in bulk', async () => {
    const messages = await saveMessages(supabase, sessionId, [
      { role: 'assistant' as const, content: 'Hello! How can I help?' },
      { role: 'user' as const, content: 'I need help with session persistence' },
      { role: 'assistant' as const, content: 'I can help with that!' },
    ]);

    if (messages.length !== 3) throw new Error(`Expected 3 messages, got ${messages.length}`);
    if (messages[0].role !== 'assistant') throw new Error('First message role mismatch');
    if (messages[1].role !== 'user') throw new Error('Second message role mismatch');
    if (messages[2].role !== 'assistant') throw new Error('Third message role mismatch');

    console.log(`     Saved ${messages.length} messages`);
  });

  // Test 5: Retrieve conversation history
  await test('Retrieve conversation history', async () => {
    const history = await getConversationHistory(supabase, sessionId);

    if (history.length === 0) throw new Error('No messages in history');
    if (history.length < 4) throw new Error(`Expected at least 4 messages, got ${history.length}`);

    // Verify messages are in chronological order
    const firstContent = history[0].content;
    const lastContent = history[history.length - 1].content;

    if (firstContent !== 'Hello, this is a test message') {
      throw new Error('First message is not the one we saved first');
    }

    console.log(`     Retrieved ${history.length} messages from history`);
    console.log(`     First message: "${firstContent.substring(0, 30)}..."`);
    console.log(`     Last message: "${lastContent.substring(0, 30)}..."`);
  });

  // Test 6: Respect history limit
  await test('Respect conversation history limit', async () => {
    const limitedHistory = await getConversationHistory(supabase, sessionId, 2);

    if (limitedHistory.length > 2) {
      throw new Error(`Expected max 2 messages, got ${limitedHistory.length}`);
    }

    console.log(`     Retrieved ${limitedHistory.length} messages with limit=2`);
  });

  // Test 7: Create another session
  await test('Create and manage multiple sessions', async () => {
    const session2 = await getOrCreateSession(supabase, TEST_USER_ID);

    if (!session2.id) throw new Error('Second session ID not returned');
    if (session2.id === sessionId) throw new Error('Second session has same ID as first');

    sessionId2 = session2.id;
    console.log(`     Session 2 ID: ${sessionId2}`);
  });

  // Test 8: Get active sessions
  await test('Get active sessions for user', async () => {
    const sessions = await getActiveSessions(supabase, TEST_USER_ID);

    if (sessions.length < 2) throw new Error(`Expected at least 2 sessions, got ${sessions.length}`);

    const hasSession1 = sessions.some((s) => s.id === sessionId);
    const hasSession2 = sessions.some((s) => s.id === sessionId2);

    if (!hasSession1) throw new Error('Session 1 not in active sessions');
    if (!hasSession2) throw new Error('Session 2 not in active sessions');

    const allActive = sessions.every((s) => s.ended_at === null);
    if (!allActive) throw new Error('Some sessions are not active');

    console.log(`     Found ${sessions.length} active sessions`);
  });

  // Test 9: End a session
  await test('End a session', async () => {
    await endSession(supabase, sessionId2);

    const updated = await getOrCreateSession(supabase, TEST_USER_ID, sessionId2);

    if (updated.ended_at === null) throw new Error('Session not marked as ended');

    console.log(`     Session marked as ended at: ${updated.ended_at}`);
  });

  // Test 10: Verify ended session not in active list
  await test('Verify ended session excluded from active list', async () => {
    const sessions = await getActiveSessions(supabase, TEST_USER_ID);

    const hasEndedSession = sessions.some((s) => s.id === sessionId2);

    if (hasEndedSession) throw new Error('Ended session appears in active sessions');

    const hasFirstSession = sessions.some((s) => s.id === sessionId);
    if (!hasFirstSession) throw new Error('Active session 1 missing from list');

    console.log(`     Ended session correctly excluded from active list`);
  });

  // Cleanup: Delete test data
  console.log(`\n🧹 Cleaning up test data...`);
  await supabase.from('chat_messages').delete().eq('session_id', sessionId);
  await supabase.from('chat_messages').delete().eq('session_id', sessionId2);
  await supabase.from('chat_sessions').delete().eq('user_id', TEST_USER_ID);
  console.log(`   ✅ Cleanup complete\n`);

  // Summary
  console.log('='.repeat(60));
  console.log(`Test Results:`);
  console.log(`  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log(`  📊 Total:  ${testsPassed + testsFailed}`);
  console.log('='.repeat(60));

  return testsFailed === 0 ? 0 : 1;
}

runTests()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
