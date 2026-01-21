# RevOS Technical Architecture

## Core Philosophy

> "Assembling Lego blocks, not carving marble"

RevOS is built using **composition over custom code** - leveraging AgentKit orchestration and MCP integrations to create a flexible, maintainable LinkedIn growth engine.

---

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: User Interface (Bolt.new Generated)               │
│ • Floating Chat (AgentKit) - bottom-right                  │
│ • Minimal Dashboards - analytics, approval queue, leads    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: AgentKit Orchestration (OpenAI)                   │
│ • Campaign Manager Agent                                   │
│ • Lead Enrichment Agent                                    │
│ • Content Generation Agent                                 │
│ • Built-in: WebSearch, FileSearch, ImageGen, CodeInterp   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: MCP Integration Layer                             │
│ ✅ Apollo.io MCP - Lead enrichment                         │
│ ✅ Mem0 MCP - Cartridge storage + persistent memory        │
│ ✅ Supabase MCP - Database operations                      │
│ ✅ Canva MCP - Professional graphics                       │
│ ✅ Context7 MCP - Documentation + content ideas            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: Background Systems (Node.js + BullMQ)             │
│ • DM Queue Worker (50 DMs/hour rate limiting)              │
│ • Email Sequence Worker (Instantly/Smartlead)              │
│ • Cron Jobs (post monitoring, analytics sync)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 5: Data Layer (Supabase All-in-One)                  │
│ PostgreSQL: users, cartridges, campaigns, leads, messages  │
│ PGVector: embeddings, client_voice, lead_magnet_search     │
│ Platform: Auth (JWT), Real-time, Storage, Edge Functions   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 6: External APIs                                      │
│ • Unipile: LinkedIn OAuth, DMs, comment scraping ($5/acct) │
│ • Apollo.io: Email discovery, company data                 │
│ • Instantly: Email sequences, deliverability               │
│ • PostHog + Clarity: Analytics, session recordings         │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### Why Supabase Alone (No Neon)?

**Supabase Provides:**
- PostgreSQL + PGVector (same as Neon)
- Built-in Auth (JWT, RLS policies)
- Real-time subscriptions (dashboard updates)
- Storage (images, PDFs)
- Edge Functions (webhooks)
- Auto-generated REST APIs

**Decision:** Supabase only - reduces complexity, provides more features.

### Why AgentKit (OpenAI) vs Anthropic?

**AgentKit Advantages:**
- Visual Agent Builder (drag-and-drop workflows)
- Built-in WebSearchTool (no Perplexity needed)
- Native tool orchestration
- Human-in-loop nodes ("Ask User")

**Decision:** Pure AgentKit for MVP - can add Anthropic via Portkey later.

### Why Mem0 + Supabase PGVector?

- **Mem0:** Conversational memory, cartridge retrieval, learning from feedback
- **PGVector:** Lead magnet semantic search, similar lead matching

**Together:** Mem0 uses Supabase as vector storage backend → Single database, dual interfaces.

---

## Cartridge System

A **cartridge** is a context module that defines:
- Persona (Executive Coach, Startup Founder, etc.)
- Writing style (tone, vocabulary, structure)
- Industry knowledge (niche-specific insights)
- Tools enabled (which MCPs this cartridge can use)

### Schema

```typescript
interface Cartridge {
  cartridge_id: string;
  name: string;
  persona: {
    role: string;
    expertise: string[];
    target_audience: string;
  };
  writing_style: {
    tone: "professional" | "casual" | "authoritative";
    vocabulary_level: 1-10;
    sentence_structure: "short" | "medium" | "long";
  };
  industry_knowledge: {
    niche: string;
    key_topics: string[];
    common_pain_points: string[];
  };
  tools_enabled: string[];
  system_prompt: string;
  examples: { post: string; dm: string; email: string; }[];
}
```

---

## Cost Analysis

### Runtime (Per Client/Month)

| Service | Cost |
|---------|------|
| OpenAI API (GPT-4o + DALL-E) | $70-120 |
| Unipile (LinkedIn) | $5/account |
| Apollo.io (500 enrichments) | $100 |
| Instantly (email) | $30 |
| Supabase Pro | $25 |
| Mem0 | $20 |
| PostHog | $0 (free tier) |
| **Total** | **$295-345/client/month** |

### Revenue Model
- Charge clients: $2,000-5,000/month
- Margin: 85-93%
- Break-even: 1 client

---

## Security & Compliance

### Multi-Tenant Isolation

```sql
CREATE POLICY "Users see own data"
  ON leads FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  ));
```

### LinkedIn Compliance
- Use Unipile (legal compliance layer)
- Rate limiting (50 DMs/hour)
- Human-in-loop for content
- No automated connection requests

---

*Last Updated: 2026-01-03*
*Source: archon-specs/01-RevOS-Technical-Architecture-v3.md*
