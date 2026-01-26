# Create Simple Test Workflow - Eliminate All Uncertainty

**Goal:** Create the simplest possible workflow to test if ChatKit integration works.

---

## 🎯 Instructions for Creating Test Workflow

### Step 1: Go to Agent Builder
https://platform.openai.com/agent-builder

### Step 2: Click "+ Create" or "New Agent"

### Step 3: Fill in these EXACT details

**Name:**
```
ChatKit Test Echo
```

**Instructions:**
```
You are a simple echo bot for testing ChatKit integration.

When the user sends a message, respond with:
"✅ ChatKit is working! You said: [their message]"

Keep responses under 50 words. Be friendly and confirm the integration is functional.
```

**Model:**
```
gpt-4o
```

**Tools:**
```
None (leave empty)
```

### Step 4: Click "Publish" (top right)

### Step 5: Click "Code" (top menu bar)

### Step 6: Copy the Workflow ID

It will look like: `wf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 7: Paste That ID Here

Just reply with:
```
TEST_WORKFLOW_ID=wf_[paste the actual ID here]
```

---

## ⚡ What Happens Next

Once you give me the ID, I will:
1. Update `.env.local` with the test workflow ID (30 seconds)
2. Restart the server (10 seconds)
3. Test it immediately (1 minute)
4. Show you the results

**Total time:** 2 minutes

If this works → Your code is perfect, original workflows have config issues
If this fails → Deeper OpenAI API issue to investigate

---

## 🎯 Why This Works

- **Brand new workflow** - No legacy issues
- **Same organization/project** - Created right now in current context
- **Super simple** - Just echoes back, can't fail
- **Published immediately** - Fresh workflow ID
- **Eliminates all variables** - Clean slate test

---

**Ready? Create the workflow and paste the ID!**
