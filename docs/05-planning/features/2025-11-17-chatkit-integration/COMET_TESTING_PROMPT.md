# Comet Browser Testing Prompt - ChatKit Integration

## 🔄 UPDATE (2025-11-17 - Round 3)

**FIXES APPLIED:**
1. ✅ **Initialization deadlock FIXED** (Commit: f9b4524)
   - ChatKit no longer stuck on "Initializing..."
   - Component now pre-fetches client_secret before rendering
2. ✅ **Authentication bypass ADDED** (Commit: 954ec02)
   - Localhost no longer requires Supabase login
   - Session endpoint detects localhost and uses mock user
   - Look for log: `[ChatKit] 🔓 Localhost detected - bypassing authentication for testing`

**EXPECTED BEHAVIOR NOW:**
- Click "Topic Generation" → ChatKit should render (no more 401 errors)
- Session creation should succeed with 200 OK
- ChatKit UI should appear within 5 seconds

---

## Objective
Test the ChatKit integration on the test page and document all findings, including errors, network requests, and behavior.

## Environment
- **URL:** http://localhost:3002/test-chatkit
- **Port:** 3002 (dev server must be running)
- **Project:** bravo-revos (ChatKit integration test)

---

## Test Instructions

### Phase 1: Initial Page Load

**Step 1.1:** Navigate to test page
```
http://localhost:3002/test-chatkit
```

**Step 1.2:** Open Developer Tools
- Press `Cmd+Option+J` (Mac) or `Ctrl+Shift+J` (Windows)
- Switch to **Network** tab
- Check "Preserve log" checkbox
- Filter by: "All" (show all requests)

**Step 1.3:** Document initial page state
- Screenshot the page
- Note any errors in console
- Check if page loads successfully

---

### Phase 2: Session Creation Test

**Step 2.1:** Click "Topic Generation" button
- Wait 3 seconds for response
- Observe the ChatKit component area (dashed border box on left)

**Step 2.2:** Monitor Network Tab
Look for this request:
```
POST /api/chatkit/session
```

**Step 2.3:** Check session request details
- Click on the `/api/chatkit/session` request in Network tab
- Go to "Response" tab
- Document the response:
  - Status code: ___
  - Response body: (copy JSON)
  - Time: ___ ms

**Step 2.4:** Check for errors
- If status is 4xx or 5xx, copy the error message
- Check Console tab for `[ChatKitWrapper]` logs
- Look for authentication errors

**Expected behaviors:**

✅ **Success:**
- Status 200
- Response contains `client_secret` and `expires_after`
- ChatKit component loads (shows OpenAI chat interface)

❌ **Failure:**
- Status 401: Authentication failed (Supabase issue)
- Status 500: Server error (OpenAI API issue)
- Status 400: Bad request (workflow ID or config issue)

---

### Phase 3: ChatKit Component Loading

**Step 3.1:** Observe ChatKit loading state
After clicking "Topic Generation", watch the left panel for:
- "Initializing ChatKit..." message
- Loading spinner
- ChatKit UI appearing

**Step 3.2:** Check for ChatKit CDN requests
In Network tab, look for requests to:
- `openai.com` or `chatkit` domains
- JavaScript/CSS files being loaded
- WebSocket connections

**Step 3.3:** Monitor console for errors
Filter console by: `TEST_CHATKIT`
Look for logs:
```
[ChatKitWrapper] Fetching client secret...
[ChatKitWrapper] Client secret obtained successfully
[ChatKitWrapper] Initializing with workflow: wf_691add48...
```

**Step 3.4:** Document loading time
- Time from button click to ChatKit visible: ___ seconds
- If stuck on "Initializing" for > 10 seconds: **FAILURE**

**Common issues:**
- CORS errors: Domain not allowlisted in OpenAI
- 404 on ChatKit CDN: Package issue
- Stuck initializing: Session creation failed silently

---

### Phase 4: Workflow Execution Test

**Step 4.1:** Wait for ChatKit to fully load
- Should see a chat input box
- Should see OpenAI branding/interface

**Step 4.2:** Type a message
In the ChatKit input, type:
```
Generate 4 LinkedIn topic hooks for a SaaS founder
```

**Step 4.3:** Press Enter and observe
- Does message appear in chat?
- Does agent start typing?
- Does response stream in?
- Time to first response: ___ seconds

**Step 4.4:** Check Event Log panel (right side)
- Should show events like:
  ```
  [HH:MM:SS] 📩 Message received: {...}
  [HH:MM:SS] ✅ Workflow complete: {...}
  ```

**Step 4.5:** Check Network tab for OpenAI requests
Look for:
- Requests to `api.openai.com`
- ChatKit sessions or completions endpoints
- Status codes

**Step 4.6:** Document the response
- Format: (JSON array / plain text / streaming)
- Content: (copy the response)
- Structure: (note the data format)

**Expected workflow response:**
```json
// Might be:
["Hook 1", "Hook 2", "Hook 3", "Hook 4"]

// Or:
{
  "type": "completion",
  "content": "Here are 4 hooks:\n1. ...\n2. ..."
}
```

---

### Phase 5: Error Scenarios

**Step 5.1:** Test with Post Writer workflow
- Click "Reset" button
- Click "Post Writer" button
- Repeat Phase 2-4 observations

**Step 5.2:** Test error handling
- Disconnect network (airplane mode)
- Try typing a message
- Document what happens

**Step 5.3:** Check for memory leaks
- Click Reset multiple times
- Click workflow buttons multiple times
- Does app slow down or crash?

---

## What to Document

### Critical Information Needed:

**1. Session Creation:**
```
Status code: ___
Response time: ___ ms
Client secret format: (first 20 chars)
Error (if any): ___
```

**2. ChatKit Loading:**
```
Does ChatKit render? Yes/No
Loading time: ___ seconds
Stuck on initializing? Yes/No
CDN requests successful? Yes/No
```

**3. Workflow Execution:**
```
Does workflow execute? Yes/No
Response time: ___ seconds
Response format: ___
Response structure: (paste JSON)
```

**4. Console Errors:**
```
Copy ALL errors from console, especially:
- [ChatKitWrapper] errors
- [TEST_CHATKIT] errors
- CORS errors
- Network errors
- React errors
```

**5. Network Requests:**
```
List ALL requests to:
- /api/chatkit/session
- openai.com domains
- chatkit CDN resources
```

---

## Screenshots to Capture

1. Initial page load (before clicking button)
2. After clicking "Topic Generation" (loading state)
3. ChatKit loaded (if it loads)
4. Network tab showing /api/chatkit/session request
5. Console showing errors (if any)
6. Event Log panel with events (if any)
7. Workflow response (if it executes)

---

## Expected Issues (Known Problems)

### Issue: Stuck on "Initializing ChatKit..." ✅ FIXED

**Status:** ✅ Resolved in commit f9b4524

**What was wrong:**
- Chicken-and-egg problem: Component waited for session before rendering ChatKit, but ChatKit needed to render to call getClientSecret

**How it was fixed:**
- Added manual `getClientSecret()` call in useEffect
- Component now pre-fetches session before rendering ChatKit
- Loading state properly transitions to ChatKit UI

**Expected behavior now:**
- "Initializing ChatKit..." should appear for < 5 seconds
- Then ChatKit UI should render successfully
- No more infinite loading state

### Issue: 401 Unauthorized ✅ FIXED

**Status:** ✅ Resolved in commit 954ec02

**What was wrong:**
- Session endpoint required Supabase authentication
- Test page had no login flow
- All requests returned 401 Unauthorized

**How it was fixed:**
- Added localhost detection in session endpoint
- Localhost requests bypass Supabase auth
- Uses mock user `{ id: 'test-user-localhost' }` for dev testing
- Production still requires full authentication (secure)

**Expected behavior now:**
- `/api/chatkit/session` should return 200 OK on localhost
- Look for log: `[ChatKit] 🔓 Localhost detected - bypassing authentication for testing`
- Session should be created successfully

### Issue: 400 Bad Request

**Symptoms:**
- `/api/chatkit/session` returns 400
- Error about workflow ID or configuration

**Possible causes:**
1. Workflow ID incorrect
2. OpenAI API key missing
3. Request body malformed

**Debug steps:**
- Check workflow IDs in .env.local
- Verify OpenAI API key is set
- Check request body in Network tab

---

## Success Criteria

**Minimum viable test:**
- ✅ Page loads without errors
- ✅ Button click triggers session request
- ✅ Session request returns 200 + client_secret
- ✅ ChatKit component renders (shows UI)
- ✅ Can type message in ChatKit
- ✅ Workflow executes and returns response
- ✅ Response appears in Event Log

**If ANY of these fail, document the failure point.**

---

## Reporting Format

**After testing, provide this information:**

```markdown
## ChatKit Integration Test Results

### Test Date: [DATE/TIME]
### Tester: Comet Browser Agent

---

### Phase 1: Page Load
- Status: ✅ Success / ❌ Failed
- Notes: ___

### Phase 2: Session Creation
- Status: ✅ Success / ❌ Failed
- Response code: ___
- Response time: ___ ms
- Client secret received: Yes/No
- Errors: ___

### Phase 3: ChatKit Loading
- Status: ✅ Success / ❌ Failed
- Loading time: ___ seconds
- Component rendered: Yes/No
- Stuck on initializing: Yes/No
- Errors: ___

### Phase 4: Workflow Execution
- Status: ✅ Success / ❌ Failed
- Workflow executed: Yes/No
- Response time: ___ seconds
- Response format: ___
- Response data: (paste sample)
- Errors: ___

---

### Console Errors (Copy All)
```
[Paste all errors here]
```

### Network Requests (Key ones)
```
POST /api/chatkit/session - Status: ___ - Time: ___ ms
[Other important requests]
```

### Screenshots
[Attach numbered screenshots]

---

### Critical Findings
[Summarize the most important discoveries]

### Blockers
[List anything preventing the integration from working]

### Recommendations
[What needs to be fixed]
```

---

## Additional Context

**What we're testing:**
- This is a new ChatKit integration for bravo-revos
- Previous developer built infrastructure but never tested it
- We need to verify if ChatKit actually connects to OpenAI
- We need to understand the response format
- Results will determine if FloatingChatBar integration is feasible

**Why this matters:**
- FloatingChatBar is 2,337 lines and complex
- We can't integrate until we know ChatKit works
- This test will reveal architectural issues early
- 20 minutes of testing saves 4+ hours of debugging

**Current known state:**
- Dev server running on port 3002
- Test page exists at /test-chatkit
- Session endpoint implemented
- ChatKitWrapper component created
- Environment configured with workflow IDs

**What we don't know:**
- Does ChatKit actually connect?
- What data structure does it return?
- What events fire when?
- Does the session token work?
- Is the domain allowlisted correctly?

---

**Ready to test? Visit:** `http://localhost:3002/test-chatkit`
