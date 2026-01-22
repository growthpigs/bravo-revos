# Unified Platform Technical Specification

**Document:** UNIFIED-PLATFORM-SPEC.md
**Status:** Draft for Review
**Date:** 2026-01-22
**Author:** Chi CTO (PAI v2 Protocol Investigation)

---

## Executive Summary

This document synthesizes findings from 4 parallel investigations into the feasibility of unifying AudienceOS and RevOS into a cohesive platform. The investigations covered:

1. **Database Schema Compatibility** - Can both apps share a database?
2. **Auth/SSO Strategy** - Can users authenticate once and access both apps?
3. **HGC Cross-App Intelligence** - Can the Holy Grail Chat work across both apps?
4. **UI Alignment** - Can RevOS adopt AudienceOS's Linear-style design?

### Key Finding

**True unification is feasible but requires significant work.** The fastest path forward is a phased approach:

| Phase | Scope | Effort | Risk |
|-------|-------|--------|------|
| **Phase 1** (Current) | App Switcher redirects between deployments | ✅ DONE | Low |
| **Phase 2** | Add AppSwitcher to RevOS (bidirectional nav) | 1-2 days | Low |
| **Phase 3** | Shared Mem0 memory (cross-app context) | 5 days | Medium |
| **Phase 4** | Unified Supabase instance (SSO) | 2-3 days | Medium |
| **Phase 5** | RevOS UI alignment (Linear design) | 2-3 days | Medium |
| **Phase 6** | True database merge | 20-25 days | HIGH |

**Recommendation:** Proceed with Phases 2-5 (~10 days total). Phase 6 is optional and should only be done if true data sharing is required.

---

## Investigation Results

### 1. Database Schema Analysis

**Supabase Instances:**
- AudienceOS: `ebxshdqfaqupnvpghodi`
- RevOS: `trdoainmejxanrownbuz`

**Critical Finding: Naming Convention Mismatch**

| Concept | AudienceOS | RevOS |
|---------|-----------|-------|
| Tenant | `agency` (SINGULAR) | `agencies` (PLURAL) |
| Users | `user` (SINGULAR) | `users` (PLURAL) |
| Clients | `client` (SINGULAR) | `clients` (PLURAL) |
| Campaigns | N/A | `campaigns` (PLURAL) |

**Impact:** All 15+ RevOS "chips" (AgentKit functions) reference PLURAL table names. If RevOS moves to AudienceOS database without renaming, **all chips will fail at runtime**.

**RLS Pattern Differences:**

| App | Pattern | Status |
|-----|---------|--------|
| AudienceOS | Function-based (`get_user_agency_id()`) | ✅ Secure |
| RevOS | JWT-based (`auth.jwt() ->> 'agency_id'`) | ⚠️ Broken |

**Decision Required:** If merging databases, should we:
- A) Rename RevOS code to use SINGULAR (20-25 days)
- B) Keep databases separate, federate via API (5-10 days)
- C) Keep databases separate, share via Mem0 only (5 days) ← **RECOMMENDED**

**Confidence:** 6/10 for full database merge

---

### 2. Auth/SSO Strategy

**Current State:** Sessions are NOT shared. Each domain has its own Supabase cookies:
- `audienceos-agro-bros.vercel.app` → Supabase `ebxshdqfaqupnvpghodi`
- `bravo-revos.vercel.app` → Supabase `trdoainmejxanrownbuz`

**Options Evaluated:**

| Option | Effort | Confidence | Recommendation |
|--------|--------|------------|----------------|
| A: Unified Supabase | 2-3 days | 95% | ✅ BEST |
| B: JWT Token Exchange | 3-4 days | 70% | Viable |
| C: Third-party (Auth0) | 5-7 days | 30% | Overkill |
| D: Service-to-Service | 2 days | 40% | API only |

**Recommended Approach: Unified Supabase Instance**

Move both apps to use AudienceOS Supabase (`ebxshdqfaqupnvpghodi`):
1. No schema changes required (apps query their own tables)
2. Auth middleware already compatible (`@supabase/ssr` in both)
3. Session cookies shared automatically across same Supabase project
4. RevOS tables can be added to AudienceOS DB without conflict

**Implementation:**
```bash
# RevOS .env changes
NEXT_PUBLIC_SUPABASE_URL=https://ebxshdqfaqupnvpghodi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[AudienceOS anon key]
```

**Confidence:** 95% - This is a known pattern

---

### 3. HGC Cross-App Intelligence

**Current HGC Implementations:**

| Aspect | AudienceOS | RevOS |
|--------|-----------|-------|
| AI Backend | Gemini Flash (GoogleGenAI) | OpenAI AgentKit |
| Model | `gemini-3-flash-preview` | gpt-4 (configurable) |
| Architecture | SmartRouter + Function Calling | MarketingConsole + Cartridges |
| Memory | Mem0 via diiiploy-gateway | Mem0 via mem0ai SDK |
| Scoping | `agencyId::clientId::userId` | `agencyId::clientId::userId` |

**Critical Finding: Memory CAN Be Shared**

Both systems use identical 3-part tenant keys for Mem0:
```typescript
// Both apps use this format
const tenantKey = `${agencyId}::${clientId}::${userId}`
```

**What This Means:**
- RevOS can read AudienceOS memories (and vice versa)
- No memory infrastructure changes needed
- Just need to add cross-app intent detection

**Recommended Implementation: Shared Mem0 with Memory Tagging**

```typescript
// When saving memories, tag with app source
await addMemory(
  buildTenantKey(agencyId, clientId, userId),
  `audienceos::client-management::${summary}` // Tagged by app
)

// When querying cross-app, search by tag
const audienceMemories = await mem0.search(
  tenantKey,
  'audienceos::*' // Get all AudienceOS memories
)
```

**User Story: "What did I do in AudienceOS yesterday?"**

With this implementation, RevOS HGC can answer by:
1. Detecting cross-app intent
2. Searching Mem0 for `audienceos::*` tagged memories
3. Injecting context into AgentKit instructions
4. Providing accurate cross-app response

**Effort:** 5 days
**Confidence:** 8.5/10

---

### 4. UI Alignment

**Design System Comparison:**

| Aspect | AudienceOS | RevOS |
|--------|-----------|-------|
| Style | Linear-style (modern) | Traditional Tailwind |
| Font | Poppins (gradient branding) | System fonts |
| Sidebar | 224px/64px (collapsible) | 256px (fixed) |
| Animations | Framer Motion | None |
| Theme | Dark/light support | Light only |
| Component LOC | 34,188 lines | 17,812 lines |

**Shared UI Components:** 25 shadcn/ui primitives are identical in both codebases.

**What RevOS Needs:**

| Component | Effort | Description |
|-----------|--------|-------------|
| AppSwitcher | 1.5 hours | Copy from AudienceOS, configure for RevOS |
| LinearSidebar | 4 hours | Replace 256px fixed with collapsible |
| Font/Colors | 2 hours | Add Poppins, gradient branding |
| Layout Shell | 4 hours | Wrap dashboard in LinearShell |
| Styling Pass | 8 hours | Update all pages for consistency |

**Total UI Alignment:** 40-60 hours (2-3 days)

**Quick Win: Just Add AppSwitcher**

For bidirectional navigation (RevOS → AudienceOS), copy these files:
1. `components/app-switcher.tsx` (139 lines)
2. `stores/app-store.ts` (88 lines)

Configure RevOS as native:
```typescript
export const APP_CONFIGS: Record<AppId, AppConfig> = {
  audienceos: {
    // ...
    url: 'https://audienceos-agro-bros.vercel.app',
    isNative: false, // External in RevOS deployment
  },
  revos: {
    // ...
    isNative: true, // This deployment IS RevOS
  },
}
```

**Effort:** 1.5 hours
**Confidence:** High

---

## Recommended Implementation Order

### Phase 2: Bidirectional Navigation (1-2 days)

**Goal:** User can switch from RevOS back to AudienceOS

**Tasks:**
1. Copy AppSwitcher component to RevOS
2. Configure app-store with RevOS as native
3. Add AppSwitcher to RevOS sidebar
4. Deploy and test

**Success Criteria:**
- [ ] RevOS shows AppSwitcher in sidebar
- [ ] Clicking "AudienceOS" navigates to audienceos-agro-bros.vercel.app
- [ ] AudienceOS "RevOS" link still works

---

### Phase 3: Shared Memory (5 days)

**Goal:** HGC in both apps can answer cross-app questions

**Tasks:**
1. Define memory tagging schema (`app::domain::topic`)
2. Update AudienceOS Mem0 writes to include tags
3. Update RevOS Mem0 writes to include tags
4. Add cross-app intent detection to RevOS MarketingConsole
5. Add cross-app intent detection to AudienceOS router
6. Test user story: "What did I do in [other app]?"

**Success Criteria:**
- [ ] RevOS HGC can answer "What clients did I talk to in AudienceOS?"
- [ ] AudienceOS HGC can answer "What campaigns did I run in RevOS?"
- [ ] Memories are tagged correctly in Mem0

---

### Phase 4: Unified Auth (2-3 days)

**Goal:** User logs in once, has access to both apps

**Tasks:**
1. Add RevOS tables to AudienceOS Supabase (campaigns, posts, leads, etc.)
2. Update RevOS .env to point to AudienceOS Supabase
3. Migrate RLS policies to function-based pattern
4. Test auth flow: Login AudienceOS → Navigate to RevOS → Still authenticated
5. Deploy to staging, then production

**Success Criteria:**
- [ ] Single login works for both apps
- [ ] RLS policies protect data correctly
- [ ] No auth errors in either app

---

### Phase 5: UI Alignment (2-3 days)

**Goal:** RevOS looks and feels like AudienceOS

**Tasks:**
1. Replace RevOS sidebar with LinearSidebar pattern
2. Add Poppins font and gradient branding
3. Update dashboard layout to LinearShell
4. Add dark mode support
5. Styling pass on all dashboard pages
6. Test responsiveness and animations

**Success Criteria:**
- [ ] RevOS sidebar collapses to 64px
- [ ] Branding matches AudienceOS gradient style
- [ ] Dark mode works
- [ ] Visual consistency achieved

---

### Phase 6: Database Merge (Optional - 20-25 days)

**Goal:** Single database for all data (only if required for features)

**Prerequisites:**
- Decide on naming convention (SINGULAR vs PLURAL)
- Plan table migration strategy
- Update all 15+ RevOS chips to use new table names

**NOT RECOMMENDED** unless there's a business requirement for cross-app data queries (e.g., "Show me clients who have active campaigns").

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Auth cookie conflicts | Medium | Test in staging first |
| RLS policy failures | High | Run security audit after migration |
| Mem0 namespace collision | Low | Use app-prefixed tags |
| UI regression | Low | Visual regression testing |
| Database migration failures | High | Backup before, test rollback |

---

## Appendix: File References

### AudienceOS Key Files
- Auth callback: `/app/auth/callback/route.ts`
- Supabase client: `/lib/supabase.ts`
- App Switcher: `/components/app-switcher.tsx`
- App Store: `/stores/app-store.ts`
- Linear Shell: `/components/linear/shell.tsx`
- Linear Sidebar: `/components/linear/sidebar.tsx`
- HGC Router: `/lib/chat/router.ts`
- Mem0 Service: `/lib/memory/mem0-service.ts`

### RevOS Key Files
- Auth callback: `/app/auth/callback/route.ts`
- Middleware: `/middleware.ts`
- Dashboard Layout: `/app/dashboard/layout.tsx`
- Dashboard Sidebar: `/components/dashboard/dashboard-sidebar.tsx`
- HGC API: `/app/api/hgc-v2/route.ts`
- Marketing Console: `/lib/console/marketing-console.ts`
- Mem0 Client: `/lib/mem0/client.ts`

### Supabase Projects
- AudienceOS: `ebxshdqfaqupnvpghodi`
- RevOS: `trdoainmejxanrownbuz`

---

## Decision Points for Review

1. **Phase Order:** Start with Phase 2 (AppSwitcher) or Phase 4 (Auth)?
2. **UI Priority:** Full alignment or just AppSwitcher for now?
3. **Memory Tagging:** Schema for `app::domain::topic` format?
4. **Database Merge:** Is Phase 6 needed at all?

---

**Next Action:** Review this spec and approve/modify the phased approach.
