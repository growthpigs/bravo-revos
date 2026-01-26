# Bravo revOS V1 - Complete Task Structure

**Project ID**: de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
**Total Tasks**: 19
**Total Story Points**: 116

---

## Epic Breakdown

| Epic | Tasks | Story Points | Branch Pattern |
|------|-------|--------------|----------------|
| Epic A: Bolt.new Scaffold | 1 | 15 | epic-A-bolt-scaffold |
| Epic B: Cartridge System | 4 | 23 | epic-B-cartridge-system |
| Epic C: Unipile & BullMQ | 3 | 20 | epic-C-unipile-bullmq |
| Epic D: Email & Webhook | 3 | 20 | epic-D-email-webhook |
| Epic E: Engagement Pods | 4 | 20 | epic-E-engagement-pods |
| Epic F: AI Integration | 2 | 10 | epic-F-ai-integration |
| Epic G: Monitoring & Testing | 2 | 8 | epic-G-monitoring-testing |

---

## 🎯 Epic A: Bolt.new Scaffold (15 points)

### A-01: Bolt.new Full-Stack Scaffold
**Story Points**: 15
**Priority**: critical
**Assignee**: User
**Branch**: epic-A-bolt-scaffold
**Status**: todo

**Description**:
Generate complete full-stack application using Bolt.new with 300-word self-contained prompt.

📖 BEFORE YOU START: This is THE FOUNDATION. Everything else depends on this scaffold.

🎯 OBJECTIVE:
Generate a production-ready Next.js 14 + Supabase application with:
- Multi-tenant architecture (agencies → clients → users)
- Admin portal (/admin/*) and Client dashboard (/dashboard/*)
- Complete database schema with RLS policies
- Authentication middleware
- iOS-style toggle components
- Lead magnet delivery system foundation

🔧 BOLT.NEW PROMPT (300 WORDS - SELF-CONTAINED):

Create a Next.js 14 full-stack lead magnet delivery system with:

DATABASE SCHEMA:
Multi-tenant: agencies → clients → users
Campaign tables: campaigns, lead_magnets, leads (status flow: comment_detected→dm_sent→email_captured→webhook_sent)
LinkedIn: linkedin_accounts (encrypted), posts, comments, dm_sequences
Cartridges: 4-tier system (system/workspace/user/skill) with voice parameters
Pods: pods, pod_members, pod_activities (min 9 members)
Webhooks: webhook_configs, webhook_deliveries (retry tracking)

FRONTEND STRUCTURE:
/admin/* - Agency admin portal (client management, system analytics, pod monitoring)
/dashboard/* - Client dashboard (campaign wizard, lead export, webhook config)
/api/* - API routes (Supabase client, auth middleware)

UI REQUIREMENTS:
shadcn/ui components throughout
iOS-style toggles for features (rounded, smooth animation, blue/gray states)
Multi-step campaign wizard (6 steps: upload → content → trigger → webhook → DM → review)
Real-time metrics with recharts
DataTables with filtering/sorting (tanstack-table)

AUTH & SECURITY:
Supabase Auth with middleware
RLS policies for multi-tenancy
Role-based routing (admin vs client)
Encrypted credential storage

KEY FEATURES:
Lead magnet upload to Supabase Storage
Webhook configuration UI (Zapier/Make/ConvertKit presets)
Voice cartridge settings page
Campaign performance dashboard
Lead export as CSV

TECH STACK:
Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth + Database + Storage), Recharts

OUTPUT:
SQL migrations, TypeScript types, RLS policies, all routes scaffolded, components styled

📚 REFERENCE DOCS:
- spec.md (complete system overview)
- data-model.md (database schema details)
- CONTEXT-FIRST-STANDARDIZATION-2025-11-04.md (Bolt optimization guide)

🔍 KNOWLEDGE BASE QUERIES:
- "Next.js 14 App Router with Supabase Auth middleware example"
- "shadcn/ui iOS-style toggle switch component"
- "Supabase Row Level Security policies for multi-tenant SaaS"
- "Next.js file upload to Supabase Storage with progress bar"

✅ DELIVERABLES:
1. Complete Next.js 14 project structure
2. Supabase schema with RLS policies
3. Admin portal routes (/admin/*)
4. Client dashboard routes (/dashboard/*)
5. Campaign wizard component
6. iOS-style toggle components
7. Authentication middleware
8. TypeScript type definitions

⚠️ CRITICAL REQUIREMENTS:
- ONE application with role-based routing (NOT separate apps)
- All database tables with proper foreign keys
- RLS policies enforcing tenant isolation
- Responsive design (mobile-first)
- Loading states for all async operations
- Error boundaries for all routes

📊 VALIDATION CHECKLIST:
- [ ] Can create agency/client/user hierarchy
- [ ] Admin can view all clients
- [ ] Client can only see their own data
- [ ] Campaign wizard completes all 6 steps
- [ ] File upload works to Supabase Storage
- [ ] Webhook config saves correctly
- [ ] iOS toggles animate smoothly
- [ ] RLS policies prevent cross-tenant access

🎯 SUCCESS CRITERIA:
User can generate entire scaffold in ONE Bolt.new session, push to GitHub, and have working foundation for all other epics.

---

## 🔧 Epic B: Cartridge System (23 points)

### B-01: Supabase Storage Setup
**Story Points**: 3
**Priority**: high
**Assignee**: CC1
**Branch**: epic-B-cartridge-system
**Status**: todo

**Description**:
Create lead-magnets bucket with RLS policies for secure file storage.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Set up Supabase Storage bucket for lead magnet files with multi-tenant security.

📚 PROJECT DOCS:
- data-model.md (Storage schema)
- spec.md lines 258-304 (Cartridge system)

🔍 KNOWLEDGE BASE:
- "Supabase Storage bucket creation with RLS policies"
- "Supabase Storage public vs private bucket configuration"

✅ DELIVERABLES:
1. lead-magnets bucket (private)
2. RLS policies (tenant-isolated access)
3. File upload API endpoint
4. Download URL generation

VALIDATION: Upload file as client A, verify client B cannot access.

---

### B-02: Cartridge Database & API
**Story Points**: 8
**Priority**: high
**Assignee**: CC1
**Branch**: epic-B-cartridge-system
**Status**: todo

**Description**:
Implement 4-tier cartridge system with voice parameters and inheritance.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Build cartridge database schema and CRUD API with 4-tier hierarchy.

📚 PROJECT DOCS:
- data-model.md (Cartridge schema)
- spec.md (Cartridge system details)

🔍 KNOWLEDGE BASE:
- "Recursive database queries for hierarchical data in PostgreSQL"
- "Supabase RLS policies for nested multi-tenant data"

✅ DELIVERABLES:
1. Cartridges table with parent_id
2. Voice parameters (tone, style, personality, vocabulary)
3. CRUD API endpoints
4. Inheritance resolution logic

VALIDATION: Create system→workspace→user→skill cartridges, verify inheritance.

---

### B-03: Voice Auto-Generation from LinkedIn
**Story Points**: 7
**Priority**: high
**Assignee**: CC2
**Branch**: epic-B-cartridge-system
**Status**: todo

**Description**:
Fetch 30 LinkedIn posts via Unipile, analyze with GPT-4 to generate voice profile.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Automatically generate voice cartridge from user's LinkedIn content.

📚 PROJECT DOCS:
- spec.md (Voice generation)
- data-model.md (Cartridge parameters)

🔍 KNOWLEDGE BASE:
- "Unipile LinkedIn API fetch user posts with pagination"
- "OpenAI GPT-4 prompt for voice style analysis"
- "Extract tone, personality, vocabulary from social media posts"

✅ DELIVERABLES:
1. Unipile posts fetch API
2. GPT-4 voice analysis prompt
3. Cartridge auto-creation endpoint
4. Voice preview UI component

VALIDATION: Analyze 30 posts, generate cartridge, verify accuracy against sample posts.

---

### B-04: Cartridge Management UI
**Story Points**: 5
**Priority**: high
**Assignee**: CC2
**Branch**: epic-B-cartridge-system
**Status**: todo

**Description**:
Build progressive disclosure UI for cartridge management and voice editing.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Create user-friendly interface for managing voice cartridges with progressive disclosure.

📚 PROJECT DOCS:
- spec.md (UI requirements)
- CONTEXT-FIRST-STANDARDIZATION-2025-11-04.md (UI patterns)

🔍 KNOWLEDGE BASE:
- "Progressive disclosure UI patterns for complex forms"
- "shadcn/ui collapsible accordion component"

✅ DELIVERABLES:
1. Cartridge list with hierarchy visualization
2. Edit form with progressive disclosure
3. Voice preview component
4. Auto-generate voice button

VALIDATION: Create/edit/delete cartridges, verify inheritance updates.

---

## 🔌 Epic C: Unipile & BullMQ (20 points)

### C-01: Unipile Integration & Session Management
**Story Points**: 5
**Priority**: high
**Assignee**: CC1
**Branch**: epic-C-unipile-bullmq
**Status**: todo

**Description**:
Implement LinkedIn session management with username/password auth and encrypted storage.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Securely connect and manage LinkedIn accounts via Unipile.

📚 PROJECT DOCS:
- spec.md (Unipile integration)
- data-model.md (linkedin_accounts table)

🔍 KNOWLEDGE BASE:
- "Unipile LinkedIn username password authentication flow"
- "Unipile session management and token refresh"
- "Encrypt sensitive credentials in Supabase PostgreSQL"

✅ DELIVERABLES:
1. Unipile auth API integration
2. Encrypted credential storage
3. Session expiry monitoring
4. Auto-reconnect logic

VALIDATION: Connect LinkedIn account, verify session persists across restarts.

---

### C-02: Comment Polling System
**Story Points**: 7
**Priority**: high
**Assignee**: CC2
**Branch**: epic-C-unipile-bullmq
**Status**: todo

**Description**:
Poll LinkedIn posts for comments at random 15-45 min intervals with bot filtering.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Detect trigger words in LinkedIn comments in real-time without hitting rate limits.

📚 PROJECT DOCS:
- spec.md (Comment polling)
- data-model.md (comments, posts tables)

🔍 KNOWLEDGE BASE:
- "Unipile LinkedIn API fetch post comments"
- "Detect bots in LinkedIn comments using Unipile"
- "BullMQ recurring job with random delay"

✅ DELIVERABLES:
1. Comment polling job (15-45min intervals)
2. Trigger word detection
3. Bot filtering logic
4. Comment deduplication

VALIDATION: Post with trigger word, verify comment detected within 45min.

---

### C-03: BullMQ Rate-Limited DM Queue
**Story Points**: 8
**Priority**: high
**Assignee**: CC3
**Branch**: epic-C-unipile-bullmq
**Status**: todo

**Description**:
Implement DM queue with 100 DMs/day per account limit and exponential backoff.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Send DMs via Unipile without exceeding LinkedIn rate limits.

📚 PROJECT DOCS:
- spec.md (DM delivery)
- data-model.md (dm_sequences table)

🔍 KNOWLEDGE BASE:
- "BullMQ rate limiting per job group"
- "Unipile LinkedIn send direct message API"
- "Exponential backoff retry strategy in BullMQ"

✅ DELIVERABLES:
1. BullMQ DM queue
2. Rate limiter (100 DMs/day/account)
3. Retry logic with exponential backoff
4. Failure tracking

VALIDATION: Queue 150 DMs, verify only 100 sent in 24 hours.

---

## 📧 Epic D: Email & Webhook (20 points)

### D-01: Email Extraction from DM Replies
**Story Points**: 5
**Priority**: high
**Assignee**: CC1
**Branch**: epic-D-email-webhook
**Status**: todo

**Description**:
Extract emails from DM replies using regex + GPT-4 fallback with confidence scoring.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Reliably extract email addresses from natural language DM responses.

📚 PROJECT DOCS:
- spec.md (Email extraction)
- data-model.md (leads table)

🔍 KNOWLEDGE BASE:
- "Regex pattern for email extraction from text"
- "OpenAI GPT-4 prompt for extracting email from message"
- "Confidence scoring for extracted data"

✅ DELIVERABLES:
1. Regex email extraction
2. GPT-4 fallback for complex cases
3. Confidence score calculation
4. Manual review queue for low confidence

VALIDATION: Test with 20 sample DM replies, verify 95%+ accuracy.

---

### D-02: Webhook to Client CRM/ESP
**Story Points**: 10
**Priority**: high
**Assignee**: CC2
**Branch**: epic-D-email-webhook
**Status**: todo

**Description**:
Send lead data to client CRM/ESP via webhook with HMAC signature and 4-attempt retry.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Reliably deliver lead data to client systems with security and retries.

📚 PROJECT DOCS:
- spec.md (Webhook delivery)
- data-model.md (webhook_configs, webhook_deliveries)

🔍 KNOWLEDGE BASE:
- "HMAC signature for webhook security"
- "HTTP retry strategy with exponential backoff"
- "Zapier webhook format requirements"
- "Make.com webhook integration best practices"

✅ DELIVERABLES:
1. Webhook delivery API
2. HMAC signature generation
3. 4-attempt retry with exponential backoff
4. Delivery status tracking
5. Webhook test tool UI

VALIDATION: Configure webhook, trigger lead, verify 4 retry attempts on failure.

---

### D-03: Mailgun One-Time Lead Magnet Delivery
**Story Points**: 5
**Priority**: high
**Assignee**: CC3
**Branch**: epic-D-email-webhook
**Status**: todo

**Description**:
Send lead magnet PDF via Mailgun with 5k emails/month free tier.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Deliver lead magnet files to captured email addresses.

📚 PROJECT DOCS:
- spec.md (Email delivery)
- data-model.md (leads table status flow)

🔍 KNOWLEDGE BASE:
- "Mailgun send email with attachment API"
- "Mailgun free tier limits 5000 emails per month"
- "Email deliverability best practices"

✅ DELIVERABLES:
1. Mailgun API integration
2. Email template with attachment
3. Delivery status tracking
4. Bounce handling

VALIDATION: Send test email with PDF, verify delivery and tracking.

---

## 🤝 Epic E: Engagement Pods (20 points)

### E-01: Pod Infrastructure & Database
**Story Points**: 5
**Priority**: medium
**Assignee**: CC1
**Branch**: epic-E-engagement-pods
**Status**: todo

**Description**:
Create pod database schema with min 9 members and participation tracking.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Build foundation for engagement pod automation.

📚 PROJECT DOCS:
- spec.md (Engagement pods)
- data-model.md (pods, pod_members, pod_activities)

🔍 KNOWLEDGE BASE:
- "LinkedIn engagement pod best practices"
- "Multi-tenant pod membership in Supabase"

✅ DELIVERABLES:
1. Pods table (min 9 members constraint)
2. Pod members table
3. Pod activities tracking
4. Pod CRUD API

VALIDATION: Create pod with 8 members, verify validation fails.

---

### E-02: LinkedIn Session Capture for Pod Members
**Story Points**: 5
**Priority**: medium
**Assignee**: CC2
**Branch**: epic-E-engagement-pods
**Status**: todo

**Description**:
Capture LinkedIn sessions for all pod members with hosted auth and expiry alerts.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Collect LinkedIn credentials from all pod members securely.

📚 PROJECT DOCS:
- spec.md (Pod session management)
- data-model.md (linkedin_accounts)

🔍 KNOWLEDGE BASE:
- "Unipile LinkedIn session capture for multiple accounts"
- "Session expiry monitoring and alerts"

✅ DELIVERABLES:
1. Hosted auth page for pod members
2. Session storage per member
3. Expiry alerts (email/SMS)
4. Re-auth flow

VALIDATION: 9 members auth, verify all sessions active.

---

### E-03: Pod Post Detection System
**Story Points**: 5
**Priority**: medium
**Assignee**: CC3
**Branch**: epic-E-engagement-pods
**Status**: todo

**Description**:
Poll for new posts from pod members every 30 minutes.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Detect when pod members publish new LinkedIn posts.

📚 PROJECT DOCS:
- spec.md (Post detection)
- data-model.md (posts table)

🔍 KNOWLEDGE BASE:
- "Unipile LinkedIn API fetch user's latest posts"
- "BullMQ recurring job every 30 minutes"

✅ DELIVERABLES:
1. Post polling job (30min intervals)
2. New post detection logic
3. Post deduplication
4. Notification system

VALIDATION: Pod member posts, verify detection within 30min.

---

### E-04: Pod Automation Engine
**Story Points**: 5
**Priority**: medium
**Assignee**: CC1
**Branch**: epic-E-engagement-pods
**Status**: todo

**Description**:
Automate staggered engagement: Like 5-30min, Comment 1-6hr after post.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Automatically engage with pod posts to boost reach.

📚 PROJECT DOCS:
- spec.md (Pod automation)
- data-model.md (pod_activities)

🔍 KNOWLEDGE BASE:
- "Unipile LinkedIn API like post"
- "Unipile LinkedIn API comment on post"
- "BullMQ delayed jobs for staggered execution"

✅ DELIVERABLES:
1. Like job (random 5-30min delay)
2. Comment job (random 1-6hr delay)
3. Engagement tracking
4. Activity analytics

VALIDATION: Post detected, verify 9 members engage with correct timing.

---

## 🤖 Epic F: AI Integration (10 points)

### F-01: AgentKit Campaign Orchestration
**Story Points**: 5
**Priority**: low
**Assignee**: CC2
**Branch**: epic-F-ai-integration
**Status**: todo

**Description**:
Integrate AgentKit with custom tools: createCampaign, optimizeMessage.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Enable AI agent to autonomously manage campaigns.

📚 PROJECT DOCS:
- spec.md (AI orchestration)

🔍 KNOWLEDGE BASE:
- "Coinbase AgentKit setup and configuration"
- "AgentKit custom tool creation guide"
- "LangChain tool integration with AgentKit"

✅ DELIVERABLES:
1. AgentKit setup
2. createCampaign custom tool
3. optimizeMessage custom tool
4. Campaign optimization logic

VALIDATION: AI creates campaign via natural language request.

---

### F-02: Mem0 Memory System Integration
**Story Points**: 5
**Priority**: low
**Assignee**: CC3
**Branch**: epic-F-ai-integration
**Status**: todo

**Description**:
Implement 3-level tenant keys: agencyId::clientId::userId for memory isolation.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Give AI long-term memory with multi-tenant isolation.

📚 PROJECT DOCS:
- spec.md (AI memory)
- data-model.md (Multi-tenant structure)

🔍 KNOWLEDGE BASE:
- "Mem0 add memory with metadata Python example"
- "Mem0 hierarchical tenant keys for multi-tenant isolation"
- "Mem0 search memories with filters"

✅ DELIVERABLES:
1. Mem0 client setup
2. 3-level tenant key structure
3. Memory CRUD operations
4. Memory search API

VALIDATION: Add memory for client A user 1, verify client B cannot access.

---

## 📊 Epic G: Monitoring & Testing (8 points)

### G-01: Real-time Monitoring Dashboard
**Story Points**: 3
**Priority**: medium
**Assignee**: CC1
**Branch**: epic-G-monitoring-testing
**Status**: todo

**Description**:
Build real-time monitoring with Supabase real-time subscriptions and Recharts.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Give admins visibility into system health and campaign performance.

📚 PROJECT DOCS:
- spec.md (Monitoring requirements)

🔍 KNOWLEDGE BASE:
- "Supabase real-time subscriptions for live dashboard"
- "Recharts line chart with live data updates"
- "Real-time metrics dashboard UI patterns"

✅ DELIVERABLES:
1. Real-time event subscriptions
2. Live metrics dashboard
3. Campaign performance charts
4. System health indicators

VALIDATION: Trigger event, verify dashboard updates within 1 second.

---

### G-02: End-to-End Testing Suite
**Story Points**: 5
**Priority**: medium
**Assignee**: CC2
**Branch**: epic-G-monitoring-testing
**Status**: todo

**Description**:
Create 8 test scenarios with mock fixtures for complete system validation.

📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Ensure system reliability with comprehensive E2E tests.

📚 PROJECT DOCS:
- spec.md (Testing requirements)

🔍 KNOWLEDGE BASE:
- "Playwright E2E testing with Next.js 14"
- "Mock Unipile API responses for testing"
- "Supabase test database setup"

✅ DELIVERABLES:
1. E2E test suite (Playwright)
2. Mock Unipile fixtures
3. Test database seeding
4. CI/CD integration

TEST SCENARIOS:
1. Campaign creation end-to-end
2. Comment detection → DM flow
3. Email extraction → Webhook
4. Pod engagement automation
5. Multi-tenant isolation
6. Rate limit enforcement
7. Retry logic validation
8. Error handling paths

VALIDATION: All 8 scenarios pass in CI/CD.

---

## Next Steps

1. **Create A-00 Context Hub Task** (if not exists)
   - Lists all project documentation
   - Lists all knowledge base sources
   - 0 story points (reading task)
   - Priority: critical

2. **Create All Tasks in Archon** using `manage_task()`:
   - Use exact titles, descriptions, and metadata above
   - Verify all 19 tasks appear in Archon UI
   - Organize by epic in Kanban view

3. **Start with A-01** (Foundation):
   - User generates scaffold in Bolt.new
   - Push to GitHub
   - All other tasks depend on this foundation

4. **Branch Strategy**:
   - Each epic has its own branch pattern
   - Tasks within an epic share the same branch
   - Merge to main when epic completes

5. **Validation**:
   - Each task has specific validation criteria
   - Use validator subagent before marking 'review'
   - Create SITREP for each task completion
