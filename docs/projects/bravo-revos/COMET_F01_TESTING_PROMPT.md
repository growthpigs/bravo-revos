# Comet User Browser: F-01 AgentKit Campaign Orchestration Testing Prompt

**Objective**: Validate that the F-01 AgentKit Campaign Orchestration layer works correctly using ONLY browser interactions (no terminal, no console access).

**Duration**: ~20-30 minutes

**Test Type**: End-to-end functional validation through real API endpoints

**Tester**: Colm

---

## Before You Start

You are testing a critical AI orchestration system that:
- Makes autonomous decisions about LinkedIn campaign engagement
- Integrates with OpenAI's GPT-4o model
- Creates engagement scheduling activities
- Has 10 passing unit tests and comprehensive validation

This test validates that the real F-01 functions work correctly when called through the API.

---

## Prerequisites

### Database Setup (Backend Team Pre-Test)

Before Colm starts, you need to seed the database with test data:

```sql
-- Create test campaign
INSERT INTO campaigns (id, name, trigger_word, lead_magnet_id, client_id, status)
VALUES (
  'campaign-test-001',
  'Test AI Campaign',
  'SCALE',
  'lead-magnet-test-001',
  'client-test-001',
  'active'
);

-- Create test pod with members
INSERT INTO pods (id, name, voice_cartridge_id)
VALUES ('pod-test-001', 'Test Pod', NULL);

INSERT INTO pod_members (id, pod_id, profile_id)
VALUES
  ('member-1', 'pod-test-001', 'profile-123'),
  ('member-2', 'pod-test-001', 'profile-456'),
  ('member-3', 'pod-test-001', 'profile-789');

-- Create test post
INSERT INTO posts (
  id,
  campaign_id,
  linkedin_post_id,
  linkedin_post_url,
  published_at
)
VALUES (
  'post-test-001',
  'campaign-test-001',
  'urn:li:activity:7234567890123456789',
  'https://www.linkedin.com/feed/update/urn:li:activity:7234567890123456789/',
  NOW()
);
```

### Environment Variables Check

Verify these are set before testing:
- `OPENAI_API_KEY` - Set with valid OpenAI API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase key

---

## Step 1: Verify Backend Is Running

**Action**: Open your browser and navigate to:
```
http://localhost:3000/api/health
```

**Expected Result**:
- Page shows `{"status":"ok"}` or similar
- No 500 or 404 errors
- Page loads instantly

**If It Fails**:
- Backend is not running
- Run `npm run dev` in the project directory
- Wait 5-10 seconds for it to start
- Try again

---

## Step 2: Test Orchestrate Post Action (Main Feature)

This is the core F-01 feature: AI decides engagement strategy for a new post.

**Action**: Open a terminal on your testing machine and run:

```bash
curl -X POST http://localhost:3000/api/agentkit/orchestrate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "action": "orchestrate_post",
    "postId": "post-test-001",
    "campaignId": "campaign-test-001",
    "podId": "pod-test-001"
  }'
```

**⚠️ OR via Browser (Using Browser DevTools Console)**:

If you don't have curl, use your browser console instead:

1. Open browser DevTools: Press `F12`
2. Go to "Console" tab
3. Paste this:

```javascript
fetch('http://localhost:3000/api/agentkit/orchestrate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'orchestrate_post',
    postId: 'post-test-001',
    campaignId: 'campaign-test-001',
    podId: 'pod-test-001'
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
```

**Expected Result**:

```json
{
  "success": true,
  "activitiesScheduled": 6,
  "strategy": {
    "shouldSchedule": true,
    "timing": "optimal",
    "engagementStrategy": {
      "likeWindow": [1, 30],
      "commentWindow": [30, 180],
      "memberSelection": "all"
    },
    "reasoning": "Post has optimal engagement conditions..."
  }
}
```

**Success Criteria**:
✅ `success: true`
✅ `activitiesScheduled` is a number > 0 (6 in this case: 3 members × 2 activities)
✅ `strategy` object has all required fields
✅ `timing` is one of: "immediate", "optimal", "delayed"
✅ `engagementStrategy` has likeWindow and commentWindow arrays

**What This Validates**:
- ✅ OpenAI API integration works
- ✅ Database queries work (campaign, pod, post, members)
- ✅ AI decision-making logic works
- ✅ Activity scheduling works
- ✅ pod_activities records created in database

**If It Fails**:
- ❌ `success: false` - Check error message
- ❌ HTTP 401 - Authentication failed
- ❌ HTTP 500 - Backend error (check logs)
- ❌ Network error - Backend not running

---

## Step 3: Verify Activities Were Created in Database

**What to Check**: The orchestration should have created 6 activities (3 likes + 3 comments)

**Action**: Run this in terminal:

```bash
curl "http://localhost:3000/api/pods/pod-test-001/activities" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Result**:

```json
{
  "activities": [
    {
      "id": "uuid-1",
      "pod_id": "pod-test-001",
      "post_id": "post-test-001",
      "member_id": "member-1",
      "engagement_type": "like",
      "status": "pending",
      "scheduled_for": "2025-11-06T07:15:00Z"
    },
    {
      "id": "uuid-2",
      "pod_id": "pod-test-001",
      "post_id": "post-test-001",
      "member_id": "member-1",
      "engagement_type": "comment",
      "status": "pending",
      "scheduled_for": "2025-11-06T07:45:00Z"
    }
    // ... 4 more activities
  ]
}
```

**Success Criteria**:
✅ 6 activities total (3 likes + 3 comments)
✅ Each has `status: "pending"`
✅ Each has `scheduled_for` timestamp in future
✅ Likes scheduled 1-30 minutes from now
✅ Comments scheduled 30-180 minutes from now
✅ All have correct `post_id` and `pod_id`

---

## Step 4: Test Optimize Message Action

This tests the AI's ability to improve message copy for better engagement.

**Action**: In browser console, run:

```javascript
fetch('http://localhost:3000/api/agentkit/orchestrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'optimize_message',
    campaignId: 'campaign-test-001',
    messageType: 'dm_initial',
    originalMessage: 'Hi, I have a framework that helps with scaling.',
    goal: 'engagement'
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
```

**Expected Result**:

```json
{
  "success": true,
  "optimizedMessage": "Saw your comment - here's the framework that transformed our scaling process...",
  "variants": [
    "I noticed your comment - let me share the scaling framework...",
    "Your point about scaling is spot on - here's the framework..."
  ],
  "confidence": 0.87
}
```

**Success Criteria**:
✅ `success: true`
✅ `optimizedMessage` is different from original
✅ `variants` array has 2-3 alternative messages
✅ `confidence` is a number between 0 and 1 (typically 0.8-0.95)
✅ Messages are more conversational/engaging than original

**What This Validates**:
- ✅ OpenAI optimization works
- ✅ A/B variant generation works
- ✅ Confidence scoring works

---

## Step 5: Test Analyze Performance Action

This tests the AI's ability to analyze campaign performance and provide recommendations.

**Action**: In browser console, run:

```javascript
fetch('http://localhost:3000/api/agentkit/orchestrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'analyze_performance',
    campaignId: 'campaign-test-001',
    timeRange: '7d'
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
```

**Expected Result**:

```json
{
  "success": true,
  "analysis": {
    "overallScore": 78,
    "insights": [
      "Trigger rate is above benchmark (5.2% vs 3%)",
      "Comment volume growing steadily"
    ],
    "recommendations": [
      "A/B test new trigger words",
      "Increase posting frequency"
    ],
    "nextActions": [
      {
        "action": "Test SCALE vs FRAMEWORK as trigger words",
        "priority": "high",
        "reason": "Comments drive the entire funnel"
      }
    ]
  }
}
```

**Success Criteria**:
✅ `success: true`
✅ `analysis.overallScore` is a number 0-100
✅ `insights` is an array with at least 2 items
✅ `recommendations` is an array with actionable items
✅ `nextActions` includes priority levels (high/medium/low)

**What This Validates**:
- ✅ Campaign metrics retrieval works
- ✅ AI analysis logic works
- ✅ Recommendations are generated correctly

---

## Step 6: Test Generate Post Content Action

This tests AI's ability to create engaging LinkedIn posts with trigger words.

**Action**: In browser console, run:

```javascript
fetch('http://localhost:3000/api/agentkit/orchestrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'generate_post',
    campaignId: 'campaign-test-001',
    topic: 'How to scale your leadership team from 5 to 50 people'
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
```

**Expected Result**:

```json
{
  "success": true,
  "postContent": {
    "postText": "I went from managing 5 people to 50 in 2 years...\n\nComment SCALE below if you want the framework!",
    "hashtags": ["#Leadership", "#Scaling", "#CEO"],
    "bestPostingTime": "Tuesday 10am EST",
    "expectedEngagement": "high",
    "reasoning": "Hook creates curiosity, strong CTA with trigger word"
  }
}
```

**Success Criteria**:
✅ `success: true`
✅ `postContent.postText` includes the trigger word "SCALE"
✅ `hashtags` is an array of 3-5 hashtags
✅ `bestPostingTime` is a specific day/time
✅ `expectedEngagement` is "low", "medium", or "high"
✅ Post text is 150-300 words

**What This Validates**:
- ✅ Post generation works
- ✅ Trigger word placement works
- ✅ Hashtag generation works
- ✅ Timing recommendations work

---

## Step 7: Test Error Handling - Missing Required Fields

This validates the API handles errors gracefully.

**Action**: In browser console, run:

```javascript
fetch('http://localhost:3000/api/agentkit/orchestrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'orchestrate_post',
    postId: 'post-test-001'
    // Missing campaignId and podId
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
```

**Expected Result**:

```json
{
  "error": "Missing required fields: postId, campaignId, podId",
  "status": 400
}
```

**Success Criteria**:
✅ Returns HTTP 400 (bad request)
✅ Error message is clear
✅ No 500 error (graceful error handling)

**What This Validates**:
- ✅ Input validation works
- ✅ Error messages are helpful
- ✅ System doesn't crash on invalid input

---

## Step 8: Test Error Handling - Invalid Campaign

**Action**: In browser console, run:

```javascript
fetch('http://localhost:3000/api/agentkit/orchestrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'orchestrate_post',
    postId: 'post-test-001',
    campaignId: 'campaign-does-not-exist',
    podId: 'pod-test-001'
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
```

**Expected Result**:

```json
{
  "success": false,
  "activitiesScheduled": 0,
  "strategy": null,
  "error": "Campaign not found"
}
```

**Success Criteria**:
✅ Returns `success: false`
✅ Error message explains what's wrong
✅ No crash or 500 error
✅ Returns HTTP 200 (graceful handling)

---

## Step 9: Verify OpenAI API Was Actually Called

**Action**: Check browser console for logs

Press `F12` and look for console logs that show:

```
[AgentKit] Strategy for post post-test-001: {
  shouldSchedule: true,
  timing: "optimal",
  ...
}
```

**Success Criteria**:
✅ Logs show AI responses
✅ Logs show decision-making process
✅ No OpenAI API errors in logs

**What This Validates**:
- ✅ OpenAI API calls are being made
- ✅ Responses are being processed
- ✅ Logging works for debugging

---

## Step 10: Check Database Records Were Created

**What to Check**: Verify agentkit_decisions table has records

**Action**: Run this in terminal (if you have database access):

```sql
SELECT * FROM agentkit_decisions
WHERE campaign_id = 'campaign-test-001'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result**:

```
id                                    campaign_id          post_id         strategy                              created_at
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  campaign-test-001    post-test-001   {"shouldSchedule":true,...}  2025-11-06 07:05:00
```

**Success Criteria**:
✅ At least 1 record for orchestrate_post
✅ Strategy JSON stored correctly
✅ campaign_id and post_id match test data
✅ Timestamp is recent

**What This Validates**:
- ✅ Database persistence works
- ✅ Audit trail is being created
- ✅ Historical data available for analysis

---

## Final Validation Checklist

Go through this checklist to confirm everything works:

```
✅ CORE FUNCTIONALITY
[  ] Backend is running and responsive
[  ] orchestrate_post action returns success
[  ] Activities created in database (6 total)
[  ] Activity status is "pending"
[  ] Activity scheduled times are valid

✅ AI DECISION MAKING
[  ] shouldSchedule is true or false based on conditions
[  ] timing matches one of the valid options
[  ] engagementStrategy has proper windows
[  ] reasoning explains the decision

✅ MESSAGE OPTIMIZATION
[  ] optimize_message returns success
[  ] optimizedMessage is different from original
[  ] variants array has 2-3 options
[  ] confidence score is between 0 and 1

✅ PERFORMANCE ANALYSIS
[  ] analyze_performance returns success
[  ] overallScore is 0-100
[  ] insights provide actionable feedback
[  ] nextActions include priority levels

✅ POST GENERATION
[  ] generate_post returns success
[  ] postText includes trigger word
[  ] hashtags array is populated
[  ] expectedEngagement matches post quality

✅ ERROR HANDLING
[  ] Missing fields return clear error messages
[  ] Invalid IDs handled gracefully
[  ] No 500 errors or crashes
[  ] Error messages are helpful

✅ DATABASE INTEGRITY
[  ] pod_activities records created correctly
[  ] agentkit_decisions records created
[  ] Status values are valid (pending, scheduled, etc)
[  ] No orphaned records

✅ OPENAI INTEGRATION
[  ] Responses show AI decision-making
[  ] Confidence scores are reasonable
[  ] No API key errors
[  ] Responses vary (not hardcoded)

✅ PROOF OF REAL EXECUTION
[  ] Database records show actual execution
[  ] Scheduled times vary (not identical)
[  ] Strategy decisions make sense
[  ] No mock data detected
```

---

## Success Criteria Summary

**MINIMUM PASS** (Core feature works):
- ✅ orchestrate_post returns success
- ✅ Activities created in database
- ✅ AI returns valid strategy

**FULL PASS** (All features work):
- ✅ All of minimum pass
- ✅ Message optimization works
- ✅ Performance analysis works
- ✅ Post generation works
- ✅ Error handling works
- ✅ Database records created

**CRITICAL PROOF**:
- ✅ OpenAI API actually called (see logs/responses)
- ✅ Database records show real execution
- ✅ Scheduled times are calculated correctly
- ✅ No hardcoded or mocked data

---

## Test Scenarios Colm Should Try

### Scenario 1: Optimal Post Conditions
**Setup**: Create a post with good campaign history
**Expected**: `shouldSchedule: true`, `timing: "optimal"`
**Validates**: AI recognizes good conditions

### Scenario 2: Poor Campaign Conditions
**Setup**: Campaign with very few past posts or low engagement
**Expected**: `shouldSchedule: false` or `timing: "delayed"`
**Validates**: AI recognizes risky conditions

### Scenario 3: Multiple Orchestrations
**Setup**: Run orchestrate_post twice on same campaign
**Expected**: Different decisions based on changing conditions
**Validates**: Non-deterministic AI behavior (not hardcoded)

### Scenario 4: Different Message Goals
**Setup**: Test optimize_message with goal="conversion" vs goal="engagement"
**Expected**: Different messages optimized for each goal
**Validates**: Context-aware optimization

### Scenario 5: Large Pod
**Setup**: Create pod with 10+ members
**Expected**: Activities scheduled = members × 2 (likes + comments)
**Validates**: Scaling works correctly

---

## Troubleshooting

### "401 Unauthorized" Error

**Cause**: Not authenticated to Supabase
**Solution**:
1. Make sure you're logged in to the app
2. Get auth token from browser localStorage (DevTools → Application → localStorage)
3. Add header: `Authorization: Bearer {token}`

### "Campaign not found"

**Cause**: Test campaign doesn't exist
**Solution**:
1. Verify campaign-test-001 exists in database
2. Run the SQL setup from Prerequisites section
3. Use actual campaign ID from your database

### OpenAI API Errors

**Cause**: Missing or invalid API key
**Solution**:
1. Check `OPENAI_API_KEY` is set
2. Verify it's a valid key (not expired)
3. Check OpenAI account has credits

### "Activities show status: 'pending'" but should be "scheduled"

**This is normal if**:
- orchestrate_post sets status to 'pending' by design
- E-04 scheduler changes it to 'scheduled' later

### Scheduled times are too far in future

**This is normal because**:
- Like window: 1-30 minutes
- Comment window: 30-180 minutes (up to 3 hours)
- Randomized to avoid detection

---

## After Testing

If all tests pass, you've validated:

1. **F-01 Implementation**: AgentKit orchestration works correctly
2. **OpenAI Integration**: GPT-4o API calls work reliably
3. **Database Integration**: All queries and inserts work
4. **Error Handling**: Graceful error handling throughout
5. **Decision Quality**: AI makes reasonable engagement decisions
6. **Activity Scheduling**: Proper delay calculation and persistence
7. **Production Readiness**: Real endpoints ready for integration

The system is ready for:
- Integration with E-04 (scheduler - will pick up pending activities)
- Integration with E-05 (executor - will execute scheduled activities)
- Deployment to staging environment

---

## Contact & Questions

If something isn't working:
1. Check the error message carefully
2. Verify prerequisites were completed
3. Check backend logs for detailed errors
4. Ask for help with:
   - Database setup issues
   - OpenAI API configuration
   - Authentication problems

---

**Test Execution Details** (For Reference)

**API Endpoint**: `POST /api/agentkit/orchestrate`

**Supported Actions**:
- `orchestrate_post` - Main orchestration (3 required params)
- `optimize_message` - Message optimization (4 params)
- `analyze_performance` - Performance analysis (2 params)
- `generate_post` - Post generation (2 params)

**Real Functions Called**:
- `orchestratePostEngagement()` - Main orchestration
- `optimizeCampaignMessage()` - Message optimization
- `analyzeCampaignPerformance()` - Performance analysis
- `generatePostContent()` - Post generation

**Database Tables Updated**:
- `campaigns` - Read only
- `pods` - Read only
- `pod_members` - Read only
- `posts` - Read only
- `pod_activities` - **WRITE** (activities created here)
- `agentkit_decisions` - **WRITE** (decisions logged here)
- `agentkit_optimizations` - **WRITE** (optimizations stored)
- `agentkit_analyses` - **WRITE** (analyses stored)

**Test Duration**: 20-30 minutes
**Browser Required**: Yes (Chrome, Firefox, Safari, Edge all work)
**Terminal/Console Access**: Helpful but not required (can use browser console)

---

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
