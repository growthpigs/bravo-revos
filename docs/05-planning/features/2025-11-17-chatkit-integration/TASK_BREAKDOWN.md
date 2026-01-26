# ChatKit Integration - Task Breakdown for Archon

**Project:** bravo-revos (de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531)
**Feature:** ChatKit Integration
**Timeline:** 6 sessions (~6 hours)
**Created:** 2025-11-17

---

## Epic: ChatKit Integration for RevOS Content Generation

**Goal:** Replace custom AgentKit implementation with OpenAI's ChatKit SDK for workflow-driven content generation while preserving existing UI patterns (floating/fullscreen/sidebar).

**Benefits:**
- Built-in session management and persistence
- Native Agent Builder workflow integration
- Simplified streaming and state management
- Better error handling and reconnection logic
- Easier to maintain than custom implementation

---

## Task 1: Manual Setup - Agent Builder Workflows

**Assignee:** User (Manual)
**Status:** todo
**Priority:** 100 (Critical - Blocks all other tasks)
**Estimated Time:** 30 minutes

### Description

**MANUAL SETUP REQUIRED** - Complete this before any coding tasks.

### Steps

#### 1. Create Agent Builder Workflows

Go to: https://platform.openai.com/agent-builder

**Workflow 1: LinkedIn Topic Generator**

```
Name: LinkedIn Topic Generator
Type: Agent

Instructions:
You are a LinkedIn content strategist.

Input: User's industry and target audience
Output: 4 compelling hooks/topics for LinkedIn posts

Rules:
- Make hooks specific and actionable
- Focus on pain points and value
- Keep each hook under 15 words
- Include variety (educational, controversial, inspiring, practical)

Format: Return as JSON array:
["Hook 1: [Specific benefit for audience]", "Hook 2: ...", "Hook 3: ...", "Hook 4: ..."]

Example output:
["How AI reduces customer churn by 40% in SaaS", "The #1 mistake killing your LinkedIn engagement", "Why your competitors are outpacing you on social", "3 automation workflows that save 10 hours/week"]
```

- Test in Preview Mode with: "Generate topics for SaaS marketing to startup founders"
- Publish workflow
- **Copy workflow ID** (format: `wf_abc123def456`)

**Workflow 2: LinkedIn Post Writer**

```
Name: LinkedIn Post Writer
Type: Agent

Instructions:
You are a LinkedIn content writer.

Input: Selected topic/hook
Output: Full LinkedIn post (250-350 words)

Structure:
1. Attention-grabbing opening (2 lines max)
2. Personal story or insight
3. Practical value/lesson
4. Clear takeaway
5. Engaging call-to-action

Style:
- Conversational, not corporate
- Short paragraphs (2-3 lines each)
- Use "you" to address reader
- Include 1-2 emojis strategically
- End with a question to drive comments

Format: Clean markdown, ready to copy/paste into LinkedIn
```

- Test with: "Write about: How AI reduces customer churn by 40% in SaaS"
- Publish workflow
- **Copy workflow ID**

#### 2. Configure Domain Allowlist

1. Go to: https://platform.openai.com/settings
2. Find "Domain Allowlist" or "ChatKit Domains"
3. Add these domains:
   - `localhost:3002`
   - `localhost:3000` (backup)
   - `*.netlify.app` (preview deployments)
   - Your production domain (if any)
4. Save changes
5. **Wait 5 minutes** for DNS propagation

#### 3. Save Workflow IDs

Create file: `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/.chatkit-workflows.txt`

```
TOPIC_GENERATION_WORKFLOW_ID=wf_[PASTE_YOUR_ID_HERE]
POST_GENERATION_WORKFLOW_ID=wf_[PASTE_YOUR_ID_HERE]
```

### Acceptance Criteria

- [ ] Topic Generator workflow created and tested
- [ ] Post Writer workflow created and tested
- [ ] Both workflow IDs saved to .chatkit-workflows.txt
- [ ] Domain allowlist configured with all 4 domains
- [ ] Waited 5 minutes for propagation
- [ ] Ready to proceed with Task 2

### Blocks

- Task 2 (Environment Setup)
- All other ChatKit integration tasks

---

## Task 2: Environment Setup & Package Verification

**Assignee:** Claude Code
**Status:** todo
**Priority:** 90
**Estimated Time:** 15 minutes
**Depends On:** Task 1

### Description

Update environment variables with ChatKit workflow IDs and verify package installation.

### Implementation Steps

1. Read workflow IDs from `.chatkit-workflows.txt` created in Task 1
2. Add to `.env.local`:
   ```bash
   # ChatKit & AgentKit Configuration
   TOPIC_GENERATION_WORKFLOW_ID=wf_[ID_FROM_FILE]
   POST_GENERATION_WORKFLOW_ID=wf_[ID_FROM_FILE]
   ```
3. Verify `@openai/chatkit` is in package.json (should already be installed)
4. Check version: Should be `^1.0.1` or newer
5. If missing: `npm install @openai/chatkit`

### Acceptance Criteria

- [ ] Workflow IDs added to .env.local
- [ ] Environment variables verified with `grep "WORKFLOW_ID" .env.local`
- [ ] ChatKit package confirmed in package.json
- [ ] No TypeScript errors: `npx tsc --noEmit`

### Files Modified

- `.env.local`
- Potentially `package.json` if reinstall needed

---

## Task 3: Create ChatKit Session API Endpoint

**Assignee:** Claude Code
**Status:** todo
**Priority:** 80
**Estimated Time:** 30 minutes
**Depends On:** Task 2

### Description

Create backend endpoint that authenticates users and creates ChatKit sessions for connecting to Agent Builder workflows.

### Implementation

**Create:** `app/api/chatkit/session/route.ts`

```typescript
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

/**
 * ChatKit Session Endpoint
 * Creates authenticated sessions for ChatKit to connect to Agent Builder workflows
 */
export async function POST(req: Request) {
  try {
    // Authenticate user via Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[CHATKIT_SESSION] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CHATKIT_SESSION] Creating session for user:', user.id);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Create ChatKit session
    const session = await openai.chatkit.sessions.create({
      user_id: user.id,
      metadata: {
        email: user.email,
        client_id: user.user_metadata?.client_id,
        agency_id: user.user_metadata?.agency_id,
      }
    });

    console.log('[CHATKIT_SESSION] Session created successfully');

    return NextResponse.json({
      client_secret: session.client_secret,
      session_id: session.id,
    });
  } catch (error: any) {
    console.error('[CHATKIT_SESSION] Error creating session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create ChatKit session',
        details: error.message
      },
      { status: 500 }
    );
  }
}
```

### Acceptance Criteria

- [ ] File created at correct path
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Endpoint accessible at `/api/chatkit/session`
- [ ] Returns session object with client_secret
- [ ] Handles authentication errors properly
- [ ] Logs session creation for debugging

### Files Created

- `app/api/chatkit/session/route.ts`

---

## Task 4: Create Workflow Finder API

**Assignee:** Claude Code
**Status:** todo
**Priority:** 75
**Estimated Time:** 20 minutes
**Depends On:** Task 2

### Description

Create API endpoint that maps user commands/triggers to appropriate Agent Builder workflow IDs.

### Implementation

**Create:** `app/api/chatkit/workflow/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Workflow Finder API
 * Maps user commands to Agent Builder workflow IDs
 */
export async function POST(req: Request) {
  try {
    const { trigger } = await req.json();

    console.log('[WORKFLOW_FINDER] Finding workflow for trigger:', trigger);

    // Map triggers to workflow IDs from environment
    const workflowMap: Record<string, string> = {
      'write': process.env.TOPIC_GENERATION_WORKFLOW_ID || '',
      'post': process.env.TOPIC_GENERATION_WORKFLOW_ID || '',
      'generate': process.env.TOPIC_GENERATION_WORKFLOW_ID || '',
    };

    const workflowId = workflowMap[trigger.toLowerCase().trim()];

    if (!workflowId) {
      console.log('[WORKFLOW_FINDER] No workflow found for:', trigger);
      return NextResponse.json({
        workflowId: null,
        error: 'No workflow configured for this trigger'
      });
    }

    console.log('[WORKFLOW_FINDER] Found workflow:', workflowId);

    return NextResponse.json({
      workflowId,
      workflowName: 'LinkedIn Topic Generator'
    });
  } catch (error: any) {
    console.error('[WORKFLOW_FINDER] Error:', error);
    return NextResponse.json({
      workflowId: null,
      error: error.message
    });
  }
}
```

### Acceptance Criteria

- [ ] File created at correct path
- [ ] TypeScript compiles
- [ ] Maps 'write', 'post', 'generate' to topic generation workflow
- [ ] Returns null for unknown triggers
- [ ] Proper error handling and logging

### Files Created

- `app/api/chatkit/workflow/route.ts`

---

## Task 5: Create ChatKitWrapper Component

**Assignee:** Claude Code
**Status:** todo
**Priority:** 70
**Estimated Time:** 45 minutes
**Depends On:** Task 3, Task 4

### Description

Create React component that wraps ChatKit SDK and handles workflow connections while integrating with RevOS UI states.

### Implementation

**Create:** `components/chat/ChatKitWrapper.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';

interface ChatKitWrapperProps {
  workflowId: string;
  onResponse?: (data: any) => void;
  onDocumentReady?: (document: { content: string; title: string }) => void;
  className?: string;
}

/**
 * ChatKit Wrapper Component
 *
 * Integrates OpenAI's ChatKit with RevOS while maintaining
 * our existing UI patterns (floating/fullscreen/sidebar)
 */
export function ChatKitWrapper({
  workflowId,
  onResponse,
  onDocumentReady,
  className
}: ChatKitWrapperProps) {
  const [sessionError, setSessionError] = useState<string | null>(null);

  const { control, messages } = useChatKit({
    api: {
      async getClientSecret(existing) {
        // Reuse existing session if valid
        if (existing) {
          console.log('[CHATKIT] Reusing existing session');
          return existing;
        }

        console.log('[CHATKIT] Creating new session');

        try {
          const res = await fetch('/api/chatkit/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Session creation failed');
          }

          const { client_secret } = await res.json();
          console.log('[CHATKIT] Session created successfully');
          return client_secret;
        } catch (error: any) {
          console.error('[CHATKIT] Session error:', error);
          setSessionError(error.message);
          throw error;
        }
      },
    },
    workflowId,
  });

  // Listen to ChatKit message events
  useEffect(() => {
    if (!control) return;

    const handleMessage = (event: any) => {
      console.log('[CHATKIT] Message received:', event.detail);

      const messageData = event.detail;

      // Call onResponse callback
      if (onResponse) {
        onResponse(messageData);
      }

      // Check if this is a document-ready event
      if (messageData.document || messageData.type === 'document') {
        const document = {
          content: messageData.document?.content || messageData.content || '',
          title: messageData.document?.title || 'Generated Content'
        };

        console.log('[CHATKIT] Document ready, triggering fullscreen');

        if (onDocumentReady) {
          onDocumentReady(document);
        }
      }
    };

    const handleError = (event: any) => {
      console.error('[CHATKIT] Error:', event.detail);
      setSessionError(event.detail.message || 'ChatKit error occurred');
    };

    // Subscribe to events
    control.addEventListener('message', handleMessage);
    control.addEventListener('error', handleError);

    return () => {
      control.removeEventListener('message', handleMessage);
      control.removeEventListener('error', handleError);
    };
  }, [control, onResponse, onDocumentReady]);

  // Show error state
  if (sessionError) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-red-500 mb-2">ChatKit Error</p>
          <p className="text-sm text-gray-600">{sessionError}</p>
          <button
            onClick={() => {
              setSessionError(null);
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ChatKit
        control={control}
        className="h-full w-full"
      />
    </div>
  );
}
```

### Acceptance Criteria

- [ ] Component created with TypeScript
- [ ] Session management working (create/reuse)
- [ ] Event listeners for messages and errors
- [ ] Callbacks for onResponse and onDocumentReady
- [ ] Error state UI with retry button
- [ ] TypeScript compiles without errors
- [ ] Proper logging for debugging

### Files Created

- `components/chat/ChatKitWrapper.tsx`

---

## Task 6: Integrate ChatKit into FloatingChatBar

**Assignee:** Claude Code
**Status:** todo
**Priority:** 65
**Estimated Time:** 90 minutes
**Depends On:** Task 5

### Description

Integrate ChatKitWrapper into existing FloatingChatBar component while preserving all UI states (floating, fullscreen, sidebar).

### Implementation Strategy

1. **Backup current file:**
   ```bash
   cp components/chat/FloatingChatBar.tsx components/chat/FloatingChatBar.backup.tsx
   ```

2. **Add imports:**
   ```typescript
   import { ChatKitWrapper } from './ChatKitWrapper';
   ```

3. **Add state variables:**
   ```typescript
   const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
   const [workingDocument, setWorkingDocument] = useState<{
     content: string;
     title: string;
   } | null>(null);
   ```

4. **Add workflow loader function:**
   ```typescript
   const loadWorkflowByTrigger = async (message: string) => {
     console.log('[FCB] Loading workflow for message:', message);

     try {
       const firstWord = message.trim().split(/\s+/)[0].toLowerCase();

       const res = await fetch('/api/chatkit/workflow', {
         method: 'POST',
         body: JSON.stringify({ trigger: firstWord }),
         headers: { 'Content-Type': 'application/json' }
       });

       const { workflowId, error } = await res.json();

       if (workflowId) {
         console.log('[FCB] Workflow loaded:', workflowId);
         setCurrentWorkflowId(workflowId);
       } else {
         console.log('[FCB] No workflow found:', error);
       }
     } catch (error) {
       console.error('[FCB] Error loading workflow:', error);
     }
   };
   ```

5. **Add response handler:**
   ```typescript
   const handleChatKitResponse = (data: any) => {
     console.log('[FCB] ChatKit response:', data);

     if (data.document || data.type === 'document') {
       setWorkingDocument({
         content: data.document?.content || data.content,
         title: data.document?.title || 'Generated Content'
       });

       // Switch to fullscreen mode
       setChatState?.('fullscreen');
     }
   };
   ```

6. **Integrate ChatKitWrapper into render:**
   - Replace existing message handling with ChatKit
   - Preserve all UI states (floating/fullscreen/sidebar)
   - Keep existing resize panels and layout

### Acceptance Criteria

- [ ] Backup file created
- [ ] ChatKitWrapper imported and integrated
- [ ] Workflow loading on user message
- [ ] ChatKit response handling working
- [ ] Document state updates trigger fullscreen
- [ ] All existing UI states preserved
- [ ] TypeScript compiles without errors
- [ ] No regression in existing functionality

### Files Modified

- `components/chat/FloatingChatBar.tsx`

### Files Created

- `components/chat/FloatingChatBar.backup.tsx`

---

## Task 7: Add Fullscreen Document View

**Assignee:** Claude Code
**Status:** todo
**Priority:** 60
**Estimated Time:** 45 minutes
**Depends On:** Task 6

### Description

Add fullscreen document view that displays generated content in a split layout (chat sidebar + document viewer).

### Implementation

Add to FloatingChatBar render logic:

```typescript
{chatState === 'fullscreen' && workingDocument ? (
  <div className="fixed inset-0 bg-background z-50">
    <div className="grid grid-cols-[400px_1fr] h-screen">
      {/* Left: Chat sidebar */}
      <div className="border-r border-border overflow-hidden bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Chat</h2>
          <button
            onClick={() => {
              setChatState('floating');
              setWorkingDocument(null);
            }}
            className="p-2 hover:bg-accent rounded-lg"
            title="Exit fullscreen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentWorkflowId && (
          <ChatKitWrapper
            workflowId={currentWorkflowId}
            onResponse={handleChatKitResponse}
            onDocumentReady={(doc) => setWorkingDocument(doc)}
            className="h-[calc(100vh-73px)]"
          />
        )}
      </div>

      {/* Right: Working document */}
      <div className="overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">{workingDocument.title}</h1>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(workingDocument.content);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Copy to Clipboard
              </button>

              <button
                onClick={() => {
                  // TODO: Implement save to campaigns
                  console.log('Save functionality');
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
              >
                Save to Campaign
              </button>
            </div>
          </div>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <pre className="whitespace-pre-wrap font-sans">
              {workingDocument.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  </div>
) : (
  /* Existing floating/sidebar render logic */
)}
```

### Additional Requirements

- Import `X` icon from lucide-react if not already imported
- Add toast notification for copy success (optional enhancement)
- Ensure dark mode styles work correctly

### Acceptance Criteria

- [ ] Fullscreen layout renders correctly
- [ ] Chat sidebar shows ChatKit on left (400px width)
- [ ] Document viewer on right with proper styling
- [ ] Copy to clipboard button works
- [ ] Exit fullscreen button returns to floating mode
- [ ] Document content formatted properly (prose styles)
- [ ] Dark mode compatible
- [ ] TypeScript compiles without errors

### Files Modified

- `components/chat/FloatingChatBar.tsx`

---

## Task 8: Database Migration for AgentKit Workflow IDs

**Assignee:** Claude Code
**Status:** todo
**Priority:** 55
**Estimated Time:** 30 minutes
**Depends On:** Task 2

### Description

Update database schema to store AgentKit workflow IDs in the console_workflows table.

### Implementation

**Create:** `supabase/migrations/20251117_add_agentkit_workflow_ids.sql`

```sql
-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Add AgentKit workflow ID column to console_workflows
ALTER TABLE console_workflows
ADD COLUMN IF NOT EXISTS agentkit_workflow_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_console_workflows_agentkit_id
ON console_workflows(agentkit_workflow_id);

-- Update existing workflow with environment variable placeholder
UPDATE console_workflows
SET agentkit_workflow_id = 'ENV:TOPIC_GENERATION_WORKFLOW_ID'
WHERE name = 'write-linkedin-post'
AND agentkit_workflow_id IS NULL;

-- Add comment
COMMENT ON COLUMN console_workflows.agentkit_workflow_id IS
'Agent Builder workflow ID from OpenAI platform. Can reference ENV: variables.';
```

### Acceptance Criteria

- [ ] Migration file created with Supabase link in header
- [ ] Column added to console_workflows table
- [ ] Index created for performance
- [ ] Existing 'write-linkedin-post' workflow updated
- [ ] Migration applied successfully (run via Supabase SQL editor)
- [ ] No database errors

### Files Created

- `supabase/migrations/20251117_add_agentkit_workflow_ids.sql`

---

## Task 9: Create Integration Test Script

**Assignee:** Claude Code
**Status:** todo
**Priority:** 50
**Estimated Time:** 45 minutes
**Depends On:** Task 2, Task 3, Task 4, Task 5, Task 8

### Description

Create comprehensive test script to verify all ChatKit integration components before manual testing.

### Implementation

**Create:** `scripts/test-chatkit-integration.ts`

```typescript
#!/usr/bin/env tsx

/**
 * ChatKit Integration Test
 * Tests the complete workflow from trigger to document display
 */

import { createClient } from '@/lib/supabase/server';

async function testChatKitIntegration() {
  console.log('🧪 Testing ChatKit Integration\n');

  // Test 1: Environment variables
  console.log('1️⃣ Checking environment variables...');
  const topicWorkflowId = process.env.TOPIC_GENERATION_WORKFLOW_ID;
  const postWorkflowId = process.env.POST_GENERATION_WORKFLOW_ID;

  if (!topicWorkflowId || !postWorkflowId) {
    console.error('❌ Missing workflow IDs in environment');
    console.log('   TOPIC_GENERATION_WORKFLOW_ID:', topicWorkflowId || 'NOT SET');
    console.log('   POST_GENERATION_WORKFLOW_ID:', postWorkflowId || 'NOT SET');
    process.exit(1);
  }

  console.log('✅ Workflow IDs configured');
  console.log('   Topic Gen:', topicWorkflowId);
  console.log('   Post Gen:', postWorkflowId);

  // Test 2: Database workflow records
  console.log('\n2️⃣ Checking database workflows...');
  const supabase = await createClient();

  const { data: workflows, error } = await supabase
    .from('console_workflows')
    .select('name, agentkit_workflow_id, is_active')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Database query failed:', error);
    process.exit(1);
  }

  console.log('✅ Found', workflows?.length || 0, 'active workflows');
  workflows?.forEach(w => {
    console.log(`   - ${w.name}: ${w.agentkit_workflow_id || 'NO ID'}`);
  });

  // Test 3: API endpoints exist
  console.log('\n3️⃣ Checking API endpoints...');
  const endpoints = [
    'app/api/chatkit/session/route.ts',
    'app/api/chatkit/workflow/route.ts'
  ];

  for (const endpoint of endpoints) {
    const fs = await import('fs');
    if (fs.existsSync(endpoint)) {
      console.log('✅', endpoint);
    } else {
      console.error('❌', endpoint, 'NOT FOUND');
    }
  }

  // Test 4: Components exist
  console.log('\n4️⃣ Checking components...');
  const components = [
    'components/chat/ChatKitWrapper.tsx',
    'components/chat/FloatingChatBar.tsx'
  ];

  for (const component of components) {
    const fs = await import('fs');
    if (fs.existsSync(component)) {
      console.log('✅', component);
    } else {
      console.error('❌', component, 'NOT FOUND');
    }
  }

  console.log('\n✅ ChatKit integration test complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Start dev server: npm run dev');
  console.log('2. Login to RevOS');
  console.log('3. Type "write" in chat');
  console.log('4. Verify ChatKit connects and loads workflow');
  console.log('5. Select a topic');
  console.log('6. Verify fullscreen document opens');
}

testChatKitIntegration().catch(console.error);
```

### Acceptance Criteria

- [ ] Script created and executable
- [ ] Tests environment variables
- [ ] Tests database workflows
- [ ] Tests API endpoint file existence
- [ ] Tests component file existence
- [ ] Clear output with emojis for readability
- [ ] Exits with error code if tests fail
- [ ] Provides next steps on success

### Files Created

- `scripts/test-chatkit-integration.ts`

---

## Task 10: Manual End-to-End Testing

**Assignee:** User
**Status:** todo
**Priority:** 40
**Estimated Time:** 30 minutes
**Depends On:** All previous tasks

### Description

Manual testing of complete ChatKit workflow from user input to document generation.

### Prerequisites

1. All previous tasks completed
2. Database migration applied
3. Dev server running: `npm run dev`
4. Test script passed: `tsx scripts/test-chatkit-integration.ts`

### Test Cases

#### Test Case 1: Initial Load
- [ ] Open http://localhost:3002/dashboard
- [ ] Chat bar appears in floating mode
- [ ] No errors in browser console
- [ ] No errors in terminal

#### Test Case 2: Write Command
- [ ] Type "write" in chat input
- [ ] Press Enter
- [ ] Verify: Workflow finder API called (check Network tab)
- [ ] Verify: ChatKit session created (check Network tab)
- [ ] Verify: ChatKit component loads
- [ ] Verify: No console errors

#### Test Case 3: Topic Generation
- [ ] Agent Builder generates 4 topics/hooks
- [ ] Topics display as interactive buttons or list
- [ ] Topics are relevant and well-formatted
- [ ] Can click/select a topic

#### Test Case 4: Content Generation
- [ ] Selecting topic triggers content generation
- [ ] Loading indicator shows (if implemented)
- [ ] Fullscreen mode activates
- [ ] Chat sidebar appears on left (400px)
- [ ] Document viewer appears on right

#### Test Case 5: Document Display
- [ ] Document title displays correctly
- [ ] Document content renders with proper formatting
- [ ] Copy to Clipboard button works
- [ ] Browser shows "Copied!" or content is in clipboard
- [ ] Save to Campaign button present (may not be functional yet)

#### Test Case 6: Exit Fullscreen
- [ ] Exit fullscreen button (X) visible
- [ ] Clicking X returns to floating mode
- [ ] Chat state resets
- [ ] Working document clears

#### Test Case 7: Error Handling
- [ ] Disconnect internet briefly
- [ ] Verify: Error message displays
- [ ] Verify: Retry button appears
- [ ] Reconnect internet
- [ ] Click Retry
- [ ] Verify: ChatKit reconnects

#### Test Case 8: Session Persistence
- [ ] Complete a workflow
- [ ] Refresh browser page
- [ ] Type "write" again
- [ ] Verify: Session reuses existing client_secret (check console logs)
- [ ] Verify: Workflow loads without re-authentication

### Bug Reporting

If any test fails, create a new task with:
- Test case number
- Expected behavior
- Actual behavior
- Browser console errors
- Network tab screenshots
- Server logs

### Acceptance Criteria

- [ ] All 8 test cases pass
- [ ] No critical errors in console
- [ ] No network request failures
- [ ] Performance acceptable (<3 seconds per workflow step)
- [ ] UI responsive and professional

---

## Task 11: Documentation & Cleanup

**Assignee:** Claude Code
**Status:** todo
**Priority:** 30
**Estimated Time:** 30 minutes
**Depends On:** Task 10

### Description

Document ChatKit integration, clean up console.log statements, and create final SITREP.

### Implementation

1. **Create ChatKit Integration Guide**
   - File: `docs/features/2025-11-17-chatkit-integration/INTEGRATION_GUIDE.md`
   - Content:
     - How ChatKit works in RevOS
     - Architecture diagram
     - Workflow ID management
     - Troubleshooting common issues
     - Adding new workflows

2. **Clean up console.log statements**
   - Review all files modified in this feature
   - Replace `console.log` with proper logging utility
   - Keep critical logs with `[CHATKIT]` prefix
   - Remove debug/diagnostic logs

3. **Create Final SITREP**
   - File: `docs/features/2025-11-17-chatkit-integration/FINAL_SITREP.md`
   - Content:
     - What was built
     - Architecture decisions
     - Testing results
     - Known limitations
     - Future enhancements
     - Time tracking (estimated vs. actual)

4. **Update main project documentation**
   - Add ChatKit section to `docs/projects/bravo-revos/spec.md`
   - Update architecture diagrams if needed

### Acceptance Criteria

- [ ] Integration guide created and comprehensive
- [ ] Console logs cleaned up (keep only [CHATKIT] prefixed ones)
- [ ] Final SITREP created with all sections
- [ ] Project documentation updated
- [ ] All documents uploaded to Archon

### Files Created

- `docs/features/2025-11-17-chatkit-integration/INTEGRATION_GUIDE.md`
- `docs/features/2025-11-17-chatkit-integration/FINAL_SITREP.md`

### Files Modified

- All ChatKit-related files (cleanup)
- `docs/projects/bravo-revos/spec.md`

---

## Success Criteria (Overall)

When all tasks are complete, the following should be true:

✅ User types "write"
✅ ChatKit loads with Agent Builder workflow
✅ Agent generates 4 topic suggestions
✅ Topics display as interactive buttons
✅ Selecting topic triggers content generation
✅ Fullscreen mode opens with document
✅ Document displays generated LinkedIn post
✅ Copy button works
✅ Can return to floating mode
✅ Session persists across page refreshes
✅ Error handling works gracefully

---

## Timeline Estimate

| Task | Time | Cumulative |
|------|------|------------|
| Task 1: Manual Setup | 30 min | 0.5 hrs |
| Task 2: Environment Setup | 15 min | 0.75 hrs |
| Task 3: Session API | 30 min | 1.25 hrs |
| Task 4: Workflow API | 20 min | 1.58 hrs |
| Task 5: ChatKitWrapper | 45 min | 2.33 hrs |
| Task 6: FloatingChatBar Integration | 90 min | 3.83 hrs |
| Task 7: Fullscreen View | 45 min | 4.58 hrs |
| Task 8: Database Migration | 30 min | 5.08 hrs |
| Task 9: Test Script | 45 min | 5.83 hrs |
| Task 10: Manual Testing | 30 min | 6.33 hrs |
| Task 11: Documentation | 30 min | 6.83 hrs |

**Total Estimated Time:** ~7 hours (6.83 hours)

---

## Dependencies Graph

```
Task 1 (Manual Setup)
  ├─> Task 2 (Environment Setup)
  │     ├─> Task 3 (Session API)
  │     ├─> Task 4 (Workflow API)
  │     ├─> Task 8 (Database Migration)
  │     └─> Task 9 (Test Script)
  │
  └─> Task 5 (ChatKitWrapper)
        ├─> Task 6 (FloatingChatBar)
        │     └─> Task 7 (Fullscreen View)
        │           └─> Task 10 (Manual Testing)
        │                 └─> Task 11 (Documentation)
        │
        └─> Task 9 (Test Script)
```

---

## Next Steps After ChatKit Integration

Once ChatKit is fully integrated and working:

1. **Pod Automation** - Agents SDK + Playwright for LinkedIn engagement
2. **DM Scraping Workflows** - Automated lead capture from DMs
3. **Unipile Posting Integration** - Publish directly to LinkedIn
4. **Campaign Management UI** - Link generated content to campaigns
5. **Analytics Dashboard** - Track engagement and performance

**One milestone at a time!** 🚀

---

## Notes for Implementation

- **Port 3002**: Always use port 3002 for dev server (not 3000 or 3001)
- **Terminology**: Use "hook" instead of "topic" in UI (hooks are headlines)
- **Brand Context**: Load from brand cartridges, not hardcoded
- **Multi-tenant**: Always respect agency/client scope
- **Error Handling**: Log everything with `[CHATKIT]` prefix for debugging
- **TypeScript**: No `any` types, full type safety
- **Testing**: Test after each task, don't wait until the end

---

**Created:** 2025-11-17
**Project ID:** de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
**Repository:** growthpigs/bravo-revos
**Branch:** feat/chatkit-integration (to be created)
