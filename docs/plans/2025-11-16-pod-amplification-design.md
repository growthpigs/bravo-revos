# Pod Amplification System - Design Document

**Date:** November 16, 2025
**Status:** Approved Design
**Priority:** Phase 2 (after V2 workflow JSON refactoring)
**Estimated Effort:** 5-7 hours

---

## Problem Statement

LinkedIn DM Pod workflow requires automated reposting by pod members to amplify original posts. Unipile API claims to support reposting but doesn't actually work. We need browser automation (Playwright) to execute reposts while still using Unipile for authentication and session management.

## Solution Overview

**Hybrid Approach:**
- **Original post publishing**: Unipile API (works fine) ✅
- **Pod member reposting**: Playwright browser automation with Unipile session tokens
- **Activity tracking**: Real-time alerts, retry logic, manual intervention queue

**Architecture Decision:** BullMQ queue with background workers
- Scalable, fault-tolerant, built-in retries
- Requires Redis (already in stack)
- Better than setTimeout (jobs survive restarts)

---

## High-Level Flow

```
1. POST PUBLISHED (via Unipile API)
   └─ Original post goes live on LinkedIn
   └─ System captures post URL, Unipile post ID

2. IMMEDIATE POD TRIGGER
   └─ API: POST /api/pods/trigger-amplification
   └─ Load all active pod members for client
   └─ Calculate randomized delays (2-15 min per member)
   └─ Queue BullMQ jobs with calculated delays

3. BULLMQ WORKER EXECUTION (at scheduled time)
   └─ Retrieve Unipile session token for pod member
   └─ Launch Playwright with injected session cookies
   └─ Navigate to original post
   └─ Click repost button + optional comment
   └─ Capture repost URL
   └─ Update database (success/failure)

4. ACTIVITY ALERTS & MONITORING
   └─ Real-time notification to admin (success/failure)
   └─ In-app notification to pod member
   └─ Failed jobs: auto-retry (up to 3 attempts)
   └─ Persistent failures: manual intervention queue
```

---

## Database Schema

### pod_members Table

```sql
CREATE TABLE pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  user_id UUID REFERENCES users(id), -- Pod owner

  -- Member identification
  name TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  unipile_account_id TEXT NOT NULL, -- Unipile account ID for session tokens

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pod_members_client ON pod_members(client_id) WHERE is_active = true;
CREATE INDEX idx_pod_members_user ON pod_members(user_id);
```

**Design Rationale:**
- One-time setup by admin
- Stores Unipile account ID (NOT LinkedIn passwords - we use Unipile sessions)
- Reusable across all posts
- Client-scoped for multi-tenancy

### pod_activities Table

```sql
CREATE TABLE pod_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  pod_member_id UUID REFERENCES pod_members(id),

  -- Action details
  action TEXT NOT NULL DEFAULT 'repost',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,

  -- Result
  repost_url TEXT, -- Link to member's repost on LinkedIn

  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pod_activities_post ON pod_activities(post_id);
CREATE INDEX idx_pod_activities_status ON pod_activities(status) WHERE status = 'pending';
CREATE INDEX idx_pod_activities_scheduled ON pod_activities(scheduled_for) WHERE status = 'pending';
```

**Design Rationale:**
- One row per repost attempt (tracks individual success/failure)
- Scheduled_for: when BullMQ should execute the job
- Attempt tracking for retry logic
- Links to existing `posts` table

---

## BullMQ Queue Architecture

### Queue Configuration

```typescript
// /lib/queues/pod-amplification-queue.ts
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL);

// Pod repost queue
export const podRepostQueue = new Queue('pod-repost', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 60000 // Start with 1 minute delay
    },
    removeOnComplete: {
      age: 3600 * 24 * 7 // Keep for 7 days
    },
    removeOnFail: false // Keep failed jobs for debugging
  }
});

// Worker (runs in background process)
export const podRepostWorker = new Worker(
  'pod-repost',
  async (job) => {
    console.log('[PodWorker] Executing repost:', job.data.activityId);
    await executeRepost(job.data.activityId);
  },
  {
    connection,
    limiter: {
      max: 5, // Max 5 concurrent reposts
      duration: 60000 // Per minute (anti-rate-limit)
    }
  }
);

// Event handlers
podRepostWorker.on('completed', (job) => {
  console.log('[PodWorker] Job completed:', job.id);
});

podRepostWorker.on('failed', (job, err) => {
  console.error('[PodWorker] Job failed:', job?.id, err);
  // Alert admin via notification system
});
```

**Why BullMQ:**
- Jobs survive server restarts (persisted in Redis)
- Built-in retry with exponential backoff
- Rate limiting (5 concurrent, avoid LinkedIn detection)
- Job monitoring and debugging
- Production-ready (used by major apps)

---

## Playwright Repost Execution

### Core Execution Function

```typescript
// /lib/workers/repost-executor.ts
import { chromium } from 'playwright';
import { createClient } from '@/lib/supabase/server';

export async function executeRepost(activityId: string) {
  const supabase = createClient();

  // 1. Load activity + member + post details
  const { data: activity, error } = await supabase
    .from('pod_activities')
    .select(`
      *,
      pod_members(*),
      posts(*)
    `)
    .eq('id', activityId)
    .single();

  if (error || !activity) {
    throw new Error(`Activity not found: ${activityId}`);
  }

  const member = activity.pod_members;
  const post = activity.posts;

  try {
    // 2. Get Unipile session token for this member
    const sessionToken = await getUnipileSessionToken(member.unipile_account_id);

    // 3. Launch Playwright browser
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
    });

    // 4. Inject Unipile session as LinkedIn cookies
    await context.addCookies([
      {
        name: 'li_at',
        value: sessionToken.li_at,
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        httpOnly: true
      },
      // Additional session cookies from Unipile
      ...sessionToken.additional_cookies
    ]);

    const page = await context.newPage();

    // 5. Navigate to original post
    console.log('[Repost] Navigating to:', post.post_url);
    await page.goto(post.post_url, { waitUntil: 'networkidle' });

    // 6. Click repost button
    console.log('[Repost] Clicking repost button');
    await page.click('button[aria-label*="Repost"]');
    await page.waitForSelector('div[role="dialog"]');

    // 7. Optional: Add randomized comment (30% chance)
    const shouldComment = Math.random() > 0.7;
    if (shouldComment) {
      const comments = [
        'Great insights!',
        'This is valuable',
        'Worth reading',
        'Exactly what I needed'
      ];
      const randomComment = comments[Math.floor(Math.random() * comments.length)];

      await page.fill('[contenteditable="true"]', randomComment);
    }

    // 8. Confirm repost
    await page.click('button:has-text("Repost")');
    await page.waitForTimeout(3000); // Wait for navigation

    // 9. Capture repost URL
    const repostUrl = page.url();

    await browser.close();

    // 10. Update activity as success
    await supabase
      .from('pod_activities')
      .update({
        status: 'success',
        executed_at: new Date().toISOString(),
        repost_url: repostUrl,
        attempt_number: activity.attempt_number
      })
      .eq('id', activityId);

    // 11. Send success alert
    await sendActivityAlert({
      activityId,
      memberId: member.id,
      postUrl: post.post_url,
      status: 'success',
      repostUrl,
      executedAt: new Date()
    });

    console.log('[Repost] Success:', repostUrl);

  } catch (error: any) {
    console.error('[Repost] Failed:', error.message);

    // Update activity as failed
    await supabase
      .from('pod_activities')
      .update({
        status: 'failed',
        executed_at: new Date().toISOString(),
        error_message: error.message,
        attempt_number: activity.attempt_number
      })
      .eq('id', activityId);

    // Send failure alert
    await sendActivityAlert({
      activityId,
      memberId: member.id,
      postUrl: post.post_url,
      status: 'failed',
      error: error.message,
      executedAt: new Date()
    });

    // Re-throw for BullMQ retry logic
    throw error;
  }
}

// Helper: Get Unipile session token
async function getUnipileSessionToken(unipileAccountId: string) {
  const response = await fetch(`https://api.unipile.com/v1/accounts/${unipileAccountId}/session`, {
    headers: {
      'Authorization': `Bearer ${process.env.UNIPILE_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get Unipile session token');
  }

  return response.json();
}
```

**Key Design Points:**
- Uses Unipile session tokens (no storing LinkedIn passwords)
- Injects cookies into Playwright context (seamless auth)
- Simple DOM navigation (LinkedIn's standard repost flow)
- Randomized commenting (30% chance, appears organic)
- Proper error handling with database updates
- Re-throws error for BullMQ retry logic

---

## API Endpoints

### POST /api/pods/trigger-amplification

**Trigger pod reposting immediately after post publishes**

```typescript
// /app/api/pods/trigger-amplification/route.ts
export async function POST(req: Request) {
  const { postId } = await req.json();
  const supabase = createClient();

  // 1. Get post details
  const { data: post } = await supabase
    .from('posts')
    .select('*, campaigns(*)')
    .eq('id', postId)
    .single();

  // 2. Get all active pod members for this client
  const { data: podMembers } = await supabase
    .from('pod_members')
    .select('*')
    .eq('client_id', post.campaigns.client_id)
    .eq('is_active', true);

  if (!podMembers || podMembers.length === 0) {
    return NextResponse.json({ error: 'No pod members found' }, { status: 400 });
  }

  // 3. Calculate randomized delays for each member (2-15 minutes)
  const now = Date.now();
  const activities = podMembers.map((member) => {
    const delayMs = (2 + Math.random() * 13) * 60000; // 2-15 min
    const scheduledFor = new Date(now + delayMs);

    return {
      post_id: postId,
      pod_member_id: member.id,
      action: 'repost',
      status: 'pending',
      scheduled_for: scheduledFor,
      attempt_number: 1,
      max_attempts: 3
    };
  });

  // 4. Insert activities into database
  const { data: insertedActivities } = await supabase
    .from('pod_activities')
    .insert(activities)
    .select();

  // 5. Queue BullMQ jobs with calculated delays
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

---

## Activity Alerts System

### Alert Types

1. **Real-time Admin Notifications**
   - When: Each repost completes/fails
   - Channel: In-app notification banner
   - Content: Member name, post URL, status, timestamp

2. **In-app Notifications to Pod Members**
   - When: Their repost executes
   - Channel: Notification center
   - Content: Post URL, status, repost URL (if success)

3. **Manual Intervention Queue**
   - When: Job fails 3 times (exhausted retries)
   - Channel: Admin dashboard alert
   - Action: Admin can manually retry or disable member

### Implementation

```typescript
// /lib/notifications/pod-alerts.ts
async function sendActivityAlert(params: {
  activityId: string;
  memberId: string;
  postUrl: string;
  status: 'success' | 'failed';
  repostUrl?: string;
  error?: string;
  executedAt: Date;
}) {
  const supabase = createClient();

  // Get member and admin user details
  const { data: member } = await supabase
    .from('pod_members')
    .select('*, users(*)')
    .eq('id', params.memberId)
    .single();

  // Create in-app notification
  await supabase
    .from('notifications')
    .insert({
      user_id: member.user_id, // Pod owner/admin
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

---

## Admin UI

### /admin/pods - Pod Management

**Features:**
- List all pod members (table view)
- Add new member (modal with Unipile account ID)
- Edit member details
- Activate/deactivate members
- View last activity timestamp

**Columns:**
- Name
- LinkedIn URL (clickable)
- Unipile Account ID
- Status (Active/Inactive badge)
- Last Activity (relative time)
- Actions (Edit, Delete)

### /admin/pods/activity - Activity Dashboard

**Features:**
- Real-time table of all pod activities
- Filters: status, date range, pod member
- Auto-refresh every 30 seconds
- Click row → view full details

**Columns:**
- Pod Member Name
- Post URL (clickable)
- Action (badge: "Repost")
- Status (Success/Failed/Pending)
- Scheduled For
- Executed At
- Result (Repost URL or error message)

---

## Testing Plan

### Unit Tests
- `executeRepost()` - Mock Playwright, verify database updates
- `getUnipileSessionToken()` - Mock API, verify error handling
- Queue job creation - Verify correct delays calculated

### Integration Tests
- End-to-end: Trigger → Queue → Execute → Alert
- Retry logic: Simulate failure, verify 3 attempts
- Manual intervention: Verify failed jobs appear in queue

### Manual Testing (with real LinkedIn accounts)
1. Set up 2-3 pod members in `/admin/pods`
2. Publish test post via Unipile
3. Trigger pod amplification
4. Verify:
   - Jobs scheduled with randomized delays
   - Reposts appear on LinkedIn
   - Activity alerts received
   - Failed jobs retry automatically

---

## Security Considerations

1. **Session Token Security**
   - Unipile tokens stored temporarily (fetched on-demand)
   - Never logged or persisted
   - Cookies injected in ephemeral browser context

2. **Rate Limiting**
   - Max 5 concurrent reposts (BullMQ limiter)
   - Randomized delays (2-15 min) to avoid detection
   - Optional comments add human-like behavior

3. **Error Handling**
   - Graceful degradation (skip failed member, continue with others)
   - Detailed error logging for debugging
   - Manual intervention queue for persistent issues

4. **Multi-tenancy**
   - Pod members scoped by `client_id`
   - RLS policies on `pod_members` and `pod_activities`
   - Each client sees only their pod data

---

## Deployment Checklist

- [ ] Redis connection configured (Upstash)
- [ ] BullMQ worker process running (`npm run worker:pod-automation`)
- [ ] Playwright installed in production environment
- [ ] Unipile API key valid
- [ ] Database migrations applied
- [ ] Admin UI deployed
- [ ] Monitoring alerts configured

---

## Success Metrics

- **Repost Success Rate:** >95%
- **Average Execution Time:** <30 seconds per repost
- **Retry Success Rate:** >80% (failures resolved on retry)
- **Manual Intervention Rate:** <5% (most issues auto-resolve)

---

## Future Enhancements (Out of Scope)

- AI-generated personalized comments per member
- Scheduled pod campaigns (trigger at specific time)
- Pod performance analytics (which members drive most engagement)
- Cross-platform support (Twitter, Facebook)

---

**Design Status:** ✅ Approved
**Next Step:** Create Archon implementation tasks using writing-plans skill
