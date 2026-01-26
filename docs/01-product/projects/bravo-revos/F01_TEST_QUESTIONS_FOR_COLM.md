# F-01 Testing Questions for Colm

**Feature**: F-01 - AgentKit Campaign Orchestration
**Tester**: Colm
**Duration**: 20-30 minutes
**Setup**: See COMET_F01_TESTING_PROMPT.md for detailed instructions

---

## Quick Validation Questions

### 1. CORE FEATURE - Orchestrate Post

**Question**: When I orchestrate a new post, does the AI make a scheduling decision?

**Test**:
```
POST /api/agentkit/orchestrate
{
  "action": "orchestrate_post",
  "postId": "post-test-001",
  "campaignId": "campaign-test-001",
  "podId": "pod-test-001"
}
```

**Expected Answers**:
- ✅ Gets `success: true`
- ✅ AI returns `shouldSchedule` (true or false)
- ✅ AI explains `timing` ("immediate", "optimal", or "delayed")
- ✅ AI provides `engagementStrategy` with like/comment windows
- ✅ Activities appear in database (6 total for 3 members)

**Your Question to Answer**:
- "Does the response show the AI is making intelligent decisions, or does it look hardcoded?"

---

### 2. ACTIVITY SCHEDULING - Check Database

**Question**: Are activities actually created with the right timing?

**Test**: Query database or check API response

**Expected Answers**:
- ✅ 3 like activities created (scheduled 1-30 min from now)
- ✅ 3 comment activities created (scheduled 30-180 min from now)
- ✅ Status is "pending" (not "scheduled" - E-04 will change it)
- ✅ Times vary (not all identical - that's good!)
- ✅ Each has correct post_id and member_id

**Your Question to Answer**:
- "Do the scheduled times make sense? (Likes soon, comments later = good engagement pattern)"

---

### 3. AI MESSAGE OPTIMIZATION

**Question**: Can the AI improve message copy?

**Test**:
```
POST /api/agentkit/orchestrate
{
  "action": "optimize_message",
  "campaignId": "campaign-test-001",
  "messageType": "dm_initial",
  "originalMessage": "Hi, I have a framework that helps with scaling.",
  "goal": "engagement"
}
```

**Expected Answers**:
- ✅ `success: true`
- ✅ `optimizedMessage` is noticeably better than original
- ✅ Returns 2-3 A/B `variants` to test
- ✅ `confidence` score is 0.8 or higher

**Your Question to Answer**:
- "Does the optimized message sound like something a real person would send?"
- "Are the A/B variants actually different, or just rewording?"

---

### 4. PERFORMANCE ANALYSIS

**Question**: Does the AI provide useful campaign insights?

**Test**:
```
POST /api/agentkit/orchestrate
{
  "action": "analyze_performance",
  "campaignId": "campaign-test-001",
  "timeRange": "7d"
}
```

**Expected Answers**:
- ✅ `success: true`
- ✅ `overallScore` is 0-100
- ✅ At least 2 `insights` that are specific
- ✅ At least 2 `recommendations` that are actionable
- ✅ `nextActions` include priority levels (high/medium/low)

**Your Question to Answer**:
- "Do the insights seem relevant to our campaign?"
- "Would you actually follow these recommendations?"
- "Are they generic or specific to our test data?"

---

### 5. POST GENERATION

**Question**: Can the AI write LinkedIn posts with our trigger word?

**Test**:
```
POST /api/agentkit/orchestrate
{
  "action": "generate_post",
  "campaignId": "campaign-test-001",
  "topic": "How to scale your leadership team"
}
```

**Expected Answers**:
- ✅ `success: true`
- ✅ `postText` includes trigger word "SCALE"
- ✅ Post is 150-300 words (engaging length)
- ✅ Has 3-5 relevant hashtags
- ✅ Suggests best posting time
- ✅ Predicts engagement level (low/medium/high)

**Your Question to Answer**:
- "Would you publish this post as-is, or does it need editing?"
- "Is the hook compelling? Would it make people comment?"
- "Does the CTA with trigger word feel natural?"

---

### 6. ERROR HANDLING - Missing Fields

**Question**: Does the system handle errors gracefully?

**Test**:
```
POST /api/agentkit/orchestrate
{
  "action": "orchestrate_post",
  "postId": "post-test-001"
  // Missing campaignId and podId
}
```

**Expected Answers**:
- ✅ Gets clear error message
- ✅ Error message says what's missing
- ✅ HTTP 400 (bad request), NOT 500 (crash)
- ✅ No stack trace or internal errors exposed

**Your Question to Answer**:
- "Is the error message helpful enough to fix the problem?"

---

### 7. ERROR HANDLING - Invalid Data

**Question**: Does the system handle bad data gracefully?

**Test**:
```
POST /api/agentkit/orchestrate
{
  "action": "orchestrate_post",
  "postId": "post-test-001",
  "campaignId": "campaign-does-not-exist",
  "podId": "pod-test-001"
}
```

**Expected Answers**:
- ✅ `success: false`
- ✅ Error message is clear ("Campaign not found")
- ✅ No crash or 500 error
- ✅ Response is still HTTP 200 or 400 (graceful)

**Your Question to Answer**:
- "Does the error make sense? Would you know what to fix?"

---

### 8. DATABASE - Decisions Logged

**Question**: Is the AI's decision-making being tracked?

**Test**: Check `agentkit_decisions` table

**Expected Answers**:
- ✅ Records exist for each orchestrate_post call
- ✅ Strategy JSON is stored correctly
- ✅ `decision_type` is "engagement_strategy"
- ✅ `activities_scheduled` count matches reality
- ✅ Timestamps are recent

**Your Question to Answer**:
- "Could you audit what decisions the AI made in the past?"

---

### 9. REALNESS CHECK - Not Mocked

**Question**: Is this using REAL OpenAI API, not test data?

**Evidence to Look For**:
- ✅ Responses vary between calls (not identical)
- ✅ Responses include reasoning that makes sense
- ✅ Confidence scores vary (0.78, 0.85, 0.92, etc - not all 0.9)
- ✅ Messages are different based on input (context-aware)
- ✅ Console shows actual API calls being made

**Your Question to Answer**:
- "Does this feel like real AI, or like hardcoded test data?"
- "Can you see evidence of OpenAI being called?"

---

### 10. PRODUCTION READINESS

**Question**: Is this ready for staging?

**Test Everything Above**, then answer:

**Your Questions to Answer**:
- "Did all 10 tests pass?"
- "Are there any error messages?"
- "Did any crashes occur?"
- "Does it feel slow or fast?"
- "Would you feel comfortable demoing this to a client?"
- "What would break if you ran this 100 times?"

---

## Decision Matrix

Use this to decide if F-01 is ready:

| Aspect | ✅ Pass | ❌ Fail |
|--------|--------|--------|
| **Core Feature** | orchestrate_post succeeds | orchestrate_post fails |
| **Database** | Activities created correctly | Activities missing or wrong |
| **AI Quality** | Decisions seem intelligent | Decisions seem random/generic |
| **Optimization** | Messages noticeably better | Messages barely changed |
| **Analysis** | Insights are specific & useful | Insights are generic |
| **Post Gen** | Posts have personality & trigger word | Posts are bland/missing trigger word |
| **Error Handling** | Clear, helpful error messages | Confusing or cryptic errors |
| **Logging** | Decisions tracked in database | No audit trail |
| **Performance** | Response in <2 seconds | Response takes >5 seconds |
| **Stability** | No crashes, consistent results | Crashes or inconsistent |

**PASS CRITERIA**: All rows show ✅ Pass

**READY FOR STAGING** if:
- 9/10 rows are ✅ Pass
- Any ❌ Fail is non-critical
- Overall impression: "This could go to staging"

---

## Testing Checklist for Colm

Before you start:
- [ ] Database setup complete (see COMET_F01_TESTING_PROMPT.md)
- [ ] Backend running (`npm run dev`)
- [ ] You have access to browser console (F12)
- [ ] Optional: Terminal/curl available

During testing:
- [ ] Question 1: Orchestrate Post - PASS / FAIL
- [ ] Question 2: Activity Scheduling - PASS / FAIL
- [ ] Question 3: Message Optimization - PASS / FAIL
- [ ] Question 4: Performance Analysis - PASS / FAIL
- [ ] Question 5: Post Generation - PASS / FAIL
- [ ] Question 6: Error Handling (Missing) - PASS / FAIL
- [ ] Question 7: Error Handling (Invalid) - PASS / FAIL
- [ ] Question 8: Database Logging - PASS / FAIL
- [ ] Question 9: Realness Check - PASS / FAIL
- [ ] Question 10: Production Readiness - PASS / FAIL

After testing:
- [ ] Document any failures
- [ ] Screenshot errors if they occur
- [ ] Note performance observations
- [ ] Give overall recommendation: Ready / Needs Work / Not Ready

---

## What to Do If Something Fails

### If orchestrate_post fails:
1. Check error message
2. Verify test data exists (campaign, pod, post, members)
3. Check OpenAI API key is valid
4. Check backend logs for detailed error

### If activities aren't created:
1. Query pod_activities table directly
2. Check status in agentkit_decisions
3. Verify pod has members
4. Check for database errors in backend logs

### If AI response is nonsensical:
1. This might actually be OK (AI can be unpredictable)
2. Try the same test again (should get different response)
3. If IDENTICAL response each time = hardcoded (BAD)
4. If DIFFERENT response = real AI (GOOD)

### If error messages are unclear:
1. Check browser console (F12) for more details
2. Check backend logs
3. This is a quality issue but not a blocker

### If it's very slow (>5 seconds):
1. OpenAI API might be slow
2. Database might be slow
3. Check network in browser DevTools
4. This might be acceptable depending on cause

---

## Important Notes for Colm

1. **The AI might surprise you**: GPT-4o is smart. If responses seem odd, that might be the AI being creative (not a bug).

2. **Responses should vary**: Each time you call orchestrate_post, the AI might suggest slightly different timing or strategy. That's GOOD (means it's not mocked).

3. **Confidence scores**: Optimization might have confidence 0.75 one time, 0.89 the next. That's normal. If it's ALWAYS 0.85 exactly, that's suspicious.

4. **Timing is random**: Like delays 1-30 min, comment delays 30-180 min. Don't expect them to be identical.

5. **Database delays**: Sometimes it takes 1-2 seconds to write to database. That's acceptable.

6. **This is real**: We're not testing a mockup. Real OpenAI API calls = real usage = real costs. We have budget for this.

---

## Questions for You

After you test, please answer:

1. **Overall Impression**: Does F-01 feel "production ready"?
2. **Best Part**: What worked best?
3. **Weakest Part**: What could be improved?
4. **Confidence Level**: On a scale 1-10, how confident would you be demoing this?
5. **Blockers**: Is there anything that would prevent staging deployment?
6. **Recommendations**: Any changes you'd suggest before going live?

---

**Test Document**: COMET_F01_TESTING_PROMPT.md (detailed step-by-step guide)
**Duration**: 20-30 minutes
**Difficulty**: Medium (technical, but well-documented)

**Questions?** Ask and we'll help clarify!

---

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
