# RevOS Technical Architecture v3

## Core Philosophy

> "Assembling Lego blocks, not carving marble"

RevOS is built using **composition over custom code** - leveraging AgentKit orchestration and MCP integrations to create a flexible, maintainable LinkedIn growth engine.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: User Interface (Bolt.new Generated)               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Floating Chat (AgentKit)                                │ │
│ │ - Bottom-right corner                                   │ │
│ │ - Cartridge selector (client context switching)         │ │
│ │ - Natural language commands                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Minimal Dashboards                                      │ │
│ │ - Analytics (PostHog data visualization)                │ │
│ │ - Content approval queue                                │ │
│ │ - Lead management                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: AgentKit Orchestration (OpenAI)                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Three Core Agents (Agent Builder Workflows)             │ │
│ │                                                         │ │
│ │ 1. Campaign Manager                                     │ │
│ │    - Create campaigns via natural language              │ │
│ │    - Load cartridge from Mem0                           │ │
│ │    - Generate content strategy                          │ │
│ │                                                         │ │
│ │ 2. Lead Enrichment Agent                                │ │
│ │    - Trigger Unipile comment scraping                   │ │
│ │    - Call Apollo MCP for enrichment                     │ │
│ │    - Generate personalized DMs via cartridge            │ │
│ │    - Queue messages to background system                │ │
│ │                                                         │ │
│ │ 3. Content Generation Agent                             │ │
│ │    - Retrieve cartridge persona from Mem0               │ │
│ │    - Generate posts via Context7 + GPT-4o               │ │
│ │    - Create graphics via Canva MCP                      │ │
│ │    - Human approval workflow (content only)             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ AgentKit Built-in Tools                                 │ │
│ │ - WebSearchTool (trend research, voice finding)         │ │
│ │ - FileSearchTool (retrieve from Mem0 knowledge base)    │ │
│ │ - ImageGenerationTool (DALL-E for graphics)             │ │
│ │ - CodeInterpreterTool (data analysis)                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: MCP Integration Layer                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Critical MCPs (80/20 Rule)                              │ │
│ │                                                         │ │
│ │ ✅ Apollo.io MCP - Lead enrichment                      │ │
│ │ ✅ Mem0 MCP - Cartridge storage + persistent memory     │ │
│ │ ✅ Supabase MCP - Database operations                   │ │
│ │ ✅ Canva MCP - Professional graphics                    │ │
│ │ ✅ Context7 MCP - Documentation + content ideas         │ │
│ │ ✅ Clarity MCP - Session analytics                      │ │
│ │                                                         │ │
│ │ V2 (Not MVP):                                           │ │
│ │ ⚠️ GoHighLevel MCP - CRM sync                           │ │
│ │ ⚠️ Apify MCP - Advanced web scraping                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: Background Systems (Node.js + BullMQ)             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Persistent Queue System                                 │ │
│ │                                                         │ │
│ │ DM Queue Worker:                                        │ │
│ │ - Rate limiting (50 DMs/hour per account)               │ │
│ │ - Staggered sending (2-15 min delays)                   │ │
│ │ - Retry logic with exponential backoff                  │ │
│ │ - Unipile API integration                               │ │
│ │                                                         │ │
│ │ Email Sequence Worker:                                  │ │
│ │ - Instantly/Smartlead API integration                   │ │
│ │ - Fallback for non-responsive DMs                       │ │
│ │ - Trigger after 48 hours no DM response                 │ │
│ │                                                         │ │
│ │ Cron Jobs:                                              │ │
│ │ - Monitor LinkedIn posts (every 30 sec)                 │ │
│ │ - Process engagement queue                              │ │
│ │ - Sync analytics to PostHog                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 5: Data Layer (Supabase All-in-One)                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PostgreSQL + PGVector                                   │ │
│ │                                                         │ │
│ │ Core Tables:                                            │ │
│ │ - users (multi-tenant isolation via RLS)                │ │
│ │ - cartridges (persona, style, knowledge)                │ │
│ │ - campaigns (client campaigns)                          │ │
│ │ - leads (scraped + enriched prospects)                  │ │
│ │ - messages (DM/email sequences)                         │ │
│ │ - lead_magnets (library + generated)                    │ │
│ │ - posts (LinkedIn content + performance)                │ │
│ │                                                         │ │
│ │ Vector Tables (PGVector):                               │ │
│ │ - embeddings (Mem0 memory storage)                      │ │
│ │ - client_voice_embeddings (writing style)               │ │
│ │ - lead_magnet_embeddings (semantic search)              │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Supabase Platform Features                              │ │
│ │ - Auth: JWT multi-tenant isolation                      │ │
│ │ - Real-time: Live dashboard updates                     │ │
│ │ - Storage: Post images, lead magnet PDFs                │ │
│ │ - Edge Functions: Webhook handlers                      │ │
│ │ - PostgREST: Auto-generated REST APIs                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 6: External APIs                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ LinkedIn Integration (Unipile)                          │ │
│ │ - OAuth authentication                                  │ │
│ │ - Post publishing                                       │ │
│ │ - Comment scraping                                      │ │
│ │ - DM sending ($5/account/month)                         │ │
│ │                                                         │ │
│ │ Lead Enrichment (Apollo.io)                             │ │
│ │ - Email discovery                                       │ │
│ │ - Company data                                          │ │
│ │ - Job title verification                                │ │
│ │                                                         │ │
│ │ Email Sequences (Instantly/Smartlead)                   │ │
│ │ - Multi-step campaigns                                  │ │
│ │ - Deliverability optimization                           │ │
│ │ - Response tracking                                     │ │
│ │                                                         │ │
│ │ Analytics (PostHog + Clarity)                           │ │
│ │ - Per-tenant usage tracking                             │ │
│ │ - Session recordings                                    │ │
│ │ - Conversion funnels                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Dual Development Model

### Why This Approach?

**Problem**: Traditional development takes 12-16 weeks for a system this complex.

**Solution**: Parallel development using AI-native tools.

### Bolt.new (UI Scaffolding)

**Generates in hours/days:**
- Complete database schemas (SQL migrations)
- React components with TypeScript
- API route handlers
- Authentication flows
- Dashboard layouts

**Example prompt:**
```
Create a Supabase-backed multi-tenant LinkedIn growth engine with:
- User authentication (JWT)
- Campaign management table
- Lead tracking with enrichment status
- Message queue visualization
- Analytics dashboard with PostHog integration
```

**Output**: 95% complete UI in <24 hours

### Claude Code (AgentKit Development)

**Builds:**
- OpenAI Agent Builder workflows
- MCP server integrations
- Background queue systems (BullMQ)
- Complex business logic
- Webhook handlers

**Cannot use Bolt.new for:**
- AgentKit workflow configuration
- Custom MCP integrations
- Real-time queue orchestration
- Multi-step agent logic

### Development Timeline

```
Week 1-2: Bolt.new Sprint
├── Database schema generation
├── Basic UI components
├── Auth + multi-tenancy
└── Dashboard scaffolding

Week 2-4: AgentKit Development (Parallel)
├── Campaign Manager agent
├── Lead Enrichment agent
├── Content Generation agent
└── MCP integrations

Week 4-6: Background Systems
├── BullMQ setup
├── DM queue worker
├── Email sequence worker
└── Cron jobs

Week 6-8: Integration + Polish
├── Connect Bolt UI to AgentKit
├── Analytics implementation
├── Testing + bug fixes
└── Documentation
```

## Cartridge System (Control Center)

### What is a Cartridge?

A **cartridge** is a context module that defines:
- Persona (Executive Coach, Startup Founder, etc.)
- Writing style (tone, vocabulary, structure)
- Industry knowledge (niche-specific insights)
- Tools enabled (which MCPs this cartridge can use)

### Storage Architecture

**Mem0 (Flexible, Primary)**
- Stores cartridge as structured memory
- Enables both approaches simultaneously:
  - System prompts (baked into agent config)
  - Swappable modules (loaded dynamically)
- Scoped by user_id + cartridge_id
- Persistent across sessions

**Supabase PGVector (Backup + Search)**
- Cartridge embeddings for semantic search
- "Find cartridge similar to [description]"
- Redundant storage for reliability

### Cartridge Schema

```typescript
interface Cartridge {
  cartridge_id: string;
  name: string;
  persona: {
    role: string; // "Executive Coach", "Startup Founder"
    expertise: string[];
    target_audience: string;
  };
  writing_style: {
    tone: "professional" | "casual" | "authoritative";
    vocabulary_level: 1-10;
    sentence_structure: "short" | "medium" | "long";
    storytelling_approach: string;
  };
  industry_knowledge: {
    niche: string;
    key_topics: string[];
    common_pain_points: string[];
    solution_frameworks: string[];
  };
  tools_enabled: string[]; // MCP IDs
  system_prompt: string; // Generated from above
  examples: {
    post: string;
    dm: string;
    email: string;
  }[];
  created_at: Date;
  updated_at: Date;
}
```

### How AgentKit Uses Cartridges

```python
# Agent Builder Workflow
1. Ask User: "Which client are you working with?"
2. File Search: Retrieve cartridge from Mem0
3. Load Context: Apply cartridge to agent system prompt
4. Generate Text: "Create LinkedIn post about [topic]" 
   → Uses cartridge persona + writing style
5. Store Feedback: User approves/edits → Update cartridge in Mem0
```

## Key Technical Decisions

### Why Supabase Alone (No Neon)?

✅ **Supabase Provides:**
- PostgreSQL + PGVector (same as Neon)
- Built-in Auth (JWT, RLS policies)
- Real-time subscriptions (dashboard updates)
- Storage (images, PDFs)
- Edge Functions (webhooks)
- Auto-generated REST APIs

❌ **Neon Advantages (Not Needed for MVP):**
- Serverless scaling (Supabase dedicated is fine for MVP)
- Database branching (not using git-based DB workflow)
- Slightly cheaper for scale-to-zero (we need always-on)

**Decision**: Supabase only - reduces complexity, provides more features.

### Why AgentKit (OpenAI) vs Anthropic Skills?

✅ **AgentKit Advantages:**
- Visual Agent Builder (drag-and-drop workflows)
- Built-in WebSearchTool (no Perplexity needed)
- Native tool orchestration
- Human-in-loop nodes ("Ask User")
- Better for multi-step workflows

❌ **Anthropic Skills:**
- Code-first (requires more development)
- No visual builder
- Separate ecosystems (no native interop with OpenAI)

**Decision**: Pure AgentKit for MVP - can add Anthropic via Portkey later if needed.

### Why Mem0 + Supabase PGVector?

**Mem0 Handles:**
- Conversational memory (chat history)
- Cartridge retrieval ("What's my client's voice?")
- Learning from feedback (user approvals/edits)

**Supabase PGVector Handles:**
- Lead magnet semantic search
- Similar lead matching
- Content recommendation

**Together**: Mem0 uses Supabase as vector storage backend → Single database, dual interfaces.

## Cost Analysis

### Development (One-Time)
- Bolt.new: $0 (free tier)
- Claude Code: $0 (using existing subscription)
- Total: **$0**

### Runtime (Per Client/Month)
- OpenAI API (GPT-4o + DALL-E): $70-120
- Unipile (10 pod members): $50
- Apollo.io (500 enrichments): $100
- Instantly (email sequences): $30
- Supabase Pro: $25
- Mem0: $20
- PostHog: $0 (free tier for <1M events)
- **Total: $295-345/client/month**

### Revenue Model
- Charge clients: $2,000-5,000/month
- Margin: 85-93%
- Break-even: 1 client

## Security & Compliance

### Multi-Tenant Isolation

**Supabase RLS (Row-Level Security)**
```sql
CREATE POLICY "Users see own data"
  ON leads FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  ));
```

### API Key Management

- Store in Supabase Vault (encrypted at rest)
- Never expose in client-side code
- Rotate quarterly
- Track usage per tenant (billing + security)

### LinkedIn Compliance

- Use Unipile (legal compliance layer)
- Rate limiting (50 DMs/hour)
- Human-in-loop for content (avoid spam)
- No automated connection requests

## Monitoring & Observability

### PostHog Analytics

**Track per tenant:**
- API usage (OpenAI tokens, Apollo credits)
- Feature adoption (DMs sent, emails triggered)
- Conversion funnels (scrape → enrich → DM → reply)
- Cost per lead

### Clarity Session Recordings

- User behavior heatmaps
- Identify UI confusion points
- Optimize approval workflows

### Error Handling

- Sentry integration (optional, not in MVP)
- Slack notifications for critical failures
- Retry logic with exponential backoff

## Next Steps

See companion documents:
1. **Cartridge System Specification** - Detailed cartridge schemas
2. **Lead Magnet Library** - Content pipeline
3. **MVP Feature Specification** - What's in/out of V1
4. **MCP Integration Guide** - Step-by-step setup
5. **Implementation Roadmap** - Week-by-week plan