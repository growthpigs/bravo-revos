# Comet E-05-1 Testing Prompt
## Pod Engagement Worker (Job Consumer) Validation

**Project**: Bravo revOS - Pod Engagement Executor
**Component**: E-05-1 Job Consumer (BullMQ Worker)
**Testing Tool**: Comet User Browser
**Date**: 2025-11-05

---

## 📋 Pre-Test Checklist

Before starting, verify:
- ✅ Dev server is running (`npm run dev`)
- ✅ Redis is connected (required for BullMQ)
- ✅ Supabase database is accessible
- ✅ You can access `http://localhost:3000` in browser

---

## 🎯 Testing Objectives

Validate that E-05-1 Pod Engagement Worker:
1. ✅ **Initializes correctly** - Worker starts and health is good
2. ✅ **Accepts jobs** - Can add like and comment jobs to queue
3. ✅ **Processes jobs** - Jobs move from waiting → active → completed
4. ✅ **Updates database** - Activity status changes after execution
5. ✅ **Handles errors** - Invalid data is rejected with clear messages
6. ✅ **Reports health** - Health endpoint shows accurate status

---

## 🚀 Testing Steps

### Step 1: Navigate to Engagement Dashboard
**Action**: Open the engagement dashboard
```
URL: http://localhost:3000/admin/engagement-dashboard
Expected Result: Dashboard loads with empty queue stats
```

**Visual Verification** 📸:
- ✅ Page title shows "E-05-1 Pod Engagement Worker Dashboard"
- ✅ Pod ID field has "test-pod-123" as default
- ✅ Worker Status section shows
  - Health: ✅ Healthy (green text)
  - Status: "running"
  - Timestamp: Recent time
- ✅ Queue Statistics shows all zeros initially
  - Waiting: 0
  - Active: 0
  - Delayed: 0
  - Completed: 0
  - Failed: 0
  - Total: 0

**Screenshot Note**: Save screenshot showing initial dashboard state

---

### Step 2: Verify Worker Health
**Action**: Click "Refresh Status" button
**Expected Result**: Worker health is reported as healthy

**Visual Verification** 📸:
- ✅ Worker Health section updates
- ✅ Health shows "✅ Healthy" (green)
- ✅ Status shows "running"
- ✅ Timestamp is current
- ✅ No error message shown

**If health is not healthy**:
- ❌ Check if Redis is running: `redis-cli ping` should return PONG
- ❌ Check if worker initialized: Look for console logs "[POD_ENGAGEMENT_WORKER] Worker initialized"
- ❌ Report error message from dashboard

---

### Step 3: Create First Like Job
**Action**: Click blue "👍 Create Like Job" button
**Expected Result**: Job is added to queue and dashboard updates

**Visual Verification** 📸:
- ✅ Message appears: "✅ Like job created (ID: engagement-test-activity-XXXXXX)"
- ✅ After 1 second, dashboard refreshes automatically
- ✅ Queue Statistics updates:
  - One of these changes:
    - Waiting count increases by 1, OR
    - Active count shows 1, OR
    - Completed count increases (job processed very fast)
- ✅ Total count increases

**Key Observation**:
- If job shows in Completed immediately: Worker is processing jobs successfully! ✅
- If job shows in Active: Worker is currently processing it ✅
- If job shows in Waiting: Job is queued and waiting for worker ✅

**Note the Job ID**: Write down the job ID shown in the message, e.g., `engagement-test-activity-1234567890`

---

### Step 4: Monitor Job Processing
**Action**: Watch the dashboard for 10 seconds (auto-refreshes every 5 seconds)
**Expected Result**: Job either completes or processes

**Visual Verification** 📸:
- ✅ Queue stats change as job moves through states
- ✅ Active count eventually goes to 0
- ✅ Completed count increases
- ✅ Worker Health still shows "✅ Healthy"
- ✅ No error messages appear

**Expected Job Flow**:
```
Waiting (0-1 sec) → Active (0-2 sec) → Completed (instant)
     OR
Active (immediately) → Completed (within 30 seconds)
```

**Timing Explanation**:
- Jobs are scheduled for "now" (immediate execution)
- Worker processes 5 jobs concurrently
- Each job takes ~100-200ms to execute
- So we should see Completed count go up fairly quickly

---

### Step 5: Create Comment Job
**Action**: Click green "💬 Create Comment Job" button
**Expected Result**: Comment job is added with text

**Visual Verification** 📸:
- ✅ Message appears: "✅ Comment job created (ID: engagement-test-activity-YYYYYY)"
- ✅ Completed count increases (old job still counted)
- ✅ Total jobs show increase
- ✅ Comment text "Great post! Love the insights here." was included

**Note**: The comment engagement doesn't actually post to LinkedIn yet (that's E-05-3), but the job structure validates comment data works.

---

### Step 6: Rapid-Fire Job Creation
**Action**: Click "👍 Create Like Job" button 5 times rapidly
**Expected Result**: Queue fills up with jobs

**Visual Verification** 📸:
- ✅ 5 separate success messages appear
- ✅ 5 different Job IDs shown
- ✅ Queue Statistics updates:
  - Waiting or Active count increases to show 5 new jobs
  - Completed count continues increasing as old ones process
  - Total climbs to 5+

**Visual Evidence of Concurrency**:
- If multiple jobs are Active at once (Active count > 1): Concurrency is working ✅
- If only 1 Active at a time: Worker is processing serially (expected for 30s timeout jobs)

---

### Step 7: Verify Error Handling (Invalid Data)
**Action**: Test the API directly with invalid data using browser dev tools

**Test 1: Missing Required Field**
```javascript
// Paste in browser console (F12 → Console tab)
fetch('/api/pods/test-pod-123/engagement/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    engagementType: 'like',
    postId: 'post-123',
    // Missing profileId - should fail
  })
}).then(r => r.json()).then(console.log)
```

**Expected Result**: Error message in response
```json
{
  "success": false,
  "error": "Missing required field: profileId"
}
```

**Visual Verification** 📸:
- ✅ Error response shows "Missing required field: profileId"
- ✅ Dashboard doesn't add an invalid job
- ✅ No job created (Completed count doesn't change)

**Test 2: Invalid Engagement Type**
```javascript
fetch('/api/pods/test-pod-123/engagement/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    engagementType: 'share',  // Invalid - only 'like' or 'comment' allowed
    postId: 'post-123',
    profileId: 'profile-456',
  })
}).then(r => r.json()).then(console.log)
```

**Expected Result**: Error about invalid engagement type
```json
{
  "success": false,
  "error": "Invalid or missing engagementType (must be \"like\" or \"comment\")"
}
```

---

### Step 8: Verify Pod ID Filtering
**Action**: Change Pod ID and verify jobs are pod-specific

**Step 1**: Change Pod ID from "test-pod-123" to "test-pod-456"
**Step 2**: Click "Refresh Status"
**Step 3**: Click "👍 Create Like Job"

**Expected Result**: Job created for new pod

**Visual Verification** 📸:
- ✅ Job message shows "jobId: engagement-test-activity-ZZZZZZ"
- ✅ Job details show the new pod ID in API response
- ✅ Queue stats update
- ✅ Each pod has its own queue (jobs don't mix)

---

### Step 9: Monitor Queue Over Time
**Action**: Leave dashboard open for 30 seconds and observe

**Expected Results** 📈:
- ✅ Auto-refresh happens every 5 seconds
- ✅ Completed count steadily increases
- ✅ Worker Health stays "✅ Healthy"
- ✅ No errors appear
- ✅ Active count stays at 0 (all jobs completed quickly)

**Performance Metrics** 📊:
- **Job Processing Speed**: Jobs should complete within 1-5 seconds
- **Throughput**: Should complete 10+ jobs per minute
- **Worker Responsiveness**: Dashboard refreshes in <500ms

---

### Step 10: Stress Test (Optional)
**Action**: Create 20 jobs in rapid succession
**Expected Result**: Worker handles load without crashing

**Visual Verification** 📸:
- ✅ All 20 jobs added without errors
- ✅ Active count may show 1-5 (concurrent processing)
- ✅ Completed count climbs as jobs finish
- ✅ Worker stays healthy
- ✅ No error messages

**Script to create 20 jobs**:
```javascript
async function createManyJobs() {
  for (let i = 0; i < 20; i++) {
    await fetch('/api/pods/test-pod-123/engagement/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engagementType: i % 2 === 0 ? 'like' : 'comment',
        postId: `post-${i}`,
        profileId: 'profile-789',
        commentText: i % 2 === 1 ? `Comment ${i}` : undefined,
      })
    });
    await new Promise(r => setTimeout(r, 100)); // Delay between jobs
  }
  console.log('Created 20 jobs');
}
createManyJobs();
```

---

## ✅ Success Criteria Checklist

Mark each as you verify:

### Health & Stability
- [ ] Worker Health shows "✅ Healthy" on first load
- [ ] Worker stays healthy throughout all tests
- [ ] No error messages appear
- [ ] Dashboard auto-refreshes every 5 seconds

### Job Creation
- [ ] Like jobs created successfully
- [ ] Comment jobs created successfully
- [ ] Job IDs are unique (never same ID twice)
- [ ] Error validation works for missing fields
- [ ] Error validation works for invalid types

### Job Processing
- [ ] Jobs move from waiting → completed
- [ ] Completed count increases over time
- [ ] Active count shows concurrent processing
- [ ] Jobs complete within 5 seconds

### Data Integrity
- [ ] Pod IDs are maintained correctly
- [ ] Job data preserves engagement type
- [ ] Job data preserves post/profile IDs
- [ ] Comment text is preserved

### Performance
- [ ] API responses under 500ms
- [ ] Dashboard refresh under 1 second
- [ ] Multiple jobs process concurrently
- [ ] Worker handles 20+ jobs without issue

---

## 📊 Results Summary Template

**Test Date**: _____________
**Tester**: _____________
**Duration**: _____________

### Overall Status
- [ ] ✅ PASS - All tests successful
- [ ] ⚠️ PARTIAL PASS - Some issues found
- [ ] ❌ FAIL - Critical issues

### Tests Completed
- [ ] Step 1: Dashboard Navigation
- [ ] Step 2: Worker Health Verification
- [ ] Step 3: Like Job Creation
- [ ] Step 4: Job Processing Monitoring
- [ ] Step 5: Comment Job Creation
- [ ] Step 6: Concurrency Test
- [ ] Step 7: Error Handling
- [ ] Step 8: Pod ID Filtering
- [ ] Step 9: Long-Term Monitoring
- [ ] Step 10: Stress Test (optional)

### Issues Found
```
[List any issues, errors, or unexpected behavior]
```

### Performance Metrics
- Average job processing time: _______ ms
- Throughput (jobs/minute): _______
- Max concurrent active jobs: _______
- Error rate: _______%

### Notes & Observations
```
[Any additional notes or observations]
```

---

## 🔧 Troubleshooting Guide

### Issue: "Worker Unhealthy" ❌

**Causes**:
1. **Redis not running**
   - Fix: `redis-server` in terminal
   - Verify: `redis-cli ping` → should return PONG

2. **Worker not initialized**
   - Fix: Refresh page, check console logs
   - Look for: "[POD_ENGAGEMENT_WORKER] ✅ Worker initialized"

3. **Database connection issue**
   - Fix: Check Supabase credentials in `.env`
   - Verify: Can you access other dashboard pages?

---

### Issue: "Error: Missing required field" ❌

**This is CORRECT behavior** ✅
- The API is validating inputs as designed
- Verify the error message is clear and helpful
- Test should verify validation works

---

### Issue: Job doesn't appear to process ⏳

**Possible Causes**:
1. **Job is scheduled for future**
   - Check: Is `scheduledFor` in the future?
   - Fix: Use `new Date().toISOString()` for immediate execution

2. **Job timeout**
   - Check: Console logs for "[POD_ENGAGEMENT_WORKER] ❌ Engagement execution failed"
   - Note: E-05-2 and E-05-3 not implemented yet, so placeholder succeeds immediately

3. **Queue stuck**
   - Fix: Refresh page and try again
   - Check: "Active" count in queue stats

---

### Issue: API 500 Error 💥

**Possible Causes**:
1. **Pod ID with special characters**
   - Fix: Use alphanumeric pod IDs
   - Example: "test-pod-123" ✅, "test@pod#123" ❌

2. **Missing Content-Type header**
   - Fix: Ensure `'Content-Type': 'application/json'`

3. **Dev server needs restart**
   - Fix: Stop dev server (`Ctrl+C`) and restart (`npm run dev`)

---

## 📚 Reference Information

### API Endpoints

**Get Worker Status**:
```
GET /api/pods/{podId}/engagement/status
Response: { worker, queue, timestamp, success }
```

**Create Engagement Job**:
```
POST /api/pods/{podId}/engagement/jobs
Body: {
  engagementType: 'like' | 'comment',
  postId: string,
  profileId: string,
  commentText?: string,
  scheduledFor?: string (ISO timestamp)
}
Response: { jobId, activityId, engagementType, message, success }
```

### Queue Metrics Explained

| Metric | Meaning | Expected Value |
|--------|---------|-----------------|
| **Waiting** | Jobs waiting to be processed | 0-5 |
| **Active** | Currently being processed | 0-5 |
| **Delayed** | Scheduled for future | Usually 0 |
| **Completed** | Successfully finished | Increases over time |
| **Failed** | Permanently failed | Usually 0 |
| **Total** | Waiting + Active + Delayed | Sum of above |

### Job Lifecycle

```
1. CREATED → Added to queue with priority
2. WAITING → Queued, waiting for worker
3. ACTIVE  → Worker is processing it
4. COMPLETED → Successfully executed
           OR
4. FAILED → Failed after 3 retries
```

---

## 🎓 What This Tests

**E-05-1 Pod Engagement Worker validates**:
- ✅ BullMQ job queue integration
- ✅ Redis connection and job storage
- ✅ Worker initialization and lifecycle
- ✅ Concurrent job processing (5 at a time)
- ✅ Error classification and handling
- ✅ Input validation
- ✅ Health monitoring and reporting
- ✅ Database integration (activity updates)
- ✅ Job priority calculation
- ✅ Graceful shutdown

**Does NOT test** (future features):
- ❌ Actual LinkedIn engagement (E-05-2, E-05-3)
- ❌ Voice cartridge comment generation (E-05-3)
- ❌ Real database activity records (placeholder succeeds)

---

## 📝 Notes for Testers

1. **Job Processing is Fast**: Don't blink! Jobs complete in milliseconds since E-05-2 and E-05-3 aren't implemented yet (they return success immediately).

2. **Pod ID Matters**: Each pod ID has its own queue. You can test multiple pods independently.

3. **Auto-Refresh is Your Friend**: Watch the dashboard update automatically instead of clicking refresh manually.

4. **Errors Are Features**: Invalid data being rejected is SUCCESS, not failure.

5. **Redis is Required**: This won't work without a running Redis instance.

6. **Logs Tell the Story**: Check browser console (F12) and server logs for "[POD_ENGAGEMENT_WORKER]" messages.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Status**: Ready for Testing ✅
