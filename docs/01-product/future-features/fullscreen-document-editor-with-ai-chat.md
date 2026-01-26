# Full-Screen Document Editor with AI Chat Integration

## Overview
Transform Knowledge Base documents into an immersive full-screen editing experience with integrated AI chat assistance - a "virtuous circle" where you can edit and get help simultaneously.

## Vision
Create a seamless experience where users can:
- Edit documents in a distraction-free full-screen environment
- Chat with AI about the document they're editing
- Get real-time suggestions and improvements
- Save changes directly to the Knowledge Base
- Link documents to campaigns for organization

## Current State
**What exists today:**
- Knowledge Base grid/list view
- DocumentDetailModal (small modal with edit functionality)
- Inline error/success messages (needs to be replaced with Sonner toast)
- "Markdown" badge on documents (currently not clickable)

**What's missing:**
- Full-screen editing experience
- Integrated AI chat for document assistance
- Split-screen layout (chat + editor)
- Real-time document context in chat

## Proposed Solution

### Layout Design
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Document Title | Actions (Save, Link, Delete)     │
├────────────────────────────┬────────────────────────────────┤
│  LEFT PANEL (Chat)         │  RIGHT PANEL (Editor)          │
│  ────────────────────────  │  ────────────────────────────  │
│  • AI Chat History         │  • Live Markdown Editor        │
│  • Document Context        │  • Preview Toggle              │
│  • Ask Questions           │  • Syntax Highlighting         │
│  • Get Suggestions         │  • Auto-save                   │
│  • Input Area              │  • Copy/Export Tools           │
└────────────────────────────┴────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Replace Notifications with Toast System
**Files to update:**
- `components/dashboard/DocumentDetailModal.tsx`
- `components/dashboard/CreateDocumentModal.tsx`

**Changes:**
1. Add import: `import { toast } from 'sonner'`
2. Replace error/success state variables with toast calls:
   ```typescript
   // Instead of:
   setError('Failed to save');
   setSuccessMessage('Document saved!');

   // Use:
   toast.error('Failed to save');
   toast.success('Document saved!');
   ```
3. Remove inline error/success message divs from JSX
4. Simplify component state (remove error/successMessage state)

**Benefits:**
- Consistent notifications across app
- Less visual clutter
- Better UX with auto-dismiss
- Follows existing patterns

---

#### Phase 2: Create FullscreenDocumentEditor Component
**New file:** `components/knowledge-base/FullscreenDocumentEditor.tsx`

**Component Structure:**
```typescript
interface FullscreenDocumentEditorProps {
  document: Document;
  onClose: () => void;
  onSave: (updatedDoc: Document) => void;
  onDelete: (docId: string) => void;
}

export function FullscreenDocumentEditor({
  document,
  onClose,
  onSave,
  onDelete
}: FullscreenDocumentEditorProps) {
  // State
  const [content, setContent] = useState(document.content);
  const [isPreview, setIsPreview] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatExpanded, setIsChatExpanded] = useState(true);

  // Handlers
  const handleSave = async () => { /* ... */ };
  const handleChat = async (message: string) => { /* ... */ };

  // Layout
  return (
    <div className="absolute inset-0 top-16 bg-white flex z-30">
      {/* LEFT: Chat Panel */}
      {isChatExpanded && (
        <div className="w-96 border-r flex flex-col">
          {/* Chat messages */}
          {/* Input area */}
        </div>
      )}

      {/* RIGHT: Editor */}
      <div className="flex-1 flex flex-col">
        {/* Header with actions */}
        {/* Editor/Preview toggle */}
        {/* Content area */}
      </div>
    </div>
  );
}
```

**Key Features:**
1. **Split-screen layout** - Chat left, editor right
2. **Toggle chat visibility** - Collapse for more editing space
3. **Live markdown editing** - Textarea with syntax support
4. **Preview mode** - Rendered markdown with ReactMarkdown
5. **Auto-save** - Debounced saves every 2 seconds
6. **Document context in chat** - Send full doc content to HGC
7. **AI suggestions** - Chat responses help improve document

**Reference Implementation:**
Based on `FloatingChatBar.tsx` fullscreen mode (lines 927-1142)

---

#### Phase 3: Make Document Cards Open Fullscreen
**Files to update:**
- `components/dashboard/DocumentCard.tsx`
- `app/dashboard/knowledge-base/page.tsx`

**Changes in DocumentCard:**
```typescript
// Make entire card clickable
<Card onClick={() => onOpenFullscreen(document)}>
  {/* ... */}
</Card>

// Make "Markdown" badge explicitly clickable too
<Badge
  variant="outline"
  className="cursor-pointer hover:bg-gray-100"
  onClick={(e) => {
    e.stopPropagation();
    onOpenFullscreen(document);
  }}
>
  Markdown
</Badge>
```

**Changes in KB Page:**
```typescript
const [fullscreenDoc, setFullscreenDoc] = useState<Document | null>(null);

// Conditionally render
{fullscreenDoc ? (
  <FullscreenDocumentEditor
    document={fullscreenDoc}
    onClose={() => setFullscreenDoc(null)}
    onSave={handleSave}
    onDelete={handleDelete}
  />
) : (
  <div>
    {/* Grid/List view */}
  </div>
)}
```

---

#### Phase 4: Chat Integration with Document Context
**API Integration:**
```typescript
// When user sends message in fullscreen editor
const handleChatMessage = async (userMessage: string) => {
  const response = await fetch('/api/hgc', {
    method: 'POST',
    body: JSON.stringify({
      message: userMessage,
      context: {
        document_title: document.title,
        document_content: document.content,
        document_type: 'knowledge_base',
      }
    })
  });

  // Stream AI response into chat
};
```

**Context Awareness:**
- AI knows it's helping with a specific document
- Can reference document content in responses
- Can suggest edits, improvements, formatting
- Can answer questions about the document

---

## User Flow

### Opening a Document
1. User clicks document card in KB grid
2. OR clicks "Markdown" badge on card
3. Fullscreen editor opens instantly
4. Document content loads in right panel
5. Chat panel ready on left

### Editing with AI Assistance
1. User edits document in right panel
2. User asks AI: "Can you improve this section?"
3. AI analyzes document content in context
4. AI provides suggestions in chat
5. User applies changes directly in editor
6. Auto-save updates KB in background

### Saving & Closing
1. Changes auto-save every 2 seconds
2. Manual "Save" button for explicit confirmation
3. Toast notification: "Document saved!"
4. Close button returns to KB grid
5. Grid refreshes to show updated document

---

## Technical Details

### Dependencies
- **Sonner** - Toast notifications (already installed)
- **ReactMarkdown** - Markdown rendering (already installed)
- **react-syntax-highlighter** - Code syntax (optional, check if installed)

### API Endpoints (Already Available)
- `PATCH /api/knowledge-base/[id]` - Update document
- `DELETE /api/knowledge-base/[id]` - Delete document
- `POST /api/hgc` - AI chat with context
- `POST /api/campaigns/[id]/documents` - Link to campaign

### State Management
```typescript
// Local state in component (no Redux/Zustand needed)
const [document, setDocument] = useState<Document>(initialDoc);
const [content, setContent] = useState(document.content);
const [messages, setMessages] = useState<Message[]>([]);
const [isSaving, setIsSaving] = useState(false);
```

### Performance Considerations
- Debounce auto-save (2 second delay)
- Lazy-load chat when first message sent
- Memoize markdown rendering
- Virtual scrolling for long documents (if needed)

---

## Benefits

### For Users
✅ Distraction-free editing environment
✅ AI assistance while writing
✅ No context switching between editor and chat
✅ Faster document creation and editing
✅ Professional full-screen experience

### For Product
✅ Differentiating feature (AI-assisted editing)
✅ Increases time spent in app
✅ Encourages more document creation
✅ Better content quality with AI suggestions
✅ Seamless integration with existing KB

---

## Future Enhancements (Phase 2+)

### Version History
- Track document changes over time
- Restore previous versions
- See who made what changes

### Collaborative Editing
- Multiple users editing same document
- Real-time cursor positions
- Conflict resolution

### Advanced AI Features
- Auto-formatting
- Grammar/spell check
- Style suggestions
- Content generation
- SEO optimization

### Export Options
- Export to PDF
- Export to Google Docs
- Export to Notion
- Generate shareable links

---

## Implementation Timeline

**Estimated Effort:**
- Phase 1 (Toast): 30 minutes
- Phase 2 (Fullscreen): 3-4 hours
- Phase 3 (Integration): 1 hour
- Phase 4 (Chat context): 2 hours

**Total:** ~6-8 hours for complete implementation

**Priority:** Medium-High
- Users already have basic document editing
- This enhances UX significantly
- Differentiates product from competitors

---

## Notes
- Inspired by existing Working Document feature in FloatingChatBar
- Reuses existing UI patterns and components
- Leverages current toast system (Sonner)
- Minimal new dependencies required
- Can be built incrementally (ship phases separately)

---

**Status:** 📋 Planned (Not Started)
**Last Updated:** 2025-11-10
**Author:** Claude Code
