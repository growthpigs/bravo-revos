# RevOS Architecture

## Critical Dependencies (DO NOT UPDATE WITHOUT TESTING)

| Package | Version | Purpose |
|---------|---------|---------|
| @openai/agents | 0.3.0 | AgentKit SDK - response extraction depends on this version |
| next | 14.x | App Router, API Routes |
| @supabase/supabase-js | 2.x | Database client |

## AgentKit Response Structure (as of 2025-11-18)

The AgentKit SDK returns responses in a specific structure. Extraction happens in `lib/console/marketing-console.ts` in the `extractResponseText()` method.

### Primary Extraction Path (Current Working)

```typescript
// result.output array contains AgentOutputItem objects
result.output[i].role === 'assistant'
result.output[i].content[j].type === 'text'
result.output[i].content[j].text // <-- This is the response text
```

### Fallback Paths (for compatibility)

1. `result.finalOutput` (string or object with .content/.text)
2. `result.newItems[].content` (RunItem array)
3. `result.modelResponses[].text` (AgentKit SDK structure)
4. `result.state.modelResponses[].output[].content[].text` (legacy)

## Known Working Flows

### 1. "write" Command Flow

1. User types "write"
2. V2 route loads brand cartridge from database (using service role client)
3. Workflow executor generates topic suggestions using AI
4. Returns 4 topic buttons + brand context message
5. User clicks topic button
6. Post generated using brand/style context
7. Content appears directly in working document area

### 2. Health Check

GET `/api/health` returns status for:
- database
- supabase
- agentkit (version check)
- mem0

### 3. Brand Context Display

Format in workflow-executor.ts (lines 184-209):
- Brand Context Loaded
- Industry
- Target Audience
- Burning Question (extracted from core_messaging)
- Topic buttons

## Key Files

| File | Purpose |
|------|---------|
| `app/api/hgc-v2/route.ts` | Main chat endpoint |
| `lib/console/marketing-console.ts` | AgentKit orchestration |
| `lib/console/workflow-executor.ts` | Workflow logic |
| `lib/console/workflow-loader.ts` | Load workflows from DB |
| `components/chat/FloatingChatBar.tsx` | Chat UI |
| `app/api/health/route.ts` | Health check endpoint |

## Database Tables

- `console_workflows` - Workflow definitions (JSON)
- `brand_cartridges` - Client brand data
- `style_cartridges` - Style/voice settings
- `hgc_sessions` - Chat sessions
- `hgc_messages` - Chat history

## Environment Variables

Required:
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `MEM0_API_KEY` - For memory features
- `CRON_SECRET` - For Vercel cron jobs

## Deployment

- **Platform**: Vercel
- **Production deploy**: `npx vercel --prod --yes`
- **Health monitoring**: Cron runs every 6 hours via `/api/cron/health-check`

## If Something Breaks

1. Check `/api/health` endpoint for status
2. Check AgentKit version hasn't changed (should be 0.3.0)
3. Check Vercel logs for extraction errors (`[MarketingConsole] ❌ EXTRACTION FAILED`)
4. Revert to last known good commit: `git checkout v1.0-working-agentkit`

## Version Check

The system validates AgentKit version on first use:
- `lib/console/marketing-console.ts` - logs warning if version != 0.3.0
- `app/api/health/route.ts` - returns version status in health check

## Last Known Good State

- **Git tag**: v1.0-working-agentkit
- **Date**: 2025-11-18
- **Commit**: (see `git tag -l`)

## UI Behavior

### Placeholder Text
When waiting for topic selection, working document shows:
```
[SELECT A HOOK FOR YOUR LINKEDIN POST FROM ONE OF THE FOUR BUTTONS]
```
Styled as monospace, uppercase, small gray text.

### Post Generation
- No AI fluff in chat
- Content goes directly to working document
- Empty response string returned to chat

### Brand Context Display
Uses `\n\n` for paragraph breaks (Markdown requirement)

## NON-NEGOTIABLES

1. **AgentKit SDK ONLY** - No raw `openai.chat.completions.create()`
2. **Mem0 integration** - scope: `agencyId::clientId::userId`
3. **Console DB** - load via `loadConsolePrompt()`
4. **Workflow JSON** - load from `console_workflows` table
5. **Session persistence** - save all conversations to DB
6. **Health monitors** - multi-source verification
7. **RLS** - backend: service role key, frontend: anon key
8. **Admin control** - `admin_users` table only

---

Last Updated: 2025-11-18
Status: STABLE - All flows working
