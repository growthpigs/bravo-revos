# FUNCTIONAL SPECIFICATION DOCUMENT (FSD)
## Agro Archon CRUD System Redesign - GitHub-Style Interface

**For:** Claude Code Instance #2 (Building Agro Archon)
**From:** Claude Code Instance #1 (RevOS Project)
**Date:** 2025-10-25
**Priority:** Both Documents and Tasks simultaneously

---

## 🎯 OBJECTIVE

Redesign the Agro Archon CRUD system to match GitHub's UX patterns:
1. **Documents** → GitHub-style Write/Preview markdown editor
2. **Tasks** → GitHub-style slide-out panel on card click
3. **Data** → Raw markdown storage (TEXT column, not JSON)

---

## 📊 CURRENT STATE vs DESIRED STATE

| Feature | Current (Agro Archon) | Desired (GitHub-Style) |
|---------|----------------------|------------------------|
| **Documents** | Structured JSON in content field | Raw markdown TEXT in content field |
| **Doc Editing** | Unknown/basic form | Write/Preview tabs like GitHub comments |
| **Task Cards** | Cards with basic info | Click anywhere → slide-out panel |
| **Task Detail** | Unknown | Full detail panel like GitHub issues |

---

## 1. DOCUMENTS CRUD - GITHUB-STYLE EDITOR

### Database Schema Changes

```sql
-- EXISTING (assumed):
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255),
  document_type VARCHAR(50), -- 'spec', 'design', 'note', 'guide', 'prp', 'api'
  status VARCHAR(50), -- 'draft', 'published', 'archived'
  content JSONB,  -- ❌ CHANGE THIS
  tags TEXT[],
  author VARCHAR(255),
  version VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- NEW SCHEMA (RECOMMENDED):
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',

  -- ✅ CHANGE: Store raw markdown as TEXT (like GitHub)
  markdown_content TEXT,

  tags TEXT[],
  author VARCHAR(255),
  version VARCHAR(50) DEFAULT '1.0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### UI Components to Build

#### A) Document Editor Component (Like GitHub Comment Editor)

```
┌─────────────────────────────────────────────────────────────┐
│ Document: "Diiiploy-REVOS COMMAND CENTER - Master Plan"     │
├─────────────────────────────────────────────────────────────┤
│ [Write] [Preview]  [Bold] [Italic] [Code] [Link] [Image]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ # Diiiploy-REVOS COMMAND CENTER                            │
│                                                              │
│ ## 🎯 MASTER VISION                                         │
│                                                              │
│ **What We're Building:**                                    │
│ A complete revenue operating system...                      │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ [Cancel] [Save Draft] [Publish]                            │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Write Tab: Textarea with raw markdown
- Preview Tab: Rendered markdown (react-markdown or marked)
- Toolbar: Bold, Italic, Code, Link, Image buttons
- Auto-save: Every 30 seconds (optional)
- Character count: Show document length

#### B) Document List View

```
┌─────────────────────────────────────────────────────────────┐
│ Documents for Project: "revOS"                   [+ New Doc] │
├─────────────────────────────────────────────────────────────┤
│ 📄 Diiiploy-REVOS COMMAND CENTER - Master Plan              │
│    spec • draft • 3,098 words • User (Diiiploy)             │
│    Tags: master-plan, agency-fulfillment, distributed       │
└─────────────────────────────────────────────────────────────┘
```

### API Endpoints

```typescript
// CREATE Document
POST /api/documents
Body: {
  project_id: string,
  title: string,
  document_type: 'spec' | 'design' | 'note' | 'guide',
  markdown_content: string,  // ✅ Raw markdown
  tags: string[],
  author: string
}

// UPDATE Document
PUT /api/documents/:id
Body: {
  title?: string,
  markdown_content?: string,  // ✅ Raw markdown
  status?: 'draft' | 'published',
  tags?: string[]
}

// GET Document
GET /api/documents/:id
Response: {
  id: string,
  title: string,
  markdown_content: string,  // ✅ Raw markdown
  tags: string[]
}
```

### MCP Server Changes

```python
# OLD (WRONG):
content = {
  "summary": "...",
  "full_content": "..."
}

# NEW (CORRECT):
markdown_content = """
# Title

## Section

Content here...
"""

manage_document(
  "create",
  markdown_content=markdown_content  # ✅ Raw string
)
```

---

## 2. TASKS CRUD - SLIDE-OUT PANEL

### UI Components

#### A) Kanban Board (Keep Current)
Make entire card clickable (not just title)

#### B) Slide-Out Panel (NEW)

```
┌────────────────────────┬────────────────────────┐
│ Kanban (visible)      │ ← Task Detail Panel    │
│                        │                        │
│ ┌──────┐ ┌──────┐    │ Task Title        [×] │
│ │Todo 4│ │Doing │    │ ──────────────────────│
│ ├──────┤ ├──────┤    │ Status: [doing] ▼     │
│ │Card 1│ │      │    │ Assignee: Agent ▼     │
│ │Card 2│ │      │    │                        │
│ └──────┘ └──────┘    │ [Write] [Preview]     │
│                        │ ──────────────────────│
│                        │ Description markdown  │
│                        │                        │
│                        │ [Save] [Delete]       │
└────────────────────────┴────────────────────────┘
```

**Features:**
- Width: 45% of screen
- Backdrop overlay
- Close: Click backdrop, [×], ESC
- Write/Preview for description
- Inline editing for Status/Assignee

---

## 3. UPDATED ARCHON CLAUDE.MD

Add to `/Users/rodericandrews/Obsidian/Master/_archon/CLAUDE.md`:

```markdown
## Document Management

**CRITICAL: Documents are raw markdown, NOT JSON!**

### Uploading Documents:

\`\`\`python
# ✅ CORRECT
markdown_content = read_file("doc.md")
manage_document(
    "create",
    markdown_content=markdown_content  # Raw string
)
\`\`\`

**WRONG:** `content={"summary": "..."}`
**RIGHT:** `markdown_content="# Title\\n\\nContent"`

### Document Types:
- spec: Technical specifications
- design: Architecture docs
- note: General docs, SITREPs
- guide: How-to guides
```

---

## 4. IMPLEMENTATION CHECKLIST

### Phase 1: Database & Backend
- [ ] Migrate documents.content JSONB → markdown_content TEXT
- [ ] Update manage_document MCP tool
- [ ] Add word count in API response
- [ ] Test with existing documents

### Phase 2: Documents UI
- [ ] Build Write/Preview component
- [ ] Add markdown toolbar
- [ ] Integrate renderer (react-markdown)
- [ ] Add auto-save
- [ ] Test round-trip editing

### Phase 3: Tasks UI
- [ ] Make cards fully clickable
- [ ] Build slide-out panel (45% width)
- [ ] Add backdrop overlay
- [ ] Write/Preview for descriptions
- [ ] Test drag-and-drop compatibility

### Phase 4: Instructions
- [ ] Update Archon CLAUDE.md
- [ ] Add examples
- [ ] Test with new Claude instance

---

## 5. TECHNICAL STACK

```bash
# Markdown rendering
npm install react-markdown remark-gfm

# Syntax highlighting
npm install react-syntax-highlighter

# Rich editor (optional)
npm install @uiw/react-md-editor
```

### Markdown Rendering

```typescript
import ReactMarkdown from 'react-markdown';

function Preview({ markdown }) {
  return (
    <ReactMarkdown className="prose">
      {markdown}
    </ReactMarkdown>
  );
}
```

### Slide Panel CSS

```css
.slide-panel {
  position: fixed;
  right: 0;
  width: 45%;
  height: 100vh;
  transform: translateX(100%);
  transition: transform 0.3s;
  z-index: 1000;
}

.slide-panel.open {
  transform: translateX(0);
}

.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 999;
}
```

---

## 6. MIGRATION SCRIPT

```sql
-- Add new column
ALTER TABLE documents ADD COLUMN markdown_content TEXT;

-- Migrate existing data
UPDATE documents
SET markdown_content = content->>'full_content'
WHERE content->>'full_content' IS NOT NULL;

-- Drop old column
ALTER TABLE documents DROP COLUMN content;

-- Make required
ALTER TABLE documents
ALTER COLUMN markdown_content SET NOT NULL;
```

---

## 7. TESTING CHECKLIST

### Documents
- [ ] Create with markdown
- [ ] Toggle Write/Preview
- [ ] Edit existing
- [ ] Verify rendering (emojis, code blocks, tables)
- [ ] Upload from Claude Code MCP

### Tasks
- [ ] Click card anywhere
- [ ] Panel slides smoothly
- [ ] Edit with Write/Preview
- [ ] Close (backdrop, [×], ESC)
- [ ] Drag-and-drop still works

---

## 8. EXPECTED OUTCOMES

✅ **Documents:**
- Simple upload (read file → pass string)
- GitHub-style editing
- Cleaner database
- No JSON confusion

✅ **Tasks:**
- Better UX (slide-out panel)
- Familiar patterns
- Markdown descriptions
- Mobile-friendly

---

## 🎯 SUMMARY

**TWO features simultaneously:**

1. **Documents:** JSONB → TEXT, Write/Preview UI
2. **Tasks:** Clickable cards, slide-out panel

**80/20 Approach:**
- TEXT column (simple, effective)
- Copy GitHub UX (proven)
- Basic Write/Preview first

**Start:**
1. Migrate schema
2. Update MCP tools
3. Build Write/Preview component
4. Build slide-out panel
5. Test end-to-end
