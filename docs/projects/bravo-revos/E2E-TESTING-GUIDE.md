# G-02: End-to-End Testing Suite
## Complete testing guide for the Bravo revOS platform

**Status**: Production Ready
**Test Framework**: Comet (browser automation)
**Total Scenarios**: 8
**Estimated Runtime**: 30-45 minutes
**Environment**: Local dev (http://localhost:3000)

---

## Pre-Test Checklist

- [ ] Dev server running: `npm run dev`
- [ ] Webhook worker running: `npm run worker:webhook`
- [ ] Pod automation worker running: `npm run worker:pod-automation`
- [ ] Redis running: `redis-server`
- [ ] Supabase emulated or connected
- [ ] Fresh test data (recommended: clear previous test data)
- [ ] Browser console open in Comet

---

## Test Scenario 1: User Authentication & Onboarding

**Objective**: Verify complete auth flow and initial onboarding

### Steps:
1. Navigate to `http://localhost:3000/auth/login`
2. Create new account with test credentials:
   - Email: `test-e2e-001@example.com`
   - Password: `TestPass123!`
3. Verify email verification (if required)
4. Complete agency/client onboarding
5. Verify redirect to dashboard

### Expected Results:
- ✅ Account created successfully
- ✅ User can log in
- ✅ Dashboard accessible
- ✅ Navigation menu visible

### Pass Criteria:
User is authenticated, on dashboard, with complete profile visible

---

## Test Scenario 2: Campaign Creation & Lead Magnet Setup

**Objective**: Verify campaign creation and lead magnet configuration

### Steps:
1. From dashboard, click "Create Campaign"
2. Fill campaign details:
   - Name: "E2E Test Campaign"
   - Lead magnet: Select/create one
   - Target: LinkedIn
3. Configure lead magnet:
   - Title: "Test Lead Magnet"
   - Description: "Testing content"
   - Landing page: Generate or use template
4. Save and publish campaign

### Expected Results:
- ✅ Campaign created with unique ID
- ✅ Lead magnet accessible
- ✅ Campaign status shows "active"
- ✅ Engagement pod can be created

### Pass Criteria:
Campaign is created and can be used for engagement

---

## Test Scenario 3: Pod Creation & Member Enrollment

**Objective**: Verify engagement pod creation and member management

### Steps:
1. From campaign, create new pod:
   - Name: "Test Engagement Pod"
   - Members: Add 3-5 test LinkedIn accounts
2. Set voice cartridge:
   - Tone: "casual"
   - Style: "conversational"
3. Configure engagement rules:
   - Like delay: 5-30 minutes
   - Comment delay: 1-6 hours
4. Save and activate pod

### Expected Results:
- ✅ Pod created with members
- ✅ Voice settings applied
- ✅ Pod shows "active" status
- ✅ Ready for post detection

### Pass Criteria:
Pod is created, configured, and ready for engagement

---

## Test Scenario 4: Post Detection & Activity Scheduling

**Objective**: Verify LinkedIn post detection and automatic activity scheduling

### Steps:
1. Configure post detection polling:
   - Interval: Set to 30 minutes (testing)
   - Members to monitor: Select pod members
2. Monitor `/admin/monitoring` dashboard
3. Trigger test post from linked LinkedIn account (or simulate)
4. Wait for post detection (max 30s in test mode)
5. Verify activities scheduled in database

### Expected Results:
- ✅ Post detected from pod members
- ✅ Engagement activities created:
   - Like activities (5-30min delay)
   - Comment activities (1-6hr delay)
- ✅ Dashboard shows scheduled count
- ✅ Activities appear as "pending"

### Pass Criteria:
Post is detected and activities are automatically scheduled

---

## Test Scenario 5: Like Engagement Execution

**Objective**: Verify like engagement execution and state management

### Steps:
1. From monitoring dashboard, observe like activities
2. Wait for scheduled like time to arrive (or manually trigger)
3. Monitor activity status in `/admin/monitoring`
4. Check execution result:
   - Status should transition to "completed"
   - Execution time recorded
5. Verify in Unipile API (optional):
   - Like was posted to LinkedIn

### Expected Results:
- ✅ Activity status: pending → completed
- ✅ Execution timestamp recorded
- ✅ Execution result stored (success/failure)
- ✅ Average execution time < 5 seconds

### Pass Criteria:
Like activity executed successfully with proper state tracking

---

## Test Scenario 6: Comment Engagement with Voice Cartridge

**Objective**: Verify comment execution with personality transformations

### Steps:
1. From monitoring dashboard, find comment activity
2. Wait for scheduled comment time
3. Observe execution in dashboard
4. Check generated comment:
   - Should reflect voice cartridge settings (tone, style)
   - Should have personality-based transformations
5. Verify in Unipile API:
   - Comment posted to LinkedIn with correct text

### Expected Results:
- ✅ Activity status: pending → completed
- ✅ Comment reflects voice cartridge settings
- ✅ Execution result stored
- ✅ No banned words in comment
- ✅ Emojis/style applied per cartridge

### Pass Criteria:
Comment executed with voice transformations applied

---

## Test Scenario 7: Error Handling & Retry Logic

**Objective**: Verify error classification and retry behavior

### Steps:
1. Simulate error conditions:
   - **Rate limit**: Try exceeding API rate limits
   - **Auth error**: Use invalid token/credentials
   - **Not found**: Try engaging with deleted post
2. Monitor error handling:
   - Check execution_attempts count
   - Verify error classification (error_type field)
   - Monitor dead-letter queue activity
3. Verify retry behavior:
   - Rate limit errors retry (3 attempts max)
   - Auth errors skip retry (move to DLQ immediately)
   - Not found errors skip retry (move to DLQ immediately)

### Expected Results:
- ✅ Errors classified correctly
- ✅ Permanent failures → DLQ
- ✅ Temporary failures → retry with backoff
- ✅ Exponential backoff observed (500ms → 1s → 2s)
- ✅ Max 3 attempts enforced

### Pass Criteria:
All error types handled appropriately with correct retry strategy

---

## Test Scenario 8: Complete End-to-End Campaign Success

**Objective**: Verify entire workflow from lead to pod engagement completion

### Steps:
1. Use previously created campaign and pod
2. Generate synthetic post from pod member
3. Monitor complete workflow:
   - Post detection
   - Activity scheduling (likes + comments)
   - Activity execution
   - Success tracking
4. Check success metrics:
   - Success rate > 80%
   - All activities executed
   - Campaign dashboard shows metrics
5. Verify monitoring dashboard:
   - Real-time updates visible
   - Metrics are accurate

### Expected Results:
- ✅ Post detected
- ✅ 5-10 engagement activities scheduled
- ✅ 80%+ success rate
- ✅ Activities completed in < 10 minutes
- ✅ Dashboard metrics accurate
- ✅ No errors in pod automation worker logs

### Pass Criteria:
Complete end-to-end workflow executed successfully with 80%+ success rate

---

## Automated Validation Tests

### Database Integrity
```sql
-- Verify no duplicate activities (idempotency)
SELECT pod_id, post_id, COUNT(*) as count
FROM pod_activities
GROUP BY pod_id, post_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Verify DLQ entries are legitimate failures
SELECT error_type, COUNT(*) as count
FROM pod_activities_dlq
GROUP BY error_type;
-- Expected: Only permanent failures (auth_error, not_found, validation_error)

-- Verify activity status flow
SELECT DISTINCT status
FROM pod_activities;
-- Expected: 'pending', 'completed', 'failed' only
```

### Performance Benchmarks
- Activity execution time: < 5 seconds
- Dashboard load time: < 2 seconds
- Real-time update latency: < 1 second
- Database query latency: < 200ms

### Monitoring Verification
- Dashboard metrics ≤ 5 seconds out of sync
- Real-time subscriptions active
- No memory leaks in worker processes
- Redis connections stable

---

## Test Failure Resolution

### Scenario 1 Fails (Auth)
- Clear browser cookies
- Check Supabase auth configuration
- Verify email verification settings

### Scenario 4 Fails (Post Detection)
- Verify post polling enabled
- Check Unipile API credentials
- Ensure pod members have posts available
- Check Redis queue status

### Scenario 5-6 Fail (Engagement)
- Verify workers are running (see npm output)
- Check Unipile API rate limits
- Verify activity scheduling succeeded in scenario 4
- Check error logs in workers

### Scenario 7 Fails (Error Handling)
- Verify error classification logic
- Check dead-letter queue table exists
- Verify retry backoff configuration
- Check max attempts enforcement

### Scenario 8 Fails (End-to-End)
- Rerun scenarios 1-7 to identify specific failure point
- Check database for orphaned activities
- Verify data integrity with SQL validation
- Check worker logs for exceptions

---

## Success Checklist

After all 8 scenarios pass:

- [ ] All activities executed successfully
- [ ] No errors in worker logs
- [ ] Dashboard metrics accurate
- [ ] No database integrity issues
- [ ] Real-time subscriptions working
- [ ] Error handling working correctly
- [ ] Performance meets benchmarks
- [ ] No memory leaks detected

**Platform is production-ready** ✅

---

## Monitoring During Tests

### Worker Console Output
```bash
# Webhook Worker (should show deliveries)
npm run worker:webhook

# Pod Automation Worker (should show scheduling and execution)
npm run worker:pod-automation
```

### Redis Queue Status
```bash
redis-cli
> KEYS "*pod*"  # See queue keys
> LLEN "bull:pod-automation:active"  # Active jobs
```

### Supabase Logs
- Monitor auth_events for login/signup
- Monitor pod_activities for activity changes
- Monitor function logs for API errors

### Dashboard Real-time
- Open `/admin/monitoring` in browser
- Watch metrics update in real-time
- Verify accuracy against worker logs
