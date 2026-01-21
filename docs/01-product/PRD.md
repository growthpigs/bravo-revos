# RevOS Product Requirements Document

## Philosophy

> **"Jobs to be done > Observability"**

Clients (coaches, small businesses) want **excellence delivered**, not dashboards to manage. AgentKit handles most operations via chat, with minimal UI for analytics and approvals.

---

## MVP Scope

### IN Scope (V1)

| # | Feature | Priority |
|---|---------|----------|
| 1 | LinkedIn Comment Scraping (Unipile API) | P0 |
| 2 | Lead Enrichment (Apollo.io MCP) | P0 |
| 3 | DM Automation (Unipile + rate limiting) | P0 |
| 4 | Email Sequences (Instantly/Smartlead) | P0 |
| 5 | Lead Magnet Library (pre-built + AI generation) | P1 |
| 6 | Content Generation (AgentKit + Context7 + Canva) | P1 |
| 7 | Cartridge System (Mem0 + Supabase) | P0 |
| 8 | Analytics (PostHog + Clarity) | P1 |
| 9 | Multi-tenant Auth (Supabase) | P0 |

### OUT of Scope (V2)

- Pod Resharing System (60-min coordination)
- GoHighLevel CRM Sync
- SMS/MMS Outreach
- Advanced A/B testing
- White-label branding
- Mobile apps

---

## Feature Details

### 1. LinkedIn Comment Scraping

**User Story:** As a client, I want to automatically scrape engaged commenters from my LinkedIn posts so I can reach out to warm leads.

**Acceptance Criteria:**
- AgentKit accepts LinkedIn post URL via chat
- Calls Unipile API to scrape all comments
- Extracts: commenter name, profile URL, comment text, timestamp
- Stores in Supabase `leads` table with status='scraped'
- Handles rate limiting (max 100 posts/hour)
- Skips duplicate commenters

### 2. Lead Enrichment (Apollo.io)

**User Story:** As a client, I want scraped profiles enriched with email + company data for multi-channel outreach.

**Acceptance Criteria:**
- Automatically enriches all leads with status='scraped'
- Retrieves: email, company name, job title, company size
- Sets enrichment_status='enriched' or 'not_found'
- Tracks Apollo credits used per client (billing)
- Handles failures gracefully (retry 3x)

### 3. DM Automation

**User Story:** As a client, I want personalized DMs sent automatically to enriched leads.

**Acceptance Criteria:**
- AgentKit generates personalized DM using cartridge + lead context
- DM mentions specific detail from comment
- Respects rate limits (50 DMs/hour per LinkedIn account)
- Staggered sending (2-15 min random delays)
- Tracks: sent, delivered, replied, bounced
- Human approval option (content only)

### 4. Email Sequences

**User Story:** As a client, I want automated email follow-ups for leads who don't respond to DMs.

**Acceptance Criteria:**
- Trigger email sequence if no DM response after 48 hours
- Only send to enriched leads with valid email
- 3-email sequence: intro, value, call-to-action
- Personalized using cartridge + lead context
- Stops sequence if lead replies anywhere

### 5. Cartridge System

**User Story:** As a client, I want all content generated in my unique voice and style.

**Acceptance Criteria:**
- Cartridge defines persona, writing style, industry knowledge
- Stored in Mem0 for flexible retrieval
- AgentKit loads cartridge for every content generation
- Learns from user feedback (approvals/edits)
- 3 default cartridges provided

### 6. Multi-Tenant Authentication

**User Story:** As a client, I want secure access to only my data.

**Acceptance Criteria:**
- Supabase Auth with email/password
- JWT tokens for API authentication
- Row-Level Security (RLS) policies on all tables
- Super admin role bypasses RLS
- Client role sees only their data

---

## Success Metrics (MVP)

### Technical
- Uptime: 99% availability
- DM delivery rate: >95%
- Email delivery rate: >90%
- Enrichment success: >70%
- API response time: <2s

### Business
- Time to first campaign: <10 minutes
- Leads scraped per campaign: >50
- DM → Reply rate: >10%
- Email → Reply rate: >5%
- Cost per client: <$350/month

### User Experience
- Client satisfaction: 4.5/5 stars
- Content approval rate: >80% (first draft)
- Support tickets: <2 per client/month

---

## MVP Complete When

1. Client can create campaign via AgentKit chat
2. AgentKit scrapes LinkedIn comments automatically
3. Apollo enriches leads with emails
4. DMs sent with rate limiting + personalization
5. Email sequences trigger for non-responders
6. Lead magnet library available (50+ assets)
7. Content generation works (posts + graphics)
8. Cartridge system personalizes all content
9. Analytics dashboards show performance
10. Multi-tenant auth isolates client data

---

*Last Updated: 2026-01-03*
*Source: archon-specs/04-MVP-Feature-Specification.md*
