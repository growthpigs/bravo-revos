# RevOS Hybrid Architecture v2.0 - Gemini File Search Integration

**Version:** 2.0
**Date:** November 20, 2025
**Branch:** feat/gemini-file-search
**Status:** Architecture Complete, Ready for Implementation

---

## Executive Summary

Integrate Gemini File Search as a RAG layer alongside existing cartridge system. This hybrid approach provides:
- **Cartridges** (Supabase JSON): Fast, structured data (brand, voice, style)
- **Gemini File Search**: Unstructured documents (PDFs, DOCX, research)
- **Mem0**: Conversation memory and learned preferences

---

## Knowledge Stack Architecture

```
LAYER 1: Structured Data (Fast, ~50ms)
├─ brand_cartridges → Company info, values, audience
├─ voice_cartridges → Tone, style, examples
├─ style_cartridges → Templates, patterns
└─ console_workflows → AgentKit workflow definitions

LAYER 2: Unstructured Documents (RAG, ~200-500ms)
├─ Gemini File Search
│  ├─ Brand guides (PDFs)
│  ├─ Style examples (DOCX)
│  ├─ Financial reports (XLSX, PDF)
│  └─ Client uploads (any format)
└─ Metadata: {client_id, doc_type, console}

LAYER 3: Conversation Memory (Fast, ~100ms)
├─ Mem0 (Long-term)
│  └─ Scope: agencyId::clientId::userId
└─ Native context (Short-term)
   └─ Current conversation
```

---

## Key Decisions

### 1. Cartridges Stay Structured
- ✅ Small JSON, fast queries
- ✅ Frequently accessed (every message)
- ✅ No RAG needed (simple lookups)
- ❌ Don't migrate to Gemini

### 2. Store Per Client (with metadata filtering)
- 10 store limit per project
- Use metadata filtering for isolation
- `client_id` in all document metadata

### 3. Preserve Citations in Hybrid Mode
- Gemini retrieves with citations
- Pass to OpenAI with `[Citation citation_X]` markers
- Map back to original citations in response

---

## Integration Points (from Explore)

### Existing Infrastructure
- `/lib/storage-utils.ts` - File upload (10MB limit, PDF/DOCX/PPTX)
- `/app/api/mem0/route.ts` - Memory API with tenant scoping
- `/lib/console/workflow-loader.ts` - Database-driven workflows
- `/lib/chips/` - Chip implementations (add GeminiSearchChip)

### Multi-Tenant Pattern
```typescript
const tenantKey = buildTenantKey(
  userData.agency_id,
  userData.client_id,
  user.id
);
// → "agency_id::client_id::user_id"
```

---

## Phase 1 Implementation Plan

### Task 1: Setup & Dependencies (30 min)
- Install `@google/generative-ai` SDK
- Add `GOOGLE_GENERATIVE_AI_API_KEY` to `.env.local`
- Create `/lib/gemini/client.ts`

### Task 2: Database Migration (30 min)
- Create `gemini_documents` table:
  ```sql
  id, client_id, filename, document_type,
  supabase_path, gemini_file_id, metadata,
  created_at, updated_at
  ```

### Task 3: Document Upload Service (1 hour)
- Create `/app/api/gemini/upload/route.ts`
- Upload to Supabase Storage
- Index in Gemini File Search
- Store metadata in database

### Task 4: Query Endpoint (1 hour)
- Create `/app/api/gemini/query/route.ts`
- Load client's documents
- Query Gemini with full context
- Return with citations

### Task 5: Admin UI (1 hour)
- Add to `/admin/documents` page
- Upload interface
- List client documents
- Delete functionality

---

## NON-NEGOTIABLE Compliance

1. ✅ **AgentKit SDK** - Use for action execution (Gemini for retrieval)
2. ✅ **Mem0 integration** - Store search results with metadata
3. ✅ **Console DB** - Load prompts via `loadConsolePrompt`
4. ✅ **Workflow JSON** - Add `gemini-search` to `console_workflows`
5. ✅ **Session persistence** - Save conversations to DB
6. ✅ **RLS** - Supabase service role for backend
7. ✅ **Admin control** - Check `admin_users` table
8. ✅ **No hard-coding** - All config in database

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Upload PDF → indexed in Gemini
- [ ] Query documents → answer with citations
- [ ] Admin can manage documents
- [ ] Multi-tenant isolation verified

### Estimated Time: 4 hours

---

## Files to Create

```
/lib/gemini/
  client.ts           - Gemini SDK initialization

/app/api/gemini/
  upload/route.ts     - Document upload
  query/route.ts      - Document query

/supabase/migrations/
  20251120_create_gemini_documents.sql

/app/admin/documents/
  page.tsx            - Admin document management
```

---

## Related Documentation

- Gemini File Search Doc: `/docs/UNIVERSAL CODING/Gemini File Search for RAG Implementation.rtf`
- HGC Workflow Spec: `/docs/HGC_WORKFLOW_SPECIFICATION.md`
- RevOS Spec: `/docs/projects/bravo-revos/spec.md`
