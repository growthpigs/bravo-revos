# Workflow Execution Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a workflow execution engine that converts JSON workflow definitions into sequential AgentKit tool calls, enabling deterministic multi-step campaigns (LinkedIn post → pod alert → email extraction).

**Architecture:** Direct tool invocation via WorkflowExecutor, bypassing Agent.run() for deterministic sequencing. Workflows stored in `console_workflows` table (separate from cartridges). Sequential execution with state passing between nodes.

**Tech Stack:** TypeScript, Zod validation, AgentKit SDK, existing chip/tool infrastructure

---

## Task 1: Create Workflow Type Definitions

**Files:**
- Create: `lib/workflow/types.ts`
- Test: `lib/workflow/__tests__/types.test.ts`

**Step 1: Write the failing test**

Create `lib/workflow/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import { WorkflowSchema } from '../types';

describe('Workflow Types', () => {
  it('validates a simple sequential workflow', () => {
    const workflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0',
      nodes: [
        {
          id: 'node-1',
          type: 'action',
          action: 'manage_campaigns',
          parameters: { action: 'list' },
          next: 'node-2'
        },
        {
          id: 'node-2',
          type: 'action',
          action: 'publish_to_linkedin',
          parameters: { campaign_id: '${variables.campaign_id}' },
          next: null
        }
      ],
      startNode: 'node-1'
    };

    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });

  it('rejects workflow with missing startNode', () => {
    const workflow = {
      id: 'bad-workflow',
      name: 'Bad',
      version: '1.0',
      nodes: [],
      // startNode missing
    };

    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(false);
  });

  it('rejects workflow with circular reference', () => {
    const workflow = {
      id: 'circular',
      name: 'Circular',
      version: '1.0',
      nodes: [
        { id: 'a', type: 'action', action: 'test', next: 'b' },
        { id: 'b', type: 'action', action: 'test', next: 'a' }
      ],
      startNode: 'a'
    };

    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test lib/workflow/__tests__/types.test.ts`
Expected: FAIL with "Cannot find module '../types'"

**Step 3: Write minimal implementation**

Create `lib/workflow/types.ts`:

```typescript
import { z } from 'zod';

// Node type for sequential execution
export const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['action']), // Start simple, add 'condition', 'parallel' later
  action: z.string().min(1), // Tool name (e.g., 'manage_campaigns')
  parameters: z.record(z.any()).optional(), // Tool parameters
  next: z.string().nullable(), // Next node ID (null = end)
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

// Complete workflow definition
export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  version: z.string().default('1.0'),
  nodes: z.array(WorkflowNodeSchema).min(1).max(20), // Max 20 nodes
  startNode: z.string().min(1),
}).refine((workflow) => {
  // Validate startNode exists in nodes
  const nodeIds = workflow.nodes.map(n => n.id);
  if (!nodeIds.includes(workflow.startNode)) {
    return false;
  }

  // Check for cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (!nodeId) return false;
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = workflow.nodes.find(n => n.id === nodeId);
    if (node?.next && hasCycle(node.next)) {
      return true;
    }

    recursionStack.delete(nodeId);
    return false;
  }

  return !hasCycle(workflow.startNode);
}, {
  message: 'Workflow must not contain cycles and startNode must exist',
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// Execution state (passed through workflow)
export interface WorkflowExecutionState {
  workflowId: string;
  currentNodeId: string | null;
  variables: Record<string, any>; // Data flows between nodes
  executionLog: Array<{
    nodeId: string;
    timestamp: Date;
    result: any;
    error?: string;
  }>;
}

// Tool registry for workflow execution
export interface WorkflowTool {
  name: string;
  execute: (parameters: any, context: any) => Promise<any>;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test lib/workflow/__tests__/types.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/workflow/types.ts lib/workflow/__tests__/types.test.ts
git commit -m "feat(workflow): add workflow type definitions with validation"
```

---

## Task 2: Create Workflow Executor Core

**Files:**
- Create: `lib/workflow/executor.ts`
- Test: `lib/workflow/__tests__/executor.test.ts`

**Step 1: Write the failing test**

Create `lib/workflow/__tests__/executor.test.ts`:

```typescript
import { describe, it, expect, vi } from '@jest/globals';
import { WorkflowExecutor } from '../executor';
import type { Workflow, WorkflowTool } from '../types';

describe('WorkflowExecutor', () => {
  it('executes a simple 2-node workflow', async () => {
    const workflow: Workflow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test',
      version: '1.0',
      nodes: [
        { id: 'step1', type: 'action', action: 'get_data', next: 'step2' },
        { id: 'step2', type: 'action', action: 'process_data', parameters: { input: '${variables.result}' }, next: null }
      ],
      startNode: 'step1'
    };

    const mockGetData = vi.fn().mockResolvedValue({ result: 'test-data' });
    const mockProcessData = vi.fn().mockResolvedValue({ output: 'processed' });

    const tools: WorkflowTool[] = [
      { name: 'get_data', execute: mockGetData },
      { name: 'process_data', execute: mockProcessData }
    ];

    const executor = new WorkflowExecutor(tools);
    const state = await executor.execute(workflow, {});

    expect(mockGetData).toHaveBeenCalledTimes(1);
    expect(mockProcessData).toHaveBeenCalledTimes(1);
    expect(state.variables.result).toBe('test-data');
    expect(state.variables.output).toBe('processed');
    expect(state.currentNodeId).toBe(null); // Workflow complete
  });

  it('resolves ${variables.x} in parameters', async () => {
    const workflow: Workflow = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Variable Test',
      version: '1.0',
      nodes: [
        { id: 'a', type: 'action', action: 'set_value', next: 'b' },
        { id: 'b', type: 'action', action: 'use_value', parameters: { data: '${variables.myValue}' }, next: null }
      ],
      startNode: 'a'
    };

    const tools: WorkflowTool[] = [
      { name: 'set_value', execute: async () => ({ myValue: 42 }) },
      { name: 'use_value', execute: async (params) => ({ received: params.data }) }
    ];

    const executor = new WorkflowExecutor(tools);
    const state = await executor.execute(workflow, {});

    expect(state.variables.received).toBe(42);
  });

  it('throws error for unknown tool', async () => {
    const workflow: Workflow = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'Error Test',
      version: '1.0',
      nodes: [{ id: 'a', type: 'action', action: 'unknown_tool', next: null }],
      startNode: 'a'
    };

    const executor = new WorkflowExecutor([]);

    await expect(executor.execute(workflow, {})).rejects.toThrow('Tool not found: unknown_tool');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test lib/workflow/__tests__/executor.test.ts`
Expected: FAIL with "Cannot find module '../executor'"

**Step 3: Write minimal implementation**

Create `lib/workflow/executor.ts`:

```typescript
import type { Workflow, WorkflowNode, WorkflowExecutionState, WorkflowTool } from './types';

export class WorkflowExecutor {
  private toolRegistry: Map<string, WorkflowTool>;

  constructor(tools: WorkflowTool[]) {
    this.toolRegistry = new Map(tools.map(t => [t.name, t]));
  }

  async execute(workflow: Workflow, context: any): Promise<WorkflowExecutionState> {
    const state: WorkflowExecutionState = {
      workflowId: workflow.id,
      currentNodeId: workflow.startNode,
      variables: {},
      executionLog: [],
    };

    while (state.currentNodeId) {
      const node = workflow.nodes.find(n => n.id === state.currentNodeId);
      if (!node) {
        throw new Error(`Node not found: ${state.currentNodeId}`);
      }

      const result = await this.executeNode(node, state, context);

      // Merge result into state variables
      state.variables = { ...state.variables, ...result };

      // Log execution
      state.executionLog.push({
        nodeId: node.id,
        timestamp: new Date(),
        result,
      });

      // Move to next node
      state.currentNodeId = node.next;
    }

    return state;
  }

  private async executeNode(
    node: WorkflowNode,
    state: WorkflowExecutionState,
    context: any
  ): Promise<any> {
    const tool = this.toolRegistry.get(node.action);
    if (!tool) {
      throw new Error(`Tool not found: ${node.action}`);
    }

    // Resolve parameters (replace ${variables.x} with actual values)
    const resolvedParams = this.resolveParameters(node.parameters || {}, state.variables);

    return await tool.execute(resolvedParams, context);
  }

  private resolveParameters(params: Record<string, any>, variables: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('${variables.')) {
        // Extract variable name: "${variables.campaign_id}" -> "campaign_id"
        const varName = value.slice(12, -1); // Remove "${variables." and "}"
        resolved[key] = variables[varName];
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test lib/workflow/__tests__/executor.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/workflow/executor.ts lib/workflow/__tests__/executor.test.ts
git commit -m "feat(workflow): add workflow executor with variable resolution"
```

---

## Task 3: Integrate Workflow Executor with MarketingConsole

**Files:**
- Modify: `lib/console/marketing-console.ts`
- Test: `lib/console/__tests__/marketing-console-workflows.test.ts`

**Step 1: Write the failing integration test**

Create `lib/console/__tests__/marketing-console-workflows.test.ts`:

```typescript
import { describe, it, expect, vi } from '@jest/globals';
import { MarketingConsole } from '../marketing-console';
import type { Workflow } from '../../workflow/types';

describe('MarketingConsole - Workflow Integration', () => {
  it('executes workflow when message contains /workflow command', async () => {
    const mockSupabase = {} as any;
    const mockOpenAI = {} as any;

    const console = new MarketingConsole({
      baseInstructions: 'Test',
      openai: mockOpenAI,
      supabase: mockSupabase,
    });

    const workflow: Workflow = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      name: 'List Campaigns',
      version: '1.0',
      nodes: [
        { id: 'list', type: 'action', action: 'manage_campaigns', parameters: { action: 'list' }, next: null }
      ],
      startNode: 'list'
    };

    const result = await console.executeWorkflow(workflow, {
      userId: 'test-user',
      agencyId: 'test-agency',
      clientId: 'test-client',
      sessionId: 'test-session',
    });

    expect(result.variables).toBeDefined();
    expect(result.executionLog.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test lib/console/__tests__/marketing-console-workflows.test.ts`
Expected: FAIL with "executeWorkflow is not a function"

**Step 3: Add executeWorkflow method to MarketingConsole**

Modify `lib/console/marketing-console.ts` (add after existing execute method):

```typescript
import { WorkflowExecutor } from '../workflow/executor';
import type { Workflow, WorkflowTool } from '../workflow/types';

// Inside MarketingConsole class, add:

/**
 * Execute a workflow directly (deterministic tool sequencing)
 */
async executeWorkflow(workflow: Workflow, context: AgentContext) {
  // Build tool registry from cartridge chips
  const tools: WorkflowTool[] = this.linkedinCartridge.chips.map(chip => {
    const agentKitTool = chip.getTool();
    return {
      name: agentKitTool.name,
      execute: async (parameters: any, ctx: any) => {
        // Call chip's getTool().execute with proper context
        return await agentKitTool.execute(parameters, ctx);
      }
    };
  });

  const executor = new WorkflowExecutor(tools);

  try {
    const state = await executor.execute(workflow, context);

    // Format result as chat message
    const summary = this.formatWorkflowResult(state);

    return {
      response: summary,
      variables: state.variables,
      executionLog: state.executionLog,
    };
  } catch (error) {
    console.error('[WORKFLOW_EXECUTION_ERROR]', error);
    throw error;
  }
}

/**
 * Format workflow execution result for user
 */
private formatWorkflowResult(state: WorkflowExecutionState): string {
  const steps = state.executionLog.map((log, idx) =>
    `${idx + 1}. ${log.nodeId}: ${log.error ? '❌ Failed' : '✅ Success'}`
  ).join('\n');

  return `Workflow completed:\n\n${steps}\n\nFinal state: ${JSON.stringify(state.variables, null, 2)}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test lib/console/__tests__/marketing-console-workflows.test.ts`
Expected: Test PASSES

**Step 5: Commit**

```bash
git add lib/console/marketing-console.ts lib/console/__tests__/marketing-console-workflows.test.ts
git commit -m "feat(console): integrate workflow executor with MarketingConsole"
```

---

## Task 4: Create Database Schema for Workflows

**Files:**
- Create: `supabase/migrations/038_console_workflows.sql`

**Step 1: Write migration**

Create `supabase/migrations/038_console_workflows.sql`:

```sql
-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
-- Create console_workflows table (separate from cartridges)

CREATE TABLE IF NOT EXISTS console_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  console_id UUID NOT NULL REFERENCES console_prompts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  workflow_json JSONB NOT NULL, -- Full workflow definition
  version VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_workflow_json CHECK (
    workflow_json ? 'id' AND
    workflow_json ? 'nodes' AND
    workflow_json ? 'startNode'
  )
);

-- Index for fast lookup by console
CREATE INDEX idx_console_workflows_console_id ON console_workflows(console_id);
CREATE INDEX idx_console_workflows_active ON console_workflows(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE console_workflows ENABLE ROW LEVEL SECURITY;

-- Admin can do anything
CREATE POLICY "Admins have full access to workflows"
  ON console_workflows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Users can read workflows for their consoles (future: when user-level consoles exist)
CREATE POLICY "Users can read workflows"
  ON console_workflows
  FOR SELECT
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER set_console_workflows_updated_at
  BEFORE UPDATE ON console_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed data: LinkedIn Campaign Workflow
INSERT INTO console_workflows (console_id, name, description, workflow_json)
SELECT
  id,
  'LinkedIn Campaign Launch',
  'Complete campaign flow: select campaign → publish post → alert pod → extract emails',
  '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "LinkedIn Campaign Launch",
    "version": "1.0",
    "nodes": [
      {
        "id": "list-campaigns",
        "type": "action",
        "action": "manage_campaigns",
        "parameters": { "action": "list" },
        "next": "publish-post"
      },
      {
        "id": "publish-post",
        "type": "action",
        "action": "publish_to_linkedin",
        "parameters": {
          "action": "post_now",
          "campaign_id": "${variables.campaign_id}",
          "content": "${variables.post_content}"
        },
        "next": "extract-emails"
      },
      {
        "id": "extract-emails",
        "type": "action",
        "action": "extract_emails_from_dms",
        "parameters": {
          "campaign_id": "${variables.campaign_id}",
          "hours_back": 24
        },
        "next": null
      }
    ],
    "startNode": "list-campaigns"
  }'::jsonb
FROM console_prompts
WHERE name = 'marketing-console-v1'
LIMIT 1;
```

**Step 2: Apply migration**

Run:
```bash
# Via Supabase dashboard (copy SQL from file)
# OR if using CLI:
npx supabase db push
```

Expected: Migration applies successfully, workflows table created

**Step 3: Verify in Supabase**

Query:
```sql
SELECT name, workflow_json->'nodes' FROM console_workflows;
```

Expected: Returns "LinkedIn Campaign Launch" with nodes array

**Step 4: Commit**

```bash
git add supabase/migrations/038_console_workflows.sql
git commit -m "feat(db): add console_workflows table with seed data"
```

---

## Task 5: Add Workflow Tab to Console Config UI

**Files:**
- Modify: `app/admin/console-config/page.tsx`
- Create: `app/admin/console-config/components/WorkflowTab.tsx`

**Step 1: Create WorkflowTab component**

Create `app/admin/console-config/components/WorkflowTab.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WorkflowSchema } from '@/lib/workflow/types';
import { Play, AlertCircle, CheckCircle } from 'lucide-react';

interface WorkflowTabProps {
  consoleId: string;
}

export function WorkflowTab({ consoleId }: WorkflowTabProps) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [jsonText, setJsonText] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, [consoleId]);

  async function loadWorkflows() {
    setLoading(true);
    try {
      const response = await fetch(`/api/workflows?console_id=${consoleId}`);
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('[LOAD_WORKFLOWS_ERROR]', error);
    } finally {
      setLoading(false);
    }
  }

  function handleWorkflowSelect(workflow: any) {
    setSelectedWorkflow(workflow);
    setJsonText(JSON.stringify(workflow.workflow_json, null, 2));
    setValidationError('');
  }

  function handleJsonChange(value: string) {
    setJsonText(value);

    try {
      const parsed = JSON.parse(value);
      const result = WorkflowSchema.safeParse(parsed);

      if (result.success) {
        setValidationError('');
      } else {
        setValidationError(result.error.errors[0].message);
      }
    } catch (error) {
      setValidationError('Invalid JSON');
    }
  }

  async function handleSave() {
    try {
      const parsed = JSON.parse(jsonText);
      const result = WorkflowSchema.safeParse(parsed);

      if (!result.success) {
        setValidationError(result.error.errors[0].message);
        return;
      }

      await fetch('/api/workflows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedWorkflow.id,
          workflow_json: parsed,
        }),
      });

      await loadWorkflows();
    } catch (error) {
      console.error('[SAVE_WORKFLOW_ERROR]', error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={selectedWorkflow?.id || ''}
          onChange={(e) => {
            const wf = workflows.find(w => w.id === e.target.value);
            if (wf) handleWorkflowSelect(wf);
          }}
          className="flex-1 px-3 py-2 border rounded"
        >
          <option value="">Select workflow...</option>
          {workflows.map(wf => (
            <option key={wf.id} value={wf.id}>{wf.name}</option>
          ))}
        </select>
        <Button onClick={handleSave} disabled={!!validationError || !selectedWorkflow}>
          Save Changes
        </Button>
      </div>

      {selectedWorkflow && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Workflow JSON</label>
            <Textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          </div>

          {validationError && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {validationError}
            </div>
          )}

          {!validationError && jsonText && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Valid workflow JSON
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

**Step 2: Add Workflow tab to Console Config**

Modify `app/admin/console-config/page.tsx` (in tabs array):

```typescript
import { WorkflowTab } from './components/WorkflowTab';

// Find the tabs array and add:
{
  id: 'workflow',
  label: 'Workflow',
  component: selectedConsole && <WorkflowTab consoleId={selectedConsole.id} />
}
```

**Step 3: Create workflows API route**

Create `app/api/workflows/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const consoleId = req.nextUrl.searchParams.get('console_id');

  const { data, error } = await supabase
    .from('console_workflows')
    .select('*')
    .eq('console_id', consoleId)
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflows: data });
}

export async function PUT(req: NextRequest) {
  const supabase = createClient();
  const { id, workflow_json } = await req.json();

  const { error } = await supabase
    .from('console_workflows')
    .update({ workflow_json, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 4: Test manually**

1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/admin/console-config`
3. Select "Marketing Console V1"
4. Click "Workflow" tab
5. Select "LinkedIn Campaign Launch"
6. Edit JSON, see validation

Expected: Workflow tab loads, shows workflow, validates JSON

**Step 5: Commit**

```bash
git add app/admin/console-config/components/WorkflowTab.tsx app/admin/console-config/page.tsx app/api/workflows/route.ts
git commit -m "feat(ui): add workflow editing tab to console config"
```

---

## Task 6: Wire Workflow Execution to HGC API

**Files:**
- Modify: `app/api/hgc-v2/route.ts`

**Step 1: Add workflow detection to API**

Modify `app/api/hgc-v2/route.ts` (add after loading console):

```typescript
// After: const console_instance = new MarketingConsole(...)

// Check if message triggers a workflow
const workflowTrigger = body.workflow_id; // Client can specify workflow_id
let workflowToExecute = null;

if (workflowTrigger) {
  // Load workflow from database
  const { data: workflowData } = await supabase
    .from('console_workflows')
    .select('workflow_json')
    .eq('id', workflowTrigger)
    .eq('is_active', true)
    .single();

  if (workflowData) {
    workflowToExecute = workflowData.workflow_json;
  }
}

// If workflow specified, execute it instead of normal chat
if (workflowToExecute) {
  const result = await console_instance.executeWorkflow(workflowToExecute, {
    userId: user.id,
    agencyId: body.agencyId,
    clientId: body.clientId,
    sessionId: session.id,
  });

  return NextResponse.json({
    response: result.response,
    sessionId: session.id,
    variables: result.variables,
    executionLog: result.executionLog,
  });
}

// Otherwise, proceed with normal agent execution
const result = await console_instance.execute(/* ... */);
```

**Step 2: Test with curl**

```bash
# Get workflow ID from database
psql $DATABASE_URL -c "SELECT id FROM console_workflows LIMIT 1;"

# Test workflow execution
curl -X POST http://localhost:3000/api/hgc-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Run campaign",
    "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
    "agencyId": "test-agency",
    "clientId": "test-client"
  }'
```

Expected: Returns workflow execution result with variables and executionLog

**Step 3: Commit**

```bash
git add app/api/hgc-v2/route.ts
git commit -m "feat(api): add workflow execution to HGC-v2 endpoint"
```

---

## Task 7: Documentation and Examples

**Files:**
- Create: `docs/guides/WORKFLOW_EXECUTION_GUIDE.md`
- Create: `docs/workflows/linkedin-campaign-example.json`

**Step 1: Write guide**

Create `docs/guides/WORKFLOW_EXECUTION_GUIDE.md`:

```markdown
# Workflow Execution Guide

## Overview

The workflow execution engine converts JSON workflow definitions into sequential AgentKit tool calls. This enables deterministic multi-step campaigns.

## Workflow Structure

```json
{
  "id": "uuid",
  "name": "Workflow Name",
  "version": "1.0",
  "nodes": [
    {
      "id": "unique-node-id",
      "type": "action",
      "action": "tool_name",
      "parameters": { "param1": "value", "param2": "${variables.prev_result}" },
      "next": "next-node-id-or-null"
    }
  ],
  "startNode": "first-node-id"
}
```

## Node Types

- **action**: Execute a tool (chip) with parameters
- (Future: **condition**, **parallel**, **loop**)

## Variable Resolution

Parameters can reference previous node results:

```json
{
  "parameters": {
    "campaign_id": "${variables.campaign_id}"
  }
}
```

The executor resolves `${variables.x}` to the actual value from previous nodes.

## Tool Registry

Available tools come from cartridge chips:
- `manage_campaigns` - Campaign CRUD
- `publish_to_linkedin` - Post content
- `extract_emails_from_dms` - Email extraction
- (More in chips directory)

## Execution Flow

1. Client sends request with `workflow_id`
2. API loads workflow from `console_workflows` table
3. WorkflowExecutor calls tools sequentially
4. State flows between nodes (variables)
5. Result includes variables and execution log

## Example Usage

```bash
curl -X POST /api/hgc-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "550e8400-...",
    "agencyId": "agency-123",
    "clientId": "client-456"
  }'
```

## Adding New Workflows

1. Create JSON following WorkflowSchema
2. Validate with `WorkflowSchema.safeParse(json)`
3. Insert into `console_workflows` table
4. Test via API or Console Config UI

## Debugging

Check execution log in API response:

```json
{
  "executionLog": [
    { "nodeId": "step1", "timestamp": "...", "result": {...} },
    { "nodeId": "step2", "timestamp": "...", "result": {...} }
  ]
}
```
```

**Step 2: Create example workflow**

Create `docs/workflows/linkedin-campaign-example.json`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "LinkedIn Campaign Launch",
  "version": "1.0",
  "nodes": [
    {
      "id": "list-campaigns",
      "type": "action",
      "action": "manage_campaigns",
      "parameters": {
        "action": "list"
      },
      "next": "publish-post"
    },
    {
      "id": "publish-post",
      "type": "action",
      "action": "publish_to_linkedin",
      "parameters": {
        "action": "post_now",
        "campaign_id": "${variables.campaign_id}",
        "content": "${variables.post_content}"
      },
      "next": "extract-emails"
    },
    {
      "id": "extract-emails",
      "type": "action",
      "action": "extract_emails_from_dms",
      "parameters": {
        "campaign_id": "${variables.campaign_id}",
        "hours_back": 24
      },
      "next": null
    }
  ],
  "startNode": "list-campaigns"
}
```

**Step 3: Commit**

```bash
git add docs/guides/WORKFLOW_EXECUTION_GUIDE.md docs/workflows/linkedin-campaign-example.json
git commit -m "docs: add workflow execution guide and examples"
```

---

## Validation Checklist

Before marking complete:

- [ ] All tests pass: `npm test lib/workflow`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Migration applied successfully
- [ ] Workflow tab loads in Console Config UI
- [ ] Can edit and save workflow JSON
- [ ] API executes workflow when `workflow_id` provided
- [ ] Example workflow runs end-to-end
- [ ] Documentation is clear and complete

---

## Future Enhancements (Out of Scope)

- **Conditional nodes**: Branch based on previous results
- **Parallel nodes**: Execute multiple tools simultaneously
- **Loop nodes**: Repeat actions until condition met
- **Visual workflow builder**: React Flow integration (Phase 2)
- **Workflow templates**: Library of pre-built workflows
- **Error recovery**: Retry failed nodes with backoff

---

## Time Estimate

- **Total**: 2-3 days for full implementation
- **Core engine**: 1 day (Tasks 1-3)
- **Database + UI**: 0.5 days (Tasks 4-5)
- **Integration + testing**: 0.5-1 day (Tasks 6-7)

## Success Criteria

✅ JSON workflow executes tools in correct order
✅ Variables flow between nodes correctly
✅ UI allows editing workflow JSON with validation
✅ API supports workflow_id parameter
✅ Example LinkedIn campaign workflow runs end-to-end
✅ All tests pass, TypeScript clean
