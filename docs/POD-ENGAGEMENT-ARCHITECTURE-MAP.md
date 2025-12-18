# Pod Engagement System - Technical Architecture Map

**Date:** 2025-12-18
**Status:** Active System Analysis
**Purpose:** Complete technical mapping of pod engagement flow from trigger to execution

---

## Executive Summary

The RevOS pod engagement system implements automated LinkedIn interactions (likes, comments, reposts) using a multi-queue BullMQ architecture. The system has **two distinct flows**:

1. **DEPRECATED:** Repost flow (disabled due to Unipile API limitations)
2. **ACTIVE:** Like/Comment flow (fully functional via Unipile API)

### Critical Finding: Two Parallel Implementations

**Queue Architecture:**
- `podAmplification` queue → `repost-executor` worker (DISABLED)
- `pod-automation` queue → E-04 scheduler → `pod-engagement` queue → E-05 executor (ACTIVE)

**The disconnect:** Code references both systems interchangeably, causing confusion about which path is actually used.

---

## 1. Current State: Repost Executor (DISABLED)

### File: `/lib/workers/repost-executor.ts`

**Status:** Feature-gated by `ENABLE_REPOST_FEATURE=true` (defaults to `false`)

**Purpose:** Execute LinkedIn reposts using browser automation (Playwright)

**Why Disabled:**
```typescript
/**
 * FEATURE STATUS: DISABLED (2024-12-18)
 *
 * Reposts require browser automation with LinkedIn session cookies.
 * Unipile does NOT have a session export endpoint (verified 404).
 *
 * To enable reposts, one of these solutions is needed:
 * 1. Unipile adds session export endpoint (contact support@unipile.com)
 * 2. Manual cookie collection during user onboarding
 * 3. Custom browser extension to capture cookies
 */
```

**Queue Relationship:**
- **Consumes:** `podAmplification` queue (defined in `/lib/queues/pod-amplification-queue.ts`)
- **Worker Name:** `repostExecutorWorker`
- **Concurrency:** 5

**Execution Flow (when enabled):**
1. Job data: `{ podActivityId, postUrl, memberUnipileAccountId }`
2. Fetch Unipile session cookies via `GET /v1/accounts/{id}/session` (404 error)
3. Launch Playwright browser with injected cookies
4. Navigate to LinkedIn post URL
5. Click repost button (multi-selector strategy)
6. Screenshot for proof
7. Upload to Supabase storage bucket `pod-amplification-proofs`
8. Update `pod_activities` table with status

**Database Updates:**
```typescript
// Success path
await supabase.from('pod_activities').update({
  status: 'success',
  proof_screenshot_url: screenshotUrl,
}).eq('id', podActivityId);

// Failure path
await supabase.from('pod_activities').update({
  status: 'failed',
  // error_message: error.message, // Column not used
}).eq('id', podActivityId);
```

**Safety Rails:**
- Mock mode: `UNIPILE_MOCK_MODE=true` → Updates DB to success with placeholder screenshot
- Feature gate: Returns early if `ENABLE_REPOST_FEATURE !== 'true'`

**Current Issues:**
- ❌ Unipile session export endpoint returns 404
- ❌ No alternative cookie collection method implemented
- ⚠️ Worker is registered but never receives real jobs (feature disabled)

---

## 2. Queue Architecture: Pod Amplification (Repost Flow)

### File: `/lib/queues/pod-amplification-queue.ts`

**Queue Name:** `podAmplification`

**Redis Connection:** Creates its own `ioredis` instance (not using centralized `/lib/redis.ts`)

```typescript
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
```

**Job Schema:**
```typescript
export interface PodAmplificationJob {
  podActivityId: string;          // UUID from pod_activities table
  postUrl: string;                // LinkedIn post URL (for Playwright navigation)
  memberUnipileAccountId: string; // Unipile account ID (for session fetch)
}
```

**Queue Configuration:**
- Attempts: 3
- Backoff: Exponential, 1 minute initial delay

**Worker Registration:**
- Worker defined in `/lib/workers/repost-executor.ts`
- Consumes queue: `podAmplificationQueue.name` (which is `'podAmplification'`)

**Current State:**
- ✅ Queue is exported and functional
- ✅ Worker is registered and listening
- ❌ No jobs are added (feature disabled)
- ⚠️ API route exists but is feature-gated

---

## 3. API Route: Trigger Amplification (Repost Flow)

### File: `/app/api/pods/trigger-amplification/route.ts`

**Endpoint:** `POST /api/pods/trigger-amplification`

**Status:** Feature-gated by `ENABLE_REPOST_FEATURE=true`

**Purpose:** Create repost jobs for all pod members except post author

**Request Body:**
```json
{
  "postId": "uuid-of-post-in-posts-table"
}
```

**Execution Flow:**

1. **Fetch Post:**
   ```typescript
   const { data: post } = await supabase
     .from('posts')
     .select('id, linkedin_account_id, campaign_id, post_url')
     .eq('id', postId)
     .single();
   ```

2. **Find Pod via Campaign:**
   ```typescript
   const { data: podMemberData } = await supabase
     .from('pod_members')
     .select('pod_id')
     .eq('linkedin_account_id', post.linkedin_account_id)
     .single();
   ```

3. **Get Pod Members (IMPORTANT JOIN):**
   ```typescript
   const { data: podMembers } = await supabase
     .from('pod_members')
     .select(`
       id,
       linkedin_account_id,
       linkedin_accounts!inner (
         unipile_account_id
       )
     `)
     .eq('pod_id', podId)
     .neq('linkedin_account_id', post.linkedin_account_id); // Exclude author
   ```

   **Critical Detail:** `unipile_account_id` is on `linkedin_accounts` table, NOT `pod_members`.

4. **Create Pod Activities:**
   ```typescript
   podActivitiesToInsert.push({
     id: podActivityId,
     pod_id: podId,
     member_id: member.id,
     post_id: postId,
     post_url: post.post_url,        // Required (NOT NULL)
     activity_type: 'repost',        // DB column name
     status: 'pending',
     scheduled_for: scheduledFor,    // 2-15 min delay
   });
   ```

5. **Queue Jobs:**
   ```typescript
   await podAmplificationQueue.addBulk(jobsToAdd);
   ```

**Schema Dependency:**
```sql
-- pod_activities columns used by this flow
id UUID
pod_id UUID REFERENCES pods(id)
member_id UUID REFERENCES pod_members(id)
post_id UUID REFERENCES posts(id)
post_url TEXT NOT NULL
activity_type TEXT -- 'repost'
status TEXT -- 'pending' → 'processing' → 'success'/'failed'
scheduled_for TIMESTAMPTZ
```

**Current Behavior:**
When `ENABLE_REPOST_FEATURE=false` (default):
```json
{
  "message": "Repost feature is currently disabled. Likes and comments are available via pod engagement.",
  "feature_status": "disabled",
  "reason": "Unipile session export not available - see docs/POD-REPOST-ARCHITECTURE-ANALYSIS.md"
}
```

---

## 4. Active System: Pod Engagement Worker (Likes/Comments)

### File: `/lib/queues/pod-engagement-worker.ts`

**Queue Name:** `pod-engagement`

**Status:** ✅ **ACTIVE AND WORKING**

**Architecture:** E-05 Pod Engagement Executor (from spec docs)

**Redis Connection:** Uses centralized `/lib/redis.ts` singleton

### Queue Configuration

```typescript
const QUEUE_NAME = 'pod-engagement';
const WORKER_CONCURRENCY = 2; // Reduced from 5 to prevent API overload
const DAILY_ENGAGEMENT_LIMIT = 90; // Per account (LinkedIn allows 100)
const RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000; // 15 min cooldown after 429
```

### Job Schema

```typescript
export interface EngagementJobData {
  podId: string;
  activityId: string;
  engagementType: 'like' | 'comment';
  postId: string;
  profileId: string;          // Unipile account ID
  commentText?: string;       // Required for comments
  scheduledFor: string;       // ISO timestamp
}
```

### Rate Limiting (Per-Account)

**Redis Keys:**
- Daily count: `pod-engagement:daily:{accountId}` (TTL: end of UTC day)
- Cooldown: `pod-engagement:cooldown:{accountId}` (TTL: 15 minutes)

**Flow:**
1. Check `checkAccountDailyLimit(accountId)` → allowed/count/remaining
2. If count >= 90, throw `EngagementJobError('rate_limit')`
3. If in cooldown, throw `EngagementJobError('rate_limit')`
4. Execute engagement
5. On success: `incrementAccountDailyCount(accountId)`
6. On 429 error: `setAccountCooldown(accountId)` (15 min block)

**Fail-Open Strategy:** If Redis is down, allow execution (log warning)

### Execution Flow

**1. Job Processing (`processEngagementJob`):**

```typescript
// Step 1: Fetch activity from DB
const activity = await fetchActivityFromDatabase(activityId);

// Step 2: Verify status is 'scheduled' (not already executed)
if (activity.status !== 'scheduled') {
  throw new Error(`Activity ${activityId} is in '${activity.status}' status, expected 'scheduled'`);
}

// Step 3: Resolve Unipile account ID
resolvedProfileId = await resolveUnipileAccountId(
  activity.member_id,
  activity.unipile_account_id
);

// Step 4: Rate limit checks
const limitCheck = await checkAccountDailyLimit(resolvedProfileId);
if (!limitCheck.allowed) throw new EngagementJobError('rate_limit');

const inCooldown = await isAccountInCooldown(resolvedProfileId);
if (inCooldown) throw new EngagementJobError('rate_limit');

// Step 5: Execute engagement (like or comment)
switch (engagementType) {
  case 'like':
    executionResult = await executeLikeEngagement({...});
    break;
  case 'comment':
    executionResult = await executeCommentEngagement({...});
    break;
}

// Step 6: Update database
await updateActivityInDatabase(activityId, executionResult);

// Step 7: Increment daily counter (only on success)
if (executionResult.success) {
  await incrementAccountDailyCount(resolvedProfileId);
}
```

**2. Unipile Account ID Resolution:**

```typescript
export async function resolveUnipileAccountId(
  memberId: string,
  activityUnipileId?: string
): Promise<string> {
  // Fast path: activity already has unipile_account_id
  if (activityUnipileId) {
    return activityUnipileId;
  }

  // Slow path: JOIN through linkedin_accounts table
  const { data: member } = await supabase
    .from('pod_members')
    .select(`
      id,
      linkedin_account_id,
      linkedin_accounts!inner (
        unipile_account_id
      )
    `)
    .eq('id', memberId)
    .single();

  const unipileAccountId = member?.linkedin_accounts?.unipile_account_id;

  if (!unipileAccountId) {
    throw new EngagementJobError('validation_error');
  }

  return unipileAccountId;
}
```

**Key Insight:** `pod_members` → `linkedin_accounts` relationship is critical. `unipile_account_id` lives on `linkedin_accounts`, not `pod_members`.

**3. Like Execution:**

```typescript
async function executeLikeEngagement({ activityId, postId, profileId }) {
  const unipileDsn = process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211';
  const likeUrl = `${unipileDsn}/api/v1/posts/${postId}/reactions`;

  const response = await fetch(likeUrl, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.UNIPILE_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      account_id: profileId,
      type: 'LIKE',
    }),
    signal: controller.signal, // 25s timeout
  });

  if (!response.ok) {
    // Error classification by status code
    if (response.status === 429) throw new EngagementJobError('rate_limit');
    if (response.status === 401 || 403) throw new EngagementJobError('auth_error');
    if (response.status === 404) throw new EngagementJobError('not_found');
    throw new EngagementJobError('unknown_error');
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    activityId,
    engagementType: 'like',
  };
}
```

**4. Comment Execution (with Voice Cartridge):**

```typescript
async function executeCommentEngagement({ podId, activityId, postId, profileId, commentText }) {
  // Fetch pod's voice cartridge
  const { data: pod } = await supabase
    .from('pods')
    .select('voice_cartridge_id')
    .eq('id', podId)
    .maybeSingle();

  let finalCommentText = commentText;

  if (pod?.voice_cartridge_id) {
    const { data: cartridge } = await supabase
      .from('cartridges')
      .select('voice_params')
      .eq('id', pod.voice_cartridge_id)
      .maybeSingle();

    if (cartridge?.voice_params) {
      // Apply tone, emojis, hashtags, banned words
      finalCommentText = applyVoiceParams(commentText, cartridge.voice_params);
    }
  }

  // Post comment to LinkedIn via Unipile
  const unipileDsn = process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211';
  const commentUrl = `${unipileDsn}/api/v1/posts/${postId}/comments`;

  const response = await fetch(commentUrl, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.UNIPILE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: profileId,
      text: finalCommentText,
    }),
    signal: controller.signal, // 25s timeout
  });

  // Error handling same as likes
  // ...

  return {
    success: true,
    timestamp: new Date().toISOString(),
    activityId,
    engagementType: 'comment',
  };
}
```

**Voice Params Application:**
```typescript
function applyVoiceParams(text: string, voiceParams: any): string {
  // Formality adjustment (casual vs formal language)
  if (voiceParams.tone?.formality === 'casual') {
    text = text
      .replace(/therefore,?/gi, 'so')
      .replace(/moreover,?/gi, 'plus')
      .replace(/nevertheless,?/gi, 'but');
  }

  // Add emojis if enabled
  if (voiceParams.style?.use_emojis && !text.includes('😊')) {
    text += ' 👍';
  }

  // Remove banned words
  if (Array.isArray(voiceParams.vocabulary?.banned_words)) {
    for (const bannedWord of voiceParams.vocabulary.banned_words) {
      const regex = new RegExp(`\\b${bannedWord}\\b`, 'gi');
      text = text.replace(regex, '');
    }
  }

  return text.trim();
}
```

**5. Database Update (Idempotent):**

```typescript
async function updateActivityInDatabase(activityId: string, result: ExecutionResult) {
  // Step 1: Check current status (idempotency)
  const { data: currentActivity } = await supabase
    .from('pod_activities')
    .select('status, execution_attempts, execution_result')
    .eq('id', activityId)
    .maybeSingle();

  // Already executed? Skip duplicate update
  if (currentActivity?.status === 'completed' || currentActivity?.status === 'executed') {
    console.log('Activity already executed (idempotency check passed)');
    return;
  }

  // Step 2: Prepare update data
  const executionAttempts = (currentActivity?.execution_attempts || 0) + 1;
  const updateData = {
    status: result.success ? 'completed' : 'failed',
    executed_at: new Date().toISOString(),
    execution_attempts: executionAttempts,
    execution_result: {
      success: result.success,
      timestamp: result.timestamp,
      error: result.error || null,
      error_type: result.errorType || null,
      attempt: executionAttempts,
    },
    last_error: result.error || null,
  };

  // Step 3: Atomic update (prevent race conditions)
  const { data: updated } = await supabase
    .from('pod_activities')
    .update(updateData)
    .eq('id', activityId)
    .eq('status', 'scheduled') // Only update if still scheduled
    .select();

  // No rows updated? Another process beat us (idempotent)
  if (!updated || updated.length === 0) {
    console.log('Activity was already updated by another process');
    return;
  }
}
```

### Error Handling & Retry Logic

**Custom Error Class:**
```typescript
export class EngagementJobError extends Error {
  constructor(
    message: string,
    public readonly errorType: 'rate_limit' | 'auth_error' | 'network_error' |
                                'not_found' | 'unknown_error' | 'validation_error' | 'timeout'
  ) {
    super(message);
    this.name = 'EngagementJobError';
  }
}
```

**Retry Strategy:**
```typescript
function determineRetryStrategy(errorType, attempt, maxAttempts): boolean {
  // NEVER retry (permanent failures)
  if (errorType === 'auth_error') return false;
  if (errorType === 'validation_error') return false;
  if (errorType === 'not_found') return false;

  // Retry up to maxAttempts (3)
  if (errorType === 'rate_limit') return attempt < maxAttempts;
  if (errorType === 'network_error') return attempt < maxAttempts;
  if (errorType === 'timeout') return attempt < maxAttempts;
  if (errorType === 'unknown_error') return attempt < maxAttempts;

  return false;
}
```

**Dead-Letter Queue:**
```typescript
async function handleFailedActivity(activityId, errorMessage, errorType, attempt) {
  // Mark activity as permanently failed
  await supabase
    .from('pod_activities')
    .update({
      status: 'failed',
      executed_at: new Date().toISOString(),
      execution_attempts: attempt,
      last_error: errorMessage,
      execution_result: {
        success: false,
        timestamp: new Date().toISOString(),
        error: errorMessage,
        error_type: errorType,
        permanent_failure: true,
        moved_to_dlq: true,
      },
    })
    .eq('id', activityId);

  // Log to dead-letter queue table
  await supabase
    .from('pod_activities_dlq')
    .insert({
      activity_id: activityId,
      error_message: errorMessage,
      error_type: errorType,
      attempts: attempt,
      created_at: new Date().toISOString(),
    });
}
```

### Worker Lifecycle

**Initialization:**
```typescript
export async function initializeEngagementWorker() {
  const redis = getRedisConnectionSync();

  workerInstance = new Worker<EngagementJobData>(
    'pod-engagement',
    processEngagementJob,
    {
      connection: redis,
      concurrency: 2,
      lockDuration: 35000, // 30s job timeout + 5s buffer
      lockRenewTime: 15000, // Renew halfway through timeout
    }
  );

  // Event handlers
  workerInstance.on('completed', (job) => console.log('Job completed:', job.id));
  workerInstance.on('failed', (job, error) => console.error('Job failed:', job?.id, error?.message));
  workerInstance.on('error', (error) => console.error('Worker error:', error));

  return workerInstance;
}
```

**Queue Management:**
```typescript
export function getEngagementQueue(): Queue<EngagementJobData> {
  if (!queueInstance) {
    queueInstance = new Queue<EngagementJobData>('pod-engagement', {
      connection: getRedisConnectionSync(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
        removeOnComplete: {
          count: 1000,
          age: 7 * 24 * 60 * 60, // 7 days
        },
        removeOnFail: {
          count: 500,
          age: 30 * 24 * 60 * 60, // 30 days
        },
      },
    });
  }
  return queueInstance;
}
```

**Adding Jobs:**
```typescript
export async function addEngagementJob(jobData: EngagementJobData) {
  validateEngagementJobData(jobData);

  const queue = getEngagementQueue();

  // Calculate delay until scheduled time
  const scheduledTime = new Date(jobData.scheduledFor);
  const now = new Date();
  const delayMs = Math.max(0, scheduledTime.getTime() - now.getTime());

  const job = await queue.add('execute-engagement', jobData, {
    jobId: `engagement-${jobData.activityId}`, // Prevents duplicates
    delay: delayMs, // BullMQ native delay
    priority: calculateJobPriority(jobData),
  });

  return job;
}
```

---

## 5. Pod Automation Queue (E-04 Scheduler)

### File: `/lib/queues/pod-automation-queue.ts`

**Queue Name:** `pod-automation`

**Purpose:** Schedule engagement activities and bridge to E-05 executor

**Job Types:**
1. `schedule-likes` - Batch schedule like activities
2. `schedule-comments` - Batch schedule comment activities
3. `execute-engagement` - Execute individual activity (bridges to E-05)

### Job Schema

```typescript
export interface PodAutomationJobData {
  podId: string;
  jobType: 'schedule-likes' | 'schedule-comments' | 'execute-engagement';
  activityId?: string; // For individual execution
}
```

### Scheduling Functions

**1. Schedule Likes:**
```typescript
export async function scheduleLikeJobs(podId: string) {
  // Get pending activities
  const pendingActivities = await getPendingActivities(podId, BATCH_SIZE_LIKES);
  const likeActivities = pendingActivities.filter(a => a.engagement_type === 'like');

  // Schedule with staggering (5-30 min delays)
  const scheduledJobs = await scheduleLikeActivities(
    likeActivities,
    LIKE_MAX_MEMBERS_PER_HOUR // 3 members max within first hour
  );

  // Add job to automation queue
  const queue = getPodAutomationQueue();
  const job = await queue.add('schedule-likes', {
    podId,
    jobType: 'schedule-likes',
  });

  return {
    jobId: job.id,
    scheduledCount: scheduledJobs.length,
    message: `Scheduled ${scheduledJobs.length} like jobs`,
  };
}
```

**2. Schedule Comments:**
```typescript
export async function scheduleCommentJobs(podId: string) {
  // Get pending activities
  const pendingActivities = await getPendingActivities(podId, BATCH_SIZE_COMMENTS);
  const commentActivities = pendingActivities.filter(a => a.engagement_type === 'comment');

  // Schedule with long delays (1-6 hour delays)
  const scheduledJobs = await scheduleCommentActivities(commentActivities);

  // Add job to automation queue
  const queue = getPodAutomationQueue();
  const job = await queue.add('schedule-comments', {
    podId,
    jobType: 'schedule-comments',
  });

  return {
    jobId: job.id,
    scheduledCount: scheduledJobs.length,
    message: `Scheduled ${scheduledJobs.length} comment jobs`,
  };
}
```

**3. Execute Individual Activity (Bridge to E-05):**
```typescript
async function processPodAutomationJob(job: Job<PodAutomationJobData>) {
  const { podId, jobType, activityId } = job.data;

  if (jobType === 'execute-engagement' && activityId) {
    // 1. Fetch activity details
    const activity = await fetchActivityForExecution(activityId);
    if (!activity) {
      console.error('Activity not found, skipping');
      return;
    }

    // 2. Resolve Unipile account ID
    let profileId: string;
    try {
      profileId = await resolveUnipileAccountId(
        activity.member_id,
        activity.unipile_account_id
      );
    } catch (resolveError) {
      console.error('Failed to resolve profile ID:', resolveError);
      await markActivityExecuted(activityId, false);
      return;
    }

    // 3. Push to E-05 execution queue
    await addEngagementJob({
      podId: activity.pod_id,
      activityId: activity.id,
      engagementType: activity.engagement_type,
      postId: activity.post_id,
      profileId: profileId,
      commentText: activity.comment_text,
      scheduledFor: activity.scheduled_for,
    });

    console.log('Queued activity for E-05 execution (profileId:', profileId, ')');
  }
}
```

### Engagement Scheduler

**File:** `/lib/pods/engagement-scheduler.ts`

**Purpose:** Calculate delays and update activity statuses

**Get Pending Activities:**
```typescript
export async function getPendingActivities(podId: string, limit: number = 100) {
  const supabase = await createClient({ isServiceRole: true });
  const now = new Date().toISOString();

  const { data } = await supabase
    .from('pod_activities')
    .select('id, pod_id, post_id, member_id, activity_type, status, scheduled_for, executed_at')
    .eq('pod_id', podId)
    .eq('status', 'pending')
    .lte('scheduled_for', now) // Ready for scheduling
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  // Map DB column 'activity_type' → interface field 'engagement_type'
  return (data || []).map((row) => ({
    ...row,
    engagement_type: row.activity_type as 'like' | 'comment' | 'repost',
  }));
}
```

**Like Delay Calculation:**
```typescript
export function calculateLikeDelay(memberIndex: number, totalMembers: number) {
  const minDelayMs = 5 * 60 * 1000; // 5 minutes
  const maxDelayMs = 30 * 60 * 1000; // 30 minutes

  // Stagger: Distribute members across time window
  const staggerWindow = (maxDelayMs - minDelayMs) * (memberIndex / Math.max(totalMembers - 1, 1));
  const randomVariation = Math.random() * (maxDelayMs - minDelayMs) * 0.2; // ±10%
  const delayMs = Math.floor(minDelayMs + staggerWindow + randomVariation);

  const scheduledFor = new Date(Date.now() + delayMs);

  return { delayMs, scheduledFor };
}
```

**Comment Delay Calculation:**
```typescript
export function calculateCommentDelay(memberIndex: number, totalMembers: number) {
  const minDelayMs = 1 * 60 * 60 * 1000; // 1 hour
  const maxDelayMs = 6 * 60 * 60 * 1000; // 6 hours

  // More random variation for comments
  const staggerWindow = (maxDelayMs - minDelayMs) * (memberIndex / Math.max(totalMembers - 1, 1));
  const randomVariation = Math.random() * (maxDelayMs - minDelayMs) * 0.3; // ±15%
  const delayMs = Math.floor(minDelayMs + staggerWindow + randomVariation);

  const scheduledFor = new Date(Date.now() + delayMs);

  return { delayMs, scheduledFor };
}
```

**Schedule Like Activities:**
```typescript
export async function scheduleLikeActivities(
  activities: EngagementActivity[],
  maxMembersPerHour: number = 3
) {
  const supabase = await createClient({ isServiceRole: true });
  const scheduledJobs: ScheduledJob[] = [];

  // Group by post to apply staggering per post
  const activitiesByPost = new Map<string, EngagementActivity[]>();
  for (const activity of activities) {
    if (!activitiesByPost.has(activity.post_id)) {
      activitiesByPost.set(activity.post_id, []);
    }
    activitiesByPost.get(activity.post_id)!.push(activity);
  }

  // Process each post's activities
  for (const [postId, postActivities] of activitiesByPost) {
    // Limit members per hour
    const activitiesToSchedule = postActivities.slice(0, maxMembersPerHour);

    for (let i = 0; i < activitiesToSchedule.length; i++) {
      const activity = activitiesToSchedule[i];
      const { delayMs, scheduledFor } = calculateLikeDelay(i, activitiesToSchedule.length);

      // Update activity with scheduled timestamp
      await supabase
        .from('pod_activities')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor.toISOString(),
        })
        .eq('id', activity.id);

      scheduledJobs.push({
        activityId: activity.id,
        memberId: activity.member_id,
        postId: activity.post_id,
        engagementType: 'like',
        scheduledFor,
        delayMs,
        jobId: `like-${activity.id}`,
      });
    }
  }

  return scheduledJobs;
}
```

---

## 6. Schema Dependencies

### Database Tables

**1. `pod_activities` (Central Table)**

**Current Schema (after migrations):**
```sql
CREATE TABLE pod_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id),
  member_id UUID REFERENCES pod_members(id),

  -- Post data
  post_url TEXT NOT NULL,

  -- Activity details
  activity_type TEXT CHECK (activity_type IN ('like', 'comment', 'repost')),
  comment_text TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,

  -- Status (critical for worker flow)
  status TEXT CHECK (status IN (
    'pending',     -- Initial state
    'scheduled',   -- E-04 scheduler sets this
    'queued',      -- Legacy
    'processing',  -- Legacy
    'executed',    -- E-05 sets this (or 'completed')
    'completed',   -- E-05 sets this (success)
    'success',     -- Legacy
    'failed'       -- E-05 sets this (error)
  )) DEFAULT 'pending',

  -- Error tracking
  last_error TEXT,

  -- Execution tracking (E-05)
  execution_result JSONB,
  execution_attempts INT DEFAULT 0,
  idempotency_key UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
-- E-04 scheduler polling
CREATE INDEX idx_pod_activities_scheduled
ON pod_activities(status, scheduled_for)
WHERE status = 'scheduled';

-- E-05 executor queries
CREATE INDEX idx_pod_activities_executed
ON pod_activities(status, executed_at)
WHERE status IN ('executed', 'completed');

-- Idempotency checks
CREATE INDEX idx_pod_activities_idempotency_key
ON pod_activities(idempotency_key)
WHERE status IN ('completed', 'executed');

-- Error tracking
CREATE INDEX idx_pod_activities_failed_status
ON pod_activities(status, last_error)
WHERE status = 'failed';
```

**Status Flow:**
```
pending → scheduled → executed/completed (success)
                   → failed (error)
```

**2. `pod_members` (Member Data)**

```sql
CREATE TABLE pod_members (
  id UUID PRIMARY KEY,
  pod_id UUID REFERENCES pods(id),
  linkedin_account_id UUID REFERENCES linkedin_accounts(id), -- FK to get unipile_account_id
  status TEXT CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ
);
```

**Critical Relationship:**
- `pod_members.linkedin_account_id` → `linkedin_accounts.unipile_account_id`
- Workers MUST JOIN through `linkedin_accounts` to get Unipile credentials

**3. `linkedin_accounts` (Unipile Integration)**

```sql
CREATE TABLE linkedin_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  unipile_account_id TEXT UNIQUE, -- Unipile's external account ID
  unipile_session JSONB,          -- Session data (for repost flow - unused)
  session_expires_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'expired', 'error')),
  rate_limit_reset_at TIMESTAMPTZ,
  daily_dm_count INTEGER DEFAULT 0,
  daily_post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ
);
```

**4. `pods` (Pod Configuration)**

```sql
CREATE TABLE pods (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  name TEXT,
  voice_cartridge_id UUID REFERENCES cartridges(id), -- For comment personalization
  settings JSONB,
  status TEXT CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ
);
```

**5. `cartridges` (Voice Personalization)**

```sql
CREATE TABLE cartridges (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  name TEXT,
  voice_params JSONB, -- Contains tone, emoji preferences, banned words
  created_at TIMESTAMPTZ
);
```

**Voice Params Schema (JSONB):**
```json
{
  "tone": {
    "formality": "casual" | "formal"
  },
  "style": {
    "use_emojis": true,
    "use_hashtags": false
  },
  "vocabulary": {
    "banned_words": ["spammy", "clickbait"]
  },
  "personality": {
    "traits": ["friendly", "professional"]
  }
}
```

**6. `pod_activities_dlq` (Dead-Letter Queue)**

```sql
CREATE TABLE pod_activities_dlq (
  id UUID PRIMARY KEY,
  activity_id UUID NOT NULL,
  error_message TEXT NOT NULL,
  error_type TEXT NOT NULL, -- 'auth_error', 'not_found', 'rate_limit', etc.
  attempts INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);
```

**7. `posts` (LinkedIn Posts)**

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  linkedin_account_id UUID REFERENCES linkedin_accounts(id),
  unipile_post_id TEXT UNIQUE,
  post_url TEXT,
  content TEXT,
  status TEXT CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

---

## 7. Unipile Integration

### Active Endpoints (Likes/Comments)

**Like a Post:**
```http
POST {UNIPILE_DSN}/api/v1/posts/{postId}/reactions
X-API-KEY: {UNIPILE_API_KEY}
Content-Type: application/json

{
  "account_id": "unipile-account-id",
  "type": "LIKE"
}
```

**Comment on Post:**
```http
POST {UNIPILE_DSN}/api/v1/posts/{postId}/comments
X-API-KEY: {UNIPILE_API_KEY}
Content-Type: application/json

{
  "account_id": "unipile-account-id",
  "text": "Great post! 👍"
}
```

**Response Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid API key
- `403 Forbidden` - Account not authorized
- `404 Not Found` - Post doesn't exist
- `429 Too Many Requests` - Rate limit hit (triggers 15-min cooldown)

### Disabled Endpoint (Repost Flow)

**Session Export (404 Error):**
```http
GET {UNIPILE_DSN}/v1/accounts/{accountId}/session
Authorization: Bearer {UNIPILE_API_KEY}

Response: 404 Not Found
```

**Why Disabled:**
- Unipile does not provide session cookie export
- Repost requires LinkedIn session cookies for Playwright automation
- No workaround available without manual cookie collection

---

## 8. Code-to-Schema Mapping Issues

### Column Name Discrepancies

**DB Column → Code Interface:**
```typescript
// Database uses: activity_type
// Code expects: engagement_type

// Mapping happens in:
// 1. pod-engagement-worker.ts line 466
return {
  ...data,
  engagement_type: data.activity_type, // Map DB → code
};

// 2. pod-automation-queue.ts line 236
return {
  ...data,
  engagement_type: data.activity_type, // Map DB → code
};

// 3. engagement-scheduler.ts line 70
return (data || []).map((row) => ({
  ...row,
  engagement_type: row.activity_type, // Map DB → code
}));
```

**This works because:**
- All read operations explicitly map `activity_type` → `engagement_type`
- All write operations use raw object with `activity_type` key

### Unipile Account ID Resolution

**Two Paths:**

1. **Fast Path (activity has `unipile_account_id`):**
   ```typescript
   if (activityUnipileId) {
     return activityUnipileId;
   }
   ```

2. **Slow Path (JOIN through `linkedin_accounts`):**
   ```typescript
   const { data: member } = await supabase
     .from('pod_members')
     .select(`
       id,
       linkedin_account_id,
       linkedin_accounts!inner (
         unipile_account_id
       )
     `)
     .eq('id', memberId)
     .single();

   return member?.linkedin_accounts?.unipile_account_id;
   ```

**Performance Optimization:**
- E-04 scheduler could pre-populate `unipile_account_id` on `pod_activities` during scheduling
- Avoids JOIN query for every execution
- Currently, most flows use slow path

---

## 9. API Routes Summary

### Active Routes

**1. `/api/pod-automation` (E-04 Manual Trigger)**

```typescript
POST /api/pod-automation
Body: {
  "action": "schedule-likes" | "schedule-comments",
  "podId": "uuid"
}

Response: {
  "status": "success",
  "message": "Scheduled 5 like jobs",
  "scheduledCount": 5,
  "jobId": "12345"
}
```

**2. `/api/pods/trigger-amplification` (Repost Flow - DISABLED)**

```typescript
POST /api/pods/trigger-amplification
Body: {
  "postId": "uuid"
}

Response (when disabled): {
  "message": "Repost feature is currently disabled...",
  "feature_status": "disabled",
  "reason": "Unipile session export not available..."
}
```

---

## 10. Technical Disconnects & Issues

### Disconnect 1: Two Queue Systems

**Problem:**
- Repost flow: `podAmplification` queue → `repost-executor` worker
- Like/Comment flow: `pod-automation` queue → `pod-engagement` queue → `pod-engagement-worker`

**Impact:**
- Confusion about which system is actually running
- Repost worker is registered but never receives jobs (feature disabled)
- Pod chip (`lib/chips/pod-chip.ts`) references `podAmplificationQueue` for reposts

**Resolution Needed:**
- Remove/archive repost code until Unipile session export is available
- Document that only like/comment flows are active

### Disconnect 2: Redis Connection Management

**Problem:**
- `pod-amplification-queue.ts` creates its own Redis connection
- `pod-engagement-worker.ts` uses centralized `/lib/redis.ts` singleton
- Different connection strategies could cause issues

**Current State:**
```typescript
// pod-amplification-queue.ts (standalone)
const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// pod-engagement-worker.ts (singleton)
import { getRedisConnectionSync } from '@/lib/redis';
```

**Impact:**
- Two Redis connections for same URL (unnecessary overhead)
- Repost queue won't benefit from singleton connection management

**Resolution:**
- Migrate `podAmplificationQueue` to use `getRedisConnectionSync()`

### Disconnect 3: Status Value Inconsistency

**Problem:**
- E-04 scheduler sets `status: 'scheduled'`
- E-05 executor sets `status: 'completed'` or `'executed'`
- Legacy code may use `'success'`, `'queued'`, `'processing'`

**Fixed By Migration:**
- `20251217_fix_pod_activities_status.sql` added all status values to constraint
- Status flow now: `pending` → `scheduled` → `completed`/`failed`

**Remaining Issue:**
- Code uses both `'completed'` and `'executed'` for success
- Should standardize on one value

### Disconnect 4: Column Naming (activity_type vs engagement_type)

**Problem:**
- Database column: `activity_type`
- TypeScript interfaces: `engagement_type`
- Requires manual mapping in every query

**Current Solution:**
- All read operations map `activity_type` → `engagement_type`
- Works but adds cognitive overhead

**Better Solution:**
- Rename DB column to `engagement_type` for consistency
- Or use Supabase generated types with custom mapping

### Disconnect 5: Unipile Account ID Storage

**Problem:**
- `unipile_account_id` lives on `linkedin_accounts` table
- `pod_members` has `linkedin_account_id` FK
- Every execution requires JOIN query

**Performance Impact:**
- E-05 executor calls `resolveUnipileAccountId()` for every job
- JOIN query overhead (minimal but unnecessary)

**Optimization:**
- Add `unipile_account_id` column to `pod_activities` table
- E-04 scheduler pre-populates during activity creation
- E-05 uses fast path (no JOIN)

---

## 11. Flow Diagram

```
                                     POD ENGAGEMENT SYSTEM
                                     =====================

┌─────────────────────────────────────────────────────────────────────────────┐
│                           REPOST FLOW (DISABLED)                            │
└─────────────────────────────────────────────────────────────────────────────┘

POST /api/pods/trigger-amplification
    │
    ├── Feature gate: ENABLE_REPOST_FEATURE=false
    │   └── Return: "Repost feature disabled"
    │
    └── (If enabled - theoretical flow)
        │
        ├── 1. Fetch post from posts table
        ├── 2. Find pod via pod_members
        ├── 3. Get all pod members (JOIN linkedin_accounts for unipile_account_id)
        │
        └── 4. For each member:
            ├── Create pod_activities row (activity_type='repost', status='pending')
            └── Queue job → podAmplificationQueue
                │
                └── repost-executor worker
                    │
                    ├── Fetch Unipile session → 404 ERROR
                    └── BLOCKED (cannot proceed)


┌─────────────────────────────────────────────────────────────────────────────┐
│                      LIKE/COMMENT FLOW (ACTIVE)                             │
└─────────────────────────────────────────────────────────────────────────────┘

POST /api/pod-automation
    │
    ├── action: "schedule-likes"
    │   │
    │   └── scheduleLikeJobs(podId)
    │       │
    │       ├── 1. Get pending activities (status='pending')
    │       ├── 2. Calculate delays (5-30 min, staggered)
    │       └── 3. Update activities (status='scheduled', scheduled_for)
    │
    └── action: "schedule-comments"
        │
        └── scheduleCommentJobs(podId)
            │
            ├── 1. Get pending activities (status='pending')
            ├── 2. Calculate delays (1-6 hours, staggered)
            └── 3. Update activities (status='scheduled', scheduled_for)


┌─────────────────────────────────────────────────────────────────────────────┐
│                    E-05 POD ENGAGEMENT EXECUTOR                             │
└─────────────────────────────────────────────────────────────────────────────┘

pod-automation-queue → execute-engagement job
    │
    └── processPodAutomationJob
        │
        ├── 1. Fetch activity (status='scheduled')
        ├── 2. Resolve unipile_account_id (JOIN linkedin_accounts)
        │
        └── 3. Add to pod-engagement queue
            │
            └── pod-engagement-worker
                │
                ├── Rate Limit Check
                │   ├── Daily count: Redis key pod-engagement:daily:{accountId}
                │   ├── Limit: 90 engagements/day/account
                │   └── Cooldown: 15 min after 429 error
                │
                ├── Execute Engagement
                │   │
                │   ├── LIKE:
                │   │   └── POST /api/v1/posts/{postId}/reactions
                │   │       Body: { account_id, type: "LIKE" }
                │   │
                │   └── COMMENT:
                │       ├── Fetch pod.voice_cartridge_id
                │       ├── Apply voice params (tone, emojis, banned words)
                │       └── POST /api/v1/posts/{postId}/comments
                │           Body: { account_id, text: transformedComment }
                │
                ├── Update Database (Idempotent)
                │   ├── Check status (prevent duplicate execution)
                │   └── Atomic update: status='completed', execution_result
                │
                └── Error Handling
                    ├── Classify error (auth, rate_limit, not_found, etc.)
                    ├── Determine retry strategy
                    └── Move to DLQ if permanent failure
```

---

## 12. Recommendations

### Immediate Actions

1. **Remove or Archive Repost Code**
   - Feature is disabled and won't work without Unipile session export
   - Confusion between two queue systems
   - Files to archive:
     - `/lib/workers/repost-executor.ts`
     - `/lib/queues/pod-amplification-queue.ts`
     - `/app/api/pods/trigger-amplification/route.ts`

2. **Standardize Status Values**
   - Choose one: `'completed'` or `'executed'` for success
   - Update all code to use consistent value
   - Remove legacy statuses from constraint after migration

3. **Pre-populate `unipile_account_id` on Activities**
   - Add `unipile_account_id` column to `pod_activities`
   - E-04 scheduler populates during creation
   - E-05 uses fast path (no JOIN)

4. **Migrate Pod Amplification Queue to Singleton Redis**
   ```typescript
   // pod-amplification-queue.ts (if keeping for future)
   import { getRedisConnectionSync } from '@/lib/redis';

   export const podAmplificationQueue = new Queue('podAmplification', {
     connection: getRedisConnectionSync(), // Use singleton
   });
   ```

### Medium-Term Improvements

1. **Rename DB Column `activity_type` → `engagement_type`**
   - Eliminate manual mapping in queries
   - Align DB schema with code interfaces

2. **Add Monitoring Dashboard**
   - Track daily engagement counts per account
   - Alert when approaching rate limits (80 of 90)
   - Monitor DLQ for patterns

3. **Optimize Voice Cartridge Loading**
   - Cache cartridges in Redis (per pod)
   - Reduce DB queries for every comment

4. **Add Engagement Analytics**
   - Track success rates by engagement type
   - Identify problematic accounts (high failure rate)
   - Optimize scheduling based on historical data

---

## 13. File Reference

### Core Files (Active System)

| File | Purpose | Status |
|------|---------|--------|
| `/lib/queues/pod-engagement-worker.ts` | E-05 executor | ✅ Active |
| `/lib/queues/pod-automation-queue.ts` | E-04 scheduler | ✅ Active |
| `/lib/pods/engagement-scheduler.ts` | Delay calculation | ✅ Active |
| `/lib/redis.ts` | Singleton Redis connection | ✅ Active |
| `/app/api/pod-automation/route.ts` | Manual trigger API | ✅ Active |

### Deprecated Files (Repost Flow)

| File | Purpose | Status |
|------|---------|--------|
| `/lib/workers/repost-executor.ts` | Repost automation | ❌ Disabled |
| `/lib/queues/pod-amplification-queue.ts` | Repost queue | ❌ Unused |
| `/app/api/pods/trigger-amplification/route.ts` | Repost trigger | ❌ Gated |
| `/lib/chips/pod-chip.ts` | Pod coordination | ⚠️ Mixed (uses disabled queue) |

### Database Migrations

| File | Purpose | Date |
|------|---------|------|
| `20251217_fix_pod_activities_status.sql` | Add missing statuses | 2025-12-17 |
| `010b_e05_pod_engagement_executor.sql` | E-05 schema | 2024-11-24 |
| `20251116_update_pod_activities_for_workers.sql` | Worker columns | 2024-11-16 |
| `001_initial_schema.sql` | Initial pod tables | 2024 |

---

## Appendix: Testing Commands

### Manual Trigger (Likes)

```bash
curl -X POST http://localhost:3000/api/pod-automation \
  -H "Content-Type: application/json" \
  -d '{
    "action": "schedule-likes",
    "podId": "uuid-of-pod"
  }'
```

### Manual Trigger (Comments)

```bash
curl -X POST http://localhost:3000/api/pod-automation \
  -H "Content-Type: application/json" \
  -d '{
    "action": "schedule-comments",
    "podId": "uuid-of-pod"
  }'
```

### Check Queue Status

```bash
curl http://localhost:3000/api/pod-automation?podId=uuid-of-pod
```

### Verify Redis Keys

```bash
# Check daily engagement count
redis-cli GET pod-engagement:daily:{accountId}

# Check cooldown
redis-cli GET pod-engagement:cooldown:{accountId}

# List all engagement keys
redis-cli KEYS pod-engagement:*
```

### Database Queries

```sql
-- Check pending activities
SELECT id, pod_id, activity_type, status, scheduled_for
FROM pod_activities
WHERE status = 'pending'
ORDER BY scheduled_for ASC;

-- Check scheduled activities
SELECT id, pod_id, activity_type, status, scheduled_for
FROM pod_activities
WHERE status = 'scheduled'
ORDER BY scheduled_for ASC;

-- Check failed activities
SELECT id, pod_id, activity_type, last_error, execution_attempts
FROM pod_activities
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Check dead-letter queue
SELECT activity_id, error_type, error_message, attempts
FROM pod_activities_dlq
ORDER BY created_at DESC;
```

---

**End of Technical Architecture Map**
