# TypeScript Fixes for HGC Route

## Summary of Issues

Found 4 TypeScript errors in `app/api/hgc/route.ts`:

1. **Line 827**: `campaignsResult.campaigns` is possibly undefined
2. **Line 941**: `handleSchedulePost()` called with wrong number of arguments
3. **Line 1320**: Message type incompatibility (tool role without tool_call_id)
4. **Line 1482**: Message type incompatibility (tool role without tool_call_id)

---

## Fix 1: Line 827 - Handle undefined campaigns array

**Problem**: TypeScript cannot guarantee `campaignsResult.campaigns` exists even after success check.

**Current Code**:
```typescript
// Line 820-833
// Return campaign selector
return NextResponse.json({
  success: true,
  response: 'Here are your campaigns. Which one would you like to use?',
  interactive: {
    type: 'campaign_select',
    workflow_id: workflowId,
    campaigns: campaignsResult.campaigns.map((c: any) => ({  // ERROR: possibly undefined
      id: c.id,
      name: c.name || 'Untitled Campaign',
      description: c.status === 'draft' ? 'Draft campaign' : undefined,
    })),
  },
})
```

**Fix**:
```typescript
// Line 820-833 (Fixed)
// Return campaign selector
return NextResponse.json({
  success: true,
  response: 'Here are your campaigns. Which one would you like to use?',
  interactive: {
    type: 'campaign_select',
    workflow_id: workflowId,
    campaigns: (campaignsResult.campaigns || []).map((c: any) => ({
      id: c.id,
      name: c.name || 'Untitled Campaign',
      description: c.status === 'draft' ? 'Draft campaign' : undefined,
    })),
  },
})
```

**Explanation**: Add `|| []` fallback to ensure `map()` always has an array to work with.

---

## Fix 2: Line 941 - Fix handleSchedulePost argument order

**Problem**: Function signature is `handleSchedulePost(content, schedule_time, campaign_id)` but called with object.

**Function Signature** (Line 362):
```typescript
async function handleSchedulePost(content: string, schedule_time: string, campaign_id?: string) {
```

**Current Code** (Line 941):
```typescript
const scheduleResult = await handleSchedulePost({
  content: postContent,
  campaign_id: campaignId,
  schedule_time: selectedScheduleTime,
})
```

**Fix**:
```typescript
// Line 941-945 (Fixed)
const scheduleResult = await handleSchedulePost(
  postContent,           // content: string
  selectedScheduleTime,  // schedule_time: string
  campaignId             // campaign_id?: string
)
```

**Explanation**: Pass arguments in correct positional order matching function signature.

---

## Fix 3 & 4: Lines 1320 & 1482 - Fix message type incompatibility

**Problem**: OpenAI's `ChatCompletionMessageParam` type requires `tool_call_id` for messages with `role: 'tool'`. Our schema allows `'tool'` role but doesn't enforce `tool_call_id`.

### Root Cause Analysis

**Validation Schema** (`lib/validations/hgc.ts`):
```typescript
z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),  // Allows 'tool' role
  content: z.string().min(1).max(10000),
  // Missing: tool_call_id field for tool messages
})
```

**OpenAI SDK Requirement**:
```typescript
// Tool messages MUST have tool_call_id
type ChatCompletionToolMessageParam = {
  role: 'tool',
  content: string,
  tool_call_id: string  // REQUIRED
}
```

### Two-Part Fix

#### Part A: Update Validation Schema

**File**: `lib/validations/hgc.ts`

**Current**:
```typescript
export const hgcRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system', 'tool']),
        content: z.string().min(1).max(10000),
      })
    )
    .min(1, 'At least one message required')
    .max(50, 'Maximum 50 messages allowed'),
})
```

**Fixed**:
```typescript
// Define discriminated union for different message types
const baseMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1).max(10000),
})

const toolMessageSchema = baseMessageSchema.extend({
  role: z.literal('tool'),
  tool_call_id: z.string().min(1), // Required for tool messages
})

const regularMessageSchema = baseMessageSchema.extend({
  role: z.enum(['user', 'assistant', 'system']),
})

export const hgcRequestSchema = z.object({
  messages: z
    .array(z.union([regularMessageSchema, toolMessageSchema]))
    .min(1, 'At least one message required')
    .max(50, 'Maximum 50 messages allowed'),
})
```

#### Part B: Filter Tool Messages in Route

**File**: `app/api/hgc/route.ts`

**Current** (Lines 1318-1321):
```typescript
{
  role: 'system',
  content: `[system prompt...]`
},
...formattedMessages  // May contain 'tool' role messages without tool_call_id
```

**Fixed**:
```typescript
{
  role: 'system',
  content: `[system prompt...]`
},
...formattedMessages.filter(msg => msg.role !== 'tool')  // Filter out tool messages
```

**Explanation**:
- Frontend should NEVER send `role: 'tool'` messages (those are only AI→Tool responses)
- Filter them out defensively to prevent type errors
- Tool messages are only created during tool execution flow (lines 1460-1477)

**Same fix for Line 1482**:
```typescript
// Line 1482-1485 (Fixed)
const finalResponse = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: `[system prompt...]`
    },
    ...formattedMessages.filter(msg => msg.role !== 'tool'),  // Add filter here too
    {
      role: 'assistant',
      content: assistantMessage.content || '',
      tool_calls: assistantMessage.tool_calls
    },
    ...toolResults  // These have proper tool_call_id
  ]
})
```

---

## Complete Fix Summary

### Files to Modify

1. **lib/validations/hgc.ts**
   - Update schema to use discriminated union
   - Require `tool_call_id` for tool messages

2. **app/api/hgc/route.ts**
   - Line 827: Add `|| []` fallback for campaigns
   - Line 941: Fix `handleSchedulePost()` argument order
   - Line 1320: Filter tool messages from `formattedMessages`
   - Line 1482: Filter tool messages from `formattedMessages`

### Testing After Fixes

```bash
# Verify TypeScript errors are resolved
npx tsc --noEmit

# Run test suite
npm test -- --testPathPattern="hgc"

# Expected: 0 TypeScript errors, all tests passing
```

---

## Why These Fixes Are Safe

1. **Line 827**: Defensive programming - empty array is valid fallback
2. **Line 941**: Corrects argument order to match function signature
3. **Lines 1320/1482**: Filters invalid messages that should never come from frontend anyway
4. **Schema update**: Makes validation stricter and catches errors earlier

These fixes do NOT change functionality - they only correct type safety issues.
