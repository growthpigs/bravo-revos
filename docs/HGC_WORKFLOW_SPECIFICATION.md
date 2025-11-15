# HGC Workflow Specification

## Core Principle

HGC is NOT a chatbot. It is a conversational interface that orchestrates the entire application through natural language + real-time UI manipulation.

## Workflow Pattern

```
User Speech → Intent Detection → Cartridge Context Loading → Action Execution → UI Navigation/Manipulation → Inline Response
```

Every interaction follows this pattern. No exceptions.

## Chat-Driven UI Navigation

User utterance triggers automatic navigation:

```
"campaign" → Navigate to /dashboard/campaigns
"write" → Navigate to working document + load write interface
"leads" → Navigate to /dashboard/leads
"review emails" → Navigate to /dashboard/email-review
```

Navigation happens WHILE HGC responds, user sees it happen in real-time.

## Cartridge Context Loading

EVERY interaction queries cartridges BEFORE generating response:

```typescript
// Mandatory cartridge lookup (pseudocode)
const context = {
  brand: await loadCartridge('brand', { clientId, userId }),
  style: await loadCartridge('style', { clientId, userId }),
  voice: await loadCartridge('voice', { userId, campaignId }), // 4-tier: request > campaign > user > default
  preferences: await loadCartridge('preferences', { userId })
}

// Response generation uses context
const response = await agentkit.generate(userMessage, { context })
```

Brand cartridge fields: `core_messaging`, `industry`, `target_audience`, `core_values`, `brand_voice`
Style cartridge fields: `tone_of_voice`, `writing_style`, `personality_traits`
Voice cartridge: 4-tier cascade (request → campaign → user → default)

## Inline Buttons vs Working Document

Two distinct UI spaces:

**Chat (80% of interactions):**
- Conversational Q&A
- Inline buttons for choices (compact, minimal, no borders/shadows)
- Real-time feedback
- Navigation triggers

**Working Document (20% - content output only):**
- Shows ONLY generated content (posts, reports, lead magnets)
- NEVER shows buttons, questions, forms
- Clean preview space

Example inline buttons:
```
HGC: "What topic would you like to write about?"

[AI Leadership] [Content Strategy] [Q4 Growth] [Custom Topic]
```

NOT card-style, NOT bordered, just minimal clickable text.

## Real-Time Form Filling

When user requests action requiring form input, HGC:

1. Navigates to appropriate page
2. Fills form fields AS USER WATCHES
3. Shows inline buttons for remaining choices
4. User sees transparency, not black box

Example:
```
User: "Create campaign for AI leadership content"

HGC Actions (visible to user):
1. Navigate to /dashboard/campaigns/new
2. Fill "Campaign Name" = "AI Leadership"
3. Load lead magnet library
4. Show inline buttons: [5 Conversations Guide] [Trust Framework] [Custom]
```

User WATCHES form getting filled. Trust through transparency.

## Voice Cartridge Mandatory Flow

ALL content generation:

```
User Request
    ↓
Copywriting Skill (professional, conversion-optimized)
    ↓
Voice Cartridge (user's authentic tone)
    ↓
Output (final personalized content)
```

NO exceptions. Even single-sentence responses use voice cartridge.

## Write Workflow (Specific Example)

```
User: "write"

1. HGC loads brand cartridge (core_messaging, industry, target_audience)
2. HGC loads style cartridge (tone_of_voice, writing_style)
3. HGC generates 3-4 personalized topic suggestions based on actual brand data
4. HGC shows inline buttons in chat:

   [Building Trust with Remote VPs] [Executive Presence Under Pressure] [Conflict as Growth Tool] [Custom Topic]

5. User clicks button → HGC generates full post using voice cartridge → shows in Working Document
6. Chat shows edit options: [Approve] [Make More Casual] [Regenerate] [Add Hook]
```

Topics are PERSONALIZED based on cartridge data, not generic.

## Session Persistence

Every interaction:

```typescript
const session = await getOrCreateSession({ userId, clientId })
await saveMessages(sessionId, [userMessage, assistantMessage])
return { sessionId, messages } // MUST return sessionId
```

Tables: `chat_sessions`, `chat_messages`
Enables cross-session context, conversation history, continuity.

## Console DB Architecture

System prompt loaded from `console_prompts` table (8-cartridge JSONB):

1. Operations Cartridge - PRD, requirements
2. System Cartridge - role, rules
3. Context Cartridge - domain knowledge
4. Skills Cartridge - available chips
5. Plugins Cartridge - MCP config
6. Knowledge Cartridge - docs, examples
7. Memory Cartridge - Mem0 scoping
8. UI Cartridge - inline button config

Load via: `loadConsolePrompt('marketing-console-v1')`

NO hardcoding >50 lines of system prompt in code. Ever.

## AgentKit Integration

```typescript
import { Agent } from '@openai/agents'

// CORRECT
const agent = new Agent({ name: 'hgc', model: 'gpt-4o' })
agent.addTool(navigateTool)
agent.addTool(fillFormTool)
agent.addTool(loadCartridgeTool)
const response = await agent.run(userMessage)

// WRONG (never do this)
const response = await openai.chat.completions.create({
  messages: [...],
  tools: [...] // manual tool calling = violation
})
```

AgentKit handles tool orchestration, streaming, error handling. No manual implementation.

## Mem0 Integration

Persistent memory across sessions:

```typescript
// 3-tier scoping
const userId = `${agencyId}::${clientId}::${userId}`

// Add memory
await mem0.add({
  user_id: userId,
  messages: [{ role: 'user', content: message }],
  metadata: { campaignId, source: 'chat' }
})

// Search memory
const context = await mem0.search(query, { user_id: userId })
```

Use for: user preferences, campaign context, conversation history, brand learning

## Health Check Compliance

Before marking ANY task complete, run:

```
GET /api/health
```

Must verify:
- AgentKit integration (not raw OpenAI calls)
- Mem0 active and scoped correctly
- Console DB loaded (not hardcoded prompts)
- Session persistence working
- Cartridge context in responses

Health check = source of truth for compliance.

## Implementation Checklist

For ANY new HGC feature:

1. Define intent detection (what user utterances trigger this)
2. Identify cartridges to load (brand/style/voice/preferences)
3. Define UI navigation (where to send user)
4. Design inline buttons (what choices to show)
5. Implement real-time orchestration (form filling, page updates)
6. Route content through voice cartridge
7. Save session state
8. Test with health check endpoint

## Non-Negotiable Rules

1. AgentKit SDK only - no manual OpenAI calls
2. Cartridge context loaded BEFORE every response
3. Voice cartridge filter on ALL content
4. Session persistence + return sessionId
5. Console DB for system prompts
6. Inline buttons in chat, content in Working Document
7. Real-time UI manipulation (no background execution)
8. Mem0 3-tier scoping

VIOLATIONS = REWRITE REQUIRED

---

Reference: `/docs/HGC_COMPREHENSIVE_SPEC_CORRECTED.md` for complete architecture
