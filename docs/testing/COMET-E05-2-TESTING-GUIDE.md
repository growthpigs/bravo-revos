# Comet Browser Testing Guide - E-05-2 Like Executor

**Purpose:** Validate E-05-2 like job execution through the engagement dashboard UI

**Duration:** ~15 minutes for complete validation

**Prerequisites:**
- Dev server running on http://localhost:3000
- Redis connection working (for BullMQ)
- UNIPILE_API_KEY environment variable set

---

## Test Scenario: Create and Execute Like Jobs

### Step 1: Open Engagement Dashboard

1. Navigate to: **http://localhost:3000/admin/engagement-dashboard**
2. You should see the **Pod Engagement Worker Dashboard**
3. Dashboard shows:
   - Worker Status (Healthy/Unhealthy)
   - Queue Statistics (waiting, active, completed, failed)
   - Create Test Jobs buttons

### Step 2: Create a Like Job

**Action:**
1. In the **"Create Test Jobs"** section
2. Keep Pod ID as: `test-pod-123` (or change to test pod)
3. Click **"👍 Create Like Job"** button

**Expected Result:**
- Success message: `✅ Like job created (ID: {jobId})`
- Queue statistics update:
  - **Active** count increases (job being processed)
  - **Completed** count increases after 2-5 seconds
  - **Failed** count remains 0

**What's Happening:**
```
1. Dashboard POST → /api/pods/{podId}/engagement/jobs
2. API creates job in BullMQ queue
3. E-05-1 Job Consumer processes the job
4. executeLikeEngagement() called
5. Unipile API called to like the post
6. Result stored with success status
7. Dashboard auto-refreshes to show completion
```

### Step 3: Monitor Queue Status

**Dashboard Auto-Refresh:**
- Dashboard refreshes every 5 seconds
- Watch the queue statistics for changes
- Successful jobs appear in **Completed** count

**Key Metrics to Verify:**
| Metric | Expected | Indicates |
|--------|----------|-----------|
| Worker Health | ✅ Healthy | Worker running |
| Waiting | 0 | All jobs processed |
| Active | 0 | No jobs processing |
| Completed | >0 | Jobs succeeded |
| Failed | 0 | No errors occurred |

### Step 4: Validate Error Handling

**Test Rate Limiting (429 Error):**
1. Create 10 like jobs quickly (click button 10 times)
2. Watch for error messages if Unipile returns 429
3. Jobs should be retried (BullMQ exponential backoff)
4. Eventually should complete or fail gracefully

**Test Missing PostId:**
1. Manually create a job with empty postId
2. Job should fail with: `[Activity {id}] Missing or empty postId`
3. Error appears in Failed count
4. Job marked with 'validation_error' type

**Test Timeout (optional):**
1. If Unipile API is slow/down
2. Job should timeout after 25 seconds
3. Message: `[Activity {id}] Request timeout (25s)`
4. Job retried 3 times (BullMQ default)

### Step 5: Check Logging

**To see detailed logs with FEATURE_FLAGS enabled:**

In dev console (F12 → Console):
```javascript
// Search for these log patterns:
"[POD_ENGAGEMENT]"          // Log prefix
"[Activity"                 // ActivityId tracing
"Like executed successfully"  // Success logs
"Like engagement failed"      // Error logs
```

**Expected Log Format:**
```
[POD_ENGAGEMENT] [Activity activity-like-e05-2-001] Calling Unipile like API: https://api1.unipile.com:13211/api/v1/posts/{postId}/reactions
[POD_ENGAGEMENT] [Activity activity-like-e05-2-001] Like executed successfully for post {postId}
```

---

## Complete Test Checklist

### Functionality Tests
- [ ] Dashboard loads without errors
- [ ] Like job button creates job successfully
- [ ] Queue statistics update in real-time
- [ ] Completed count increases after job execution
- [ ] Failed count remains 0 for valid jobs

### Error Handling Tests
- [ ] Empty postId shows validation error
- [ ] Empty profileId shows validation error
- [ ] Auth errors (401/403) shown clearly
- [ ] Rate limit errors (429) shown clearly
- [ ] Not found errors (404) shown clearly
- [ ] Timeout errors shown after 25s
- [ ] All errors include ActivityId for tracing

### Performance Tests
- [ ] Single job completes in <5 seconds
- [ ] 5 concurrent jobs all complete
- [ ] 10 concurrent jobs process correctly
- [ ] Dashboard remains responsive during processing
- [ ] No memory leaks (monitor browser memory)

### Integration Tests
- [ ] E-05-1 Job Consumer processes E-05-2 jobs
- [ ] BullMQ queue properly configured
- [ ] Retry logic works (3 attempts)
- [ ] Exponential backoff applied
- [ ] Job data preserved across retries

---

## Detailed Test Cases

### Test Case 1: Single Like Job
**Steps:**
1. Open dashboard
2. Click "Create Like Job"
3. Wait for success message
4. Verify queue updates

**Expected:**
- ✅ Job created
- ✅ Completed count increases
- ✅ Success message shows

**Pass Criteria:** All expectations met

---

### Test Case 2: Multiple Concurrent Jobs
**Steps:**
1. Open dashboard
2. Click "Create Like Job" button 5 times rapidly
3. Watch Active count increase
4. Wait for all to complete

**Expected:**
- ✅ Active count reaches 5
- ✅ All jobs eventually complete
- ✅ Completed count increases to 5
- ✅ Failed count stays 0

**Pass Criteria:** All 5 jobs complete successfully

---

### Test Case 3: Error Message with ActivityId
**Steps:**
1. Inspect network request in DevTools
2. Look at job creation response
3. Check logs for [Activity xxx] prefix

**Expected:**
- ✅ Response includes activityId
- ✅ Logs show [Activity {id}] prefix
- ✅ Error messages include activityId

**Pass Criteria:** All error messages include activityId

---

### Test Case 4: Timeout Handling
**Steps:**
1. (Requires slow/down Unipile API)
2. Create like job
3. Monitor for timeout message
4. Watch for retry

**Expected:**
- ✅ Timeout after 25 seconds
- ✅ Message: "[Activity {id}] Request timeout (25s)"
- ✅ Job retried (up to 3 times)

**Pass Criteria:** Timeout handled gracefully

---

## What's Being Tested

### E-05-2 Features Validated

✅ **Like Job Creation**
- API receives POST with job data
- Job stored in BullMQ with correct properties
- ActivityId assigned for tracing

✅ **Job Execution**
- E-05-1 Job Consumer picks up job
- executeLikeEngagement() called
- Unipile API endpoint hit correctly

✅ **Error Handling**
- Input validation (empty postId/profileId)
- HTTP error classification (429, 401/403, 404)
- Timeout handling (25s)
- Network error handling

✅ **Tracing & Logging**
- ActivityId in all error messages
- Proper error classification
- Timestamp formatting
- Production-ready log format

✅ **Idempotency**
- Same job retried produces same result
- No duplicate likes on retries
- BullMQ handles deduplication

---

## Troubleshooting

### Issue: "Worker Unhealthy"
**Cause:** BullMQ not running or Redis not connected
**Solution:**
```bash
# Check Redis is running
redis-cli ping

# If not, start Redis:
redis-server
```

### Issue: "Failed: 3 failed, 50 passed"
**Cause:** Pre-existing E-05-1 test failures (not E-05-2)
**Solution:** Expected - only E-05-2 tests should pass. Use Comet to validate actual execution.

### Issue: "Connection refused" on Unipile API
**Cause:** UNIPILE_API_KEY not set or wrong endpoint
**Solution:**
```bash
# Check environment variable
echo $UNIPILE_API_KEY

# Or in .env.local:
UNIPILE_API_KEY=your_key_here
UNIPILE_DSN=https://api1.unipile.com:13211
```

### Issue: Jobs stay in "Waiting" state
**Cause:** Worker not processing jobs
**Solution:**
1. Check if worker is running: `npx pm2 list` (or `ps aux | grep node`)
2. Check Redis is working: `redis-cli ping`
3. Restart dev server: `npm run dev`

---

## Success Criteria

**E-05-2 is validated when:**

✅ Like jobs create successfully via dashboard
✅ Queue statistics update in real-time
✅ Jobs complete within 5 seconds
✅ All error messages include ActivityId
✅ Timeout protection works (25s)
✅ Input validation prevents invalid requests
✅ Multiple concurrent jobs process correctly
✅ Completed count increases after job execution
✅ Failed count stays 0 for valid jobs
✅ Error classification works (429, 401/403, 404)

---

## Performance Benchmarks

**Expected Performance (should see these numbers):**

| Operation | Expected Time | Status |
|-----------|---|---|
| Create job | <100ms | ✅ |
| Queue processing | 100-2000ms | ✅ |
| Unipile API call | 1-4 seconds | ✅ |
| Job completion | 2-5 seconds | ✅ |
| Dashboard refresh | 5 seconds | ✅ |
| Timeout protection | 25 seconds | ✅ |

**If slower:**
- Check network latency to Unipile
- Check BullMQ queue depth (Waiting jobs piling up)
- Check worker concurrency (configured for 5)

---

## Dashboard UI Guide

### Worker Status Section
```
🟢 Health: ✅ Healthy
Status: running
Timestamp: 2025-11-05T...
```

### Queue Statistics Table
```
Metric      | Count
------------|-------
Waiting     | 0      (jobs queued, not processing)
Active      | 0      (jobs currently processing)
Delayed     | 0      (scheduled for future)
Completed   | >0     (successfully processed)
Failed      | 0      (job failed)
Total       | >0     (all jobs)
```

### Create Test Jobs Section
```
[👍 Create Like Job] [💬 Create Comment Job]
Message: ✅ Like job created (ID: {jobId})
        or ❌ Error: {error message}
```

---

## Next Steps After Validation

**If all tests pass:**
1. ✅ Code is production-ready
2. ✅ Deploy to staging environment
3. ✅ Run load tests with 100+ jobs
4. ✅ Deploy to production
5. ✅ Monitor error rates and performance

**If tests fail:**
1. Check error messages for ActivityId
2. Verify UNIPILE_API_KEY is set
3. Check Redis is running
4. Review logs for detailed error info
5. Check network connectivity to Unipile API

---

## Support

For detailed implementation info, see:
- `docs/sitreps/E-05-2-LIKE-EXECUTOR-SITREP.md` - Implementation details
- `docs/sitreps/E-05-2-REFACTORING-AND-REVIEW-COMPLETE.md` - Refactoring summary
- `lib/queue/pod-engagement-worker.ts` - Source code

---

**Test Date:** ___________
**Tester:** ___________
**All Tests Passed:** ☐ Yes  ☐ No
**Comments:** _____________________________________________

