# Task 1: Pod Database Schema - CONFLICT DETECTED

**Date:** November 16, 2025
**Task:** Create pod_members and pod_activities tables with RLS
**Status:** BLOCKED - Schema conflict detected
**Time Spent:** 30 minutes

---

## Problem Summary

**CRITICAL CONFLICT:** The design document specifies a NEW schema that conflicts with EXISTING tables already deployed in production.

### Existing Schema (001_initial_schema.sql - DEPLOYED)
```
pods (parent table)
  ├─ client_id → clients
  ├─ name, description, settings
  └─ min_members, auto_engage

pod_members
  ├─ pod_id → pods (REQUIRED)
  ├─ user_id → users
  ├─ linkedin_account_id → linkedin_accounts
  ├─ role (owner/member)
  └─ participation_score

pod_activities
  ├─ pod_id → pods (REQUIRED)
  ├─ post_id → posts
  ├─ member_id → pod_members
  ├─ engagement_type (like/comment/repost)
  └─ scheduled_for, executed_at
```

### New Design Document (2025-11-16-pod-amplification-design.md)
```
pod_members (NO pods table!)
  ├─ client_id → clients (DIRECT)
  ├─ user_id → users
  ├─ name TEXT
  ├─ linkedin_url TEXT
  └─ unipile_account_id TEXT (NOT linkedin_account_id FK)

pod_activities
  ├─ post_id → posts
  ├─ pod_member_id → pod_members
  ├─ action TEXT (default 'repost')
  ├─ status (pending/success/failed)
  └─ retry tracking (attempt_number, max_attempts)
```

---

## Key Differences

| Feature | Existing Schema | New Design | Impact |
|---------|----------------|------------|--------|
| **pods table** | ✅ EXISTS | ❌ NOT NEEDED | Major structural difference |
| **pod_members.pod_id** | ✅ REQUIRED FK | ❌ REMOVED | Breaking change |
| **pod_members.client_id** | ❌ NOT PRESENT | ✅ DIRECT FK | New relationship |
| **pod_members.linkedin_account_id** | ✅ FK to linkedin_accounts | ❌ REMOVED | Breaking change |
| **pod_members.unipile_account_id** | ❌ NOT PRESENT | ✅ TEXT field | New field |
| **pod_members.name** | ❌ NOT PRESENT | ✅ TEXT | New field |
| **pod_members.linkedin_url** | ❌ NOT PRESENT | ✅ TEXT | New field |
| **pod_activities.pod_id** | ✅ REQUIRED FK | ❌ REMOVED | Breaking change |
| **pod_activities.action** | ❌ NOT PRESENT | ✅ TEXT | New field |
| **pod_activities.engagement_type** | ✅ CHECK constraint | ❌ REMOVED | Breaking change |
| **pod_activities.attempt_number** | ❌ NOT PRESENT | ✅ INTEGER | New retry logic |

---

## Root Cause Analysis

**Why this happened:**
1. Initial schema (001_initial_schema.sql) created complex pod hierarchy
2. New design document (November 16) simplified architecture
3. Design document written WITHOUT checking existing production schema
4. No migration audit performed before creating new design

**Impact:**
- Cannot create new tables (already exist)
- Cannot apply new schema (breaking changes)
- Risk of data loss if we drop/recreate
- Implementation plan assumes clean slate

---

## Options for Resolution

### Option A: ALTER Existing Schema (RECOMMENDED)
**Add missing columns to existing tables, preserve data**

Pros:
- ✅ No data loss
- ✅ Backward compatible
- ✅ Incremental migration

Cons:
- ❌ More complex than new design
- ❌ Keeps `pods` table (may not be needed)
- ❌ Requires careful NULL handling

**Migration:**
```sql
-- Add new columns to pod_members
ALTER TABLE pod_members
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS unipile_account_id TEXT,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Add new columns to pod_activities
ALTER TABLE pod_activities
  ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'repost',
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS repost_url TEXT;

-- Update status CHECK constraint
ALTER TABLE pod_activities
  DROP CONSTRAINT IF EXISTS pod_activities_status_check,
  ADD CONSTRAINT pod_activities_status_check
    CHECK (status IN ('pending', 'success', 'failed', 'completed'));
```

### Option B: Drop and Recreate (DANGEROUS)
**Drop existing tables, apply new schema**

Pros:
- ✅ Clean implementation
- ✅ Matches design exactly

Cons:
- ❌ **DATA LOSS** (all pod data deleted)
- ❌ Requires careful dependency management
- ❌ Breaks existing code that uses `pods` table

**NOT RECOMMENDED unless production has zero pod data**

### Option C: Revise Design Document (PRAGMATIC)
**Update design to work with existing schema**

Pros:
- ✅ No migration needed
- ✅ No data loss
- ✅ Can start implementation immediately

Cons:
- ❌ More complex than intended
- ❌ Requires updating implementation plan
- ❌ Design document becomes obsolete

---

## Recommended Action

**OPTION A: ALTER existing schema with additive migration**

### Rationale:
1. **Data safety:** Preserves any existing pod data
2. **Backward compatibility:** Existing code continues to work
3. **Flexibility:** New code can use new fields, old code uses old fields
4. **Incremental:** Can deprecate old fields later after full migration

### Next Steps:
1. ✅ Create ALTER migration: `20251116_add_pod_amplification_fields.sql`
2. ✅ Add new columns to existing tables
3. ✅ Update RLS policies for new columns
4. ✅ Add indexes for new fields
5. ✅ Update implementation plan to use existing schema
6. ✅ Test with sample data
7. ✅ Commit migration

---

## Questions for User

Before proceeding, I need confirmation:

1. **Does production have any existing pod data?**
   - If YES → Must use Option A (ALTER)
   - If NO → Could use Option B (DROP/CREATE)

2. **Is the `pods` parent table being used?**
   - If YES → Must preserve in migration
   - If NO → Could deprecate (but still keep)

3. **Should I:**
   - **A) Create ALTER migration** (safe, preserves data)
   - **B) Check for existing data first**, then decide
   - **C) Update design document** to match existing schema

---

## Files Affected

### Created:
- `/supabase/migrations/20251116_create_pod_tables.sql` (CANNOT APPLY - conflict)
- `/docs/sitreps/tasks/2025-11-16-task1-pod-schema-conflict.md` (this file)

### Need Review:
- `/docs/plans/2025-11-16-pod-amplification-design.md` (conflicts with production)
- `/docs/plans/2025-11-16-pod-amplification-implementation.md` (assumes clean slate)

---

## Conclusion

**Task 1 Status:** BLOCKED pending decision on schema conflict resolution

**Recommendation:** Option A (ALTER migration) - safest path forward

**Waiting for:** User confirmation on data status and preferred approach

**Time to Resolution:**
- Option A: 30 minutes (create ALTER migration)
- Option B: 10 minutes (if zero data confirmed)
- Option C: 1 hour (revise all design docs)

---

**Next Session:** Create appropriate migration once approach confirmed
