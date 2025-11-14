# Mem0 Cartridge Integration Plan

## Overview
Integrate Style and Instructions cartridges with Mem0 to actually influence AI-generated content. Currently, cartridges exist in the database but don't affect HGC-v2 output.

## Architecture
```
User uploads PDF → Extract text → AI analysis → Store in Mem0
                                                    ↓
HGC-v2 generates content ← Retrieve from Mem0 ← System prompt injection
```

## Tasks

### Task 1: Create Style Cartridge Upload/Process Handler
**File**: `/app/api/cartridges/style/[id]/upload/route.ts`

Implement POST endpoint that:
- Accepts PDF/TXT/DOCX file uploads
- Extracts text content
- Stores files in Supabase storage
- Updates style_cartridges.source_files array
- Returns success with file metadata

**Tests**:
- Upload PDF file
- Upload multiple files
- Handle unsupported file types
- Verify storage path: `{userId}/style/{styleId}/{filename}`

**Acceptance**:
- Files stored in Supabase storage
- Database updated with file metadata
- Returns 200 with file list

---

### Task 2: Create Style Analysis with Mem0 Storage
**File**: `/app/api/cartridges/style/[id]/analyze/route.ts`

Implement POST endpoint that:
- Reads uploaded files from storage
- Extracts text (PDF → text, DOCX → text)
- Calls GPT-4 to analyze writing style:
  - Tone (formal, casual, conversational)
  - Structure patterns (short vs long sentences)
  - Vocabulary level
  - Common phrases/patterns
- Stores analysis in Mem0 with scope: `style::marketing::${userId}`
- Updates style_cartridges.learned_style JSON field
- Sets analysis_status to 'processed'

**Tests**:
- Analyze single document
- Analyze multiple documents
- Handle empty/malformed files
- Verify Mem0 storage
- Verify learned_style JSON structure

**Mem0 Structure**:
```typescript
await mem0.add({
  messages: [{
    role: "user",
    content: `Writing style analysis for user ${userId}:

    Tone: ${analysis.tone}
    Sentence structure: ${analysis.structure}
    Vocabulary: ${analysis.vocabulary}
    Common patterns: ${analysis.patterns}

    Examples:
    ${examples}`
  }]
}, {
  user_id: `style::marketing::${userId}`,
  metadata: {
    type: "style_analysis",
    cartridge_id: styleId,
    analyzed_at: new Date().toISOString()
  }
})
```

**Acceptance**:
- GPT-4 analyzes style correctly
- Mem0 stores analysis
- Database updated with learned_style
- analysis_status = 'processed'

---

### Task 3: Create Instructions Cartridge Mem0 Storage
**File**: `/app/api/cartridges/instructions/[id]/process/route.ts`

Implement POST endpoint that:
- Reads instruction cartridge (goals, constraints)
- Optionally extracts text from training_docs
- Stores in Mem0 with scope: `instructions::marketing::${userId}`
- Sets status to 'processed'

**Tests**:
- Process instructions without docs
- Process instructions with training docs
- Verify Mem0 storage
- Handle missing cartridge

**Mem0 Structure**:
```typescript
await mem0.add({
  messages: [{
    role: "user",
    content: `Content generation instructions for user ${userId}:

    Goals:
    ${instruction.goals}

    Constraints:
    ${instruction.constraints}

    Additional context:
    ${trainingDocsText}`
  }]
}, {
  user_id: `instructions::marketing::${userId}`,
  metadata: {
    type: "instructions",
    cartridge_id: instructionId,
    processed_at: new Date().toISOString()
  }
})
```

**Acceptance**:
- Instructions stored in Mem0
- Training docs processed if present
- Status updated to 'processed'

---

### Task 4: Create Cartridge Retrieval Helper
**File**: `/lib/cartridges/retrieval.ts`

Create utility functions:

```typescript
// Retrieve style memories for a user
async function retrieveStyleCartridge(userId: string): Promise<StyleMemory[]>

// Retrieve instruction memories for a user
async function retrieveInstructionCartridge(userId: string): Promise<InstructionMemory[]>

// Retrieve all cartridge memories for system prompt
async function retrieveAllCartridges(userId: string): Promise<CartridgeMemories>
```

**Tests**:
- Retrieve when cartridges exist
- Handle missing cartridges
- Verify Mem0 search parameters
- Test retrieval performance (<500ms)

**Acceptance**:
- Functions retrieve from correct Mem0 scopes
- Returns structured data for prompt injection
- Handles missing data gracefully

---

### Task 5: Integrate Cartridges into HGC-v2 System Prompt
**File**: `/app/api/hgc-v2/route.ts`

Modify POST handler:
- Before generating content, call `retrieveAllCartridges(userId)`
- Pass cartridge data to `assembleSystemPrompt()`
- Inject style and instructions into prompt

**File**: `/lib/orchestration/console-prompt-assembly.ts`

Modify `assembleSystemPrompt()`:
- Accept optional cartridge data parameter
- Inject style guidance section if style cartridge exists
- Inject instruction constraints if instructions cartridge exists

**Tests**:
- Generate content without cartridges (baseline)
- Generate with style cartridge only
- Generate with instructions cartridge only
- Generate with both cartridges
- Verify prompt includes cartridge data
- E2E test: Upload style → Generate → Verify style matching

**Acceptance**:
- Cartridge data retrieved before generation
- System prompt includes cartridge guidance
- Generated content reflects style/instructions
- Tests validate end-to-end flow

---

### Task 6: Add Status Polling for Processing
**File**: `/app/api/cartridges/style/[id]/status/route.ts`
**File**: `/app/api/cartridges/instructions/[id]/status/route.ts`

Implement GET endpoints that return:
- Current processing status
- Progress if applicable
- Error messages if failed

Update frontend polling logic in cartridges page.

**Tests**:
- Poll during processing
- Poll when complete
- Poll when failed
- Handle missing cartridge

**Acceptance**:
- Frontend can check status
- Status updates in real-time
- Errors reported to user

---

## Testing Strategy

### Unit Tests
- Each endpoint handler
- Mem0 storage/retrieval functions
- Text extraction utilities

### Integration Tests
- Upload → Process → Mem0 storage
- Retrieve → Prompt assembly → Generation
- Full CRUD flow with Mem0

### E2E Test
1. User uploads 3 blog posts to Style cartridge
2. System analyzes and stores in Mem0
3. User creates Instructions cartridge
4. System stores in Mem0
5. User generates LinkedIn post via HGC-v2
6. Verify output matches style and follows instructions

## Dependencies

### Required Libraries
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction
- `@mem0ai/mem0` - Already installed

### Environment Variables
- All Mem0 credentials already configured
- Supabase storage bucket: `style-documents`
- Supabase storage bucket: `instruction-documents`

## Success Criteria

1. ✅ Style cartridge upload works
2. ✅ Style analysis stores in Mem0
3. ✅ Instructions cartridge stores in Mem0
4. ✅ HGC-v2 retrieves cartridge data
5. ✅ Generated content reflects style
6. ✅ Generated content follows instructions
7. ✅ All tests passing
8. ✅ TypeScript compiles with no errors

## Rollout Plan

1. Implement Tasks 1-3 (cartridge processing)
2. Test cartridge CRUD independently
3. Implement Task 4 (retrieval)
4. Implement Task 5 (HGC-v2 integration)
5. E2E testing
6. Task 6 (status polling)
7. User acceptance testing
