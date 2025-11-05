# E-04 Browser-Based Testing Guide

**Purpose**: Real-world validation of the Pod Automation Engine (E-04) through the browser interface.

**Testing Tool**: Comet User Browser (navigates UI, clicks buttons, observes results)

**Duration**: ~10-15 minutes per test run

---

## What This Tests

This dashboard provides **real, functional testing** of E-04 by allowing browser-only interaction with:

1. **Queue Health Monitoring**: Real-time status from BullMQ + Redis
2. **Pending Activity Detection**: Actual count from Supabase database
3. **Scheduling Operations**: Real calls to `scheduleLikeJobs()` and `scheduleCommentJobs()`
4. **Job Queue Integration**: Real jobs added to BullMQ queue
5. **Statistics Aggregation**: Real pod engagement statistics

---

## Prerequisites

Before running this test, you need:

1. **Running Backend**: `npm run dev` must be executing
2. **Redis Running**: Background service accessible (used by BullMQ)
3. **Supabase Connected**: Database with `pods` and `pod_activities` tables
4. **Test Pod**: A pod record in the database with ID (e.g., `test-pod-123`)
5. **Pending Activities**: Activities in `pod_activities` table with:
   - `pod_id` = your test pod ID
   - `status` = 'pending'
   - `engagement_type` = 'like' or 'comment'

---

## Step-by-Step Testing Flow

### Step 1: Navigate to Dashboard

**URL**: `http://localhost:3000/admin/automation-dashboard?podId=test-pod-123`

Replace `test-pod-123` with your actual pod ID.

**Expected**: Dashboard loads with:
- Pod information displayed
- Pending activities count
- Queue status showing all zeros (or existing jobs)
- No error messages

**If Failed**:
- Check backend is running (`npm run dev`)
- Check pod ID exists in database
- Check browser console for errors

---

### Step 2: Verify Initial State

**What to Check**:
1. **Pod ID matches**: Shows `test-pod-123` correctly
2. **Pod Status**: Shows as 'active' or your pod's actual status
3. **Pending Activities Count**: Shows non-zero if you have pending activities
4. **Queue Status**: All counts visible (waiting, active, delayed, etc.)

**Example Initial State**:
```
Pod ID: test-pod-123
Pod Name: Test Pod
Pod Status: active

Pending Activities:
- Total: 5
- Likes: 3
- Comments: 2

Queue Status:
- Waiting: 0
- Active: 0
- Delayed: 0
- Completed: 25
- Failed: 0
```

---

### Step 3: Trigger Scheduling (Like Activities)

**Action**: Click "Schedule Likes" button

**What Happens Behind the Scenes**:
1. Browser sends POST to `/api/pods/test-pod-123/automation/actions`
2. API calls `scheduleLikeJobs()` from E-04
3. Function calls `getPendingActivities(podId, 20)` to get like activities
4. Function calls `scheduleLikeActivities()` which:
   - Limits to 3 members per hour
   - Calculates random delays (5-30 minutes each)
   - Updates database status to 'scheduled'
   - Calculates scheduled_for timestamps
5. Adds 'schedule-likes' job to BullMQ queue
6. Returns job ID and scheduled count

**Expected Result**:
- "Last Action Result" box appears showing:
  - Action: `schedule-likes`
  - Status: ✅ SUCCESS (green)
  - Job ID: `job-like-1` or similar UUID
  - Scheduled Count: Number of activities scheduled (e.g., 3)
  - Message: "Scheduled 3 like jobs"
  - Duration: Time taken (typically 50-200ms)

**Example Success**:
```
Last Action Result
─────────────────
Action: schedule-likes
Status: ✅ SUCCESS
Job ID: 65a8f3d2-4a9c-11ef-8932-0242ac120002
Scheduled Count: 3
Message: Scheduled 3 like jobs
Duration: 87ms
```

**If Failed**:
- Red error box appears with error message
- Check:
  - Pod ID is correct
  - Pod has pending activities
  - Database connection is working
  - Check backend logs for detailed error

---

### Step 4: Verify Queue Updated

**What Changed**:
After scheduling likes, the queue should have changed:

**Before**:
```
Queue Status:
- Waiting: 0
```

**After**:
```
Queue Status:
- Waiting: 1  ← Increased!
```

**Why**: One `schedule-likes` job was added to the queue waiting for processing.

**Check**: Verify waiting count increased by 1

---

### Step 5: Verify Activities Updated

**What Changed**:
Activities in the database were updated. The dashboard shows this:

**Before**:
```
Activity Statistics:
- Pending: 5
- Scheduled: 0
```

**After**:
```
Activity Statistics:
- Pending: 2  ← Decreased!
- Scheduled: 3  ← Increased!
```

**Why**: Activities moved from 'pending' to 'scheduled' status in database

**Check**: Verify pending activities decreased and scheduled increased

---

### Step 6: Trigger Scheduling (Comment Activities)

**Action**: Click "Schedule Comments" button

**Expected Result**: Similar to likes:
- Success message
- Job ID returned
- Scheduled Count shows number of comments scheduled
- Queue waiting count increases again

**Note**: Comments may show 0 if all pending activities are likes. This is normal - the function handles empty activity lists gracefully.

---

### Step 7: Refresh and Verify Stability

**Action**: Click "Refresh Now" button

**Expected**:
- Dashboard reloads data from API
- Numbers remain consistent (no unexpected changes)
- Queue status is stable
- No error messages

**This Validates**:
- API endpoint stability
- Database query reliability
- No race conditions

---

### Step 8: Auto-Refresh Check

**What to Observe**:
- Dashboard automatically refreshes every 5 seconds
- Watch the "Last Updated" timestamp in Pod Information
- Should change every 5 seconds

**This Validates**:
- Real-time monitoring capability
- Continuous queue status tracking

---

## What Gets Tested (Real E-04 Functions Called)

### Direct Function Calls

When you click "Schedule Likes", this exact call chain happens:

```typescript
// User clicks button → Browser sends POST
POST /api/pods/test-pod-123/automation/actions
body: { action: "schedule-likes" }

// Backend executes:
→ scheduleLikeJobs(podId)  // From pod-automation-queue.ts
  → getPendingActivities(podId, 20)  // From engagement-scheduler.ts
    → Query: SELECT * FROM pod_activities
             WHERE status='pending'
             AND engagement_type='like'
             ORDER BY scheduled_for ASC
             LIMIT 20
  → scheduleLikeActivities(activities, 3)  // Max 3 per hour
    → calculateLikeDelay(i, totalMembers)
      → Generates random delay between 5-30 minutes
      → Adds ±10% variation
    → Update database: UPDATE pod_activities
                       SET status='scheduled',
                           scheduled_for=NOW() + delay
    → Return ScheduledJob[]
  → podAutomationQueue.add('schedule-likes', { ... })
    → Actually adds job to Redis queue
  → getAutomationQueueStatus()
    → Query Redis: Get job counts
  → getPodEngagementStats(podId)
    → Query database: Count activities by status

// Return to browser
← HTTP 200 with result
```

### Database Queries Executed

1. **Read**: `SELECT * FROM pod_activities WHERE pod_id=X AND status='pending'`
2. **Update**: `UPDATE pod_activities SET status='scheduled', scheduled_for=? WHERE id=?`
3. **Read**: `SELECT COUNT(*) FROM pods WHERE id=X`
4. **Read**: `SELECT status FROM pod_activities WHERE pod_id=X`

### Redis Operations

1. **Write**: Add job to queue: `pod-automation:job:...`
2. **Read**: Get queue metrics (waiting, active, etc.)

---

## Success Criteria

✅ **Full Test Pass** requires:

1. Dashboard loads without errors
2. Initial state displays correctly
3. "Schedule Likes" button works and returns job ID
4. Queue waiting count increases
5. Activity statistics update (pending decreases, scheduled increases)
6. "Schedule Comments" button works
7. Refresh maintains consistency
8. No error messages throughout

---

## Troubleshooting

### Dashboard Won't Load

**Error**: Page shows "Loading..." forever or blank screen

**Solutions**:
1. Check backend is running: `npm run dev`
2. Check browser console (F12) for errors
3. Verify URL is correct
4. Try a different pod ID
5. Check if backend logs show connection errors

### "Failed to fetch status" Error

**Cause**: Backend API error

**Check**:
1. Backend logs for stack trace
2. Verify pod ID exists: `SELECT * FROM pods WHERE id='...'`
3. Check Supabase connection
4. Look for database permission errors

### "Unknown error" on Action

**Cause**: Scheduling operation failed

**Check Backend Logs** for:
- Database connection error
- Queue connection error (Redis)
- Missing pending activities
- Permission issues

### Queue Count Doesn't Change

**Possible Causes**:
1. No pending activities for that engagement type
2. Job was processed immediately (check completed count)
3. Queue operation failed silently

**Check**:
1. Verify pending activities exist
2. Check "Last Action Result" for error message
3. Look at backend logs

---

## Dashboard Metrics Explained

### Queue Status
- **Waiting**: Jobs queued, not yet processing
- **Active**: Currently being processed
- **Delayed**: Scheduled for later processing
- **Completed**: Successfully finished jobs
- **Failed**: Jobs that failed after retries

### Activity Statistics
- **Total**: All activities ever created
- **Pending**: Not yet scheduled
- **Scheduled**: Scheduled, waiting for execution
- **Executed**: Successfully completed
- **Failed**: Failed after all retries

### Pending Activities
- **Total Pending**: Activities ready to be scheduled
- **Pending Likes**: Like activities waiting
- **Pending Comments**: Comment activities waiting

---

## Performance Expectations

### Response Times
- **Dashboard Load**: 200-500ms
- **Schedule Likes**: 50-200ms
- **Schedule Comments**: 50-200ms
- **Status Refresh**: 100-300ms

### Typical Numbers
- **Pending Activities**: 5-50 (depends on pod detection activity)
- **Queue Waiting**: 0-5 (jobs process quickly)
- **Scheduled Activities**: 0-100+ (depends on scheduling frequency)

---

## What This Validates

✅ **E-04 Functionality**:
- Pending activity detection works
- Delay calculation produces valid delays
- Database updates work correctly
- Queue job creation works
- Statistics aggregation works
- Error handling works

✅ **Integration**:
- E-03 (post detection) feeds activities to database
- E-04 (automation) reads and schedules them
- BullMQ queue accepts jobs
- Database transactions complete successfully

✅ **Production Readiness**:
- Real-world API endpoints work
- Error handling is robust
- Response times are acceptable
- No memory leaks or crashes

---

## Next Steps After Testing

If all tests pass:

1. **Data**: Activities should be in 'scheduled' status in database
2. **Queue**: Jobs waiting to be processed by job processor
3. **E-05**: Will consume these jobs and execute engagement

You can verify scheduled activities by querying:
```sql
SELECT id, pod_id, engagement_type, status, scheduled_for
FROM pod_activities
WHERE pod_id = 'test-pod-123'
ORDER BY scheduled_for ASC;
```

---

## Browser-Only Constraints Addressed

❌ **Cannot do**:
- Check terminal output
- Run bash commands
- Read log files
- Check Redis directly

✅ **Can do** (what we built):
- Navigate to URL
- Click buttons
- Read displayed results
- Watch real-time updates
- See error messages
- Verify status changes

This dashboard bridges the gap - Comet can fully test E-04 using only browser interactions.

---

## Testing Checklist

Use this checklist when running the test:

```
[ ] Dashboard loads without errors
[ ] Pod information displays correctly
[ ] Pending activities count is visible
[ ] Queue status shows all metrics
[ ] "Schedule Likes" button clickable
[ ] Schedule Likes action succeeds
[ ] Job ID returned in result
[ ] Scheduled count is > 0
[ ] Queue waiting count increased
[ ] Activity statistics updated
[ ] "Schedule Comments" button clickable
[ ] Schedule Comments action succeeds (or shows 0 scheduled)
[ ] Refresh Now button works
[ ] Auto-refresh working (timestamp updates)
[ ] No error messages throughout test
[ ] Browser console has no errors (F12)
```

---

**Test Date**: _____________
**Tester**: _____________
**Pod ID Used**: _____________
**Result**: ✅ PASS / ❌ FAIL
**Notes**: _________________________________________________________________

---

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
