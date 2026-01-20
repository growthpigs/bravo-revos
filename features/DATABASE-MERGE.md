# DATABASE-MERGE: RevOS + AudienceOS Unified Database

**Status:** Phase 0 COMPLETE - Ready for Phase 1 Migration
**Created:** 2026-01-20
**Last Verified:** 2026-01-20 (Runtime verification via Supabase SQL Editor + Table Editor)
**Priority:** High (blocks HGC integration)
**Confidence:** 10/10 (Phase 0 cleanup executed and verified)

---

## ✅ PHASE 0 COMPLETE (2026-01-20)

### Critical Discoveries from Runtime Stress Test

**1. Table Counts Were WRONG:**
| Database | Planned | Actual |
|----------|---------|--------|
| AudienceOS | 19 tables | **26+ tables** |
| RevOS | 30 tables | **55+ tables** |

**2. ABBY Contamination (RevOS) - ✅ DROPPED:**
```
outfit_history:    ✅ DROPPED
swatches:          ✅ DROPPED
swipe_cartridges:  ✅ DROPPED
```
These were leftover schema artifacts from ABBY project - all dropped successfully.

**3. Duplicate Chat Tables (RevOS) - ✅ CLEANED:**
| Table | Rows | Status |
|-------|------|--------|
| `chat_message` | 0 | ✅ DROPPED |
| `chat_messages` | 18 | ✅ ACTIVE (kept) |
| `chat_session` | 0 | ✅ DROPPED |
| `chat_sessions` | 213 | ✅ ACTIVE (kept) |

**4. Naming Convention Mismatch:**
- **AudienceOS:** SINGULAR (`chat_message`, `agency`, `client`)
- **RevOS:** PLURAL (`chat_messages`, `agencies`, `clients`)
- **Decision:** Use AudienceOS SINGULAR convention (gold standard)

**5. RLS Security Warnings - ✅ FIXED:**
| Database | Table | Issue | Status |
|----------|-------|-------|--------|
| AudienceOS | `user` | Has policies but RLS not enabled | ✅ FIXED |
| AudienceOS | `permission` | UNRESTRICTED | ✅ FIXED |
| RevOS | `backup_dm_sequences` | UNRESTRICTED | ✅ FIXED |
| RevOS | `campaigns_trigger_word_backup` | UNRESTRICTED | ✅ FIXED |

---

## Overview

Merge RevOS and AudienceOS into a single shared database with app toggle (like 11 Labs studio/agents). Users can switch between apps while sharing clients, agencies, and users.

---

## Goals

1. **Single source of truth** - One database for all customer data
2. **App toggle** - Switch RevOS ↔ AudienceOS from header (like 11 Labs)
3. **Shared HGC** - Same Holy Grail Chat works in both apps
4. **Unified cartridges** - Training cartridges (AOS) + brand/style cartridges (RevOS)

---

## Database Strategy

### Decision: AudienceOS is Primary

AudienceOS Supabase (`ebxshdqfaqupnvpghodi`) becomes the unified database because:
- Already has cleaner 10-folder doc structure
- Uses Drizzle ORM (type-safe)
- Has RBAC system implemented
- Production-ready with RLS

### Migration Path

1. Add RevOS-only tables to AudienceOS schema
2. Add `app_context` column where needed
3. Migrate RevOS data to unified DB
4. Point RevOS codebase at new DB
5. Deploy with feature flag

---

## Schema Merge Plan

### SHARED TABLES (No Changes Needed)

These already exist in AudienceOS, RevOS will use them:

| Table | Notes |
|-------|-------|
| `agency` | Tenant root |
| `user` | Auth users |
| `client` | Both apps need clients |
| `chat_session` | Unified HGC sessions |
| `chat_message` | Unified HGC messages |

### NEW TABLES (Add to AudienceOS)

RevOS-specific tables to add:

```sql
-- LinkedIn Integration
CREATE TABLE linkedin_account (...);
CREATE TABLE post (...);
CREATE TABLE comment (...);

-- Lead Generation
CREATE TABLE campaign (...);
CREATE TABLE lead_magnet (...);
CREATE TABLE lead (...);

-- DM Automation
CREATE TABLE dm_sequence (...);
CREATE TABLE dm_message (...);

-- Webhooks
CREATE TABLE webhook_config (...);
CREATE TABLE webhook_delivery (...);

-- Engagement Pods
CREATE TABLE pod (...);
CREATE TABLE pod_member (...);
CREATE TABLE pod_activity (...);

-- AI System
CREATE TABLE console_workflow (...);
CREATE TABLE cartridge (...);  -- Unified brand+style+training
CREATE TABLE campaign_skill (...);
CREATE TABLE skill_execution (...);
CREATE TABLE memory (...);
CREATE TABLE queue_job (...);
```

### CARTRIDGE UNIFICATION

Current state:
- **AudienceOS:** Training Cartridges (voice, style, preferences, instructions, brand)
- **RevOS:** `brand_cartridges` + `style_cartridges` tables

Unified approach:
```sql
CREATE TABLE cartridge (
  id UUID PRIMARY KEY,
  agency_id UUID REFERENCES agency(id),
  user_id UUID REFERENCES "user"(id),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,  -- 'training', 'brand', 'style', 'voice'
  app_context VARCHAR(20),     -- 'audience', 'revos', 'both'
  config JSONB NOT NULL,       -- Flexible config per type
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### HGC UNIFICATION

Current state:
- **AudienceOS:** `chat_session`, `chat_message` (Gemini-based)
- **RevOS:** `hgc_sessions`, `hgc_messages` (AgentKit-based)

Unified approach:
- Use AudienceOS tables as base
- Add `ai_provider` column to track Gemini vs AgentKit
- HGC component loads different backend based on `app_context`

```sql
ALTER TABLE chat_session ADD COLUMN app_context VARCHAR(20) DEFAULT 'both';
ALTER TABLE chat_message ADD COLUMN ai_provider VARCHAR(20); -- 'gemini', 'agentkit'
```

---

## App Context Pattern

### Table Categorization (Verified 2026-01-20)

**SHARED TABLES (app_context = 'both'):**
- `agency` - Tenant root
- `user` - Auth users
- `client` - Both apps need clients
- `chat_session` - Unified HGC sessions
- `chat_message` - Unified HGC messages
- `cartridge` - Unified (brand, style, voice, training, preferences, instruction)

**AUDIENCEOS-ONLY TABLES (app_context = 'audience'):**
- `client_assignment`, `stage_event`, `task`
- `integration`, `communication`, `alert`, `document`
- `intake_form_field`, `intake_response`
- `kpi_snapshot`, `ad_performance`
- `onboarding_instance`, `onboarding_journey`, `onboarding_stage_status`
- `member_client_access`

**REVOS-ONLY TABLES (app_context = 'revos'):**
- `linkedin_account`, `post`, `comment`
- `campaign`, `lead_magnet`, `lead`, `lead_magnet_library`
- `dm_sequence`, `dm_delivery`
- `webhook_config`, `webhook_delivery`, `webhook_endpoint`, `webhook_log`
- `pod`, `pod_member`, `pod_activity`
- `console_workflow`, `console_prompt`
- `memory`, `notification`
- `processed_comment`, `processed_message`, `triggered_comment`
- `pending_connection`, `connected_account`
- `scrape_job`, `email_queue`, `email_extraction_review`
- `unipile_webhook_log`

For tables that need app-specific data:

```sql
-- Pattern: Add app_context column
ALTER TABLE [table] ADD COLUMN app_context VARCHAR(20)
  CHECK (app_context IN ('audience', 'revos', 'both'))
  DEFAULT 'both';

-- Pattern: RLS policy scopes by app
CREATE POLICY [table]_app_rls ON [table] FOR ALL
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND (
    app_context = 'both'
    OR app_context = (auth.jwt() ->> 'app_context')
  )
);
```

---

## UI Changes (RevOS → AudienceOS)

### App Toggle Header

Add to both apps:
```tsx
<AppToggle
  current="revos"  // or "audience"
  onSwitch={(app) => router.push(`/${app}/dashboard`)}
/>
```

### Menu Alignment

RevOS sidebar should match AudienceOS Linear design:
- Same spacing, typography, icons
- Same collapsible pattern
- Same hover states

### Design System

RevOS currently uses shadcn/ui directly.
AudienceOS has `components/linear/` wrapper.

Action: Create shared `@diiiploy/ui` package OR copy Linear components to RevOS.

---

## Migration Steps

### Phase 0: Pre-Migration Cleanup ✅ COMPLETE

**RevOS Cleanup - EXECUTED:**
```sql
-- Drop ABBY contamination tables ✅
DROP TABLE IF EXISTS outfit_history;
DROP TABLE IF EXISTS swatches;
DROP TABLE IF EXISTS swipe_cartridges;

-- Drop orphan chat tables ✅
DROP TABLE IF EXISTS chat_message;
DROP TABLE IF EXISTS chat_session;

-- Fix RLS on backup tables ✅
ALTER TABLE backup_dm_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns_trigger_word_backup ENABLE ROW LEVEL SECURITY;
```

**AudienceOS Cleanup - EXECUTED:**
```sql
-- Fix RLS on user table ✅
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

-- Fix RLS on permission table ✅
ALTER TABLE permission ENABLE ROW LEVEL SECURITY;
```

**Note:** Table renaming (plural → singular) will be done in Phase 1 as part of full migration.

### Phase 1: Schema Preparation

1. [x] Run Phase 0 cleanup scripts on both DBs ✅
2. [ ] Create migration: Add RevOS tables to AudienceOS
3. [ ] Create migration: Add `app_context` columns
4. [ ] Create migration: Unify cartridge table
5. [ ] Test in staging environment

### Phase 2: Data Migration (1 day)

1. [ ] Export RevOS data
2. [ ] Transform to unified schema
3. [ ] Import to AudienceOS DB
4. [ ] Verify data integrity

### Phase 3: Code Updates (2-3 days)

1. [ ] Update RevOS to use unified Supabase URL
2. [ ] Update RevOS types to match unified schema
3. [ ] Add app toggle to both apps
4. [ ] Test cross-app data visibility

### Phase 4: HGC Integration (1-2 days)

1. [ ] Extract HGC as shared component
2. [ ] Configure app_context routing
3. [ ] Test HGC in both apps
4. [ ] Deploy

---

## Verification

### Test Cases

1. [ ] Create client in AudienceOS → visible in RevOS
2. [ ] Create lead in RevOS → NOT visible in AudienceOS (app-specific)
3. [ ] HGC works in both apps with correct backend
4. [ ] Cartridges load correctly per app context
5. [ ] App toggle switches without losing session

### Commands

```bash
# Verify schema
npx supabase db diff

# Run migrations
npx supabase db push

# Test RLS
npm test -- --grep "unified-db"
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Full backup before, test in staging first |
| RLS breaks cross-app queries | Test all policies before production |
| HGC backend mismatch | Feature flag for gradual rollout |
| Performance degradation | Monitor query times, add indexes |

---

## Open Questions

1. **Which Supabase project?** → Recommend AudienceOS (cleaner)
2. **URL structure?** → `/revos/...` vs `/audience/...` OR subdomain
3. **Auth session?** → Same JWT for both apps? Yes - shared auth
4. **Deployment?** → Same Vercel project with route groups OR separate projects

---

## Related

- `/features/HGC-SHARED.md` (to create)
- `/features/UI-ALIGNMENT.md` (to create)
- `/docs/04-technical/DATA-MODEL.md`

---

**Last Updated:** 2026-01-20 (Phase 0 Cleanup Complete)
