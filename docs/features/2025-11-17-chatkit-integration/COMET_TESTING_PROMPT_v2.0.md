# COMET TESTING PROMPT - Version 2.0

**Document Purpose:** This document contains the testing prompt for Comet browser agent.
**Version:** 2.0
**Date:** 2025-11-17
**Context:** ChatKit integration - Round 4 testing after user parameter fix

## CHANGELOG

**v2.0 (2025-11-17):**
- Fixed missing `user` parameter in OpenAI API request (commit: 30bfc9c)
- Changed from `scope.user_id` to top-level `user` parameter
- All 3 blockers now resolved:
  1. ✅ Initialization deadlock (f9b4524)
  2. ✅ Authentication bypass (954ec02)
  3. ✅ User parameter (30bfc9c)

---

<div style="border-top: 3px dashed red; margin: 20px 0;"></div>

---

# ChatKit Integration - Round 4 Testing

## Test Environment
- **URL:** http://localhost:3002/test-chatkit
- **Port:** 3002
- **Expected Status:** All blockers resolved, ChatKit should render

---

## Test Objectives

1. **Verify session creation succeeds** (no more "Missing required parameter: 'user'" error)
2. **Confirm ChatKit UI renders** (should appear within 5 seconds)
3. **Test workflow execution** (Topic Generation + Post Writer)
4. **Document response format** (what data structure does ChatKit return?)
5. **Capture event structure** (what events fire during workflow execution?)

---

## Test Procedure

### Phase 1: Session Creation Verification

**Steps:**
1. Navigate to http://localhost:3002/test-chatkit
2. Open Developer Tools (Cmd+Option+J / Ctrl+Shift+J)
3. Open **Network** tab, enable "Preserve log"
4. Open **Console** tab
5. Click **"Topic Generation"** button
6. Wait 5 seconds

**Expected Results:**
- ✅ POST `/api/chatkit/session` returns **200 OK** (not 401, not 400)
- ✅ Console shows: `[ChatKit] 🔓 Localhost detected - bypassing authentication for testing`
- ✅ Console shows: `[ChatKit] Client secret obtained successfully`
- ✅ Loading spinner appears briefly (< 5 seconds)
- ✅ ChatKit UI renders (shows OpenAI chat interface)

**If Failed:**
- Copy the full error message from Console
- Screenshot the Network request details
- Note the exact error status code

---

### Phase 2: ChatKit UI Rendering

**Steps:**
1. After clicking "Topic Generation", observe the left panel
2. Watch for the dashed border container
3. Look for OpenAI branding/chat interface

**Expected Results:**
- ✅ "Initializing ChatKit..." disappears after < 5 seconds
- ✅ ChatKit iframe/component loads
- ✅ Chat input box appears
- ✅ No error messages displayed

**What to Capture:**
- Screenshot of fully rendered ChatKit UI
- Any console logs with `[ChatKitWrapper]` prefix
- Time from button click to full render (in seconds)

---

### Phase 3: Workflow Execution Test

**Steps:**
1. Once ChatKit is loaded, type in the chat input:
   ```
   Generate 4 LinkedIn topic hooks for a SaaS founder
   ```
2. Press Enter
3. Observe the response in the chat
4. Watch the **Event Log** panel on the right side

**Expected Results:**
- ✅ Message appears in chat
- ✅ Agent starts responding (typing indicator or streaming text)
- ✅ Response completes within 10-30 seconds
- ✅ Event Log shows events like:
  - `📩 Message received: {...}`
  - `✅ Workflow complete: {...}`

**Critical Data to Capture:**
1. **Response Format:** Is it JSON array, plain text, or structured object?
2. **Response Content:** Copy the exact response (first 500 characters)
3. **Event Structure:** Copy ALL events from Event Log panel
4. **Response Time:** Seconds from Enter to complete response

**Example of what to document:**
```json
// Example response format (capture the actual structure):
{
  "type": "completion",
  "content": "Here are 4 LinkedIn hooks:\n1. ...\n2. ...",
  "metadata": { ... }
}
```

---

### Phase 4: Post Writer Workflow Test

**Steps:**
1. Click **"Reset"** button
2. Click **"Post Writer"** button
3. Wait for ChatKit to reload
4. Type: `Write a LinkedIn post about AI automation for small businesses`
5. Press Enter

**Expected Results:**
- ✅ Same session creation success as Phase 1
- ✅ ChatKit renders successfully
- ✅ Different workflow executes (Post Writer instead of Topic Generation)
- ✅ Response format documented

---

### Phase 5: Error Scenario Testing

**Steps:**
1. **Test 1: Network disconnect**
   - Enable airplane mode or disconnect network
   - Try typing a message
   - Document what happens

2. **Test 2: Rapid button clicking**
   - Click Reset
   - Rapidly click "Topic Generation" 3 times
   - Does it handle multiple requests gracefully?

3. **Test 3: Browser refresh**
   - Refresh the page (Cmd+R / Ctrl+R)
   - Click "Topic Generation" again
   - Does it reinitialize correctly?

---

## Required Deliverables

### 1. Test Status Summary

```markdown
| Phase | Status | Time | Notes |
|-------|--------|------|-------|
| Session Creation | ✅/❌ | Xms | ... |
| ChatKit UI Render | ✅/❌ | Xs | ... |
| Topic Generation | ✅/❌ | Xs | ... |
| Post Writer | ✅/❌ | Xs | ... |
| Error Scenarios | ✅/❌ | - | ... |
```

### 2. Network Requests

```markdown
**POST /api/chatkit/session**
- Status: XXX
- Response Time: XXXms
- Request Body: { ... }
- Response Body: { ... }

**Other OpenAI Requests:**
- List all requests to api.openai.com domains
- Note any CDN requests for ChatKit resources
```

### 3. Console Logs

```
[Copy ALL logs with [ChatKitWrapper] or [TEST_CHATKIT] prefix]

Example:
[11:21:30] [ChatKitWrapper] Fetching client secret...
[11:21:31] [ChatKit] 🔓 Localhost detected - bypassing authentication for testing
[11:21:32] [ChatKitWrapper] Client secret obtained successfully
```

### 4. Event Log Contents

```json
// Copy the exact events from the Event Log panel
// Example format:
[
  { "timestamp": "11:21:45", "type": "message", "data": {...} },
  { "timestamp": "11:21:50", "type": "complete", "data": {...} }
]
```

### 5. Response Structure Documentation

```json
// CRITICAL: Document the EXACT structure of workflow responses
// This is needed for FloatingChatBar integration

// Topic Generation Response Format:
{
  // Paste actual response here
}

// Post Writer Response Format:
{
  // Paste actual response here
}
```

### 6. Screenshots Required

1. **Initial page load** (before clicking button)
2. **ChatKit fully rendered** (after successful load)
3. **Topic Generation response** (showing the generated hooks)
4. **Post Writer response** (showing the generated post)
5. **Network tab** (showing successful /api/chatkit/session request)
6. **Event Log panel** (showing all events)

---

## Success Criteria

**Minimum Viable Success:**
- ✅ Session creation returns 200 OK
- ✅ ChatKit UI renders without errors
- ✅ At least one workflow executes successfully
- ✅ Response structure is documented
- ✅ Event structure is documented

**Complete Success:**
- ✅ All of the above
- ✅ Both workflows tested (Topic Generation + Post Writer)
- ✅ Error scenarios tested
- ✅ Performance metrics captured (load times, response times)

---

## Known Fixed Issues

### 1. Initialization Deadlock ✅ FIXED
**Commit:** f9b4524
**Problem:** Chicken-and-egg: component waited for session to render ChatKit, but ChatKit needed to render to create session
**Fix:** Manual getClientSecret() call in useEffect pre-fetches session
**Status:** Resolved

### 2. Authentication 401 ✅ FIXED
**Commit:** 954ec02
**Problem:** Session endpoint required Supabase login, test page had no auth
**Fix:** Localhost detection bypasses auth, uses mock user
**Status:** Resolved

### 3. Missing User Parameter ✅ FIXED
**Commit:** 30bfc9c
**Problem:** OpenAI API expected top-level `user` parameter, was sending `scope.user_id`
**Fix:** Changed to `user: user.id` at top level
**Status:** Resolved

---

## If You Encounter Errors

**Error: Still seeing "Missing required parameter: 'user'"**
- This should be fixed now
- Check server logs for the actual request body being sent
- Verify the session endpoint compiled correctly

**Error: ChatKit stuck on "Initializing..."**
- Check Console for errors
- Check Network tab for failed CDN requests
- Look for WebSocket connection failures

**Error: Session creation fails**
- Copy the full error message
- Check the request/response in Network tab
- Verify OpenAI API key is configured in .env.local

**Error: Workflow doesn't execute**
- Check that workflow IDs are correct in .env.local
- Verify Agent Builder workflows are published
- Check domain allowlist in OpenAI settings

---

## Post-Testing Actions

**After successful test:**
1. Document findings in CHATKIT_API_OBSERVATIONS.md
2. Share response structure with development team
3. Plan FloatingChatBar integration based on actual behavior

**If test fails:**
1. Report exact error messages
2. Provide Network tab screenshots
3. Include Console logs
4. Development team will debug and create v2.1 prompt

---

<div style="border-bottom: 3px dashed red; margin: 20px 0;"></div>

---

## METADATA (Not for Comet)

**Last Updated:** 2025-11-17
**Commit:** 30bfc9c
**Branch:** feat/chatkit-integration
**Dev Server:** Port 3002
**Expected Test Duration:** 15-20 minutes
