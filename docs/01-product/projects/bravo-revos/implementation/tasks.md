# Tasks: LinkedIn Growth Engine - Comment Scraper & DM Automation

**Input**: Design documents from `/specs/001-linkedin-growth-engine/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory → ✅ COMPLETE
   → Tech stack: TypeScript 5.6.3, Node.js, Express, React, PostgreSQL, Drizzle ORM
   → Structure: Web app (backend/server + frontend/client in monorepo)
2. Load optional design documents → ✅ COMPLETE
   → data-model.md: 10 tables (3 extended, 7 new)
   → contracts/: 15 REST endpoints across 4 resource groups
   → research.md: 8 technical decisions (Vitest, Unipile, Apollo.io, etc.)
   → quickstart.md: 8 end-to-end test scenarios
3. Generate tasks by category → ✅ COMPLETE
   → Setup: dependencies, test framework, database
   → Tests: 15 contract tests + 8 integration tests (TDD - before implementation)
   → Core: 10 tables, 6 services, 15 endpoints, 8 UI components
   → Integration: cron jobs, email notifications
   → Polish: performance validation, documentation
4. Apply task rules → ✅ COMPLETE
   → Different files = [P] parallel execution
   → Same file = sequential
   → Tests before implementation (TDD mandatory)
5. Number tasks sequentially → T001-T078
6. Dependencies mapped → see Dependencies section
7. Parallel execution examples provided
8. Validation complete:
   ✅ All 15 contracts have tests
   ✅ All 10 entities have model tasks
   ✅ All endpoints implemented after tests
9. Return: SUCCESS (78 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths relative to `/alpha-rev-os/1.0_alpha_revOS/`

---

## Phase 3.1: Setup & Dependencies

- [ ] **T001** Install testing dependencies (vitest, @vitest/ui, supertest, @types/supertest)
- [ ] **T002** Create vitest.config.ts with TypeScript and database test configuration
- [ ] **T003** Install LinkedIn integration dependencies (node-cron, resend, axios for Unipile/Apollo APIs)
- [ ] **T004** [P] Add environment variables to .env.example (UNIPILE_API_KEY, APOLLO_API_KEY, RESEND_API_KEY)
- [ ] **T005** Create shared/types/linkedin.ts from contracts/types.ts (copy TypeScript interfaces)

---

## Phase 3.2: Database Schema (Foundation)

- [ ] **T006** Extend campaigns table schema in shared/schema.ts (add LinkedIn-specific fields: linkedinPostUrl, leadMagnetId, scraperStatus, etc.)
- [ ] **T007** Extend leads table schema in shared/schema.ts (add linkedinProfileUrl, headline, isPrivateProfile, priorityScore, etc.)
- [ ] **T008** Extend messages table schema in shared/schema.ts (add linkedinThreadId, dmQueueId, openedVia, etc.)
- [ ] **T009** [P] Create linkedinPosts table in shared/schema.ts (postUrl, postId, authorName, totalComments, scrapingEnabled, etc.)
- [ ] **T010** [P] Create commentScrapes table in shared/schema.ts (status, commentsFound, leadsCreated, errorMessage, etc.)
- [ ] **T011** [P] Create leadCampaignAssociations table in shared/schema.ts (junction table: leadId, campaignId, engagementStatus, commentText, dmSentAt, etc.)
- [ ] **T012** [P] Create industryIntelligence table in shared/schema.ts (jobTitle, industry, painPoints, techStack, expiresAt, etc.)
- [ ] **T013** [P] Create leadMagnets table in shared/schema.ts (title, resourceUrl, resourceType, timesOffered, etc.)
- [ ] **T014** [P] Create dmQueue table in shared/schema.ts (leadId, campaignId, personalizedMessage, priority, scheduledSendTime, status, retryCount, etc.)
- [ ] **T015** [P] Create manualTasks table in shared/schema.ts (taskType, priority, status, title, description, failureContext, etc.)
- [ ] **T016** Add database indexes in shared/schema.ts (idx_linkedin_posts_next_scrape, idx_leads_linkedin_url, idx_dm_queue_scheduled, etc. - see data-model.md)
- [ ] **T017** Add Drizzle relations in shared/schema.ts (campaigns → linkedinPosts, leads → leadCampaignAssociations, etc.)
- [ ] **T018** Create Zod validation schemas in shared/validation/linkedin.ts (campaignCreateSchema, leadUpdateSchema, etc.)
- [ ] **T019** Run database migration: npm run db:push (verify all tables created successfully)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints) - All [P]

- [ ] **T020** [P] Contract test POST /api/campaigns in tests/integration/campaigns/create.test.ts (validate request body, test invalid LinkedIn URL, verify 201 response)
- [ ] **T021** [P] Contract test GET /api/campaigns in tests/integration/campaigns/list.test.ts (test pagination, filtering by status, verify response schema)
- [ ] **T022** [P] Contract test GET /api/campaigns/{id} in tests/integration/campaigns/detail.test.ts (test 404 for non-existent campaign, verify full campaign object with linkedinPost and leadMagnet)
- [ ] **T023** [P] Contract test PATCH /api/campaigns/{id} in tests/integration/campaigns/update.test.ts (test status changes, message template updates)
- [ ] **T024** [P] Contract test GET /api/campaigns/{id}/metrics in tests/integration/campaigns/metrics.test.ts (verify engagement rates calculations)
- [ ] **T025** [P] Contract test GET /api/leads in tests/integration/leads/list.test.ts (test filtering by campaignId, engagementStatus, multiCampaign flag)
- [ ] **T026** [P] Contract test GET /api/leads/{id} in tests/integration/leads/detail.test.ts (verify campaignAssociations array, enrichmentData, messageHistory)
- [ ] **T027** [P] Contract test PATCH /api/leads/{id} in tests/integration/leads/update.test.ts (test priority score updates, tags modification)
- [ ] **T028** [P] Contract test POST /api/linkedin/validate-post in tests/integration/linkedin/validate.test.ts (test valid post URL returns postId and comment count, test invalid URL returns 400)
- [ ] **T029** [P] Contract test POST /api/linkedin/scrape/{campaignId} in tests/integration/linkedin/scrape.test.ts (verify 202 response with scrapeId, test 409 if already scraping)
- [ ] **T030** [P] Contract test GET /api/linkedin/dm-queue in tests/integration/linkedin/dmQueue.test.ts (test filtering by campaignId and status, verify summary object)
- [ ] **T031** [P] Contract test GET /api/lead-magnets in tests/integration/leadMagnets/list.test.ts
- [ ] **T032** [P] Contract test POST /api/lead-magnets in tests/integration/leadMagnets/create.test.ts (validate required fields: title, resourceUrl)

### Integration Tests (End-to-End Scenarios from quickstart.md) - All [P]

- [ ] **T033** [P] Integration test: Campaign creation with post validation flow in tests/integration/scenarios/campaignCreation.test.ts
- [ ] **T034** [P] Integration test: Comment scraping creates leads correctly in tests/integration/scenarios/commentScraping.test.ts (verify private profile handling, bot filtering)
- [ ] **T035** [P] Integration test: Lead enrichment with Apollo.io in tests/integration/scenarios/leadEnrichment.test.ts (verify cache usage, graceful degradation on API failure)
- [ ] **T036** [P] Integration test: DM queue respects rate limits in tests/integration/scenarios/dmAutomation.test.ts (verify 2-minute delay, 50 DMs/hour cap)
- [ ] **T037** [P] Integration test: Multi-campaign lead detection in tests/integration/scenarios/multiCampaign.test.ts (verify lead added to both campaigns, priority boost)
- [ ] **T038** [P] Integration test: Message history auto-purge (90 days) in tests/integration/scenarios/messagePurge.test.ts
- [ ] **T039** [P] Integration test: Manual tasks created after DM failures in tests/integration/scenarios/manualTasks.test.ts (verify 3 retries before task creation)
- [ ] **T040** [P] Integration test: Email notifications for critical errors in tests/integration/scenarios/emailNotifications.test.ts

**CHECKPOINT**: Run `npm test` - ALL tests MUST FAIL at this point (no implementation yet)

---

## Phase 3.4: Service Layer Implementation (ONLY after tests are failing)

- [ ] **T041** [P] Create Unipile API client service in server/services/unipile.service.ts (authentication, rate limit handling, error mapping, POST comment fetching, POST DM sending)
- [ ] **T042** [P] Create Apollo.io enrichment service in server/services/enrichment.service.ts (lead enrichment by LinkedIn URL, cache lookup, error handling)
- [ ] **T043** [P] Create comment scraper service in server/services/commentScraper.service.ts (fetch comments via Unipile, filter bots/spam, create/update leads, handle private profiles)
- [ ] **T044** [P] Create DM automation service in server/services/dmAutomation.service.ts (queue management, message personalization, rate limit enforcement, retry logic)
- [ ] **T045** [P] Create scheduling service in server/services/scheduling.service.ts (node-cron job registration, scraper scheduler, DM queue processor scheduler)
- [ ] **T046** [P] Create email notification service in server/services/email.service.ts (Resend integration, critical error templates, rate-limited notifications)
- [ ] **T047** Industry intelligence cache service in server/services/industryIntelligence.service.ts (lookup by job title + industry, create cache entries, handle expiration)

**CHECKPOINT**: Run contract tests - some should start passing for service-level functionality

---

## Phase 3.5: API Routes (Endpoints Implementation)

### Campaigns Routes
- [ ] **T048** POST /api/campaigns endpoint in server/routes/campaigns.routes.ts (validate LinkedIn URL, create campaign, trigger initial scrape scheduling)
- [ ] **T049** GET /api/campaigns endpoint in server/routes/campaigns.routes.ts (pagination, filtering by status, include metrics)
- [ ] **T050** GET /api/campaigns/{id} endpoint in server/routes/campaigns.routes.ts (join linkedinPosts and leadMagnets, include recentLeads)
- [ ] **T051** PATCH /api/campaigns/{id} endpoint in server/routes/campaigns.routes.ts (status updates, message template changes)
- [ ] **T052** GET /api/campaigns/{id}/metrics endpoint in server/routes/campaigns.routes.ts (calculate engagement rates: openRate, replyRate, conversionRate)

### Leads Routes
- [ ] **T053** GET /api/leads endpoint in server/routes/leads.routes.ts (filtering by campaignId, engagementStatus, multiCampaign, pagination)
- [ ] **T054** GET /api/leads/{id} endpoint in server/routes/leads.routes.ts (join campaignAssociations, enrichmentData, messageHistory limited to 90 days)
- [ ] **T055** PATCH /api/leads/{id} endpoint in server/routes/leads.routes.ts (update notes, tags, priorityScore)

### LinkedIn-Specific Routes
- [ ] **T056** POST /api/linkedin/validate-post endpoint in server/routes/linkedin.routes.ts (call Unipile to validate post exists, extract postId and comment count)
- [ ] **T057** POST /api/linkedin/scrape/{campaignId} endpoint in server/routes/linkedin.routes.ts (create commentScrape job record, trigger async scraper service)
- [ ] **T058** GET /api/linkedin/dm-queue endpoint in server/routes/linkedin.routes.ts (filter by campaignId/status, include summary stats)

### Lead Magnets Routes
- [ ] **T059** GET /api/lead-magnets endpoint in server/routes/leadMagnets.routes.ts (list active lead magnets for client)
- [ ] **T060** POST /api/lead-magnets endpoint in server/routes/leadMagnets.routes.ts (create new lead magnet, validate resourceUrl)

**CHECKPOINT**: Run contract tests - all should pass now

---

## Phase 3.6: Background Jobs (Scheduled Tasks)

- [ ] **T061** Comment scraper cron job in server/jobs/scraper.job.ts (runs every 15 minutes, finds posts with nextScheduledScrape <= now, triggers commentScraper service)
- [ ] **T062** DM queue processor cron job in server/jobs/dmQueue.job.ts (runs every 2 minutes, fetches queued DMs with scheduledSendTime <= now, enforces rate limits, sends via Unipile)
- [ ] **T063** Message history purge job in server/jobs/messagePurge.job.ts (runs daily at 2 AM UTC, deletes messages older than 90 days, logs purge metrics)
- [ ] **T064** Industry intelligence cache cleanup job in server/jobs/cacheCleanup.job.ts (runs daily, removes expired intelligence records)
- [ ] **T065** Initialize all cron jobs in server/index.ts (import scheduling service, register all jobs on server start)

---

## Phase 3.7: Frontend Components (UI Layer)

### Campaign Pages
- [ ] **T066** [P] CampaignList page in client/src/pages/campaigns/CampaignList.tsx (fetch campaigns with useCampaigns hook, display CampaignCard grid, filtering/search)
- [ ] **T067** [P] CampaignDetail page in client/src/pages/campaigns/CampaignDetail.tsx (display metrics, linkedinPost info, recent leads, scraping status)
- [ ] **T068** [P] CampaignWizard component in client/src/pages/campaigns/CampaignWizard.tsx (multi-step form: URL validation → lead magnet selection → message template → review)

### Lead Pages
- [ ] **T069** [P] LeadList page in client/src/pages/leads/LeadList.tsx (LeadTable component, filtering by campaign/status, multi-campaign badge)
- [ ] **T070** [P] LeadDetail page in client/src/pages/leads/LeadDetail.tsx (show all campaign associations, enrichment data, message history timeline)

### Shared Components
- [ ] **T071** [P] CampaignMetrics component in client/src/components/campaigns/CampaignMetrics.tsx (recharts for engagement rates visualization)
- [ ] **T072** [P] DMQueueDashboard component in client/src/components/dmQueue/DMQueueDashboard.tsx (show pending/processing/sent DMs, next scheduled send time)
- [ ] **T073** [P] ManualTasksList component in client/src/components/tasks/ManualTasksList.tsx (display pending manual tasks, mark complete action)

### React Hooks
- [ ] **T074** [P] useCampaigns hook in client/src/hooks/useCampaigns.ts (TanStack Query wrapper for campaign endpoints)
- [ ] **T075** [P] useLeads hook in client/src/hooks/useLeads.ts (TanStack Query wrapper for lead endpoints)
- [ ] **T076** [P] useLinkedIn hook in client/src/hooks/useLinkedIn.ts (post validation, scraping trigger, DM queue fetching)

---

## Phase 3.8: Polish & Validation

- [ ] **T077** Run quickstart.md test scenarios manually (all 8 scenarios from quickstart.md: campaign creation, scraping, enrichment, DM automation, multi-campaign, purge, manual tasks, email notifications)
- [ ] **T078** Performance validation tests in tests/performance/ (verify <30s scraping, <500ms enrichment, <50ms DB queries as per plan.md performance goals)

---

## Dependencies

### Critical Path (Sequential)
```
Setup (T001-T005)
  ↓
Database Schema (T006-T019)
  ↓
Tests Written (T020-T040) [ALL MUST FAIL]
  ↓
Service Layer (T041-T047)
  ↓
API Routes (T048-T060)
  ↓
Background Jobs (T061-T065)
  ↓
Frontend (T066-T076)
  ↓
Polish (T077-T078)
```

### Specific Task Dependencies
- T019 (DB migration) blocks T020-T040 (tests need DB schema)
- T020-T040 (tests) block T041-T060 (TDD: tests before implementation)
- T041 (Unipile service) blocks T043, T044, T056, T057 (depends on API client)
- T042 (enrichment service) blocks T043 (scraper uses enrichment)
- T043 (scraper service) blocks T061 (scraper job uses scraper service)
- T044 (DM automation service) blocks T062 (DM job uses automation service)
- T048-T060 (API routes) block T066-T076 (frontend needs API)

### Parallel Execution Opportunities
- **Database tables** (T009-T015): All [P] - different table definitions
- **Contract tests** (T020-T032): All [P] - different test files
- **Integration tests** (T033-T040): All [P] - independent scenarios
- **Service layer** (T041-T047): All [P] - different service files
- **Frontend components** (T066-T076): All [P] - different component files

---

## Parallel Execution Examples

### Example 1: Database Schema Creation (T009-T015)
```bash
# Launch all table creation tasks simultaneously
# Task T009: Create linkedinPosts table in shared/schema.ts
# Task T010: Create commentScrapes table in shared/schema.ts
# Task T011: Create leadCampaignAssociations table in shared/schema.ts
# Task T012: Create industryIntelligence table in shared/schema.ts
# Task T013: Create leadMagnets table in shared/schema.ts
# Task T014: Create dmQueue table in shared/schema.ts
# Task T015: Create manualTasks table in shared/schema.ts
```

### Example 2: Contract Tests (T020-T032)
```bash
# All contract tests can run in parallel (different files)
npm test tests/integration/campaigns/create.test.ts &
npm test tests/integration/campaigns/list.test.ts &
npm test tests/integration/campaigns/detail.test.ts &
npm test tests/integration/campaigns/update.test.ts &
npm test tests/integration/campaigns/metrics.test.ts &
npm test tests/integration/leads/list.test.ts &
npm test tests/integration/leads/detail.test.ts &
npm test tests/integration/leads/update.test.ts &
npm test tests/integration/linkedin/validate.test.ts &
npm test tests/integration/linkedin/scrape.test.ts &
npm test tests/integration/linkedin/dmQueue.test.ts &
npm test tests/integration/leadMagnets/list.test.ts &
npm test tests/integration/leadMagnets/create.test.ts
```

### Example 3: Service Layer (T041-T047)
```bash
# All services can be implemented in parallel
# Task T041: Unipile service (server/services/unipile.service.ts)
# Task T042: Apollo enrichment (server/services/enrichment.service.ts)
# Task T043: Comment scraper (server/services/commentScraper.service.ts)
# Task T044: DM automation (server/services/dmAutomation.service.ts)
# Task T045: Scheduling (server/services/scheduling.service.ts)
# Task T046: Email notifications (server/services/email.service.ts)
# Task T047: Industry cache (server/services/industryIntelligence.service.ts)
```

### Example 4: Frontend Components (T066-T076)
```bash
# All React components and hooks can be built in parallel
# Task T066: CampaignList page
# Task T067: CampaignDetail page
# Task T068: CampaignWizard component
# Task T069: LeadList page
# Task T070: LeadDetail page
# Task T071: CampaignMetrics component
# Task T072: DMQueueDashboard component
# Task T073: ManualTasksList component
# Task T074: useCampaigns hook
# Task T075: useLeads hook
# Task T076: useLinkedIn hook
```

---

## Task Execution Checklist

### Before Starting
- [ ] All design documents reviewed (plan.md, data-model.md, contracts/, research.md, quickstart.md)
- [ ] Development environment ready (Node.js, PostgreSQL, Replit deployment configured)
- [ ] Environment variables set (UNIPILE_API_KEY, APOLLO_API_KEY, RESEND_API_KEY)

### During Execution
- [ ] Run tests after each task completion
- [ ] Commit after each task (atomic commits for rollback capability)
- [ ] Mark [P] tasks as completed when file is done (allows parallel work on other tasks)
- [ ] Stop if tests pass before implementation is complete (TDD violation - fix tests first)

### After Completion
- [ ] All 78 tasks marked complete
- [ ] All contract tests passing (T020-T032)
- [ ] All integration tests passing (T033-T040)
- [ ] Performance benchmarks met (T078)
- [ ] Quickstart scenarios validated manually (T077)
- [ ] Ready for production deployment

---

## Notes

- **[P] tasks** = Different files, no dependencies → safe for parallel execution
- **TDD mandatory**: Tests (T020-T040) MUST be written and MUST FAIL before implementation (T041+)
- **Commit strategy**: Atomic commits after each task for clear history and rollback capability
- **Multi-tenant isolation**: Every database query MUST filter by `client_id` (enforced by RLS policies)
- **Rate limits**: 50 DMs/hour per client, 2-minute minimum delay between messages
- **Data retention**: Messages purged after 90 days (automatic via T063 job)
- **Error handling**: Failed DMs retry 3 times (15min, 30min, 60min delays) before creating manual task

---

## Validation Checklist
*GATE: Checked before marking tasks.md as complete*

- [x] All 15 API contracts have corresponding tests (T020-T032)
- [x] All 10 database entities have model tasks (T006-T015)
- [x] All tests come before implementation (T020-T040 before T041+)
- [x] Parallel tasks [P] are truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD workflow enforced (tests written → tests fail → implementation → tests pass)
- [x] Integration tests cover all quickstart.md scenarios

---

**Total Tasks**: 78
**Parallel Tasks**: 46 (marked [P])
**Estimated Completion**: 3-4 weeks for full-stack team of 2-3 developers
**Critical Path**: Setup → DB Schema → Tests → Services → Routes → Jobs → Frontend → Polish

**Next Action**: Begin with T001 (install testing dependencies) and proceed sequentially through setup tasks
