# TypeScript Migration Plan

**Mission:** Kill Python backend, migrate to AgentKit TypeScript SDK

**Date:** 2025-11-10
**Author:** Cord (CTO)
**Status:** Ready to execute

---

## What We're Building

Single Next.js API route at `/app/api/hgc/route.ts` containing:

1. **AgentKit TypeScript agent** (import from `@openai/agent-kit`)
2. **Mem0 client** (import from `mem0ai`)
3. **Tools** that query Supabase directly using service role key
4. **Streaming response** back to frontend

---

## Tools Needed (6 total)

### Business Data Tools (5):
1. **get_all_campaigns()**
   - Direct Supabase query: `SELECT * FROM campaigns WHERE client_id = ?`
   - Returns: List of campaigns with metrics

2. **get_campaign_by_id(campaign_id: string)**
   - Direct Supabase query: `SELECT * FROM campaigns WHERE id = ?`
   - Returns: Single campaign with detailed metrics

3. **create_campaign(name, voice_id, description)**
   - Direct Supabase insert: `INSERT INTO campaigns (...) VALUES (...)`
   - Status: `draft`
   - Returns: Created campaign object

4. **schedule_post(content, time, campaign_id)**
   - Direct Supabase insert: `INSERT INTO post_queue (...) VALUES (...)`
   - Returns: Scheduled post confirmation

5. **analyze_campaign_performance(campaign_id)**
   - Multiple Supabase queries for metrics
   - Returns: Analytics data

### Memory Tools (2):
6. **search_memory(query: string)**
   - Mem0 API: `mem0.search(query, filters={user_id})`
   - Returns: List of relevant memories

7. **save_memory(content: string)**
   - Mem0 API: `mem0.add(content, user_id)`
   - Returns: Confirmation

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (FloatingChatBar.tsx)                          │
│   └─ POST /api/hgc { message, user_id, pod_id }        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ /app/api/hgc/route.ts (Next.js API Route)              │
│                                                         │
│   1. Get authenticated user (Supabase auth)            │
│   2. Initialize AgentKit agent with tools              │
│   3. Process message                                    │
│   4. Stream response back                               │
└──────────────────────┬─────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│ Supabase Direct  │        │ Mem0 API         │
│ (service role)   │        │ (mem0ai client)  │
│                  │        │                  │
│ - campaigns      │        │ - search_memory  │
│ - post_queue     │        │ - save_memory    │
│ - leads          │        │                  │
│ - posts          │        └──────────────────┘
└──────────────────┘
```

---

## Implementation Steps

### Step 1: Install Dependencies
```bash
cd /Users/rodericandrews/Obsidian/Master/_projects/bravo-revos
npm install @openai/agent-kit mem0ai
```

### Step 2: Create `/app/api/hgc/route.ts`

**Structure:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { Agent } from '@openai/agent-kit'
import { MemoryClient } from 'mem0ai'

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Initialize tools with Supabase service role key
  const tools = [
    get_all_campaigns_tool(supabase),
    get_campaign_by_id_tool(supabase),
    create_campaign_tool(supabase),
    schedule_post_tool(supabase),
    analyze_campaign_performance_tool(supabase),
    search_memory_tool(mem0Client, user.id),
    save_memory_tool(mem0Client, user.id)
  ]

  // 3. Create agent
  const agent = new Agent({
    name: "RevOS Intelligence",
    instructions: `...`,
    tools: tools,
    model: "gpt-4o"
  })

  // 4. Process and stream
  const stream = await agent.run(message)
  return new Response(stream)
}
```

### Step 3: Tool Implementation

**Example: get_all_campaigns**
```typescript
function get_all_campaigns_tool(supabase) {
  return {
    name: "get_all_campaigns",
    description: "Get ALL campaigns for current user with basic metrics",
    parameters: {}, // No parameters needed
    handler: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          description,
          status,
          created_at
        `)
        .eq('client_id', user.client_id)

      if (error) throw error
      return { success: true, campaigns: data, count: data.length }
    }
  }
}
```

### Step 4: Delete Python Backend

```bash
# Remove Python backend entirely
rm -rf /Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/packages/holy-grail-chat/

# Remove from deployment configs
# Edit render.yaml, package.json, etc.
```

### Step 5: Update Frontend

**Change in FloatingChatBar.tsx:**
```typescript
// BEFORE:
const response = await fetch('http://localhost:8000/chat', { ... })

// AFTER:
const response = await fetch('/api/hgc', { ... })
```

### Step 6: Test

```bash
# Start dev server
npm run dev

# Test queries:
# - "show my campaigns"
# - "create a campaign called Test"
# - "remember my favorite color is blue"
# - "what's my favorite color?"
```

---

## Testing Checklist

- [ ] Auth works (user identification)
- [ ] get_all_campaigns returns real data
- [ ] get_campaign_by_id works with campaign ID
- [ ] create_campaign creates draft campaign
- [ ] schedule_post adds to post_queue
- [ ] search_memory retrieves past conversations
- [ ] save_memory persists new information
- [ ] Streaming response works in UI
- [ ] Agent calls tools proactively
- [ ] Response time < 3 seconds

---

## References

**AgentKit TypeScript:**
- https://github.com/openai/openai-agents-sdk
- TypeScript examples and documentation

**Mem0 + AgentKit:**
- https://docs.mem0.ai/integrations/openai-agents-sdk
- Integration guide

**Supabase TypeScript:**
- https://supabase.com/docs/reference/javascript/select
- Direct database queries

---

## Risks and Mitigation

**Risk:** AgentKit TypeScript SDK might have different API than Python
**Mitigation:** Follow official examples, adapt as needed

**Risk:** Tools might not work first try
**Mitigation:** Test each tool individually before integrating

**Risk:** Streaming might be different in TypeScript
**Mitigation:** Use AgentKit's native streaming support

---

## Success Criteria

1. ✅ Python backend completely removed
2. ✅ Chat works in < 3 seconds
3. ✅ Agent calls tools correctly
4. ✅ All 6 tools functional
5. ✅ Streaming works in UI
6. ✅ Memory persists across sessions
7. ✅ Simpler codebase (one language)
8. ✅ Easier deployment (just Next.js)

---

## Timeline

**Estimated:** 1-2 hours

1. Install deps (5 min)
2. Create route.ts skeleton (15 min)
3. Implement 6 tools (45 min)
4. Test and debug (30 min)
5. Delete Python backend (5 min)
6. Update frontend (10 min)
7. Final testing (10 min)

**Total:** ~2 hours

---

## Notes

This is the **correct architecture** from the start. Python backend was unnecessary complexity that caused 10 hours of debugging.

Cord was right.
