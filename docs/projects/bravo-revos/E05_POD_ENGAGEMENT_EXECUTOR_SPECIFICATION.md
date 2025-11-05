# E-05 Pod Engagement Executor - Specification

**Status**: 📋 Design Phase
**Purpose**: Execute scheduled LinkedIn engagement activities (likes and comments)
**Dependencies**: E-03 (activity creation), E-04 (activity scheduling), E-02 (voice cartridge)
**Expected Completion**: 1,500+ lines of code

---

## Executive Summary

E-05 is the **execution layer** that consumes job queue entries created by E-04 and executes real LinkedIn engagement. It bridges the scheduling system with actual API operations.

**Core Responsibility**: Process scheduled activities at their scheduled times and update activity status based on execution results.

---

## Problem Statement

**Current State** (E-04):
- Activities are marked "scheduled" with `scheduled_for` timestamps
- Jobs are queued in BullMQ Redis
- System waits for executor

**What E-05 Solves**:
1. Process jobs from BullMQ queue at scheduled times
2. Apply voice cartridge to comments (personality/tone)
3. Execute actual LinkedIn API calls via Unipile
4. Handle success/failure and update database
5. Implement robust retry logic for transient failures
6. Prevent duplicate execution

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│  E-04 Pod Automation Engine (Scheduling)                │
│  - Creates scheduled activities                          │
│  - Adds jobs to BullMQ queue                             │
│  - Pod activities in 'scheduled' status                  │
└──────────────────┬──────────────────────────────────────┘
                   │ Jobs in Redis Queue
                   │ (waiting for execution time)
                   ▼
┌─────────────────────────────────────────────────────────┐
│  E-05 Pod Engagement Executor (THIS FEATURE)            │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Job Consumer (BullMQ Worker)                       │ │
│  │ - Polls for ready jobs                             │ │
│  │ - Checks scheduled_for timestamp                   │ │
│  │ - Orchestrates execution flow                      │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Engagement Executor                                │ │
│  │ - Like execution (simple API call)                 │ │
│  │ - Comment execution (with voice cartridge)         │ │
│  │ - LinkedIn API integration (Unipile)               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ State Manager                                      │ │
│  │ - Update activity status (executed/failed)         │ │
│  │ - Record execution details                         │ │
│  │ - Handle idempotency                               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Error Handler                                      │ │
│  │ - Retry logic (exponential backoff)                │ │
│  │ - Error classification                             │ │
│  │ - Dead letter queue for unrecoverable errors       │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────┘
                   │ Update Activity Status
                   │ (executed / failed)
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase Database                                      │
│  - pod_activities table updated with results            │
│  - Execution timestamps recorded                        │
│  - Error messages stored                                │
└─────────────────────────────────────────────────────────┘
```

---

## Detailed Specification

### 1. Job Consumer (BullMQ Worker)

**Responsibility**: Continuously monitor queue and process jobs at scheduled times

**Implementation**:
- Create worker process that connects to Redis
- Worker listens for jobs from E-04 queue
- For each job:
  1. Get job data (pod_id, activity_id, engagement_type)
  2. Check if scheduled_for time has arrived
  3. If not ready: reschedule for later
  4. If ready: execute engagement
  5. Handle job completion or failure

**Configuration**:
```
Worker Concurrency: 3-5 jobs simultaneously
Job Timeout: 30 seconds per engagement
Automatic Retry: 3 attempts before dead letter queue
Backoff Strategy: Exponential (500ms, 1s, 2s)
Poll Interval: 1-5 seconds (adaptive)
```

**Code Location**: `lib/queue/pod-engagement-worker.ts`

**Success Metric**: Jobs processed within 5 seconds of scheduled time

---

### 2. Engagement Executor

**Responsibility**: Execute actual LinkedIn operations

#### 2A: Like Execution

**Input**:
- `pod_id`: Which pod is performing the action
- `activity_id`: Which activity record to update
- `post_id`: LinkedIn post to like
- `profile_id`: Profile performing the like

**Process**:
1. Validate activity still exists and is in 'scheduled' status
2. Call Unipile LinkedIn API: `POST /posts/{post_id}/like`
3. If successful: return job success
4. If failed: classify error and decide retry/fail

**API Call** (Unipile):
```
POST https://api.unipile.com/v0/posts/{postId}/like
Headers: Authorization: Bearer {token}
```

**Duration**: 500-2000ms typically

---

#### 2B: Comment Execution

**Input**:
- `pod_id`: Which pod is performing the action
- `activity_id`: Which activity record to update
- `post_id`: LinkedIn post to comment on
- `profile_id`: Profile performing the comment
- `comment_text`: Original comment text (from activity)

**Process**:
1. Validate activity still exists and is in 'scheduled' status
2. **Apply Voice Cartridge** (personality/tone adjustment)
   - Fetch cartridge settings for the pod
   - Transform comment_text using voice model
   - Example: "Great post!" → "This is a fantastic post and I love the insights!"
3. Call Unipile LinkedIn API: `POST /posts/{post_id}/comments`
4. If successful: store generated comment and return success
5. If failed: classify error and decide retry/fail

**Voice Cartridge Integration**:
- Location: `lib/pods/voice-cartridge.ts` (already exists from E-02)
- Function: `applyVoiceToComment(podId, originalText) → enhancedText`
- Ensures each pod has unique voice/personality in comments
- Critical for authenticity and brand consistency

**API Call** (Unipile):
```
POST https://api.unipile.com/v0/posts/{postId}/comments
Headers: Authorization: Bearer {token}
Body: { text: "enhanced comment text from voice cartridge" }
```

**Duration**: 1000-3000ms typically (includes voice generation)

---

### 3. State Manager

**Responsibility**: Update database with execution results

#### 3A: Success Path

When engagement executes successfully:

```sql
UPDATE pod_activities
SET
  status = 'executed',
  executed_at = NOW(),
  execution_result = {
    success: true,
    timestamp: ISO_STRING,
    api_response: {
      post_id: '...',
      created_at: ISO_STRING,
      engagement_id: '...'
    }
  },
  comment_generated = (voice cartridge output, if comment)
WHERE id = activity_id
```

---

#### 3B: Failure Path

When engagement fails:

```sql
UPDATE pod_activities
SET
  status = 'failed',
  executed_at = NOW(),
  failure_count = failure_count + 1,
  last_error = {
    error_type: 'rate_limit' | 'auth_error' | 'network_error' | 'api_error',
    message: 'Human readable error',
    timestamp: ISO_STRING,
    will_retry: true | false
  },
  next_retry_at = (calculated based on backoff)
WHERE id = activity_id
```

---

#### 3C: Idempotency

**Prevention of Duplicate Engagement**:
- Check if activity is already in 'executed' status before processing
- Store execution_id in database to track LinkedIn-side IDs
- If same job retried: check if it was already successfully executed
- Never execute twice for same activity

---

### 4. Error Handling & Retry Logic

**Error Classification**:

| Error Type | Cause | Retryable | Action |
|-----------|-------|-----------|--------|
| **rate_limit** | Too many requests to LinkedIn | Yes | Exponential backoff, max 3 retries |
| **auth_error** | Invalid/expired credentials | No | Mark failed, alert admin |
| **network_error** | Connection timeout/failure | Yes | Retry with backoff |
| **post_not_found** | Post deleted or inaccessible | No | Mark failed |
| **profile_blocked** | User blocked from acting | No | Mark failed, log event |
| **api_error** | Unipile API error | Maybe | Classify by error code |

**Retry Strategy**:
```
Attempt 1: Immediate
Attempt 2: After 500ms
Attempt 3: After 1.5 seconds
Attempt 4+: Dead Letter Queue

Total Max Time: ~2 seconds before giving up
```

**Dead Letter Queue**:
- Jobs that fail all retries go to separate queue
- Can be reviewed/reprocessed manually
- Prevents infinite retry loops
- Logged for analysis

---

### 5. Integration Points

#### 5A: Reads from Database

**pod_activities Table** (E-03/E-04 output):
```sql
SELECT id, pod_id, engagement_type, post_id, profile_id,
       comment_text, scheduled_for, status
FROM pod_activities
WHERE status = 'scheduled' AND scheduled_for <= NOW()
ORDER BY scheduled_for ASC
LIMIT 100;
```

**pods Table** (pod metadata):
```sql
SELECT id, voice_cartridge_id, linkedin_account_id
FROM pods
WHERE id = $1;
```

**voice_cartridges Table** (E-02 output):
```sql
SELECT id, personality_style, tone, templates
FROM voice_cartridges
WHERE id = $1;
```

#### 5B: Reads from External APIs

**Unipile LinkedIn API**:
- `POST /posts/{postId}/like` - Like a post
- `POST /posts/{postId}/comments` - Comment on post
- Requires valid LinkedIn access token (stored in pod config)

#### 5C: Writes to Database

**pod_activities Table** (execution results):
- `status` = 'executed' or 'failed'
- `executed_at` = timestamp
- `execution_result` = JSON with details
- `comment_generated` = final comment text (for comments)

#### 5D: Logs

**System Logs**:
- Execution start/end with timestamps
- API response details
- Error messages with full context
- Performance metrics (duration, retry count)

---

## Data Flow Example: Like Execution

```
1. E-04 creates scheduled activity:
   {
     pod_id: 'pod-123',
     engagement_type: 'like',
     post_id: 'linkedin-post-456',
     profile_id: 'linked-in-profile-789',
     scheduled_for: 2024-03-15T14:30:00Z,
     status: 'scheduled'
   }

2. E-04 adds job to queue:
   {
     jobId: 'job-uuid-1',
     type: 'schedule-likes',
     data: { activityId: 'activity-id-1' },
     timestamp: NOW()
   }

3. E-05 Worker polls queue and finds job
   - Checks if scheduled_for time has arrived
   - Loads activity from database
   - Calls executor

4. E-05 Executor processes:
   - Validates activity status = 'scheduled'
   - Gets pod config and LinkedIn token
   - Calls Unipile: POST /posts/linkedin-post-456/like
   - Receives: { success: true, timestamp: '...' }

5. E-05 State Manager updates:
   UPDATE pod_activities
   SET status = 'executed',
       executed_at = NOW(),
       execution_result = { success: true, ... }
   WHERE id = 'activity-id-1'

6. Job marked complete in queue
```

---

## Data Flow Example: Comment Execution

```
1. E-04 creates scheduled activity:
   {
     pod_id: 'pod-123',
     engagement_type: 'comment',
     post_id: 'linkedin-post-456',
     comment_text: 'Great post!',
     scheduled_for: 2024-03-15T15:00:00Z,
     status: 'scheduled'
   }

2. E-05 Worker processes at scheduled time

3. E-05 Executor:
   - Gets pod's voice_cartridge
   - Applies voice: 'Great post!' → 'This is a fantastic post!'
   - Calls Unipile: POST /posts/linkedin-post-456/comments
   - Body: { text: 'This is a fantastic post!' }
   - Receives: { success: true, comment_id: '...', timestamp: '...' }

4. E-05 State Manager updates:
   UPDATE pod_activities
   SET status = 'executed',
       executed_at = NOW(),
       comment_generated = 'This is a fantastic post!',
       execution_result = { success: true, comment_id: '...' }
   WHERE id = 'activity-id-1'

5. Job marked complete
```

---

## Error Handling Example: Rate Limit

```
1. E-05 Executor calls Unipile
2. Receives: { error: 'rate_limit_exceeded', retry_after: 60 }
3. Error Handler:
   - Classifies as 'rate_limit' (retryable)
   - Increments attempt counter
   - Schedules retry in 500ms (attempt 2)

4. If attempt 3 also fails with rate limit:
   - Mark activity as failed (max retries exhausted)
   - Log: "Rate limit after 3 retries, giving up"
   - Send alert to admin about pod

5. Admin can manually requeue later when rates reset
```

---

## Success Criteria & Validation

### Phase 1: Unit Tests
- ✅ Job consumer processes jobs correctly
- ✅ Like execution calls correct API
- ✅ Comment execution applies voice cartridge
- ✅ Success path updates database correctly
- ✅ Failure path records errors
- ✅ Retry logic works as expected
- ✅ Idempotency prevents duplicates

### Phase 2: Integration Tests
- ✅ Jobs flow from E-04 → E-05 → Database
- ✅ Real Unipile API integration (sandbox)
- ✅ Voice cartridge integration works
- ✅ Database updates visible to other systems
- ✅ Error scenarios handled gracefully

### Phase 3: End-to-End Tests
- ✅ Full E-03 → E-04 → E-05 pipeline
- ✅ Real LinkedIn engagement execution (test account)
- ✅ Performance metrics acceptable
- ✅ No duplicate engagements
- ✅ All error types handled

### Success Metrics
| Metric | Target |
|--------|--------|
| Job processing latency | < 5 sec from scheduled time |
| Engagement execution time | 500-3000ms |
| Success rate (no errors) | > 95% |
| Retry effectiveness | 70%+ of errors resolved on retry 2-3 |
| Duplicate prevention | 0% duplicates across all jobs |

---

## Implementation Approach

### Task Breakdown (6 subtasks)

1. **E-05-1: Job Consumer Setup**
   - BullMQ worker connection
   - Job polling and timing logic
   - Job data extraction
   - Est. 300 lines

2. **E-05-2: Like Executor**
   - Validate activity status
   - Call Unipile API
   - Handle response
   - Est. 150 lines

3. **E-05-3: Comment Executor with Voice Cartridge**
   - Voice cartridge integration
   - Comment enhancement
   - Call Unipile API
   - Est. 200 lines

4. **E-05-4: State Manager**
   - Database updates for success/failure
   - Execution result storage
   - Idempotency checks
   - Est. 250 lines

5. **E-05-5: Error Handling & Retry Logic**
   - Error classification
   - Retry scheduling
   - Dead letter queue
   - Est. 300 lines

6. **E-05-6: Testing & Validation**
   - Unit tests for all components
   - Integration tests with mock APIs
   - End-to-end validation
   - Est. 400+ lines

**Total: ~1,600 lines of code + 400+ lines of tests**

---

## Configuration & Environment

**Required Environment Variables**:
```
UNIPILE_API_KEY = LinkedIn API key
REDIS_URL = Redis connection string (same as E-04)
DATABASE_URL = Supabase connection
POD_ENGAGEMENT_WORKER_CONCURRENCY = 3-5
POD_ENGAGEMENT_JOB_TIMEOUT = 30000 (milliseconds)
```

**Configuration File** (`lib/config.ts` additions):
```typescript
export const POD_ENGAGEMENT_CONFIG = {
  WORKER_CONCURRENCY: 5,
  JOB_TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RETRY_BACKOFF_MS: [0, 500, 1500], // Backoff per attempt
  POLL_INTERVAL_MS: 2000,
  DEADLETTER_QUEUE_NAME: 'pod-engagement-dead-letter',
  LOG_LEVEL: 'info',
};
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| LinkedIn rate limiting | Medium | Medium | Exponential backoff, queue management |
| Duplicate engagements | Low | High | Idempotency checks, execution tracking |
| Voice cartridge failures | Low | Medium | Fallback to original text if generation fails |
| Database connection loss | Low | High | Retry logic, error handling |
| Worker crash | Medium | Medium | Process monitoring, auto-restart |

---

## Performance Expectations

### Throughput
- **Single worker**: 5-10 engagements/minute (limited by API)
- **3 concurrent workers**: 15-30 engagements/minute
- **5 concurrent workers**: 25-50 engagements/minute

### Latency
- Job processing: 50-200ms
- Unipile API call: 500-2000ms
- Database update: 10-50ms
- **Total per engagement**: 600-2300ms

### Resource Usage
- Memory per worker: 50-100MB
- CPU: Low (mostly I/O bound)
- Database connections: 1-2 per worker
- Redis connections: 1 per worker

---

## Dependencies

**Code Dependencies**:
- `bullmq` - Job queue (already in project)
- `redis` - Job queue backend (already in project)
- `@supabase/supabase-js` - Database (already in project)
- `axios` or `node-fetch` - HTTP requests (already in project)

**Feature Dependencies**:
- E-02: Voice Cartridge (need `lib/pods/voice-cartridge.ts`)
- E-03: Activity Creation (pod_activities table structure)
- E-04: Activity Scheduling (scheduled activities with timestamps)
- Unipile API: LinkedIn integration

**Data Dependencies**:
- `pods` table - Pod configuration
- `pod_activities` table - Activities to execute
- `voice_cartridges` table - Voice/personality data
- `linkedin_accounts` table - LinkedIn credentials

---

## Monitoring & Observability

**Key Metrics to Track**:
- Jobs processed per minute
- Success vs failure rate
- Error types distribution
- Execution latency by engagement type
- Retry effectiveness
- Queue depth (jobs waiting)

**Logging Points**:
- Job received from queue
- Activity validation
- API call start/end
- Error occurrence with classification
- Database update confirmation
- Job completion

**Alerts Needed**:
- Queue depth > 1000 jobs (system backlog)
- Error rate > 10% (systemic issue)
- Worker crash/restart
- Dead letter queue activity (persistent failures)

---

## Timeline & Effort Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| E-05-1: Job Consumer | 2-3 hours | BullMQ setup, job polling |
| E-05-2: Like Executor | 1-2 hours | Simple API integration |
| E-05-3: Comment + Voice | 2-3 hours | Voice cartridge integration |
| E-05-4: State Manager | 2-3 hours | Database operations, idempotency |
| E-05-5: Error Handling | 3-4 hours | Retry logic, classification |
| E-05-6: Testing | 4-6 hours | Unit + integration + E2E tests |
| **Total** | **14-21 hours** | 1-3 weeks depending on parallelization |

---

## Post-Implementation

Once E-05 is complete:
1. Full E-03 → E-04 → E-05 pipeline operational
2. Real LinkedIn engagement fully automated
3. Ready for:
   - Staging environment testing
   - Production deployment
   - E-06+ additional features (if planned)

---

## Notes for Implementation

- Start with simple like execution (no voice cartridge complexity)
- Test against Unipile sandbox API first
- Implement comprehensive error handling early
- Use structured logging for debugging
- Write tests as you go (TDD approach)
- Consider rate limiting strategies for future scale

---

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
