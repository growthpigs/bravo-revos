# Pod Amplification System - Implementation Plan

**Date:** November 16, 2025
**Priority:** Phase 2 (after V2 workflow JSON refactoring)
**Estimated Effort:** 5-7 hours
**Approach:** TDD with subagent-driven development

---

## Prerequisites

- ✅ V2 workflow JSON refactoring complete (100% NON-NEGOTIABLE compliance)
- ✅ Design document reviewed: `/docs/plans/2025-11-16-pod-amplification-design.md`
- ✅ Redis connection configured (Upstash)
- ✅ Playwright installed in project

---

## Task Breakdown

### Task 1: Database Schema - Pod Tables (1 hour)

**Goal:** Create `pod_members` and `pod_activities` tables with RLS policies

**Implementation:**
1. Create migration: `supabase/migrations/20251116_create_pod_tables.sql`
2. Include both tables with all columns from design
3. Add indexes for performance (client_id, status, scheduled_for)
4. Add RLS policies (client-scoped, admin full access)
5. Add helpful SQL comments

**Testing:**
- Apply migration via Supabase SQL editor
- Verify tables exist: `\d pod_members`, `\d pod_activities`
- Test RLS: Insert/select as different users
- Verify indexes: `\d pod_members` shows all indexes

**Success Criteria:**
- Migration applies without errors
- RLS prevents cross-client data access
- Indexes exist for query optimization

---

### Task 2: BullMQ Queue Setup (1 hour)

**Goal:** Configure pod repost queue with retry logic

**Files to Create:**
- `/lib/queues/pod-amplification-queue.ts` - Queue and worker configuration

**Implementation:**
```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { executeRepost } from '@/lib/workers/repost-executor';

const connection = new Redis(process.env.UPSTASH_REDIS_URL);

export const podRepostQueue = new Queue('pod-repost', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
    removeOnComplete: { age: 3600 * 24 * 7 },
    removeOnFail: false
  }
});

export const podRepostWorker = new Worker(
  'pod-repost',
  async (job) => {
    console.log('[PodWorker] Executing:', job.data.activityId);
    await executeRepost(job.data.activityId);
  },
  {
    connection,
    limiter: { max: 5, duration: 60000 }
  }
);

podRepostWorker.on('completed', (job) => {
  console.log('[PodWorker] Completed:', job.id);
});

podRepostWorker.on('failed', (job, err) => {
  console.error('[PodWorker] Failed:', job?.id, err);
});
```

**Testing:**
- Create test job: `podRepostQueue.add('test', { activityId: 'test-123' })`
- Verify job appears in Redis
- Verify worker picks up job
- Test retry logic with intentional failure

**Success Criteria:**
- Jobs queue successfully
- Worker processes jobs
- Retry logic works (3 attempts with exponential backoff)
- Rate limiting prevents >5 concurrent jobs

---

### Task 3: Playwright Repost Executor (2 hours)

**Goal:** Implement browser automation for LinkedIn reposting

**Files to Create:**
- `/lib/workers/repost-executor.ts` - Core repost logic with Playwright

**Implementation:**
```typescript
import { chromium } from 'playwright';
import { createClient } from '@/lib/supabase/server';
import { sendActivityAlert } from '@/lib/notifications/pod-alerts';

export async function executeRepost(activityId: string) {
  const supabase = createClient();

  // 1. Load activity + member + post
  const { data: activity } = await supabase
    .from('pod_activities')
    .select(`*, pod_members(*), posts(*)`)
    .eq('id', activityId)
    .single();

  if (!activity) throw new Error(`Activity not found: ${activityId}`);

  try {
    // 2. Get Unipile session token
    const sessionToken = await getUnipileSessionToken(
      activity.pod_members.unipile_account_id
    );

    // 3. Launch Playwright
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...'
    });

    // 4. Inject Unipile session cookies
    await context.addCookies([
      {
        name: 'li_at',
        value: sessionToken.li_at,
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        httpOnly: true
      }
    ]);

    const page = await context.newPage();

    // 5. Navigate to post
    await page.goto(activity.posts.post_url, { waitUntil: 'networkidle' });

    // 6. Click repost button
    await page.click('button[aria-label*="Repost"]');
    await page.waitForSelector('div[role="dialog"]');

    // 7. Optional comment (30% chance)
    if (Math.random() > 0.7) {
      const comments = ['Great insights!', 'Worth reading', 'Valuable'];
      await page.fill(
        '[contenteditable="true"]',
        comments[Math.floor(Math.random() * comments.length)]
      );
    }

    // 8. Confirm repost
    await page.click('button:has-text("Repost")');
    await page.waitForTimeout(3000);

    const repostUrl = page.url();
    await browser.close();

    // 9. Update activity success
    await supabase
      .from('pod_activities')
      .update({
        status: 'success',
        executed_at: new Date().toISOString(),
        repost_url: repostUrl
      })
      .eq('id', activityId);

    // 10. Send alert
    await sendActivityAlert({
      activityId,
      memberId: activity.pod_member_id,
      postUrl: activity.posts.post_url,
      status: 'success',
      repostUrl,
      executedAt: new Date()
    });

  } catch (error: any) {
    // Update failure
    await supabase
      .from('pod_activities')
      .update({
        status: 'failed',
        executed_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', activityId);

    // Send failure alert
    await sendActivityAlert({
      activityId,
      memberId: activity.pod_member_id,
      postUrl: activity.posts.post_url,
      status: 'failed',
      error: error.message,
      executedAt: new Date()
    });

    throw error; // Re-throw for BullMQ retry
  }
}

async function getUnipileSessionToken(unipileAccountId: string) {
  const response = await fetch(
    `https://api.unipile.com/v1/accounts/${unipileAccountId}/session`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.UNIPILE_API_KEY}`
      }
    }
  );

  if (!response.ok) throw new Error('Failed to get Unipile session');
  return response.json();
}
```

**Testing:**
- Mock Playwright: Test with playwright.test()
- Mock Unipile API: Verify session token fetch
- Test failure scenarios: Network error, LinkedIn selector change
- Verify database updates: Success and failure cases
- Test retry logic: Intentional failures

**Success Criteria:**
- Successfully navigates to LinkedIn post
- Injects cookies and authenticates
- Clicks repost button and confirms
- Updates database correctly
- Handles errors and retries

---

### Task 4: Pod Trigger API Endpoint (1 hour)

**Goal:** API endpoint to trigger pod amplification after post publishes

**Files to Create:**
- `/app/api/pods/trigger-amplification/route.ts`

**Implementation:**
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { podRepostQueue } from '@/lib/queues/pod-amplification-queue';

export async function POST(req: Request) {
  const { postId } = await req.json();
  const supabase = createClient();

  // 1. Get post details
  const { data: post } = await supabase
    .from('posts')
    .select('*, campaigns(*)')
    .eq('id', postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // 2. Get active pod members for client
  const { data: podMembers } = await supabase
    .from('pod_members')
    .select('*')
    .eq('client_id', post.campaigns.client_id)
    .eq('is_active', true);

  if (!podMembers || podMembers.length === 0) {
    return NextResponse.json({ error: 'No pod members' }, { status: 400 });
  }

  // 3. Calculate randomized delays (2-15 min)
  const now = Date.now();
  const activities = podMembers.map((member) => {
    const delayMs = (2 + Math.random() * 13) * 60000;
    return {
      post_id: postId,
      pod_member_id: member.id,
      action: 'repost',
      status: 'pending',
      scheduled_for: new Date(now + delayMs),
      attempt_number: 1,
      max_attempts: 3
    };
  });

  // 4. Insert activities
  const { data: insertedActivities } = await supabase
    .from('pod_activities')
    .insert(activities)
    .select();

  // 5. Queue BullMQ jobs
  for (const activity of insertedActivities) {
    const delay = new Date(activity.scheduled_for).getTime() - Date.now();
    await podRepostQueue.add(
      'repost',
      { activityId: activity.id },
      { delay }
    );
  }

  return NextResponse.json({
    success: true,
    activitiesScheduled: insertedActivities.length,
    activities: insertedActivities
  });
}
```

**Testing:**
- Create test post with campaign
- Create test pod members
- Call endpoint: `POST /api/pods/trigger-amplification`
- Verify activities inserted with correct delays
- Verify BullMQ jobs queued
- Check job execution at scheduled time

**Success Criteria:**
- Activities created for all pod members
- Delays randomized between 2-15 minutes
- BullMQ jobs queued successfully
- Jobs execute at scheduled time

---

### Task 5: Activity Alerts System (1 hour)

**Goal:** Real-time notifications for repost success/failure

**Files to Create:**
- `/lib/notifications/pod-alerts.ts`

**Implementation:**
```typescript
import { createClient } from '@/lib/supabase/server';

export async function sendActivityAlert(params: {
  activityId: string;
  memberId: string;
  postUrl: string;
  status: 'success' | 'failed';
  repostUrl?: string;
  error?: string;
  executedAt: Date;
}) {
  const supabase = createClient();

  // Get member and user details
  const { data: member } = await supabase
    .from('pod_members')
    .select('*, users(*)')
    .eq('id', params.memberId)
    .single();

  // Create in-app notification
  await supabase.from('notifications').insert({
    user_id: member.user_id,
    type: 'pod_activity',
    title: params.status === 'success'
      ? '✅ Pod Repost Successful'
      : '❌ Pod Repost Failed',
    message: params.status === 'success'
      ? `${member.name} reposted: ${params.postUrl}`
      : `Failed to repost for ${member.name}: ${params.error}`,
    metadata: {
      activity_id: params.activityId,
      post_url: params.postUrl,
      repost_url: params.repostUrl,
      status: params.status,
      executed_at: params.executedAt
    }
  });
}
```

**Testing:**
- Mock activity success: Verify notification created
- Mock activity failure: Verify error message in notification
- Test notification metadata: Contains all required fields
- Verify user receives notification in UI

**Success Criteria:**
- Notifications created for success/failure
- Contains activity details and URLs
- User can see notification in UI

---

### Task 6: Admin UI - Pod Management (1.5 hours)

**Goal:** UI for managing pod members

**Files to Create:**
- `/app/admin/pods/page.tsx` - Pod members list
- `/components/admin/AddPodMemberModal.tsx` - Add member form

**Implementation:**
- Table with columns: Name, LinkedIn URL, Unipile Account ID, Status, Last Activity, Actions
- Add Member button → Modal with form
- Edit/Delete actions per row
- Active/Inactive toggle

**Testing:**
- Add new pod member
- Edit existing member
- Toggle active/inactive status
- Delete member
- Verify RLS: Can only see own client's members

**Success Criteria:**
- Can add/edit/delete pod members
- UI shows correct data
- RLS enforced

---

### Task 7: Admin UI - Activity Dashboard (1 hour)

**Goal:** Real-time activity monitoring

**Files to Create:**
- `/app/admin/pods/activity/page.tsx` - Activity dashboard

**Implementation:**
- Table with columns: Member, Post URL, Status, Scheduled, Executed, Result
- Filters: status, date range, pod member
- Auto-refresh every 30 seconds
- Click row → View full details

**Testing:**
- Create test activities (pending, success, failed)
- Verify table updates in real-time
- Test filters work correctly
- Click row and verify details modal

**Success Criteria:**
- Shows all activities with correct status
- Filters work
- Auto-refresh works
- Details modal shows complete info

---

### Task 8: Integration Testing & Validation (30 min)

**Goal:** End-to-end validation of complete flow

**Testing Checklist:**
1. Create pod members (2-3 test accounts)
2. Publish LinkedIn post via Unipile
3. Trigger pod amplification: `POST /api/pods/trigger-amplification`
4. Verify activities created with delays
5. Wait for execution (or manually trigger)
6. Verify reposts appear on LinkedIn
7. Verify alerts sent
8. Check activity dashboard updates
9. Test retry logic (force failure)
10. Verify manual intervention queue

**Success Criteria:**
- Complete flow works end-to-end
- Reposts appear on LinkedIn
- Alerts received
- Failed jobs retry 3 times
- Manual intervention queue shows persistent failures

---

## Execution Strategy

**Use:** Subagent-driven development (`/superpowers-execute-plan`)

**Workflow:**
1. Launch fresh subagent per task
2. Subagent implements with TDD
3. Code review between tasks
4. Continuous validation
5. Update Archon task status

**Time Estimate:** 5-7 hours total (assuming no major blockers)

---

## Dependencies

- Redis (Upstash) for BullMQ
- Playwright for browser automation
- Unipile API key with valid accounts
- Test LinkedIn accounts for pod members

---

## Success Metrics

- **Repost Success Rate:** >95%
- **Average Execution Time:** <30 seconds per repost
- **Retry Success Rate:** >80%
- **Manual Intervention Rate:** <5%

---

**Plan Status:** ✅ Complete and ready for execution
**Next Step:** Execute V2 workflow JSON refactoring first (Phase 1 priority)
