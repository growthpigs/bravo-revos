# V2 Workflow JSON Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate hardcoded workflow logic in V2 route by loading workflow definitions from database, achieving 100% NON-NEGOTIABLE compliance.

**Architecture:** Refactor `/app/api/hgc-v2/route.ts` to use workflow loader instead of hardcoded "write" command handler. Load workflow JSON from `console_workflows` table, execute steps dynamically, interpolate prompts with variables.

**Tech Stack:** Next.js API routes, Supabase, workflow-loader utility (already created)

**Status:** Database table created ✅, Workflow loader created ✅, Route refactoring needed

**Estimated Time:** 2-3 hours

---

## Task 1: Test Current V2 Route

**Files:**
- Test: `/app/api/hgc-v2/route.ts` (existing)

**Step 1: Verify dev server running**

Run: `npm run dev`
Expected: Server starts on port 3000

**Step 2: Test V2 route health check**

Run: `curl http://localhost:3000/api/hgc-v2`
Expected:
```json
{
  "status": "ok",
  "service": "Holy Grail Chat V2",
  "version": "2.0.0-agentkit-mem0",
  "mode": "agentkit"
}
```

**Step 3: Verify workflow exists in database**

Run Supabase query:
```sql
SELECT name, display_name, workflow_type FROM console_workflows WHERE name = 'write-linkedin-post';
```

Expected: 1 row returned with workflow data

**Step 4: Document current behavior (baseline)**

Run in browser (logged in):
1. Navigate to http://localhost:3000/dashboard
2. Type "write" in chat
3. Expected: Hardcoded topic buttons appear (current behavior)

---

## Task 2: Create Workflow Execution Handler

**Files:**
- Create: `/lib/console/workflow-executor.ts`

**Step 1: Write failing test**

```typescript
// /lib/console/workflow-executor.test.ts
import { executeWorkflowStep } from './workflow-executor';

describe('WorkflowExecutor', () => {
  it('should execute generate_topics step', async () => {
    const workflow = {
      steps: [{ step: 'generate_topics', ai_prompt_key: 'topic_generation' }],
      prompts: { topic_generation: 'Generate topics for {industry}' }
    };

    const context = { industry: 'healthcare' };
    const result = await executeWorkflowStep(workflow, 'generate_topics', context);

    expect(result).toHaveProperty('topics');
    expect(Array.isArray(result.topics)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test workflow-executor.test.ts`
Expected: FAIL - "executeWorkflowStep is not defined"

**Step 3: Create minimal workflow executor**

```typescript
// /lib/console/workflow-executor.ts
import OpenAI from 'openai';
import { WorkflowDefinition, getWorkflowPrompt, interpolatePrompt } from './workflow-loader';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function executeWorkflowStep(
  workflow: WorkflowDefinition,
  stepName: string,
  context: Record<string, any>
): Promise<any> {
  const step = workflow.steps.find(s => s.step === stepName);

  if (!step) {
    throw new Error(`Step not found: ${stepName}`);
  }

  // Handle different step types
  switch (step.step) {
    case 'generate_topics':
      return await generateTopics(workflow, context);

    case 'generate_post':
      return await generatePost(workflow, context);

    default:
      throw new Error(`Unknown step type: ${step.step}`);
  }
}

async function generateTopics(workflow: WorkflowDefinition, context: any) {
  const promptTemplate = getWorkflowPrompt(workflow, 'topic_generation');
  if (!promptTemplate) throw new Error('topic_generation prompt not found');

  const prompt = interpolatePrompt(promptTemplate, context);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.8,
    messages: [
      { role: 'system', content: 'You are a content strategist. Return ONLY valid JSON.' },
      { role: 'user', content: prompt }
    ]
  });

  const response = completion.choices[0]?.message?.content || '[]';
  const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
  const topics = JSON.parse(cleanResponse);

  return { topics };
}

async function generatePost(workflow: WorkflowDefinition, context: any) {
  const promptTemplate = getWorkflowPrompt(workflow, 'post_generation');
  if (!promptTemplate) throw new Error('post_generation prompt not found');

  const prompt = interpolatePrompt(promptTemplate, context);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
      { role: 'system', content: 'You are an expert LinkedIn content creator.' },
      { role: 'user', content: prompt }
    ]
  });

  return { post: completion.choices[0]?.message?.content || '' };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test workflow-executor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/console/workflow-executor.ts lib/console/workflow-executor.test.ts
git commit -m "feat(workflows): add workflow step executor

- Executes workflow steps dynamically from JSON
- Supports generate_topics and generate_post steps
- Interpolates prompts with context variables
- Comprehensive test coverage

Part of V2 workflow JSON refactoring"
```

---

## Task 3: Refactor V2 Route - Remove Hardcoded "Write" Handler

**Files:**
- Modify: `/app/api/hgc-v2/route.ts:235-348` (remove hardcoded logic)
- Modify: `/app/api/hgc-v2/route.ts` (add workflow loader imports)

**Step 1: Add workflow loader imports**

```typescript
// Add to imports at top of /app/api/hgc-v2/route.ts
import { findWorkflowByTrigger, loadWorkflow } from '@/lib/console/workflow-loader';
import { executeWorkflowStep } from '@/lib/console/workflow-executor';
```

**Step 2: Replace hardcoded write command check (lines 236-348)**

Find this block:
```typescript
const isWriteCommand = message.toLowerCase().trim().match(/^write\W*$/i);

if (isWriteCommand) {
  // 110+ lines of hardcoded logic
}
```

Replace with:
```typescript
// Check if message matches any workflow trigger
const matchedWorkflow = await findWorkflowByTrigger(message, supabase, user.id);

if (matchedWorkflow) {
  console.log('[HGC_V2] Workflow matched:', matchedWorkflow.name);

  // Handle different workflow types
  if (matchedWorkflow.workflow_type === 'content_generation') {
    return await handleContentGenerationWorkflow(matchedWorkflow, user, session, supabase);
  }

  // Add more workflow types as needed
}
```

**Step 3: Create workflow handler function**

Add before the main POST handler:
```typescript
async function handleContentGenerationWorkflow(
  workflow: WorkflowDefinition,
  user: any,
  session: any,
  supabase: SupabaseClient
) {
  // Step 1: Load brand cartridge
  const { data: brandData } = await supabase
    .from('brand_cartridges')
    .select('industry, target_audience, brand_voice, core_messaging')
    .eq('user_id', user.id)
    .single();

  if (!brandData) {
    return NextResponse.json({
      success: false,
      response: '⚠️ Please complete your brand setup first.',
      sessionId: session.id
    });
  }

  // Step 2: Execute generate_topics step
  const context = {
    industry: brandData.industry || 'business',
    target_audience: brandData.target_audience || 'professionals',
    brand_voice: brandData.brand_voice || 'professional',
    core_messaging: brandData.core_messaging
      ? `\nCORE MESSAGING:\n${brandData.core_messaging.substring(0, 2000)}`
      : ''
  };

  const { topics } = await executeWorkflowStep(workflow, 'generate_topics', context);

  // Step 3: Convert topics to decision_options format
  const decision_options = topics.map((label: string, index: number) => ({
    label,
    value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 50),
    icon: ['brain', 'star', 'trophy', 'trending'][index] || 'brain',
    variant: index === 0 ? 'primary' : 'secondary'
  }));

  // Step 4: Save user message
  await saveMessages(supabase, session.id, [
    { role: 'user' as const, content: 'write' }
  ]);

  // Step 5: Return response with decision buttons
  return NextResponse.json({
    success: true,
    response: `📋 **Brand Context Loaded**\n\n**Industry:** ${brandData.industry}\n\n**Target Audience:** ${brandData.target_audience}`,
    sessionId: session.id,
    interactive: {
      type: 'decision',
      workflow_id: `${workflow.name}-${Date.now()}`,
      decision_options
    },
    meta: {
      workflow_name: workflow.name,
      workflow_type: workflow.workflow_type,
      cartridgesRetrieved: true,
      clearDocument: true
    }
  });
}
```

**Step 4: Test manually**

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000/dashboard
3. Type "write" in chat
4. Expected: Topics generated from workflow JSON (not hardcoded)

**Step 5: Commit**

```bash
git add app/api/hgc-v2/route.ts
git commit -m "refactor(v2): replace hardcoded write handler with workflow loader

BREAKING CHANGE: Removes hardcoded workflow logic

- Uses findWorkflowByTrigger() to match commands
- Loads workflow JSON from database
- Executes steps dynamically via workflow-executor
- NO hardcoded topics or prompts

Achieves NON-NEGOTIABLE #4: Workflow JSON from DB

Before: 110 lines of hardcoded logic
After: Loads from console_workflows table"
```

---

## Task 4: Handle Topic Selection via Workflow

**Files:**
- Modify: `/app/api/hgc-v2/route.ts:193-233` (workflow decision handling)

**Step 1: Replace hardcoded topic mapping (lines 197-233)**

Find this block:
```typescript
if (workflow_id && decision) {
  let topic = '';
  switch (decision) {
    case 'linkedin_growth':
      topic = 'LinkedIn growth strategies';
      break;
    // ... more hardcoded cases
  }
}
```

Replace with:
```typescript
if (workflow_id && decision) {
  console.log('[HGC_V2_WORKFLOW] Decision received:', decision);

  // Extract workflow name from workflow_id (format: "write-linkedin-post-1234567890")
  const workflowName = workflow_id.split('-').slice(0, -1).join('-');

  // Load workflow definition
  const workflow = await loadWorkflow(workflowName, supabase, user.id);

  if (!workflow) {
    return NextResponse.json({
      success: false,
      error: 'Workflow not found',
      sessionId: session.id
    }, { status: 404 });
  }

  // Handle confirmation step
  if (workflow_id.includes('-confirm')) {
    // User confirmed, proceed with post generation
    return await generatePostFromWorkflow(workflow, decision, user, session, supabase);
  }

  // First selection: show confirmation
  const confirmationPrompt = getWorkflowPrompt(workflow, 'confirmation');
  const interpolated = interpolatePrompt(confirmationPrompt, { topic: decision.replace(/_/g, ' ') });

  return NextResponse.json({
    success: true,
    response: interpolated,
    interactive: {
      type: 'decision',
      workflow_id: `${workflow_id}-confirm`,
      decision_options: [
        { label: 'Add personal story', value: 'add_story', variant: 'primary' },
        { label: 'Generate without story', value: decision, variant: 'secondary' }
      ]
    },
    sessionId: session.id,
    meta: {
      workflow_name: workflow.name,
      topic: decision,
      awaitingStory: true
    }
  });
}
```

**Step 2: Create post generation function**

Add before main POST handler:
```typescript
async function generatePostFromWorkflow(
  workflow: WorkflowDefinition,
  topicValue: string,
  user: any,
  session: any,
  supabase: SupabaseClient
) {
  // Load brand and style cartridges
  const { data: brandData } = await supabase
    .from('brand_cartridges')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: styleData } = await supabase
    .from('style_cartridges')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Build context for post generation
  const brand_context = brandData
    ? `Brand: ${brandData.industry}\nTarget: ${brandData.target_audience}\nValues: ${brandData.core_values}`
    : 'Professional business context';

  const style_context = styleData
    ? `Tone: ${styleData.tone_of_voice}\nStyle: ${styleData.writing_style}`
    : 'Professional, engaging tone';

  const context = {
    topic: topicValue.replace(/_/g, ' '),
    brand_context,
    style_context
  };

  // Execute generate_post step from workflow
  const { post } = await executeWorkflowStep(workflow, 'generate_post', context);

  // Save messages
  await saveMessages(supabase, session.id, [
    { role: 'user' as const, content: `I want to write about ${context.topic}` },
    { role: 'assistant' as const, content: '✅ LinkedIn post generated in working document' }
  ]);

  // Return post in working document
  return NextResponse.json({
    success: true,
    response: '✅ LinkedIn post generated in working document',
    document: {
      content: post,
      title: `LinkedIn Post: ${context.topic}`
    },
    sessionId: session.id,
    meta: {
      workflow_name: workflow.name,
      topic: context.topic,
      hasBrandData: !!brandData,
      hasStyleData: !!styleData
    }
  });
}
```

**Step 3: Test end-to-end workflow**

1. Type "write" → see topics
2. Click topic → see confirmation prompt
3. Click "Generate without story" → see post in working document
4. Expected: All prompts from workflow JSON, no hardcoded text

**Step 4: Commit**

```bash
git add app/api/hgc-v2/route.ts
git commit -m "refactor(v2): handle topic selection via workflow JSON

- Loads workflow by name from workflow_id
- Uses workflow prompts for confirmation
- Generates post via executeWorkflowStep()
- NO hardcoded topic mapping

Completes workflow JSON refactoring"
```

---

## Task 5: Update Frontend ENV Variable

**Files:**
- Modify: `.env.local`

**Step 1: Switch to V2 route**

Change:
```
NEXT_PUBLIC_HGC_VERSION=v3
```

To:
```
NEXT_PUBLIC_HGC_VERSION=v2
```

**Step 2: Restart dev server**

Run:
```bash
# Kill existing server
pkill -f "npm run dev"

# Restart
npm run dev
```

**Step 3: Test in browser**

1. Navigate to http://localhost:3000/dashboard
2. Type "write"
3. Expected: Topics from workflow JSON
4. Select topic → confirmation → post generated
5. All from database, zero hardcoded logic

**Step 4: Commit**

```bash
git add .env.local
git commit -m "config: switch to V2 route (workflow JSON architecture)

V2 now loads workflows from database:
- NO hardcoded logic
- 100% NON-NEGOTIABLE compliant
- AgentKit + Mem0 + Workflow JSON ✅

V3 remains suspended (violated architecture)"
```

---

## Task 6: Run TypeScript Check

**Step 1: Check for type errors**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Fix any import errors**

If errors about missing imports:
```typescript
import type { WorkflowDefinition } from '@/lib/console/workflow-loader';
import type { SupabaseClient } from '@supabase/supabase-js';
```

**Step 3: Re-run check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit if fixes needed**

```bash
git add app/api/hgc-v2/route.ts
git commit -m "fix(types): add missing workflow type imports"
```

---

## Task 7: Update CLAUDE.md Status

**Files:**
- Modify: `/CLAUDE.md`

**Step 1: Update compliance status**

Find section:
```markdown
**PROGRESS UPDATE (2025-11-16 14:30):**
- ✅ V2 analysis complete
- ✅ `console_workflows` table created
- 🔧 Next: Create workflow loader and refactor V2 route
```

Replace with:
```markdown
**PROGRESS UPDATE (2025-11-16 [CURRENT_TIME]):**
- ✅ V2 workflow JSON refactoring COMPLETE
- ✅ Hardcoded logic removed from V2 route
- ✅ All workflows load from console_workflows table
- ✅ 100% NON-NEGOTIABLE COMPLIANCE ACHIEVED

**V2 Architecture Status:**
- ✅ AgentKit SDK (marketing-console.ts)
- ✅ Mem0 integration (multi-tenant scoping)
- ✅ Console DB (loadConsolePrompt)
- ✅ Workflow JSON (console_workflows table)
- ✅ Session persistence (saveMessages)
- ✅ Multi-tenant (proper isolation)

**STATUS: PRODUCTION READY** 🎉
```

**Step 2: Commit documentation update**

```bash
git add CLAUDE.md
git commit -m "docs: mark V2 as 100% compliant and production ready

All NON-NEGOTIABLES achieved:
1. ✅ AgentKit SDK ONLY
2. ✅ Mem0 integration
3. ✅ Console DB
4. ✅ Workflow JSON from DB
5. ✅ Session persistence
6. ✅ Multi-tenant

Ready for user testing"
```

---

## Task 8: Final Push and Verification

**Step 1: Push to remote**

Run: `git push origin feat/v2-agentkit-architecture`

**Step 2: Verify in browser one more time**

1. Open http://localhost:3000/dashboard
2. Complete write workflow end-to-end
3. Check browser console for workflow logs
4. Expected: `[HGC_V2] Workflow matched: write-linkedin-post`

**Step 3: Check database for session persistence**

Query Supabase:
```sql
SELECT * FROM chat_sessions ORDER BY created_at DESC LIMIT 5;
```

Expected: Recent sessions saved

**Step 4: Success! Document completion**

Create completion note in chat showing:
- All 6 NON-NEGOTIABLES ✅
- V2 route now 100% compliant
- Ready for pod amplification Phase 2

---

## Validation Checklist

Before marking complete, verify:

- [ ] Workflow loads from database (not hardcoded)
- [ ] Topics generated from workflow JSON
- [ ] Confirmation prompt from workflow JSON
- [ ] Post generation from workflow JSON
- [ ] TypeScript check passes (0 errors)
- [ ] Manual test: write → topics → confirmation → post generated
- [ ] All code committed to feature branch
- [ ] CLAUDE.md updated with completion status
- [ ] Ready to merge or proceed to pod amplification

---

## Next Steps

After completing this plan:

**Option 1: Merge V2 to main**
- Create PR: `feat/v2-agentkit-architecture → main`
- Title: "V2: 100% NON-NEGOTIABLE Compliance - Workflow JSON Architecture"
- Deploy to dev environment for testing

**Option 2: Continue to Pod Amplification**
- Use plan: `docs/plans/2025-11-16-pod-amplification-implementation.md`
- Estimated: 5-7 hours
- Completes flagship LinkedIn DM Pod workflow

---

**Plan Status:** Ready for execution
**Execution Method:** Use superpowers:executing-plans or superpowers:subagent-driven-development
**Estimated Time:** 2-3 hours
