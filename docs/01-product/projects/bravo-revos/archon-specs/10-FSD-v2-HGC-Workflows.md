# Functional Specification Document v2 - RevOS HGC Workflows

## Overview

This document defines user interactions with RevOS through the HGC (Holy Grail Chat) conversational interface. RevOS is NOT a traditional dashboard-first SaaS. It is a chat-driven UI orchestration system where users accomplish tasks through natural language while watching the system work in real-time.

Core Principle: Chat is the primary interface. Dashboard exists for metrics and context, not as the primary interaction point.

## User Personas

### Persona 1: Chase (Super Admin)

**Demographics:**
- Age: 35-45
- Role: RevOS Founder
- Technical Skill: High
- LinkedIn: 10,000+ connections

**Goals:**
- Monitor all clients' campaigns
- Track costs (OpenAI, Unipile)
- Identify performance issues
- Support clients when needed
- Optimize system performance

**Pain Points:**
- Need visibility across ALL tenants
- Must troubleshoot client issues quickly
- Track profitability per client
- Ensure quality (review AI-generated content)

**Primary Use Cases:**
1. View system-wide analytics
2. Access any client's account for support
3. Review AI-generated content quality
4. Monitor API costs and usage
5. Manage client subscriptions

**Preferred Interaction:**
- HGC chat: "Show me all campaigns with <10% reply rate"
- Dashboard: Quick overview of system health
- Real-time health checks at /admin/system-health

---

### Persona 2: Rachel (Client - Executive Coach)

**Demographics:**
- Age: 48
- Business: Leadership coaching for VPs/C-suite
- Revenue: $800k/year
- Team: Solo + 1 VA
- LinkedIn: 8,000 connections
- Tech Savvy: Medium

**Goals:**
- Generate 20-30 qualified leads/month
- Book 10-15 discovery calls/month
- Close 2-3 new clients/month ($10k packages)
- Spend <1 hour/week on lead gen
- Maintain authentic voice

**Pain Points:**
- Too busy to post/engage daily on LinkedIn
- Inconsistent lead flow
- Manual DM outreach takes forever
- Hard to track who she's messaged
- Doesn't want to "learn another tool"

**Primary Use Cases:**
1. Create LinkedIn posts via chat
2. Review leads from campaigns
3. See who replied to DMs
4. Check weekly performance summary

**Preferred Interaction:**
- Chat-first (speaks naturally, sees results)
- Minimal dashboard use (only when curious about metrics)

---

### Persona 3: Jake (Client - Startup Founder)

**Demographics:**
- Age: 32
- Business: B2B SaaS (project management tool)
- Stage: Pre-seed ($500k raised)
- Team: 4 people
- LinkedIn: 3,500 connections
- Tech Savvy: Very high

**Goals:**
- Find 50-100 early adopters
- Get 20 product demos booked/month
- Convert 10% to beta users
- Build personal brand as founder

**Pain Points:**
- Building product full-time, can't do outreach
- Generic cold emails don't work
- Need to show progress to investors
- Want data/metrics to optimize

**Primary Use Cases:**
1. Create campaigns around product updates
2. Generate content about startup lessons
3. Track conversion funnel
4. A/B test different messaging

**Preferred Interaction:**
- HGC chat: "Create campaign for our new feature launch"
- Dashboard: Loves metrics, checks daily
- Wants to see detailed analytics

---

## User Journey Maps

### Journey 1: Rachel Creates First LinkedIn Post (Chat-Driven)

**Context:** Rachel just logged in. She wants to write about "building trust with remote teams."

#### Step 1: Natural Language Request (30 seconds)

**What happens:**
1. Rachel opens app, sees HGC chat interface
2. Rachel: "write"
3. HGC loads cartridges (brand, style, voice)
4. HGC analyzes: brand_cartridge.industry = "executive coaching", brand_cartridge.target_audience = "VPs/C-suite", style_cartridge.tone_of_voice = "professional, warm"

**System actions:**
- Query Supabase: `SELECT * FROM cartridges WHERE user_id = Rachel AND tier IN ('brand', 'style', 'voice')`
- Load context into Mem0 session
- Generate personalized topic suggestions based on actual brand data

**UI response (Chat):**
```
HGC: "Based on your work with executive leaders, here are some topics that align with your brand:

[Building Trust with Remote VPs]
[Executive Presence Under Pressure]
[Conflict as Growth Tool]
[Custom Topic]
```

**Acceptance criteria:**
- Cartridges loaded <500ms
- Topics PERSONALIZED from brand data (not generic)
- Inline buttons shown in chat (minimal, no borders/shadows)

---

#### Step 2: Topic Selection + Content Generation (15 seconds)

**What happens:**
1. Rachel clicks: [Building Trust with Remote VPs]
2. HGC navigates to Working Document (user sees navigation happen)
3. HGC generates post via Copywriting Skill → Voice Cartridge filter
4. Content streams into Working Document in real-time

**System actions:**
- Call AgentKit with cartridge context
- Stream response from GPT-4o
- Filter through voice cartridge (4-tier: request → campaign → user → default)
- Populate Working Document as content generates

**UI response (Working Document):**
```
[Real-time streaming text appears]

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
HGC: "Generated post about building trust. Check the document for preview.

[Approve] [Make More Casual] [Regenerate] [Add Hook]"
```

**Acceptance criteria:**
- Content generated <30 seconds
- Streaming visible to user (transparency)
- Voice cartridge applied (matches Rachel's authentic tone)
- Working Document shows ONLY content (no buttons/questions)
- Chat shows edit options as inline buttons

---

#### Step 3: Approval + Scheduling (20 seconds)

**What happens:**
1. Rachel reviews in Working Document
2. Rachel clicks [Approve] in chat
3. HGC: "When should I post this?"
4. HGC shows datetime picker inline

**System actions:**
- Show InlineDateTimePicker component
- Pre-populate with smart default (tomorrow 9 AM EST based on timezone)

**UI response (Chat):**
```
HGC: "When should I post this?"

[Inline DateTime Picker]
📅 2025-11-16
🕐 09:00 EST

[Schedule Post] [Post Now]
```

**User action:**
- Rachel adjusts to 10:30 AM
- Clicks [Schedule Post]

**System actions:**
- Create scheduled_posts record
- Store session in chat_sessions + chat_messages
- Return sessionId for continuity

**UI response:**
```
HGC: "Scheduled for Nov 16, 10:30 AM EST. I'll notify you when it's live."
```

**Acceptance criteria:**
- Datetime picker inline in chat (not modal)
- Timezone auto-detected
- Post scheduled in Supabase
- Session persisted (getOrCreateSession, saveMessages)
- Confirmation shown immediately

---

### Journey 2: Rachel Creates Campaign from LinkedIn Post (Chat-Driven)

#### Step 1: Campaign Intent Detection (5 seconds)

**What happens:**
1. Rachel: "campaign"
2. HGC detects intent → navigates to /dashboard/campaigns
3. User SEES navigation happen in real-time

**System actions:**
- Intent detection: keyword "campaign"
- Navigate to /dashboard/campaigns (router.push visible to user)
- Load campaign list in background

**UI response (Chat):**
```
HGC: "Let's create a campaign. Would you like to:

[Create from LinkedIn Post]
[Create from Scratch]
```

**Dashboard:**
- Shows existing campaigns in background
- User sees navigation happen (transparency)

**Acceptance criteria:**
- Navigation visible in real-time (<200ms)
- Intent detected correctly
- Inline buttons shown (minimal style)

---

#### Step 2: Campaign Creation + Form Filling (30 seconds)

**What happens:**
1. Rachel clicks [Create from LinkedIn Post]
2. HGC: "Paste your LinkedIn post URL"
3. Rachel: "https://linkedin.com/posts/rachel-coach-123..."
4. HGC navigates to /dashboard/campaigns/new
5. HGC fills form AS RACHEL WATCHES

**System actions:**
- Navigate to campaign creation page
- Scrape post via Unipile API
- Extract commenters (47 found)
- Auto-fill form fields:
  - Campaign Name: "Building Trust with Remote Teams"
  - Source Post: [URL]
  - Target: 47 commenters

**UI response (Dashboard - Form auto-filling):**
```
[User watches fields populate in real-time]

Campaign Name: Building Trust with Remote Teams ✓
Source Post: linkedin.com/posts/... ✓
Target Leads: 47 commenters found ✓
```

**Chat shows:**
```
HGC: "Found 47 people who commented on your post. I'll enrich their profiles and draft personalized DMs. Continue?"

[Yes, Continue] [Review Leads First]
```

**Acceptance criteria:**
- Form filling visible to user (transparency over black box)
- Scraping completes <30 seconds
- Form fields auto-populated accurately
- User can intervene before continuing

---

#### Step 3: Lead Enrichment + DM Preview (60 seconds)

**What happens:**
1. Rachel clicks [Yes, Continue]
2. HGC loads brand + style cartridges
3. HGC enriches 47 leads (Apollo API)
4. HGC generates 3 sample DMs using voice cartridge

**System actions:**
- Query cartridges: brand (core_messaging, target_audience), style (tone_of_voice, writing_style)
- Enrich leads via queue (BullMQ)
- Generate DM templates via Copywriting Skill → Voice Cartridge
- Show progress in chat

**UI response (Chat - Progress):**
```
HGC: "Enriching leads...
✓ 10/47 complete
✓ 25/47 complete
✓ 47/47 complete

Found emails for 32 people (68% success rate).

Here are sample DMs I'll send:"

---
DM 1 (to Sarah):
"Sarah - your comment about building trust with remote teams really hit home.
I just created a guide on the 5 conversations every remote leader must have.
Want me to send it over?"

DM 2 (to Mike):
"Mike - loved your point about vulnerability in leadership.
I work with VPs navigating exactly this.
Created a free assessment that might help - interested?"

DM 3 (to Lisa):
"Lisa - your story about that difficult team conversation resonated.
I published a framework for these moments.
Happy to share if useful?"
---

[Approve & Send] [Make More Casual] [Regenerate]
```

**Acceptance criteria:**
- Cartridges loaded before DM generation
- Voice cartridge applied to ALL content
- Progress updates every 10 leads
- Sample DMs personalized (use actual commenter names)
- User can approve or request changes

---

### Journey 3: Jake Analyzes Campaign (Chat + Dashboard Hybrid)

#### Step 1: Campaign Query (Chat-Driven)

**What happens:**
1. Jake: "How's my product launch campaign doing?"
2. HGC queries database, loads campaign context

**System actions:**
- Search campaigns: `WHERE user_id = Jake AND name LIKE '%product launch%'`
- Load campaign metrics
- Navigate to /dashboard/campaigns/[id]

**UI response (Chat):**
```
HGC: "Your 'Product Launch - New Feature' campaign is performing well:

✓ 68 DMs sent
✓ 24 replies (35.3% reply rate)
✓ 12 demos booked (50% conversion)
✓ 4 beta signups (33% demo conversion)

Opening campaign dashboard now..."
```

**Dashboard:**
- Navigates to campaign detail page
- Shows funnel visualization (Recharts)

**Acceptance criteria:**
- Campaign found by natural language query
- Navigation happens automatically
- Summary shown in chat before detailed view

---

#### Step 2: Funnel Deep Dive (Dashboard-Driven)

**What happens:**
1. Dashboard shows conversion funnel
2. Jake clicks funnel stage to drill down

**UI (Dashboard):**
```
+--------------------------------------------------+
| Product Launch - New Feature        [Active]     |
+--------------------------------------------------+

Conversion Funnel (Interactive)

  100 Comments ----68%---→ 68 Enriched
                    ↓
                  35.3%
                    ↓
                 24 Replied
                    ↓
                   50%
                    ↓
                 12 Demos
                    ↓
                  33.3%
                    ↓
                 4 Signups

Top Performing Message (8 replies / 24 sent = 33%)
"[Name] - saw you're building in the project management space too..."

[View Full Message] [Use in New Campaign]
```

**User action:**
- Jake clicks "24 Replied" stage
- Modal shows list of 24 leads who replied

**Acceptance criteria:**
- Funnel updates real-time (Supabase real-time)
- Can drill down into each stage
- Top performing content surfaced
- Actions available (duplicate campaign, export leads)

---

## Detailed User Flows

### Flow 1: Content Generation with Cartridge Context

**Trigger:** User says "write"

**Flow:**

1. **Intent Detection:**
   - HGC detects "write" keyword
   - Determines content type: LinkedIn post (default)

2. **Cartridge Loading (MANDATORY - happens BEFORE response):**
   ```typescript
   const brand = await loadCartridge('brand', { clientId, userId })
   // Fields: core_messaging, industry, target_audience, core_values, brand_voice

   const style = await loadCartridge('style', { clientId, userId })
   // Fields: tone_of_voice, writing_style, personality_traits

   const voice = await loadCartridge('voice', { userId, campaignId: null })
   // 4-tier cascade: request → campaign → user → default
   ```

3. **Personalized Topic Generation:**
   ```typescript
   // Use brand cartridge to generate relevant topics
   const topics = generateTopics({
     industry: brand.industry, // "executive coaching"
     target_audience: brand.target_audience, // "VPs/C-suite"
     core_values: brand.core_values // ["authenticity", "growth"]
   })

   // NOT generic topics - personalized based on cartridge data
   ```

4. **UI Response (Chat - Inline Buttons):**
   ```
   HGC: "Based on your work with executive leaders, here are some topics:

   [Building Trust with Remote VPs]
   [Executive Presence Under Pressure]
   [Conflict as Growth Tool]
   [Custom Topic]
   ```

5. **User Selection:**
   - Clicks inline button (e.g., [Building Trust with Remote VPs])

6. **Content Generation (Copywriting Skill → Voice Cartridge):**
   ```typescript
   // Step 1: Copywriting Skill (professional, conversion-optimized)
   const draft = await copywritingSkill.generate({
     topic: selectedTopic,
     context: brand
   })

   // Step 2: Voice Cartridge Filter (user's authentic tone)
   const final = await voiceCartridge.filter(draft, {
     tone: voice.tone_of_voice,
     style: voice.writing_style,
     personality: voice.personality_traits
   })
   ```

7. **UI Response (Working Document - Streaming):**
   - Content streams into Working Document in real-time
   - User SEES content being generated (transparency)
   - Chat shows edit options:
     ```
     [Approve] [Make More Casual] [Regenerate] [Add Hook]
     ```

8. **Session Persistence:**
   ```typescript
   const session = await getOrCreateSession({ userId, clientId })
   await saveMessages(sessionId, [
     { role: 'user', content: 'write' },
     { role: 'assistant', content: generatedPost }
   ])
   return { sessionId } // MUST return sessionId
   ```

**Acceptance criteria:**
- Cartridges loaded BEFORE response generation
- Topics personalized from brand data (not generic)
- Voice cartridge applied to ALL content
- Session persisted across interactions
- User sees transparency (streaming, real-time)

---

### Flow 2: Campaign Creation with Real-Time Form Filling

**Trigger:** User says "campaign" or "create campaign for [topic]"

**Flow:**

1. **Intent Detection + Navigation:**
   - Detect "campaign" keyword
   - Navigate to /dashboard/campaigns (user SEES navigation)

2. **Decision Point:**
   ```
   HGC: "Would you like to:

   [Create from LinkedIn Post]
   [Create from Scratch]
   ```

3. **User Selection: [Create from LinkedIn Post]**

4. **Post URL Collection:**
   ```
   HGC: "Paste your LinkedIn post URL"
   User: "https://linkedin.com/posts/..."
   ```

5. **Scraping + Form Auto-Fill (User Watches):**
   - Navigate to /dashboard/campaigns/new
   - Scrape post via Unipile
   - Auto-fill form fields AS USER WATCHES:
     ```
     Campaign Name: [Auto-filled from post content]
     Source Post: [URL]
     Target Leads: [N commenters found]
     ```

6. **Lead Enrichment Progress:**
   ```
   HGC: "Found 47 commenters. Enriching profiles...
   ✓ 10/47
   ✓ 25/47
   ✓ 47/47 complete

   Found emails for 32 people (68% success)."
   ```

7. **DM Generation (with Cartridge Context):**
   ```typescript
   // Load cartridges
   const brand = await loadCartridge('brand', { clientId, userId })
   const style = await loadCartridge('style', { clientId, userId })
   const voice = await loadCartridge('voice', { userId, campaignId })

   // Generate DM via Copywriting Skill → Voice Cartridge
   const dm = await copywritingSkill.generateDM({
     lead: leadData,
     campaign: campaignContext,
     brand: brand,
     style: style
   })

   const personalizedDM = await voiceCartridge.filter(dm, voice)
   ```

8. **DM Preview (3 samples):**
   ```
   HGC: "Here are sample DMs I'll send:

   DM 1 (to Sarah):
   "Sarah - your comment about [specific point] really hit home..."

   DM 2 (to Mike):
   "Mike - loved your point about [specific insight]..."

   DM 3 (to Lisa):
   "Lisa - your story about [specific experience] resonated..."

   [Approve & Send] [Make More Casual] [Regenerate]
   ```

9. **Approval + Queue:**
   - User clicks [Approve & Send]
   - DMs queued in BullMQ (rate-limited, 20/day max)
   - Campaign status: "active"

**Acceptance criteria:**
- Form filling visible to user (not background process)
- Cartridges loaded before DM generation
- Voice cartridge applied to ALL DMs
- Progress updates shown (transparency)
- User can intervene at any point
- Session persisted throughout flow

---

### Flow 3: Lead Magnet Selection (Inline Workflow)

**Trigger:** Campaign requires lead magnet for DM offer

**Flow:**

1. **Automatic Trigger:**
   - Campaign created for "Team Building" topic
   - HGC needs relevant lead magnet

2. **Semantic Search:**
   ```typescript
   const matches = await searchLeadMagnets({
     query: `${brand.industry} ${campaignTopic}`,
     userId: userId
   })
   // Returns: [
   //   { id: '1', title: '5 Conversations Every Leader Must Have', match: 95% },
   //   { id: '2', title: 'Building High-Trust Teams Framework', match: 87% },
   //   { id: '3', title: '1-on-1 Meeting Template', match: 82% }
   // ]
   ```

3. **UI Response (Chat - Inline Selection):**
   ```
   HGC: "Choosing lead magnet for your campaign...

   Top match: '5 Conversations Every Leader Must Have'
   - Category: Guide
   - Performance: 78% download rate, 42% conversion
   - Best for: Executive coaches targeting new managers

   [Use This] [See Alternatives] [Create Custom]
   ```

4. **User Decision Tree:**

   **If [Use This]:**
   - Lead magnet linked to campaign
   - DMs include lead magnet offer

   **If [See Alternatives]:**
   - Shows matches #2 and #3
   - User selects one

   **If [Create Custom]:**
   ```
   HGC: "What specific topic should the lead magnet cover?"
   User: "Remote team communication frameworks"

   HGC: "Generating custom guide... (this takes ~2 min)
   ✓ Research via Context7
   ✓ Content generation via GPT-4o
   ✓ Design via Canva MCP

   [Preview shows here]

   [Approve] [Edit Content] [Regenerate]
   ```

5. **Persistence:**
   - Lead magnet saved to library
   - Campaign linked to lead magnet
   - DM templates updated with offer

**Acceptance criteria:**
- Semantic search returns relevant matches
- Performance data shown (builds trust)
- Custom generation works <2 minutes
- New lead magnets saved to library for reuse
- Inline workflow (no navigation away from chat)

---

## Wireframe Descriptions

### Screen 1: Chat Interface (Primary UI)

**Purpose:** Primary interaction point for all user actions

**Layout:**

```
+--------------------------------------------------+
|  RevOS          [Chat] [Document] [Dashboard]    |
+--------------------------------------------------+
|                                                  |
|  Chat Messages (Scrollable)                      |
|  +--------------------------------------------+  |
|  | You: "write"                               |  |
|  +--------------------------------------------+  |
|  |                                            |  |
|  | HGC: "Based on your work with executive    |  |
|  | leaders, here are some topics:             |  |
|  |                                            |  |
|  | [Building Trust with Remote VPs]           |  |
|  | [Executive Presence Under Pressure]        |  |
|  | [Conflict as Growth Tool]                  |  |
|  | [Custom Topic]                             |  |
|  +--------------------------------------------+  |
|  |                                            |  |
|  | You: [clicked Building Trust...]           |  |
|  +--------------------------------------------+  |
|  |                                            |  |
|  | HGC: "Generated post about building trust. |  |
|  | Check the document for preview.            |  |
|  |                                            |  |
|  | [Approve] [Make More Casual] [Regenerate]  |  |
|  +--------------------------------------------+  |
|                                                  |
|  Input Area                                      |
|  +--------------------------------------------+  |
|  | Type your message...                       |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

**Components:**
- Chat message history (scrollable, auto-scroll to bottom)
- Inline buttons (minimal, no borders/shadows, just clickable text)
- Input field (always visible, bottom-fixed)

**Interactions:**
- Type message → Enter or click Send
- Click inline button → Sends as user message
- Streaming responses appear word-by-word
- Auto-fullscreen if content >500 chars + trigger keywords

**Bolt.new Prompt:**
```
Create chat interface with:
- Message history (flex-col, gap-4, scrollable)
- User messages: right-aligned, blue background
- HGC messages: left-aligned, gray background
- Inline buttons: minimal text buttons, no borders, hover:underline
- Streaming support: append chunks in real-time
- Input field: bottom-fixed, auto-focus
- Support markdown in messages
```

---

### Screen 2: Working Document (Content Output)

**Purpose:** Shows ONLY generated content (posts, reports, lead magnets)

**Layout:**

```
+--------------------------------------------------+
|  RevOS          [Chat] [Document] [Dashboard]    |
+--------------------------------------------------+
|                                                  |
|  Working Document                                |
|  +--------------------------------------------+  |
|  |                                            |  |
|  | [Content streams here in real-time]        |  |
|  |                                            |  |
|  | "I had a VP ask me yesterday: 'My remote   |  |
|  | team isn't arguing anymore... and that     |  |
|  | terrifies me.'                             |  |
|  |                                            |  |
|  | Silence isn't harmony. It's fear.          |  |
|  |                                            |  |
|  | Here's how to create psychological safety: |  |
|  |                                            |  |
|  | 1. Reward dissent publicly                 |  |
|  | 2. Share your own mistakes first           |  |
|  | 3. Ask 'What am I missing?' in meetings    |  |
|  |                                            |  |
|  | Conflict isn't the problem. Silence is."   |  |
|  |                                            |  |
|  +--------------------------------------------+  |
|                                                  |
|  [No buttons or questions - content only]        |
|                                                  |
+--------------------------------------------------+
```

**Components:**
- Document view (full-width, markdown rendering)
- Streaming text support
- NEVER shows buttons, questions, or forms
- Clean preview space

**Interactions:**
- Content syncs from chat automatically
- User reads, reviews content
- All actions happen in chat (approve, edit, etc.)

**Bolt.new Prompt:**
```
Create working document view:
- Full-width content area
- Markdown rendering (prose class for typography)
- Streaming support (append text chunks)
- NEVER show buttons or interactive elements
- Clean, distraction-free reading experience
```

---

### Screen 3: Dashboard (Secondary - Metrics & Context)

**Purpose:** Shows campaign metrics, lead lists, analytics

**Layout:**

```
+--------------------------------------------------+
|  RevOS          [Chat] [Document] [Dashboard]    |
+--------------------------------------------------+
|                                                  |
|  Campaigns Overview                              |
|  +--------------------------------------------+  |
|  | Active (3)                                 |  |
|  |                                            |  |
|  | Product Launch - New Feature    [Active]   |  |
|  | 68 sent • 24 replies (35.3%) • 12 demos    |  |
|  | [View Details]                             |  |
|  |                                            |  |
|  | Building Trust with Remote Teams [Active]  |  |
|  | 32 sent • 12 replies (37.5%) • 8 calls     |  |
|  | [View Details]                             |  |
|  +--------------------------------------------+  |
|                                                  |
|  Performance (Last 7 Days)                       |
|  +--------------------------------------------+  |
|  | 📊 Reply Rate: 35.8% avg                  |  |
|  | 📞 Calls Booked: 20                       |  |
|  | ✅ Demos Completed: 15                    |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

**Components:**
- Campaign cards (summary view)
- Metrics cards (high-level stats)
- Click campaign → Detailed view with funnel

**Interactions:**
- View metrics passively
- Click campaign for deep dive
- Primarily used AFTER chat interaction (context checking)

**Bolt.new Prompt:**
```
Create dashboard with:
- Campaign cards (title, status, key metrics)
- Metrics summary (reply rate, calls, demos)
- Minimal design, focus on data
- Click card → Navigate to /dashboard/campaigns/[id]
- Real-time updates via Supabase realtime
```

---

## Interaction Patterns

### Pattern 1: Chat-Driven UI Navigation

**Principle:** User speech triggers automatic navigation, user SEES it happen

**Examples:**

```
User: "campaign" → Navigate to /dashboard/campaigns
User: "write" → Navigate to Working Document + load write interface
User: "leads" → Navigate to /dashboard/leads
User: "review emails" → Navigate to /dashboard/email-review
```

**Implementation:**
```typescript
// Intent detection
if (userMessage.includes('campaign')) {
  await navigateTo('/dashboard/campaigns')
  return "Opening campaigns dashboard..."
}

if (userMessage.includes('write')) {
  await navigateTo('/document')
  const topics = await generateTopics(cartridges)
  return { topics, inlineButtons: true }
}
```

**Guidelines:**
- Navigation happens WHILE HGC responds
- User sees real-time page changes
- Transparency over black box execution

---

### Pattern 2: Inline Buttons vs Working Document

**Two distinct UI spaces:**

**Chat (80% of interactions):**
- Conversational Q&A
- Inline buttons for choices
- Real-time feedback
- Navigation triggers

**Working Document (20% - content output only):**
- Shows ONLY generated content
- NEVER shows buttons, questions, forms
- Clean preview space

**Example:**

```
Chat:
HGC: "What topic would you like to write about?"
[AI Leadership] [Content Strategy] [Q4 Growth] [Custom Topic]

Working Document:
[Generated post content appears here - no buttons]
```

**Guidelines:**
- Buttons in chat are minimal (no borders/shadows)
- Document is read-only output space
- Clear separation of concerns

---

### Pattern 3: Real-Time Form Filling

**Principle:** When user requests action, HGC fills forms AS USER WATCHES

**Example:**

```
User: "Create campaign for AI leadership content"

HGC Actions (visible to user):
1. Navigate to /dashboard/campaigns/new
2. Fill "Campaign Name" = "AI Leadership"
3. Load lead magnet library
4. Show inline buttons: [5 Conversations Guide] [Trust Framework] [Custom]
```

**Implementation:**
```typescript
// Navigate first
await navigateTo('/dashboard/campaigns/new')

// Fill form fields with delay (visible to user)
await fillFormField('name', 'AI Leadership', { delay: 200 })
await fillFormField('target', 'LinkedIn commenters', { delay: 200 })

// Show inline decision
return {
  message: "Choose lead magnet:",
  interactive: {
    type: 'decision',
    options: leadMagnets
  }
}
```

**Guidelines:**
- User WATCHES form getting filled
- Trust through transparency
- Can intervene at any point

---

### Pattern 4: Cartridge Context Loading (MANDATORY)

**Principle:** EVERY interaction queries cartridges BEFORE generating response

**Flow:**

```typescript
// 1. Load cartridges (happens BEFORE response)
const brand = await loadCartridge('brand', { clientId, userId })
const style = await loadCartridge('style', { clientId, userId })
const voice = await loadCartridge('voice', { userId, campaignId })

// 2. Generate response using context
const response = await agentkit.generate(userMessage, {
  context: { brand, style, voice }
})
```

**Brand Cartridge Fields:**
- core_messaging
- industry
- target_audience
- core_values
- brand_voice

**Style Cartridge Fields:**
- tone_of_voice
- writing_style
- personality_traits

**Voice Cartridge:**
- 4-tier cascade: request → campaign → user → default

**Guidelines:**
- NO generic responses - always personalized
- Cartridges queried even for simple interactions
- Voice cartridge filter on ALL content (no exceptions)

---

### Pattern 5: Session Persistence

**Principle:** Every interaction saves to database, returns sessionId

**Implementation:**

```typescript
// 1. Get or create session
const session = await getOrCreateSession({ userId, clientId })

// 2. Save messages
await saveMessages(sessionId, [
  { role: 'user', content: userMessage },
  { role: 'assistant', content: assistantMessage }
])

// 3. MUST return sessionId
return { sessionId, messages }
```

**Tables:**
- chat_sessions
- chat_messages

**Benefits:**
- Cross-session context
- Conversation history
- Continuity across logins

**Guidelines:**
- Always return sessionId in response
- Load previous context on session resume
- Mem0 integration for long-term memory

---

## Acceptance Criteria Summary

### Global Requirements

**Performance:**
- All chat responses <2s
- Cartridge loading <500ms
- Navigation transitions <200ms
- Streaming starts immediately (<100ms to first chunk)
- Dashboard updates real-time (Supabase real-time)

**HGC Architecture Compliance:**
- AgentKit SDK only (NO manual OpenAI calls)
- Cartridge context loaded BEFORE every response
- Voice cartridge filter on ALL content
- Session persistence + return sessionId
- Console DB for system prompts (no >50 line hardcoding)

**UI/UX:**
- Chat is primary interface (NOT dashboard)
- Inline buttons minimal (no borders/shadows)
- Working Document shows ONLY content (no buttons)
- Real-time form filling visible to user
- Navigation happens as user watches (transparency)

**Security:**
- RLS policies enforce tenant isolation
- Supabase service role key backend only
- Supabase anon key frontend only
- Session expires after 7 days

---

## Key Workflow Examples (v1 vs v2)

### Example 1: Creating LinkedIn Post

**v1 (Dashboard-First):**
1. User navigates to /dashboard/posts
2. Clicks "New Post" button
3. Fills form: topic, tone, length
4. Clicks "Generate"
5. Waits for generation
6. Reviews in modal
7. Clicks "Schedule"

**v2 (HGC Chat-Driven):**
1. User: "write"
2. HGC loads cartridges, shows personalized topics as inline buttons
3. User clicks topic
4. Content streams into Working Document in real-time
5. Chat shows [Approve] [Edit] buttons
6. User clicks [Approve]
7. DateTime picker appears inline in chat
8. User schedules, done

**Improvement:** Faster, more natural, cartridge-driven personalization

---

### Example 2: Creating Campaign

**v1 (Dashboard-First):**
1. User navigates to /dashboard/campaigns
2. Clicks "New Campaign"
3. Fills form manually
4. Uploads CSV of leads
5. Writes DM template manually
6. Clicks "Save"

**v2 (HGC Chat-Driven):**
1. User: "campaign"
2. HGC navigates to /dashboard/campaigns
3. HGC: [Create from LinkedIn Post] [Create from Scratch]
4. User clicks [Create from LinkedIn Post]
5. User pastes URL
6. HGC scrapes, enriches leads, auto-fills form AS USER WATCHES
7. HGC generates DMs using cartridges, shows 3 samples
8. User clicks [Approve & Send]

**Improvement:** Automation with transparency, cartridge-driven DM personalization

---

### Example 3: Analyzing Campaign

**v1 (Dashboard-First):**
1. User navigates to /dashboard/campaigns
2. Clicks campaign from list
3. Reviews static metrics
4. Clicks "Export" for leads

**v2 (HGC Chat + Dashboard Hybrid):**
1. User: "How's my product launch campaign doing?"
2. HGC queries database, shows summary in chat
3. HGC auto-navigates to /dashboard/campaigns/[id]
4. Dashboard shows real-time funnel (Recharts)
5. User clicks funnel stage to drill down
6. Chat available for follow-up questions

**Improvement:** Natural language query, automatic navigation, real-time updates

---

## Major Changes from v1 to v2

### 1. Primary Interface Shift
**v1:** Dashboard-first (traditional SaaS)
**v2:** Chat-first (conversational orchestration)

### 2. Cartridge Context Integration
**v1:** Generic AI responses
**v2:** All responses personalized via brand/style/voice cartridges (loaded BEFORE generation)

### 3. Real-Time Transparency
**v1:** Background processes (user waits)
**v2:** User SEES form filling, navigation, content generation in real-time

### 4. Inline Workflows
**v1:** Modals, separate pages, complex flows
**v2:** Inline buttons in chat, minimal navigation, streamlined UX

### 5. Voice Cartridge Mandatory
**v1:** Optional tone settings
**v2:** ALL content filtered through voice cartridge (4-tier cascade)

### 6. Session Persistence
**v1:** Stateless interactions
**v2:** Session-aware via chat_sessions + chat_messages tables, Mem0 integration

---

## Implementation Checklist

For ANY new HGC feature:

1. Define intent detection (what user utterances trigger this)
2. Identify cartridges to load (brand/style/voice/preferences)
3. Define UI navigation (where to send user)
4. Design inline buttons (what choices to show)
5. Implement real-time orchestration (form filling, page updates)
6. Route content through voice cartridge
7. Save session state
8. Test with health check endpoint (/api/health)

---

## Next Steps

Use this FSD v2 to:

1. Generate UI with Bolt.new (paste wireframe descriptions as prompts)
2. Validate with Chase (are these the right HGC workflows?)
3. Configure AgentKit (user flows define agent workflows)
4. Test with beta clients (Rachel, Jake personas)
5. Ensure health check compliance (verify cartridges, session persistence, AgentKit usage)

See companion documents:
- HGC_WORKFLOW_SPECIFICATION.md - Detailed architecture patterns
- CLAUDE.md - Implementation rules and non-negotiables
- HGC API Contract (docs/api/hgc-contract.md) - Frontend/backend contract
