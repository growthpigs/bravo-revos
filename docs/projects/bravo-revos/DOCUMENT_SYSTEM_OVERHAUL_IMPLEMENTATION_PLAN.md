# Document System Overhaul - Comprehensive Implementation Plan

**Project**: AgroArchon UI Redesign
**Epic**: Document Management System Overhaul
**Created**: 2025-11-03
**Status**: Planning

---

## Executive Summary

This document outlines a comprehensive overhaul of AgroArchon's document organization system. The goal is to create an intuitive, scalable document management structure that separates permanent project knowledge (Project Docs) from active development work (Branch Docs), implements visual task organization with a 12-color pastel system, and provides a clean left-sidebar navigation UI.

**Key Improvements:**
- Left sidebar navigation replacing folder-in-list views
- Expandable tab groups (Product, Technical, Discovery, Supporting, Operations Archive)
- Auto-save for all documents (same behavior as tasks)
- Sort options: Alphabetical, Most Recent, Date Modified
- 12-color pastel system for visual task/story grouping
- Operations Archive for completed branch work
- Repository structure alignment with UI organization
- Branch merge automation with feature documentation auto-generation

---

## 1. Document Organization Structure

### 1.1 Project Docs (Permanent Knowledge Base)

**5 Main Tab Groups:**

#### **Product** ▼
Purpose: Product strategy and feature planning
- **Features** - Active features being developed or shipped
- **Future Features** - Backlog and future planning
- **Roadmap** - Project timeline and milestones

#### **Technical** ▼
Purpose: Technical specifications and design documentation
- **Specs** - Technical specifications with subfolders:
  - **FSD** - Functional Specification Documents
  - **ISD** - Interface Specification Documents
  - **PRD** - Product Requirements Documents
  - **PRP** - Problem Resolution Plans
  - **Tech** - Other technical specs
- **Design System** - UI/UX design system, component library, style guides
- **User Stories** - User stories, acceptance criteria, UX flows

#### **Discovery** ▼
Purpose: Research, exploration, and proof-of-concept work
- **Brainstorming** - Ideas, rough notes, initial explorations
- **Research** - Research findings, competitive analysis, technical investigations
- **POC Docs** - Proof of concept documentation and results

#### **Supporting** (Standalone)
Purpose: General documentation that doesn't fit other categories
- Meeting notes, architecture decisions, general reference docs

#### **Operations Archive** (Standalone)
Purpose: Read-only knowledge base of completed work
- Organized by completed branches/epics
- Contains tasks and operations summaries from merged branches
- Structure: `operations-archive/[branch-name]/tasks/` + `operations-summary.md`

### 1.2 Branch Docs (Active Development Work)

**5 Tabs (Non-expandable):**

1. **Milestones** - Branch-specific milestones and timeline
2. **Planning** - Implementation plans, technical design
3. **Implementation** - Development notes, decisions, in-progress documentation
4. **Validation** - Test plans, validation reports, QA documentation
5. **Operations** - Deployment notes, rollout plans, operations summaries

---

## 2. UI/UX Design

### 2.1 Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ Top Bar: [Project Docs] [Branch Docs] Toggle            │
│          Branch Selector (for Branch Docs view)          │
├────────────┬─────────────────────────────────────────────┤
│            │ Product  Technical  Discovery  Supporting   │ ← Tab groups
│            │ Operations Archive                           │
├────────────┼─────────────────────────────────────────────┤
│ LEFT       │  MAIN CONTENT AREA                          │
│ SIDEBAR    │                                              │
│            │  ┌────────────────────────────────────────┐ │
│ Product ▼  │  │ Sort: [Alphabetical▼] [Search...]      │ │
│  Features  │  │                                         │ │
│  Future    │  │ Document List or Editor View            │ │
│  Roadmap   │  │                                         │ │
│            │  │ - Document 1                            │ │
│ Technical ▼│  │ - Document 2                            │ │
│  Specs ▼   │  │ - Document 3                            │ │
│   FSD      │  │                                         │ │
│   ISD      │  │ [Auto-save status indicator]            │ │
│   PRD      │  │                                         │ │
│   PRP      │  │                                         │ │
│   Tech     │  │                                         │ │
│  Design    │  └────────────────────────────────────────┘ │
│  Stories   │                                              │
│            │                                              │
│ Discovery ▼│                                              │
│  Brainstorm│                                              │
│  Research  │                                              │
│  POC Docs  │                                              │
│            │                                              │
│ Supporting │                                              │
│            │                                              │
│ Operations │                                              │
│ Archive ▼  │                                              │
│  [branches]│                                              │
│            │                                              │
└────────────┴─────────────────────────────────────────────┘
```

### 2.2 User Flow

1. **User clicks "Technical" tab** → Left sidebar shows: Specs, Design System, User Stories
2. **User clicks "Specs"** → Expands to show: FSD, ISD, Tech subfolders
3. **User clicks "FSD"** → Main area shows all FSD documents with sort/search controls
4. **User clicks document** → Document editor opens in main area
5. **User types** → Auto-save triggers (debounced, like tasks)

### 2.3 Navigation Controls

**Sort Options** (dropdown in main content area):
- Alphabetical (A-Z)
- Most Recent (newest first)
- Date Modified (most recently modified)

**Search** (search box in main content area):
- Real-time filtering within current section
- Searches document titles and content

**New Document Button**:
- Smaller size (current is too large)
- Context-aware: creates document in currently selected section

### 2.4 Document Editor Improvements

**Required Fixes:**
- ✅ Auto-save (same behavior as tasks - debounced, no manual save)
- ✅ Fixed header when scrolling (title and toolbar stay visible)
- ✅ Heading text wrapping (long titles should wrap, not overflow)
- ✅ Metadata moved to right sidebar (author, created date, modified date, tags)
- ✅ 80% width modals (current modals too wide)
- ✅ setIsEditing bug fix (currently undefined - can't save docs)

**Editor Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ Fixed Header: Document Title     [Close] [Delete] [...]  │
│ Toolbar: Bold | Italic | H1 | H2 | ...                   │
├────────────────────────────────────┬─────────────────────┤
│                                    │ RIGHT SIDEBAR       │
│ Markdown Editor                    │                     │
│ (Auto-save enabled)                │ Author: Claude      │
│                                    │ Created: 2025-11-03 │
│                                    │ Modified: 5 min ago │
│                                    │                     │
│                                    │ Tags: [backend]     │
│                                    │       [api]         │
│                                    │                     │
│ [Auto-save status: Saved ✓]       │                     │
│                                    │                     │
└────────────────────────────────────┴─────────────────────┘
```

---

## 3. Color System for Visual Task Organization

### 3.1 Conceptual Model

- **Epic** = Git Branch = Colored Tab (faded/translucent pastel)
- **Story** = Feature/functionality within branch = Group of tasks (pastel background)
- **Task** = Individual work item = Colored by its story

### 3.2 Color Palette (12 Pastel Colors)

**Requirements:**
- 12 colors on a spectrum (color wheel)
- Pastel shades (soft, not bright)
- NO bright yellow (use orange-yellow and reddish-orange instead)
- Colors must be distinguishable when adjacent

**Proposed Palette:**
```
1.  Pastel Red:         #FFB3BA (light rose)
2.  Reddish-Orange:     #FFCCB3 (peach)
3.  Orange-Yellow:      #FFE6B3 (cream)
4.  Pastel Green-Yellow:#E6F5B3 (light lime)
5.  Pastel Green:       #B3E6CC (mint)
6.  Green-Cyan:         #B3E6E6 (aqua)
7.  Pastel Cyan:        #B3D9FF (sky blue)
8.  Pastel Blue:        #C2B3FF (periwinkle)
9.  Blue-Purple:        #D9B3FF (lavender)
10. Pastel Purple:      #F0B3FF (orchid)
11. Pink-Purple:        #FFB3E6 (light pink)
12. Pink-Red:           #FFB3CC (rose pink)
```

### 3.3 Color Application

**Branch Tabs (Epics):**
- Use faded/translucent version of assigned color
- Example: `background-color: rgba(255, 179, 186, 0.3)`
- Tab border uses solid version of color

**Task Story Groupings:**
- Tasks with same story_id get same pastel background
- Example: `background-color: #FFB3BA`
- Color rotates through 12-color palette
- Adjacent stories get different colors (prevent same color next to each other)

**Git Coach Comments:**
- Appear between story groups (visual separator)
- Neutral gray background

### 3.4 Database Changes for Color System

**Add to tasks table:**
```sql
ALTER TABLE tasks ADD COLUMN story_id TEXT;
ALTER TABLE tasks ADD COLUMN story_color INTEGER; -- Index 0-11 of color palette
```

**Color assignment logic:**
- When task is assigned a story_id, assign next available color (not used by previous story)
- Color wraps around after 12 stories

---

## 4. Operations Archive Workflow

### 4.1 Purpose

When a branch/epic is completed and merged to main, all its work (tasks, documents, learnings) should be preserved in a searchable, read-only knowledge base.

### 4.2 Structure

**Operations Archive Tab → Click branch name → See:**
```
operations-archive/
  feat-authentication/
    tasks/
      task-001-implement-jwt.md
      task-002-add-refresh-tokens.md
      task-003-create-login-endpoint.md
    operations-summary.md
  feat-payment-system/
    tasks/
      ...
    operations-summary.md
```

### 4.3 Workflow

**When branch merges:**
1. **Auto-detect merge** (via GitHub webhook or manual trigger)
2. **Generate feature documentation** from completed work:
   - Aggregate task descriptions and outcomes
   - Include implementation notes
   - List key decisions made
3. **Show modal popup** with generated documentation for user review
4. **User edits/approves** documentation
5. **Move completed tasks** from branch to `operations-archive/[branch-name]/tasks/`
6. **Save operations summary** as `operations-summary.md`
7. **Archive branch docs** (Planning, Implementation, Validation, Operations) to supporting docs or delete
8. **Branch tab** changes color to archived state (gray with archive icon)

### 4.4 Searchability

- Operations Archive documents are fully searchable via search box
- Can filter by branch name
- Can sort by date completed
- Tasks within archived branches remain searchable

---

## 5. Repository Structure Alignment

### 5.1 Repository Folder Structure

**Must mirror the UI tab organization:**

```
docs/
  projects/
    [project-name]/
      features/
        feature-001.md
        feature-002.md
      future-features/
        future-idea-001.md
      roadmap/
        2025-q1-roadmap.md
        2025-q2-roadmap.md
      specs/
        fsd/
          user-authentication-fsd.md
          payment-processing-fsd.md
        isd/
          api-interface-spec.md
          database-interface-spec.md
        prd/
          product-requirements-v1.md
        prp/
          auth-issue-resolution.md
        tech/
          architecture-overview.md
      design-system/
        component-library.md
        style-guide.md
      user-stories/
        epic-001-stories.md
      brainstorming/
        initial-ideas.md
      research/
        competitive-analysis.md
        tech-stack-research.md
      poc-docs/
        stripe-integration-poc.md
      supporting/
        meeting-notes-2025-10.md
      operations-archive/
        feat-authentication/
          tasks/
            task-001.md
          operations-summary.md
        feat-payment-system/
          tasks/
            task-002.md
          operations-summary.md
```

### 5.2 Sync Rules

**CRITICAL: All `.md` files in repo MUST exist in Archon (and vice versa).**

**Workflow:**
1. Create/update file in repo: `docs/projects/[project]/[category]/document.md`
2. **Immediately** upload to Archon: `manage_document('create', ...)`
3. Both locations stay in sync, never diverge

**Why this matters:**
- Repo = Source of truth for AI/developers (full context)
- Archon = Searchable index for users (easy discovery)
- Nothing gets lost (dual storage ensures durability)

---

## 6. Branch Merge Automation

### 6.1 Trigger

**GitHub Webhook** (preferred) or **Manual button** in UI

When branch merges to main:
- Webhook fires: `POST /api/webhooks/github/branch-merged`
- Payload includes: `branch_name`, `commit_sha`, `merged_by`

### 6.2 Auto-Generate Feature Documentation

**Process:**
1. Query all tasks for the merged branch: `find_tasks(branch=branch_name)`
2. Query all Branch Docs (Planning, Implementation, Validation, Operations)
3. Use AI to generate comprehensive feature documentation:
   - Feature overview
   - Key implementation details
   - Decisions made
   - Testing outcomes
   - Known limitations
4. Generate `operations-summary.md`

### 6.3 User Review Modal

**Show modal with:**
- Generated documentation (editable markdown)
- [Approve] [Edit] [Cancel] buttons
- On approve: Move to Operations Archive
- On edit: User can modify before approving
- On cancel: Keep branch active, don't archive

### 6.4 Move to Operations Archive

**Steps:**
1. Create folder: `operations-archive/[branch-name]/`
2. Move completed tasks: `operations-archive/[branch-name]/tasks/`
3. Save operations summary: `operations-archive/[branch-name]/operations-summary.md`
4. Update task status: `archived: true`
5. Update branch tab: Show archive icon, gray out
6. Delete or archive branch docs (Planning, Implementation, etc.)

---

## 7. Auto-Save Implementation

### 7.1 Requirements

**Documents must auto-save exactly like tasks:**
- Debounced save (wait 500ms after last keystroke)
- No manual "Save" button required
- Visual indicator: "Saving..." → "Saved ✓"
- Save on blur (when user clicks away)
- Handle conflicts gracefully (last write wins with warning)

### 7.2 Technical Approach

**Frontend (React):**
```typescript
const useAutoSave = (documentId: string, content: string) => {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  useEffect(() => {
    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await api.updateDocument(documentId, { content });
        setSaveStatus('saved');
      } catch (error) {
        setSaveStatus('error');
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [content, documentId]);

  return saveStatus;
};
```

**Backend (FastAPI):**
```python
@router.patch("/documents/{document_id}")
async def update_document(
    document_id: str,
    update: DocumentUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Update document
    # Return updated document with new modified timestamp
    pass
```

### 7.3 Status Indicator

**In editor footer:**
- ✅ "Saved" (green) - Last save successful
- ⏳ "Saving..." (gray) - Save in progress
- ⚠️ "Error saving" (red) - Save failed, retry button

---

## 8. Database Schema Changes

### 8.1 New Tables

**project_doc_groups** (expandable tab groups):
```sql
CREATE TABLE IF NOT EXISTS project_doc_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL, -- 'Product', 'Technical', 'Discovery', 'Supporting', 'Operations Archive'
  group_order INTEGER NOT NULL DEFAULT 0,
  is_expandable BOOLEAN DEFAULT TRUE,
  is_branch_specific BOOLEAN DEFAULT FALSE, -- TRUE for Branch Docs, FALSE for Project Docs
  CONSTRAINT unique_group_per_project UNIQUE(project_id, group_name)
);
```

**project_doc_sections** (sections within groups):
```sql
CREATE TABLE IF NOT EXISTS project_doc_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES project_doc_groups(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL, -- 'Features', 'Specs', 'FSD', etc.
  section_order INTEGER NOT NULL DEFAULT 0,
  parent_section_id UUID REFERENCES project_doc_sections(id), -- For nested sections (e.g., FSD under Specs)
  repository_path TEXT NOT NULL, -- 'features/', 'specs/fsd/', etc.
  CONSTRAINT unique_section_per_group UNIQUE(group_id, section_name)
);
```

### 8.2 Modify Existing Tables

**documents table:**
```sql
ALTER TABLE documents ADD COLUMN section_id UUID REFERENCES project_doc_sections(id);
ALTER TABLE documents ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN archived_branch_name TEXT;
```

**tasks table:**
```sql
ALTER TABLE tasks ADD COLUMN story_id TEXT;
ALTER TABLE tasks ADD COLUMN story_color INTEGER CHECK (story_color >= 0 AND story_color <= 11);
ALTER TABLE tasks ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN archived_branch_name TEXT;
```

---

## 9. Implementation Phases

### Phase 1: Database & Backend (Week 1)
- [ ] Create migration scripts for new tables
- [ ] Add story_id and story_color to tasks
- [ ] Add section_id and archive fields to documents
- [ ] Implement auto-save endpoint for documents
- [ ] Create API endpoints for doc groups/sections

### Phase 2: Left Sidebar Navigation (Week 1-2)
- [ ] Create LeftSidebar component
- [ ] Implement expandable groups
- [ ] Implement nested sections (Specs → FSD/ISD/Tech)
- [ ] Add active state highlighting
- [ ] Connect to document list view

### Phase 3: Document Editor Improvements (Week 2)
- [ ] Fix setIsEditing bug
- [ ] Implement auto-save with debouncing
- [ ] Add auto-save status indicator
- [ ] Fixed header when scrolling
- [ ] Move metadata to right sidebar
- [ ] Heading text wrapping
- [ ] 80% width modals

### Phase 4: Sort & Search (Week 2)
- [ ] Add sort dropdown (Alphabetical, Most Recent, Date Modified)
- [ ] Implement sort logic in backend
- [ ] Enhance search to filter within current section
- [ ] Add search highlighting

### Phase 5: Color System (Week 3)
- [ ] Define 12-color pastel palette (hex values)
- [ ] Add color picker UI for stories
- [ ] Implement color assignment logic (rotation)
- [ ] Apply colors to task backgrounds
- [ ] Apply colors to branch tabs (faded/translucent)
- [ ] Style Git Coach comments (neutral gray)

### Phase 6: Operations Archive (Week 3-4)
- [ ] Create Operations Archive folder structure
- [ ] Implement move-to-archive logic
- [ ] Build feature documentation generator (AI-powered)
- [ ] Create user review modal
- [ ] Archive branch tabs (gray with icon)

### Phase 7: Branch Merge Automation (Week 4)
- [ ] Set up GitHub webhook endpoint
- [ ] Implement merge detection
- [ ] Trigger auto-archive workflow
- [ ] Test end-to-end merge → archive flow

### Phase 8: Repository Sync (Week 4-5)
- [ ] Create repository folder structure
- [ ] Implement file sync on document create/update
- [ ] Add validation: ensure all .md files in repo exist in Archon
- [ ] Add validation: ensure all Archon docs exist in repo

### Phase 9: Testing & Polish (Week 5)
- [ ] Comprehensive testing of all features
- [ ] UI/UX polish (button sizes, spacing, colors)
- [ ] Performance optimization (large document lists)
- [ ] Documentation for users
- [ ] Migration guide for existing documents

### Phase 10: Deployment (Week 5-6)
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Fix bugs found in UAT
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 10. Additional Features to Research

### 10.1 Markdown Editor Improvements

**Reference**: Features tab in Archon project
**Research needed**: Advanced markdown editor capabilities, WYSIWYG options, toolbar customization

### 10.2 Point System

**Reference**: Archon project docs
**Research needed**: Story points for documents? Complexity estimation?

### 10.3 Archon /plan Command

**Reference**: Existing Archon slash commands
**Research needed**: Can we mirror the /plan command structure for document planning?

### 10.4 Secrets Tab

**Purpose**: Credential management (like MCP server credentials page)
**Requirements**:
- Secure storage of API keys, tokens, credentials
- Environment variable management
- Per-project secrets
- Never commit secrets to repo

---

## 11. Success Criteria

### 11.1 User Experience Goals

✅ **Intuitive Navigation**: Users can find documents in ≤3 clicks
✅ **Fast Search**: Search results appear in <500ms
✅ **No Lost Work**: Auto-save prevents data loss
✅ **Visual Clarity**: Color system makes story groupings obvious
✅ **Knowledge Preservation**: Operations Archive captures all completed work
✅ **Repository Alignment**: Developers can find docs in repo matching UI structure

### 11.2 Technical Goals

✅ **Performance**: Document lists load in <1s (up to 1000 docs)
✅ **Scalability**: System handles 10,000+ documents per project
✅ **Reliability**: Auto-save success rate >99.9%
✅ **Data Integrity**: Repo ↔ Archon sync >99.9% accurate
✅ **Automation**: Branch merge → archive flow completes in <30s

### 11.3 Acceptance Criteria

- [ ] All 5 Project Doc groups implemented and functional
- [ ] All 5 Branch Doc tabs implemented and functional
- [ ] Left sidebar navigation works on desktop and tablet
- [ ] Auto-save works for all document types
- [ ] Sort options work correctly (Alphabetical, Recent, Modified)
- [ ] Search filters within current section
- [ ] 12-color pastel system applied to tasks and branches
- [ ] Operations Archive folders created on branch merge
- [ ] Feature documentation auto-generated and editable
- [ ] Repository structure mirrors UI organization
- [ ] All existing documents migrated to new structure
- [ ] Zero data loss during migration

---

## 12. Risks & Mitigations

### Risk 1: Migration Complexity
**Risk**: Migrating existing documents to new structure could cause data loss or confusion
**Mitigation**:
- Create comprehensive migration script with rollback capability
- Test migration on staging with production data copy
- Provide clear mapping from old tabs to new sections
- Manual review of migration results before production deploy

### Risk 2: Performance with Large Document Sets
**Risk**: 10,000+ documents could slow down UI
**Mitigation**:
- Implement pagination (50 docs per page)
- Lazy load document content (only load when opened)
- Add database indexes on section_id, modified_date
- Use virtual scrolling for large lists

### Risk 3: Color System Confusion
**Risk**: Users might not understand the color grouping system
**Mitigation**:
- Add onboarding tooltip explaining colors
- Provide legend in UI (hover branch tab → see "Epic: Authentication")
- Allow users to toggle colors on/off in settings
- Document color system clearly in help docs

### Risk 4: Auto-Save Conflicts
**Risk**: Multiple users editing same document could cause conflicts
**Mitigation**:
- Implement optimistic locking (version numbers)
- Show warning when conflict detected
- Provide manual merge UI
- Consider adding collaborative editing (future phase)

### Risk 5: Repository Sync Drift
**Risk**: Repo and Archon could get out of sync
**Mitigation**:
- Add daily sync validation job
- Alert admins when drift detected
- Provide manual sync tool in UI
- Log all sync operations for debugging

---

## 13. Open Questions

1. **Folder Creation**: Should users be able to create custom subfolders within sections, or only use predefined structure?
2. **Document Templates**: Should we provide templates for common document types (FSD, ISD, operations summary)?
3. **Permissions**: Should different doc sections have different permission levels (e.g., only admins can edit archived docs)?
4. **Export**: Should users be able to export entire sections as ZIP files?
5. **Collaborative Editing**: Is real-time collaborative editing (Google Docs style) needed in future?
6. **Version History**: Should documents have full version history (Git-style diffs)?
7. **Document Linking**: Should documents be able to reference/link to other documents with autocomplete?
8. **Bulk Operations**: Should users be able to bulk-move, bulk-delete, or bulk-tag documents?

---

## 14. Future Enhancements (Post-MVP)

1. **Document Templates** - Predefined templates for FSD, ISD, operation summaries
2. **Version History** - Full Git-style diff history for documents
3. **Collaborative Editing** - Real-time multi-user editing
4. **Document Linking** - Reference other docs with `[[document-name]]` syntax
5. **Smart Search** - AI-powered semantic search across all documents
6. **Document Insights** - Show related documents, similar content, references
7. **Custom Sections** - Allow users to create their own doc sections
8. **Document Templates** - Save documents as reusable templates
9. **Bulk Operations** - Multi-select documents for move/delete/tag operations
10. **PDF Export** - Export documents or entire sections as PDF
11. **Markdown Extensions** - Mermaid diagrams, math formulas, embedded code
12. **Document Analytics** - Track views, edits, most-referenced docs

---

## 15. Appendix

### A. Current vs. New Tab Structure

**Current Project Docs:**
- General
- Features
- Future Features
- Roadmap
- Specs

**New Project Docs:**
- Product ▼ (Features, Future Features, Roadmap)
- Technical ▼ (Specs [FSD/ISD/Tech], Design System, User Stories)
- Discovery ▼ (Brainstorming, Research, POC Docs)
- Supporting
- Operations Archive

**New Branch Docs:**
- Milestones
- Planning
- Implementation
- Validation
- Operations

### B. Color Palette CSS Variables

```css
:root {
  --pastel-red: #FFB3BA;
  --pastel-reddish-orange: #FFCCB3;
  --pastel-orange-yellow: #FFE6B3;
  --pastel-green-yellow: #E6F5B3;
  --pastel-green: #B3E6CC;
  --pastel-green-cyan: #B3E6E6;
  --pastel-cyan: #B3D9FF;
  --pastel-blue: #C2B3FF;
  --pastel-blue-purple: #D9B3FF;
  --pastel-purple: #F0B3FF;
  --pastel-pink-purple: #FFB3E6;
  --pastel-pink-red: #FFB3CC;
}

/* Faded versions for branch tabs (30% opacity) */
.branch-tab-color-0 { background-color: rgba(255, 179, 186, 0.3); }
.branch-tab-color-1 { background-color: rgba(255, 204, 179, 0.3); }
/* ... etc for all 12 colors */

/* Solid versions for task backgrounds */
.story-color-0 { background-color: var(--pastel-red); }
.story-color-1 { background-color: var(--pastel-reddish-orange); }
/* ... etc for all 12 colors */
```

### C. Repository Structure Commands

```bash
# Create project doc structure
mkdir -p docs/projects/{project-name}/{features,future-features,roadmap}
mkdir -p docs/projects/{project-name}/specs/{fsd,isd,prd,prp,tech}
mkdir -p docs/projects/{project-name}/{design-system,user-stories}
mkdir -p docs/projects/{project-name}/{brainstorming,research,poc-docs}
mkdir -p docs/projects/{project-name}/{supporting,operations-archive}
```

### D. Auto-Save Example

```typescript
// DocumentEditor.tsx
import { useAutoSave } from '@/hooks/useAutoSave';

const DocumentEditor = ({ documentId, initialContent }) => {
  const [content, setContent] = useState(initialContent);
  const saveStatus = useAutoSave(documentId, content);

  return (
    <div>
      <MarkdownEditor value={content} onChange={setContent} />
      <SaveStatus status={saveStatus} />
    </div>
  );
};
```

---

**End of Document**

**Next Steps:**
1. Review and approve this plan
2. Research markdown editor improvements (Features tab)
3. Research point system (Archon docs)
4. Create detailed technical design documents
5. Begin Phase 1 implementation
