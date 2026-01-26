# Document Visibility Issue - Root Cause Analysis

**Date**: 2025-11-03
**Document**: Document System Overhaul - Implementation Plan
**Document ID**: 26629ee6-7937-4d2d-ba30-ee4236a0e3ec
**Project**: AgroArchon UI Redesign (f1f7603a-7dd1-4faf-8cae-15d611803979)

## Problem

The "Document System Overhaul - Implementation Plan" was successfully uploaded to Archon but is **not visible in the Features or Future Features tabs** in the AgroArchon UI.

## Root Cause

The document subtab/categorization system **does not exist yet**. It's actually part of **Phase 1 of the Document System Overhaul** that we're planning to implement!

### Current State

1. **Document exists** in database and can be retrieved by ID
2. **No `subtab_id` field** on the document
3. **Frontend expects documents to be categorized** but there's no categorization mechanism
4. **Backend code supports `subtab_id`** in add_document but NOT in update_document (now fixed)

### Investigation Findings

**Document Structure (Current)**:
```json
{
  "id": "26629ee6-7937-4d2d-ba30-ee4236a0e3ec",
  "title": "Document System Overhaul - Implementation Plan",
  "document_type": "spec",
  "status": "draft",
  "version": "1.0",
  "tags": ["planning", "document-system", "ui-redesign", "architecture", "implementation-plan"],
  "author": "Claude"
  // NO subtab_id field!
}
```

**Existing Documents** (also have no subtab_id):
- Design Analysis - Current Archon vs Strut Target
- *AgroArchon UI Redesign - Approved Design Specification
- Development Log - 2025-10-25: GitHub-Style UI Redesign
- Implementation Plan - GitHub-Style CRUD Fixes

**Project Structure**:
- ❌ No `subtabs` field on project
- ❌ No subtabs API endpoint returns empty array
- ❌ No subtab infrastructure in database

## Chicken-and-Egg Problem

We created an implementation plan for building the document organization system, but we can't properly categorize that implementation plan document because the categorization system doesn't exist yet!

## Backend Fix Applied

**File**: `/Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python/src/server/services/projects/document_service.py`

**Line 340-341** Added:
```python
if "subtab_id" in update_fields:
    docs[i]["subtab_id"] = update_fields["subtab_id"]
```

This allows documents to be updated with a `subtab_id` field once the subtab system is implemented.

## Solution Options

### Option 1: Tag-Based Workaround (Quick)
Add tags that the frontend can filter by:
- Tag: "category:features" → Shows in Features tab
- Tag: "category:future-features" → Shows in Future Features tab

**Pros**: Works immediately without backend changes
**Cons**: Hacky, doesn't solve the root problem

### Option 2: Implement Phase 1 First (Proper)
Follow the implementation plan and build:
1. `project_doc_groups` table (Product, Technical, Discovery, Supporting, Operations Archive)
2. `project_doc_sections` table (Specs → FSD, ISD, PRD, PRP, Tech)
3. Migration to add `section_id` to documents
4. API endpoints for groups/sections CRUD
5. Update frontend to use new structure

**Pros**: Solves the problem properly, enables full system
**Cons**: Requires Phase 1 implementation (~1-2 weeks)

### Option 3: Manual Database Update (Temporary)
Manually add `category` or `subtab_name` field to document for now:
- Use direct database UPDATE to add a field the frontend can filter by
- Document shows up in UI while Phase 1 is being built

**Pros**: Document becomes visible immediately
**Cons**: Still requires Phase 1 for permanent solution

## Recommendation

**Implement Phase 1** (Option 2) since:
1. It's already planned and approved
2. Backend service fix is already in place
3. We have 10 tasks ready to execute
4. Branch `feat/document-system-overhaul` is created and pushed
5. Trying workarounds delays the real solution

## Next Steps

1. ✅ Backend fix applied (subtab_id support in update_document)
2. 🟡 Restart Archon server to apply changes
3. 🔴 Begin Phase 1 implementation:
   - Create migration for project_doc_groups and project_doc_sections tables
   - Add section_id and archive fields to documents
   - Implement API endpoints for groups/sections
4. 🔴 Once Phase 1 complete: Assign document to proper section
5. 🔴 Document becomes visible in UI

## Related Files

- Implementation Plan: `./DOCUMENT_SYSTEM_OVERHAUL_IMPLEMENTATION_PLAN.md` (28KB, 815 lines)
- Task Script: `/tmp/create-tasks.sh` (10 tasks created)
- Branch: `feat/document-system-overhaul` (pushed to GitHub)
- Backend Service: `document_service.py:340-341` (fixed)

---

**Status**: Analysis complete, ready for Phase 1 implementation.
