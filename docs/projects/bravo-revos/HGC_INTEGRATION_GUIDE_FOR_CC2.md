# HGC Phase 2 Integration Guide for CC2
**Quick Start for Floating Chat Bar Integration**

---

## API Endpoint

**POST** `/api/hgc`

**Authentication**: Required (Supabase session-based)

---

## Request Format

```typescript
POST /api/hgc
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Remember that I prefer posting at 2pm EST" },
    { "role": "assistant", "content": "I've saved your preference..." },
    { "role": "user", "content": "What time do I like to post?" }
  ]
}
```

**Required Fields:**
- `messages`: Array of conversation history
- Each message needs `role` ("user" or "assistant") and `content` (string)

**Validation:**
- Max 100 messages
- Max 10,000 characters per message
- Roles must be "user" or "assistant"

---

## Response Format

**Streaming Text Response**

The API streams the response word-by-word as `text/plain`:

```typescript
const response = await fetch('/api/hgc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages })
})

// Read stream
const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  // Append chunk to UI
}
```

---

## Key Features (What Makes This Special)

### 1. **Persistent Memory (Mem0)**
- User says: "Remember my posting time is 2pm"
- Hard refresh the page
- User asks: "What's my posting time?"
- **Agent remembers** across sessions! 🧠

### 2. **Conversation History**
- Pass full `messages` array - agent uses context
- Same-chat recall is instant
- Cross-session recall uses Mem0 (takes ~30s to index)

### 3. **6 RevOS Tools Available**
Agent can call these automatically:
- `get_campaign_metrics()` - View campaign data
- `analyze_pod_engagement()` - Pod performance
- `get_linkedin_performance()` - LinkedIn metrics
- `create_campaign()` - Draft campaigns (safe)
- `schedule_post()` - Queue posts for review (safe)
- `analyze_campaign_performance()` - Deep analytics

---

## Example Integration

```typescript
'use client'

import { useState } from 'react'

export function FloatingChatBar() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/hgc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      // Read streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMessage = { role: 'assistant', content: '' }
      setMessages(prev => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        assistantContent += chunk

        // Update assistant message in place
        setMessages(prev =>
          prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          )
        )
      }
    } catch (err) {
      console.error('HGC Error:', err)
      // Handle error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Your UI here */}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  )
}
```

---

## Error Handling

**Common Errors:**

1. **401 Unauthorized** - User not logged in
   ```typescript
   if (response.status === 401) {
     // Redirect to login
     router.push('/auth/login')
   }
   ```

2. **400 Bad Request** - Invalid messages format
   - Check message structure
   - Verify roles are "user" or "assistant"
   - Check content length

3. **500 Server Error** - Python orchestrator error
   - Check server logs: `tail -f /tmp/bravo-dev.log`
   - Look for `[HGC_API]` or `[ORCHESTRATOR]` logs

---

## Testing Tips

### 1. **Test Memory Persistence**
```
1. Type: "Remember my lucky number is 73"
2. Wait for response
3. Hard refresh page (clear conversation)
4. Type: "What's my lucky number?"
5. Should respond: "Your lucky number is 73"
```

### 2. **Test Conversation Context**
```
1. Type: "I prefer posting at 2pm"
2. Type: "What time do I like to post?"
3. Should recall from same conversation
```

### 3. **Test Tools (Optional)**
```
Type: "What campaigns am I running?"
Agent should call get_campaign_metrics() tool
```

---

## Debugging

**Server Logs:**
```bash
tail -f /tmp/bravo-dev.log | grep -E "HGC_API|ORCHESTRATOR|MEM0_TOOL"
```

**Health Check:**
```bash
curl http://localhost:3000/api/hgc
# Should return: {"status":"ok","service":"Holy Grail Chat","version":"2.0.0-phase2",...}
```

**Python Debug Logs:**
Check stderr output in logs - shows:
- `[ORCHESTRATOR]` - Message processing
- `[MEM0_TOOL]` - Memory operations (save/search)
- Tool calls and results

---

## Important Notes

1. **Authentication Required**: API checks for authenticated Supabase user
2. **Streaming Only**: Response is streamed word-by-word, not JSON
3. **Memory Scoping**: Memories are isolated by `pod::user_id` (automatic)
4. **Safety Controls**: All write tools (create_campaign, schedule_post) create DRAFT/QUEUED items only

---

## What You DON'T Need to Worry About

- ✅ Memory management (handled by Mem0)
- ✅ Tool calling (agent decides automatically)
- ✅ User scoping (automatic per authenticated user)
- ✅ Conversation context (just pass full messages array)
- ✅ Error recovery (cleanup and validation built-in)

---

## Quick Migration from Old Chat

**Old Component**: `/components/hgc-chat.tsx`
**Your Component**: `/components/chat/FloatingChatBar.tsx`

**What to Copy:**
1. `handleSubmit` function (lines 26-124 in hgc-chat.tsx)
2. Streaming logic (lines 80-118)
3. Message state management

**What to Change:**
1. Your UI/styling (floating bar vs corner chat)
2. Open/close behavior
3. Position/layout

**What Stays the Same:**
- API endpoint (`/api/hgc`)
- Request format
- Response streaming
- Message structure

---

## Need Help?

**Check these files:**
- `/components/hgc-chat.tsx` - Reference implementation
- `/app/api/hgc/route.ts` - API route code
- `/docs/projects/bravo-revos/HGC_PHASE2_REFACTORING_SITREP_2025-11-09.md` - Full technical details

**Test it first:**
```bash
# The old chat component still works for testing
# Compare behavior to make sure your integration matches
```

---

**TL;DR**: POST to `/api/hgc` with `messages` array, read streaming response word-by-word. Agent has memory and tools. Just copy the streaming logic from `hgc-chat.tsx` and you're good! 🚀
