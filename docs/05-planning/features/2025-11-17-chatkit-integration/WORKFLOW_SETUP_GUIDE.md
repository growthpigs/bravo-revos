# OpenAI Agent Builder Workflow Setup Guide

**Date:** 2025-11-17
**Status:** 🚨 Configuration Required
**Issue:** Workflow IDs in `.env.local` don't exist in OpenAI account

---

## 🎯 Current Situation

**Your Code:** ✅ Working perfectly (all 3 blockers resolved)
**Problem:** Workflow IDs in environment variables don't exist in OpenAI Agent Builder
**Error:** `"Workflow with id 'wf_691add48...' not found"`

**Current Workflow IDs:**
```bash
TOPIC_GENERATION_WORKFLOW_ID=wf_691add48a50881908ddb38929e401e7e0c39f3da1d1ca993
POST_GENERATION_WORKFLOW_ID=wf_691ae10f742c819099472795dc6995a7062240a5334648ba
```

---

## Step 1: Check OpenAI Agent Builder

### Access Your Agent Builder Dashboard

**URL:** https://platform.openai.com/agent-builder

**What to Look For:**
- Do you see any existing agents/workflows?
- Are there workflows named "Topic Generation" or "Post Writer"?
- If yes, are they **published** (deployed)?
- If yes, copy their actual workflow IDs

### Verify Organization/Project

**CRITICAL:** The API key and workflows must be in the same organization and project.

1. Check your API key's organization:
   - Go to https://platform.openai.com/settings/organization
   - Note your organization name and ID

2. Check Agent Builder organization:
   - In Agent Builder, verify you're in the same organization
   - Top-right corner should show organization name

3. **If organizations don't match:** Switch to the correct organization or create workflows in the API key's organization

---

## Step 2: Create Workflows (If They Don't Exist)

### Option A: Use Existing Workflows (Recommended)

If you already created these workflows in Agent Builder:

1. Go to Agent Builder dashboard
2. Find your workflows
3. Click on each workflow
4. Copy the workflow ID (starts with `wf_`)
5. Skip to Step 3 below

### Option B: Create New Workflows

If you don't have these workflows yet, here's how to create them:

---

### Workflow 1: Topic Generation

**Name:** Topic Generation
**Purpose:** Generate 4 LinkedIn topic hooks based on user's target audience

**Instructions:**
```
You are a LinkedIn content strategist. When the user provides information about their business or industry, generate 4 compelling topic hooks that would make excellent LinkedIn posts.

Each topic should:
- Be relevant to their target audience
- Be specific and actionable
- Create curiosity or provide clear value
- Be suitable for a 500-1000 word LinkedIn post

Format your response as a simple numbered list:
1. [First topic hook]
2. [Second topic hook]
3. [Third topic hook]
4. [Fourth topic hook]

Keep each hook concise (10-15 words).
```

**Model:** GPT-4 or GPT-4o
**Temperature:** 0.7-0.8 (creative but not random)

**Steps to Create:**
1. Go to https://platform.openai.com/agent-builder
2. Click "Create Agent" or "New Workflow"
3. Enter the name: "Topic Generation"
4. Paste the instructions above
5. Select GPT-4 or GPT-4o as the model
6. Set temperature to 0.7
7. **IMPORTANT:** Click "Publish" or "Deploy"
8. Copy the workflow ID (format: `wf_xxxxxxxxxxxxx`)

---

### Workflow 2: Post Writer

**Name:** Post Writer
**Purpose:** Write full LinkedIn posts from topic hooks or outlines

**Instructions:**
```
You are a professional LinkedIn content writer. When the user provides a topic or outline, write a complete, engaging LinkedIn post.

Post Structure:
- **Hook (1-2 lines):** Grab attention immediately
- **Body (3-5 paragraphs):** Deliver value, tell a story, or share insights
- **Call-to-Action:** Encourage engagement (comment, share, follow)

Style Guidelines:
- Conversational and authentic tone
- Short paragraphs (2-3 sentences max)
- Use line breaks for readability
- Include relevant emojis sparingly (1-3 per post)
- Length: 500-1000 words
- Avoid corporate jargon

Format: Plain text, ready to copy/paste into LinkedIn
```

**Model:** GPT-4 or GPT-4o
**Temperature:** 0.7-0.8

**Steps to Create:**
1. In Agent Builder, click "Create Agent" or "New Workflow"
2. Enter the name: "Post Writer"
3. Paste the instructions above
4. Select GPT-4 or GPT-4o as the model
5. Set temperature to 0.7
6. **IMPORTANT:** Click "Publish" or "Deploy"
7. Copy the workflow ID (format: `wf_xxxxxxxxxxxxx`)

---

## Step 3: Update Environment Variables

### File: `.env.local`

**Replace the existing workflow IDs with your actual IDs:**

```bash
# OpenAI Agent Builder Workflows (for ChatKit integration)
TOPIC_GENERATION_WORKFLOW_ID=wf_[YOUR_ACTUAL_TOPIC_ID]
POST_GENERATION_WORKFLOW_ID=wf_[YOUR_ACTUAL_POST_ID]

# Public workflow IDs (exposed to client for test page)
NEXT_PUBLIC_TOPIC_GENERATION_WORKFLOW_ID=wf_[YOUR_ACTUAL_TOPIC_ID]
NEXT_PUBLIC_POST_GENERATION_WORKFLOW_ID=wf_[YOUR_ACTUAL_POST_ID]
```

**IMPORTANT:** Both the private and public versions should have the SAME workflow IDs.

---

## Step 4: Restart Dev Server

```bash
# Stop the current dev server
# Press Ctrl+C in the terminal where it's running

# Start it again
npm run dev

# Server should start on port 3002
# Visit: http://localhost:3002/test-chatkit
```

---

## Step 5: Test Again

### Expected Behavior (After Valid Workflow IDs)

1. **Navigate to:** http://localhost:3002/test-chatkit

2. **Click "Topic Generation"**
   - ✅ "Initializing ChatKit..." (2-5 seconds)
   - ✅ ChatKit UI renders
   - ✅ Chat input box appears

3. **Type:** "Generate 4 LinkedIn topic hooks for a SaaS founder"
   - ✅ Message sends
   - ✅ AI responds within 10-30 seconds
   - ✅ Event log shows workflow events

4. **Click "Reset"**

5. **Click "Post Writer"**
   - ✅ Same smooth experience

6. **Type:** "Write a LinkedIn post about AI automation for small businesses"
   - ✅ Full post generated
   - ✅ Response appears in chat

---

## Troubleshooting

### Issue: "Workflow not found" persists

**Possible Causes:**
1. **Workflow not published** - Make sure you clicked "Publish" or "Deploy" in Agent Builder
2. **Wrong organization** - API key and workflows must be in same org
3. **Typo in workflow ID** - Double-check the ID you copied
4. **Workflow ID format wrong** - Should start with `wf_` followed by 40+ characters

**Debug Steps:**
```bash
# Check what ID is being sent
# Look in terminal logs for:
[ChatKit] Creating session: {
  userId: 'test-user-localhost',
  workflowId: 'wf_xxxxxxxxxxxxx',  # ← Verify this matches your workflow
  timestamp: '2025-11-17T...'
}
```

---

### Issue: ChatKit still stuck on "Initializing..."

**Possible Causes:**
1. Didn't restart dev server after updating `.env.local`
2. Browser cache (hard refresh: Cmd+Shift+R / Ctrl+Shift+F5)
3. Different issue than workflow ID

**Debug Steps:**
1. Restart dev server (Ctrl+C then `npm run dev`)
2. Hard refresh browser
3. Check browser console for errors
4. Check Network tab for 401/400 errors

---

### Issue: API Key Permissions

**Error:** "API key doesn't have access to Agent Builder"

**Solution:**
1. Verify your API key has Agent Builder access
2. Create a new API key in the correct organization
3. Update `OPENAI_API_KEY` in `.env.local`
4. Restart dev server

---

## Verification Checklist

**Before testing, verify:**

- [ ] Workflows exist in Agent Builder dashboard
- [ ] Workflows are **published/deployed** (not just saved as draft)
- [ ] Workflow IDs copied correctly (start with `wf_`)
- [ ] API key organization matches Agent Builder organization
- [ ] `.env.local` updated with correct workflow IDs
- [ ] Both private AND public env vars updated (same IDs)
- [ ] Dev server restarted after updating `.env.local`
- [ ] Browser refreshed (hard refresh if needed)

---

## Success Criteria

**You'll know it's working when:**
- ✅ ChatKit UI renders (no more stuck on "Initializing...")
- ✅ You can type messages in the chat
- ✅ Workflow executes and responds
- ✅ Event log shows workflow events
- ✅ Response appears in chat within 30 seconds

**Once working:**
- Document response structure for FloatingChatBar integration
- Test both workflows thoroughly
- Proceed with integration planning

---

## Quick Reference

**OpenAI Agent Builder:** https://platform.openai.com/agent-builder
**Organization Settings:** https://platform.openai.com/settings/organization
**API Keys:** https://platform.openai.com/api-keys

**Test Page:** http://localhost:3002/test-chatkit
**Dev Log:** `/docs/features/2025-11-17-chatkit-integration/2025-11-17-DEV-LOG.md`

---

## Next Steps After Configuration

Once workflows are working:

1. **Document Response Format**
   - What structure does ChatKit return?
   - How are events structured?
   - What's the completion signal?

2. **Plan FloatingChatBar Integration**
   - Review 2,337-line component
   - Identify integration points
   - Create realistic timeline (3-4 hours)

3. **Implement Integration**
   - Add ChatKit mode to FloatingChatBar
   - Wire up trigger detection
   - Test thoroughly

4. **Deploy to Netlify**
   - Verify domain allowlist
   - Test in production
   - Monitor with Sentry

---

**Last Updated:** 2025-11-17
**Status:** Awaiting workflow configuration
**Estimated Time to Fix:** 10-15 minutes
**Confidence:** High (code is proven working)
