# HGC Final Specification - RevOS Chat-Driven UI

## Overview

RevOS is a chat-driven UI orchestration system where users accomplish tasks through natural language while watching the system work in real-time. This document defines the complete user experience and implementation requirements for the HGC (Holy Grail Chat) interface.

**Core Principle:** Chat is the primary interface. Dashboard exists for metrics and context, not as the primary interaction point.

---

## Architecture Status (ACTUAL - Code Verified)

### ✅ Implemented & Working
- HGC v2 API route (`/app/api/hgc-v2/route.ts`) with raw OpenAI client
- Session persistence (`chat_sessions`, `chat_messages`) via `getOrCreateSession`, `saveMessages`
- Cartridge system loading from Supabase (brand, style, voice cartridges)
- Voice cartridge 4-tier cascade architecture defined
- Console DB loader (`loadConsolePrompt`) with fallback to hardcoded default
- **WriteChip** - Topic selection with brand-based personalization
- **PublishingChip** - FULLY FUNCTIONAL LinkedIn posting via Unipile
- Unipile client (`lib/unipile-client.ts`) - posts to LinkedIn, mock mode support
- All UI components exist (FloatingChatBar, ChatMessage, InlineButtons, InlineDecisionButtons, etc.)
- Supabase RLS multi-tenancy

### 🐛 BROKEN (Needs Fix)
- **Mem0 integration** - Was working, now can't recall user info (lines 117-135 in hgc-v2/route.ts attempt retrieval but fail)
- **WriteChip post generation** - Line 132 returns placeholder `[AI would generate post about ${input.topic} here]` instead of actual content

### ⏳ Coming Soon (Future Features)
- Apollo or similar API for lead enrichment
- Canva MCP for lead magnet design
- Context7 MCP for lead magnet content research
- AgentKit SDK migration (currently using raw OpenAI, has `@openai/agents` imports in chips but not wired up)

### 🎯 IMMEDIATE PRIORITY
**Fix WriteChip to generate actual post content** - The ONLY missing piece for complete write → working doc → post to LinkedIn flow

---

## Current Write Workflow (What Actually Works)

### Step 1: Topic Selection ✅ WORKING
User: "write"
→ HGC v2 route detects command (line 236)
→ Fetches brand & style cartridges from Supabase (lines 248-259)
→ Returns personalized topic buttons based on user's industry, values, audience

### Step 2: Post Generation 🐛 BROKEN (Placeholder Only)
User clicks topic button
→ WriteChip receives `action: 'generate_post'` with topic
→ **LINE 132**: Returns placeholder `[AI would generate post about ${topic} here]`
→ **NEEDS**: Actual OpenAI call to generate content using style/brand cartridges

### Step 3: Publishing ✅ FULLY WORKING
User clicks "Post Now" button
→ PublishingChip `publish_to_linkedin(action: 'post_now', content)`
→ Gets user's LinkedIn account from `linkedin_accounts` table
→ Calls `createLinkedInPost(unipileAccountId, content)`
→ Posts to LinkedIn via Unipile API
→ Stores in `posts` table
→ Creates monitoring job in `scrape_jobs` table
→ Returns post URL

**Bottleneck:** Step 2 (post generation) is placeholder code

---

## UI Components (EXACT - Code Verified)

### Chat Interface
**File:** `/components/chat/FloatingChatBar.tsx`
- Message history (scrollable)
- Inline buttons (2 types below)
- Input field (bottom-fixed)
- Streaming support

### Inline Buttons (Two Types)

#### A. Primary Action Buttons
**File:** `/components/chat/inline-button.tsx`
```tsx
className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 focus:ring-2"
```
**Variants:** primary (blue), secondary (gray), success (green), warning (amber)
**Features:** Scale animations, focus rings, loading spinner, navigation support
**Use:** Major actions (Approve, Post Now, Schedule)

#### B. Decision/Choice Buttons
**File:** `/components/chat/InlineDecisionButtons.tsx`
```tsx
className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded text-xs bg-white hover:border-gray-900 hover:bg-gray-50"
```
**Features:** White bg + borders, compact, optional icons (PlusCircle, List)
**Use:** Topic choices, inline selections, non-primary actions

### Working Document
**File:** `/components/chat/ChatMessage.tsx` (with expand capability)
- Full-width markdown rendering
- Streaming text support
- NEVER shows buttons/questions
- Content output only

---

## Acceptance Criteria

**Performance:**
- Chat responses <2s
- Cartridge loading <500ms
- Navigation <200ms
- Streaming starts <100ms

**HGC Compliance:**
- ✅ Session persistence working
- ✅ Cartridge system working (Supabase)
- ✅ Voice cartridge cascade defined
- ✅ Publishing to LinkedIn working
- 🐛 Mem0 broken (needs fix)
- 🐛 Post generation placeholder (needs fix)
- ⏳ AgentKit SDK (needs migration from raw OpenAI)
- ✅ Console DB working (with fallback)

**UI/UX:**
- ✅ Chat is primary interface
- ✅ Exact button styling implemented
- ✅ Working Document content-only
- ✅ Components exist and functional

---

## Immediate Next Steps

### Priority 1: Fix Post Generation (UNBLOCK WRITE FLOW)

**File:** `/lib/chips/write-chip.ts` line 120-143

**Current (BROKEN):**
```typescript
case 'generate_post': {
  // Gets style data but doesn't use it!
  const { data: styleData } = await supabase
    .from('style_cartridges')
    .select('tone_of_voice, writing_style, personality_traits')
    .eq('user_id', userId)
    .single();

  // Returns placeholder instead of real content
  return this.formatSuccess({
    action: 'show_in_working_document',
    content_type: 'linkedin_post',
    generated_content: `[AI would generate post about ${input.topic} here]`,
    // ...
  });
}
```

**Needed (WORKING):**
```typescript
case 'generate_post': {
  if (!input.topic) {
    return this.formatError('Topic is required');
  }

  // Get brand + style data
  const { data: brandData } = await supabase
    .from('brand_cartridges')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: styleData } = await supabase
    .from('style_cartridges')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Actually generate post using OpenAI
  const prompt = `Create a LinkedIn post about ${input.topic}.

  Brand context:
  - Industry: ${brandData?.industry || 'business'}
  - Target audience: ${brandData?.target_audience || 'professionals'}
  - Core values: ${brandData?.core_values || 'innovation'}

  Style:
  - Tone: ${styleData?.tone_of_voice || 'professional'}
  - Writing style: ${styleData?.writing_style || 'informative'}
  - Personality: ${styleData?.personality_traits || 'approachable'}

  Write an engaging LinkedIn post that:
  1. Hooks the reader in first line
  2. Provides value/insight
  3. Ends with engaging question or CTA
  4. Includes 3-5 relevant hashtags
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const generatedContent = response.choices[0].message.content;

  return this.formatSuccess({
    action: 'show_in_working_document',
    content_type: 'linkedin_post',
    generated_content: generatedContent,
    metadata: {
      topic: input.topic,
      style: styleData?.writing_style || 'professional',
      tone: styleData?.tone_of_voice || 'informative'
    }
  });
}
```

**Testing:**
1. Say "write" in chat
2. Click topic button
3. Verify actual post content appears in Working Document
4. Click "Post Now"
5. Verify post appears on LinkedIn

---

### Priority 2: Fix Mem0 Recall Issue

**File:** `/app/api/hgc-v2/route.ts` lines 117-135

**Current behavior:** Attempts to retrieve cartridges from Mem0, gracefully degrades but doesn't work

**Investigation needed:**
1. Check Mem0 API credentials
2. Verify 3-tier scoping format `${agencyId}::${clientId}::${userId}`
3. Test Mem0 search/add operations
4. Review `/lib/cartridges/retrieval.ts` implementation

---

### Priority 3: AgentKit SDK Migration (Later)

**File:** `/app/api/hgc-v2/route.ts` line 27

**Current:**
```typescript
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

**Target:**
```typescript
import { Agent } from '@openai/agents';

const agent = new Agent({ name: 'hgc', model: 'gpt-4o' });
// Tools already using @openai/agents format in chips
const response = await agent.run(userMessage, { context: cartridges });
```

---

## User Personas

### Persona 1: Chase (Super Admin)
Founder managing all clients, tracking costs, troubleshooting issues, optimizing system performance.

### Persona 2: Rachel (Client - Executive Coach)
$800k/year coaching business, needs 20-30 leads/month, wants <1 hour/week on lead gen, maintains authentic voice.

### Persona 3: Jake (Client - Startup Founder)
Pre-seed SaaS founder, needs 50-100 early adopters, data-driven, checks metrics daily.

---

## User Journey Maps

### Journey 1: Rachel Creates LinkedIn Post (Write Workflow)

#### Step 1: Natural Language Request (30 seconds) ✅ WORKING
1. Rachel opens app, sees HGC chat
2. Rachel: "write"
3. HGC loads cartridges from Supabase
4. HGC generates personalized topics based on brand data

**UI response (Chat):**
```
HGC: "Based on your work with executive leaders, here are some topics:

[Building Trust with Remote VPs] [Executive Presence Under Pressure] [Conflict as Growth Tool] [Custom Topic]
```

#### Step 2: Content Generation (15 seconds) 🐛 NEEDS FIX
1. Rachel clicks: [Building Trust with Remote VPs]
2. HGC calls WriteChip `generate_post`
3. **CURRENT:** Returns placeholder
4. **NEEDED:** Actually generates post using OpenAI + cartridges
5. Content streams to Working Document

**UI response (Working Document):**
```
[Real LinkedIn post content appears here]

"I had a VP ask me yesterday: 'My remote team isn't arguing anymore...
and that terrifies me.'

Silence isn't harmony. It's fear.

Here's how to create psychological safety where healthy conflict thrives:

1. Reward dissent publicly
2. Share your own mistakes first
3. Ask 'What am I missing?' in every meeting

Conflict isn't the problem. Silence is."
```

**Chat shows:**
```
[Post Now] [Schedule] [Edit] [Save Draft]
```

#### Step 3: Publishing (10 seconds) ✅ WORKING
1. Rachel clicks [Post Now]
2. PublishingChip calls `createLinkedInPost()` via Unipile
3. Post appears on LinkedIn
4. Stored in database
5. Monitoring job created

**UI response:**
```
✅ Post published to LinkedIn!
🔍 Now monitoring for trigger word: "interested"

View post: [LinkedIn URL]
```

---

## Interaction Patterns

### Pattern 1: Chat-Driven UI Navigation
```
User: "campaign" → Navigate to /dashboard/campaigns
User: "write" → Stay in chat, load write workflow
User: "leads" → Navigate to /dashboard/leads
```

### Pattern 2: Inline Buttons vs Working Document
**Chat:** Buttons for choices, Q&A, actions
**Working Document:** Content output only (no interactive elements)

### Pattern 3: Cartridge Context Loading
```typescript
const brand = await loadCartridge('brand', { clientId, userId })
const style = await loadCartridge('style', { clientId, userId })
const voice = await loadCartridge('voice', { userId, campaignId })
// All responses personalized using cartridge context
```

### Pattern 4: Session Persistence
```typescript
const session = await getOrCreateSession(supabase, userId, sessionId, voiceId)
await saveMessages(supabase, session.id, messages)
return { sessionId } // MUST return
```

---

## Related Documents

- `/docs/HGC_WORKFLOW_SPECIFICATION.md` - Detailed architecture patterns
- `/docs/CLAUDE.md` - Implementation rules and non-negotiables
- `/lib/chips/write-chip.ts` - Write workflow implementation
- `/lib/chips/publishing-chip.ts` - LinkedIn publishing implementation
- `/lib/unipile-client.ts` - Unipile API integration

---

**Version:** 1.1 (Code-Verified)
**Last Updated:** 2025-11-15
**Status:** Write workflow 90% complete - just needs post generation fix (Priority 1)

**Next Session:**
1. Fix WriteChip post generation (15 min)
2. Test complete flow: write → topic → generate → working doc → post to LinkedIn
3. Fix Mem0 recall issue
4. Plan AgentKit migration
