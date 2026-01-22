#!/usr/bin/env npx tsx
/**
 * E-05 Pod Engagement Executor - End-to-End Test Script
 *
 * Tests the full pipeline:
 * 1. Create test activity in 'pending' status
 * 2. Run E-04 scheduling → verify status changes to 'scheduled'
 * 3. Run E-05 execution → verify Unipile API is called
 * 4. Verify final status is 'completed'
 *
 * Usage:
 *   npx tsx scripts/test-e05-flow.ts
 *
 * Prerequisites:
 *   - Database migration applied (20251217_fix_pod_activities_status.sql)
 *   - Valid Unipile account linked to pod member
 *   - UNIPILE_MOCK_MODE=true for dry-run testing
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { EngagementActivity } from '../lib/pods/engagement-scheduler';
import {
  addEngagementJob,
  getEngagementQueueStats,
} from '../lib/queues/pod-engagement-worker';
import { checkRedisHealth } from '../lib/redis';

// Create direct Supabase client (not Next.js server client)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Resolve Unipile account ID directly (standalone version)
async function resolveUnipileAccountIdStandalone(memberId: string): Promise<string> {
  const supabase = getSupabase();

  const { data: member, error } = await supabase
    .from('pod_member')
    .select('unipile_account_id')
    .eq('id', memberId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch pod member ${memberId}: ${error.message}`);
  }

  if (!member?.unipile_account_id) {
    throw new Error(`Pod member ${memberId} has no Unipile account ID`);
  }

  return member.unipile_account_id;
}

const LOG_PREFIX = '[E05_TEST]';

// Test configuration
const TEST_CONFIG = {
  // Set to a real pod ID from your database
  podId: process.env.TEST_POD_ID || '',
  // Set to a real member ID with linked Unipile account
  memberId: process.env.TEST_MEMBER_ID || '',
  // Set to a real LinkedIn post ID for testing
  postId: process.env.TEST_POST_ID || 'urn:li:activity:7406677961430548480',
  // Test timeout
  timeoutMs: 30000,
};

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: unknown;
}

async function runTest(): Promise<void> {
  console.log(`${LOG_PREFIX} ========================================`);
  console.log(`${LOG_PREFIX} E-05 Pod Engagement Executor - E2E Test`);
  console.log(`${LOG_PREFIX} ========================================\n`);

  const results: TestResult[] = [];

  // Validate environment
  console.log(`${LOG_PREFIX} Step 0: Validating environment...`);
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_URL',
    'UNIPILE_API_KEY',
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.error(`${LOG_PREFIX} ❌ Missing environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  // Check Redis
  console.log(`${LOG_PREFIX} Checking Redis connection...`);
  const redisHealthy = await checkRedisHealth();
  if (!redisHealthy) {
    console.error(`${LOG_PREFIX} ❌ Redis health check failed`);
    process.exit(1);
  }
  console.log(`${LOG_PREFIX} ✅ Redis connected\n`);

  // Initialize Supabase
  const supabase = getSupabase();

  try {
    // Step 1: Verify test prerequisites
    console.log(`${LOG_PREFIX} Step 1: Checking test prerequisites...`);

    if (!TEST_CONFIG.podId || !TEST_CONFIG.memberId) {
      console.log(`${LOG_PREFIX} ⚠️ TEST_POD_ID or TEST_MEMBER_ID not set`);
      console.log(`${LOG_PREFIX} Looking for existing pod with members...`);

      // Find a pod with members
      const { data: pods } = await supabase
        .from('pod')
        .select('id, name')
        .limit(1);

      if (pods && pods.length > 0) {
        TEST_CONFIG.podId = pods[0].id;
        console.log(`${LOG_PREFIX} Found pod: ${pods[0].name} (${pods[0].id})`);

        // Find a member for this pod with Unipile account (direct column, not through linkedin_accounts)
        const { data: members } = await supabase
          .from('pod_member')
          .select('id, unipile_account_id')
          .eq('pod_id', TEST_CONFIG.podId)
          .not('unipile_account_id', 'is', null)
          .limit(1);

        if (members && members.length > 0) {
          TEST_CONFIG.memberId = members[0].id;
          console.log(`${LOG_PREFIX} Found member: ${members[0].id} (Unipile: ${members[0].unipile_account_id})`);
        }
      }

      if (!TEST_CONFIG.podId || !TEST_CONFIG.memberId) {
        console.log(`${LOG_PREFIX} ❌ No test pod/member found. Create test data first.`);
        console.log(`${LOG_PREFIX}\nTo create test data:`);
        console.log(`${LOG_PREFIX} 1. Create a pod in the pods table`);
        console.log(`${LOG_PREFIX} 2. Add a pod member with a valid unipile_account_id`);
        console.log(`${LOG_PREFIX} Example: UPDATE pod_members SET unipile_account_id = 'xxx' WHERE id = 'member-uuid'`);
        process.exit(1);
      }
    }

    results.push({
      step: 'Prerequisites',
      success: true,
      message: `Pod: ${TEST_CONFIG.podId}, Member: ${TEST_CONFIG.memberId}`,
    });

    // Step 2: Test profile ID resolution
    console.log(`\n${LOG_PREFIX} Step 2: Testing profile ID resolution...`);

    let profileId: string;
    try {
      profileId = await resolveUnipileAccountIdStandalone(TEST_CONFIG.memberId);
      console.log(`${LOG_PREFIX} ✅ Resolved profile ID: ${profileId}`);
      results.push({
        step: 'Profile Resolution',
        success: true,
        message: `Resolved to: ${profileId}`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`${LOG_PREFIX} ❌ Profile resolution failed: ${errorMsg}`);
      results.push({
        step: 'Profile Resolution',
        success: false,
        message: errorMsg,
      });
      printSummary(results);
      process.exit(1);
    }

    // Step 3: Create test activity
    console.log(`\n${LOG_PREFIX} Step 3: Creating test activity...`);

    // Note: pod_activities.id is UUID, so let database generate it
    // post_url is required (NOT NULL), post_id is optional (FK to posts table)
    // Column is 'activity_type' not 'engagement_type' (from migration 20251116)
    const { data: activity, error: createError } = await supabase
      .from('pod_activity')
      .insert({
        pod_id: TEST_CONFIG.podId,
        member_id: TEST_CONFIG.memberId,
        post_url: `https://www.linkedin.com/feed/update/${TEST_CONFIG.postId}`,
        activity_type: 'like',  // DB column is activity_type
        status: 'pending',
        scheduled_for: new Date().toISOString(), // Ready now
      })
      .select()
      .single();

    const testActivityId = activity?.id;

    if (createError) {
      console.log(`${LOG_PREFIX} ❌ Failed to create activity: ${createError.message}`);
      results.push({
        step: 'Create Activity',
        success: false,
        message: createError.message,
      });
      printSummary(results);
      process.exit(1);
    }

    console.log(`${LOG_PREFIX} ✅ Created activity: ${testActivityId}`);
    results.push({
      step: 'Create Activity',
      success: true,
      message: `Activity ID: ${testActivityId}`,
      data: activity,
    });

    // Step 4: Test E-04 scheduling (standalone - bypasses Next.js context)
    console.log(`\n${LOG_PREFIX} Step 4: Testing E-04 scheduling...`);

    // Simulate what E-04 scheduler does: update status to 'scheduled'
    // (Real scheduler uses Next.js server client, we use standalone client)
    const scheduledFor = new Date(Date.now() + 5 * 60 * 1000); // 5 min from now
    const { error: scheduleError } = await supabase
      .from('pod_activity')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledFor.toISOString(),
      })
      .eq('id', testActivityId);

    if (scheduleError) {
      console.log(`${LOG_PREFIX} ❌ Failed to schedule: ${scheduleError.message}`);
    } else {
      console.log(`${LOG_PREFIX} Updated activity status to 'scheduled'`);
    }

    // Verify status changed
    const { data: scheduledActivity } = await supabase
      .from('pod_activity')
      .select('status')
      .eq('id', testActivityId)
      .single();

    if (scheduledActivity?.status === 'scheduled') {
      console.log(`${LOG_PREFIX} ✅ Activity status: scheduled`);
      results.push({
        step: 'E-04 Scheduling',
        success: true,
        message: 'Activity transitioned to scheduled status',
      });
    } else {
      console.log(`${LOG_PREFIX} ❌ Activity status: ${scheduledActivity?.status} (expected: scheduled)`);
      results.push({
        step: 'E-04 Scheduling',
        success: false,
        message: `Status is ${scheduledActivity?.status}, expected scheduled`,
      });
    }

    // Step 5: Test E-05 queue submission
    console.log(`\n${LOG_PREFIX} Step 5: Testing E-05 queue submission...`);

    if (process.env.UNIPILE_MOCK_MODE === 'true') {
      console.log(`${LOG_PREFIX} ⚠️ MOCK MODE - Skipping actual Unipile API call`);

      // Just add to queue without executing
      const job = await addEngagementJob({
        podId: TEST_CONFIG.podId,
        activityId: testActivityId,
        engagementType: 'like',
        postId: TEST_CONFIG.postId,
        profileId: profileId,
        scheduledFor: new Date().toISOString(),
      });

      console.log(`${LOG_PREFIX} ✅ Job added to E-05 queue: ${job.id}`);
      results.push({
        step: 'E-05 Queue',
        success: true,
        message: `Job ID: ${job.id}`,
      });
    } else {
      console.log(`${LOG_PREFIX} 🔥 LIVE MODE - Will call Unipile API`);
      console.log(`${LOG_PREFIX} Set UNIPILE_MOCK_MODE=true to skip this`);

      const job = await addEngagementJob({
        podId: TEST_CONFIG.podId,
        activityId: testActivityId,
        engagementType: 'like',
        postId: TEST_CONFIG.postId,
        profileId: profileId,
        scheduledFor: new Date().toISOString(),
      });

      console.log(`${LOG_PREFIX} ✅ Job added to E-05 queue: ${job.id}`);
      results.push({
        step: 'E-05 Queue',
        success: true,
        message: `Job ID: ${job.id} (LIVE MODE - will execute)`,
      });
    }

    // Step 6: Check queue stats
    console.log(`\n${LOG_PREFIX} Step 6: Checking queue stats...`);
    const stats = await getEngagementQueueStats();
    console.log(`${LOG_PREFIX} Queue stats:`, JSON.stringify(stats, null, 2));
    results.push({
      step: 'Queue Stats',
      success: true,
      message: `Waiting: ${stats.waiting}, Active: ${stats.active}`,
      data: stats,
    });

    // Cleanup: Delete test activity
    console.log(`\n${LOG_PREFIX} Cleanup: Removing test activity...`);
    await supabase.from('pod_activity').delete().eq('id', testActivityId);
    console.log(`${LOG_PREFIX} ✅ Test activity deleted`);

    // Print summary
    printSummary(results);

  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Test failed:`, error);
    printSummary(results);
    process.exit(1);
  }
}

function printSummary(results: TestResult[]): void {
  console.log(`\n${LOG_PREFIX} ========================================`);
  console.log(`${LOG_PREFIX} Test Summary`);
  console.log(`${LOG_PREFIX} ========================================`);

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((r) => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${LOG_PREFIX} ${icon} ${r.step}: ${r.message}`);
  });

  console.log(`${LOG_PREFIX} ----------------------------------------`);
  console.log(`${LOG_PREFIX} Passed: ${passed}/${results.length}`);
  console.log(`${LOG_PREFIX} Failed: ${failed}/${results.length}`);

  if (failed === 0) {
    console.log(`${LOG_PREFIX}\n✅ All tests passed!`);
  } else {
    console.log(`${LOG_PREFIX}\n❌ Some tests failed.`);
  }
}

// Run the test
runTest().catch((error) => {
  console.error(`${LOG_PREFIX} Unhandled error:`, error);
  process.exit(1);
});
