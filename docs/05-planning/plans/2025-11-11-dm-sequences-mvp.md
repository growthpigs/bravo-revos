# DM Sequences MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the complete DM Sequences system for automated LinkedIn lead generation (Step 4 of the 7-step lead flow)

**Architecture:** Three-tier implementation: (1) Database schema for dm_sequences and dm_deliveries tables, (2) API routes for CRUD operations and delivery tracking, (3) Frontend UI for sequence management with template editor and analytics

**Tech Stack:** Next.js 14, TypeScript, Supabase PostgreSQL, BullMQ, Unipile API, GPT-4o for email extraction

---

## Prerequisites Verification

**Before starting, verify:**
- [ ] Supabase connection working (`lib/supabase/server.ts`)
- [ ] BullMQ setup exists (check for `lib/queue/` directory)
- [ ] Unipile API credentials in `.env.local`
- [ ] Voice cartridge system working (`app/dashboard/cartridges/`)
- [ ] Campaigns table exists and populated

---

## Task 1: Database Schema - DM Sequences Table

**Files:**
- Create: `supabase/migrations/020_create_dm_sequences.sql`

**Step 1: Write migration for dm_sequences table**

```sql
-- DM Sequences Table
CREATE TABLE IF NOT EXISTS dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, paused, archived

  -- Step 1: Initial DM
  step1_template TEXT NOT NULL,
  step1_delay_min INTEGER NOT NULL DEFAULT 2, -- minutes
  step1_delay_max INTEGER NOT NULL DEFAULT 15, -- minutes
  voice_cartridge_id UUID REFERENCES cartridges(id),

  -- Step 2: Email capture
  step2_auto_extract BOOLEAN NOT NULL DEFAULT true,
  step2_confirmation_template TEXT NOT NULL DEFAULT 'Got it! Sending your lead magnet now...',

  -- Step 3: Backup DM
  step3_enabled BOOLEAN NOT NULL DEFAULT true,
  step3_delay INTEGER NOT NULL DEFAULT 5, -- minutes
  step3_template TEXT NOT NULL DEFAULT 'Here''s your direct download link: {{download_url}}',
  step3_link_expiry INTEGER NOT NULL DEFAULT 24, -- hours

  -- Analytics
  sent_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  email_captured_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dm_sequences_campaign ON dm_sequences(campaign_id);
CREATE INDEX idx_dm_sequences_client ON dm_sequences(client_id);
CREATE INDEX idx_dm_sequences_status ON dm_sequences(status);

-- RLS Policies
ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY dm_sequences_client_isolation ON dm_sequences
  FOR ALL
  USING (client_id = (SELECT client_id FROM users WHERE id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER dm_sequences_updated_at
  BEFORE UPDATE ON dm_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration**

```bash
# If using Supabase CLI
supabase db push

# Or apply manually via Supabase dashboard SQL editor
```

Expected: Table created, indexes added, RLS policies active

**Step 3: Verify table exists**

```bash
# Via Supabase dashboard or psql
SELECT * FROM dm_sequences LIMIT 1;
```

Expected: Empty result set (table exists)

**Step 4: Commit**

```bash
git add supabase/migrations/020_create_dm_sequences.sql
git commit -m "feat(db): add dm_sequences table with RLS policies"
```

---

## Task 2: Database Schema - DM Deliveries Table

**Files:**
- Create: `supabase/migrations/021_create_dm_deliveries.sql`

**Step 1: Write migration for dm_deliveries table**

```sql
-- DM Deliveries Table (tracking individual sends)
CREATE TABLE IF NOT EXISTS dm_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES dm_sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Delivery tracking
  step_number INTEGER NOT NULL CHECK (step_number IN (1, 2, 3)),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,

  -- Content
  message_content TEXT NOT NULL,
  unipile_message_id VARCHAR(255), -- External ID from Unipile

  -- Email extraction (step 2)
  email_extracted VARCHAR(255),
  extraction_confidence FLOAT,
  extraction_method VARCHAR(50), -- regex, gpt4o, manual

  -- Errors
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dm_deliveries_sequence ON dm_deliveries(sequence_id);
CREATE INDEX idx_dm_deliveries_lead ON dm_deliveries(lead_id);
CREATE INDEX idx_dm_deliveries_status ON dm_deliveries(status);
CREATE INDEX idx_dm_deliveries_step ON dm_deliveries(step_number);
CREATE INDEX idx_dm_deliveries_sent_at ON dm_deliveries(sent_at);

-- RLS Policies
ALTER TABLE dm_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY dm_deliveries_client_isolation ON dm_deliveries
  FOR ALL
  USING (
    sequence_id IN (
      SELECT id FROM dm_sequences WHERE client_id = (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Updated_at trigger
CREATE TRIGGER dm_deliveries_updated_at
  BEFORE UPDATE ON dm_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration**

```bash
supabase db push
```

Expected: Table created with foreign keys and indexes

**Step 3: Verify relationships**

```bash
# Check foreign keys exist
SELECT * FROM dm_deliveries LIMIT 1;
```

Expected: Empty result set (table exists)

**Step 4: Commit**

```bash
git add supabase/migrations/021_create_dm_deliveries.sql
git commit -m "feat(db): add dm_deliveries table for tracking DM sends"
```

---

## Task 3: TypeScript Types for DM Sequences

**Files:**
- Create: `types/dm-sequences.ts`

**Step 1: Create type definitions**

```typescript
export interface DMSequence {
  id: string;
  campaign_id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'archived';

  // Step 1: Initial DM
  step1_template: string;
  step1_delay_min: number;
  step1_delay_max: number;
  voice_cartridge_id: string | null;

  // Step 2: Email capture
  step2_auto_extract: boolean;
  step2_confirmation_template: string;

  // Step 3: Backup DM
  step3_enabled: boolean;
  step3_delay: number;
  step3_template: string;
  step3_link_expiry: number;

  // Analytics
  sent_count: number;
  replied_count: number;
  email_captured_count: number;

  created_at: string;
  updated_at: string;
}

export interface DMDelivery {
  id: string;
  sequence_id: string;
  lead_id: string;
  step_number: 1 | 2 | 3;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at: string | null;
  delivered_at: string | null;
  replied_at: string | null;
  message_content: string;
  unipile_message_id: string | null;
  email_extracted: string | null;
  extraction_confidence: number | null;
  extraction_method: 'regex' | 'gpt4o' | 'manual' | null;
  error_message: string | null;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDMSequenceInput {
  campaign_id: string;
  name: string;
  description?: string;
  step1_template: string;
  step1_delay_min?: number;
  step1_delay_max?: number;
  voice_cartridge_id?: string;
  step2_confirmation_template?: string;
  step3_enabled?: boolean;
  step3_delay?: number;
  step3_template?: string;
  step3_link_expiry?: number;
}

export interface UpdateDMSequenceInput extends Partial<CreateDMSequenceInput> {
  status?: 'active' | 'paused' | 'archived';
}
```

**Step 2: Verify types are valid TypeScript**

```bash
npx tsc --noEmit types/dm-sequences.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add types/dm-sequences.ts
git commit -m "feat(types): add DM sequences TypeScript definitions"
```

---

## Task 4: API Route - List DM Sequences

**Files:**
- Create: `app/api/dm-sequences/route.ts`

**Step 1: Write GET handler**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/dm-sequences - List sequences for user's client
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Query sequences (RLS will filter by client_id automatically)
    const { data: sequences, error: sequencesError } = await supabase
      .from('dm_sequences')
      .select(`
        *,
        campaigns(id, name),
        cartridges(id, name)
      `)
      .eq('client_id', userData.client_id)
      .order('created_at', { ascending: false });

    if (sequencesError) {
      console.error('[DM_SEQUENCES] Error fetching sequences:', sequencesError);
      return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 });
    }

    return NextResponse.json({ sequences: sequences || [] });
  } catch (error) {
    console.error('[DM_SEQUENCES] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Test GET endpoint manually**

```bash
# Start dev server on port 3000
PORT=3000 npm run dev

# In another terminal, test the endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/dm-sequences
```

Expected: `{"sequences":[]}`

**Step 3: Add POST handler for creating sequences**

```typescript
// POST /api/dm-sequences - Create new sequence
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const {
      campaign_id,
      name,
      description,
      step1_template,
      step1_delay_min = 2,
      step1_delay_max = 15,
      voice_cartridge_id,
      step2_confirmation_template = 'Got it! Sending your lead magnet now...',
      step3_enabled = true,
      step3_delay = 5,
      step3_template = "Here's your direct download link: {{download_url}}",
      step3_link_expiry = 24,
    } = body;

    // Validate required fields
    if (!campaign_id || !name || !step1_template) {
      return NextResponse.json(
        { error: 'Missing required fields: campaign_id, name, step1_template' },
        { status: 400 }
      );
    }

    // Create sequence
    const { data: sequence, error: createError } = await supabase
      .from('dm_sequences')
      .insert({
        campaign_id,
        client_id: userData.client_id,
        name,
        description,
        step1_template,
        step1_delay_min,
        step1_delay_max,
        voice_cartridge_id,
        step2_confirmation_template,
        step3_enabled,
        step3_delay,
        step3_template,
        step3_link_expiry,
      })
      .select()
      .single();

    if (createError) {
      console.error('[DM_SEQUENCES] Error creating sequence:', createError);
      return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 });
    }

    return NextResponse.json({ sequence }, { status: 201 });
  } catch (error) {
    console.error('[DM_SEQUENCES] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 4: Test POST endpoint**

```bash
curl -X POST http://localhost:3000/api/dm-sequences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "campaign_id": "CAMPAIGN_UUID",
    "name": "Test Sequence",
    "step1_template": "Hi {{name}}, thanks for your interest!"
  }'
```

Expected: `{"sequence":{...}}` with 201 status

**Step 5: Commit**

```bash
git add app/api/dm-sequences/route.ts
git commit -m "feat(api): add DM sequences list and create endpoints"
```

---

## Task 5: API Route - Individual Sequence Operations

**Files:**
- Create: `app/api/dm-sequences/[id]/route.ts`

**Step 1: Write GET handler for single sequence**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/dm-sequences/[id] - Get single sequence
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sequence, error } = await supabase
      .from('dm_sequences')
      .select(`
        *,
        campaigns(id, name),
        cartridges(id, name)
      `)
      .eq('id', params.id)
      .single();

    if (error || !sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error('[DM_SEQUENCES] Error fetching sequence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/dm-sequences/[id] - Update sequence
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { data: sequence, error } = await supabase
      .from('dm_sequences')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('[DM_SEQUENCES] Error updating sequence:', error);
      return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
    }

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error('[DM_SEQUENCES] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/dm-sequences/[id] - Delete sequence
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('dm_sequences')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('[DM_SEQUENCES] Error deleting sequence:', error);
      return NextResponse.json({ error: 'Failed to delete sequence' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DM_SEQUENCES] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Test GET /api/dm-sequences/[id]**

```bash
curl http://localhost:3000/api/dm-sequences/SEQUENCE_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: `{"sequence":{...}}`

**Step 3: Test PUT /api/dm-sequences/[id]**

```bash
curl -X PUT http://localhost:3000/api/dm-sequences/SEQUENCE_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"status": "paused"}'
```

Expected: `{"sequence":{...}}` with status updated

**Step 4: Commit**

```bash
git add app/api/dm-sequences/[id]/route.ts
git commit -m "feat(api): add DM sequence GET/PUT/DELETE endpoints"
```

---

## Task 6: Frontend - Replace Placeholder Page

**Files:**
- Modify: `app/dashboard/dm-sequences/page.tsx`

**Step 1: Replace entire placeholder with real implementation**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Eye, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { DMSequence } from '@/types/dm-sequences';

export default function DMSequencesPage() {
  const [sequences, setSequences] = useState<DMSequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dm-sequences');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load sequences');
      }

      setSequences(data.sequences || []);
    } catch (error) {
      console.error('Error loading DM sequences:', error);
      toast.error('Failed to load DM sequences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const response = await fetch(`/api/dm-sequences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sequence');
      }

      toast.success(`Sequence ${newStatus === 'active' ? 'activated' : 'paused'}`);
      loadSequences();
    } catch (error) {
      toast.error('Failed to update sequence status');
    }
  };

  const handleDeleteSequence = async (id: string) => {
    if (!confirm('Are you sure you want to delete this DM sequence?')) {
      return;
    }

    try {
      const response = await fetch(`/api/dm-sequences/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete sequence');
      }

      toast.success('DM sequence deleted');
      loadSequences();
    } catch (error) {
      toast.error('Failed to delete sequence');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'paused': return 'bg-orange-100 text-orange-700';
      case 'archived': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading DM sequences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">DM Sequences</h1>
          <p className="text-gray-600 mt-2">Automated LinkedIn direct message campaigns</p>
        </div>
        <Button onClick={() => toast.info('Create sequence modal coming next')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sequence
        </Button>
      </div>

      {sequences.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No DM sequences yet</p>
            <Button onClick={() => toast.info('Create sequence modal coming next')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Sequence
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sequences.map((sequence) => (
            <Card key={sequence.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle>{sequence.name}</CardTitle>
                      <Badge className={getStatusColor(sequence.status)}>
                        {sequence.status}
                      </Badge>
                    </div>
                    {sequence.description && (
                      <CardDescription className="mt-2">
                        {sequence.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(sequence.id, sequence.status)}
                    >
                      {sequence.status === 'active' ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.info('Edit coming next')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSequence(sequence.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="text-2xl font-semibold">{sequence.sent_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Replies</p>
                    <p className="text-2xl font-semibold">{sequence.replied_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Emails Captured</p>
                    <p className="text-2xl font-semibold">{sequence.email_captured_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Conversion Rate</p>
                    <p className="text-2xl font-semibold">
                      {sequence.sent_count > 0
                        ? `${Math.round((sequence.email_captured_count / sequence.sent_count) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Step 1 Delay:</span> {sequence.step1_delay_min}-{sequence.step1_delay_max} min
                    </div>
                    <div>
                      <span className="font-medium">Backup DM:</span> {sequence.step3_enabled ? 'Enabled' : 'Disabled'}
                    </div>
                    <div>
                      <span className="font-medium">Link Expiry:</span> {sequence.step3_link_expiry}h
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test the page loads**

```bash
# Dev server should be running on port 3000
# Navigate to: http://localhost:3000/dashboard/dm-sequences
```

Expected: Page loads, shows "No DM sequences yet" if empty

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit app/dashboard/dm-sequences/page.tsx
```

Expected: No errors

**Step 4: Commit**

```bash
git add app/dashboard/dm-sequences/page.tsx
git commit -m "feat(ui): replace placeholder DM sequences page with real implementation"
```

---

## Task 7: Create Sequence Modal Component

**Files:**
- Create: `components/dashboard/CreateDMSequenceModal.tsx`

**Step 1: Create modal component**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { CreateDMSequenceInput } from '@/types/dm-sequences';

interface CreateDMSequenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: Array<{ id: string; name: string }>;
  cartridges: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export function CreateDMSequenceModal({
  open,
  onOpenChange,
  campaigns,
  cartridges,
  onSuccess,
}: CreateDMSequenceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateDMSequenceInput>>({
    campaign_id: '',
    name: '',
    description: '',
    step1_template: 'Hi {{name}}, thanks for commenting "{{trigger_word}}"! Can you share your email so I can send you the {{lead_magnet_name}}?',
    step1_delay_min: 2,
    step1_delay_max: 15,
    step2_confirmation_template: 'Got it! Sending your lead magnet now...',
    step3_enabled: true,
    step3_delay: 5,
    step3_template: "Here's your direct download link (expires in 24h): {{download_url}}",
    step3_link_expiry: 24,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.campaign_id || !formData.name || !formData.step1_template) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/dm-sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sequence');
      }

      toast.success('DM sequence created successfully');
      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({
        campaign_id: '',
        name: '',
        description: '',
        step1_template: 'Hi {{name}}, thanks for commenting "{{trigger_word}}"! Can you share your email so I can send you the {{lead_magnet_name}}?',
        step1_delay_min: 2,
        step1_delay_max: 15,
        step2_confirmation_template: 'Got it! Sending your lead magnet now...',
        step3_enabled: true,
        step3_delay: 5,
        step3_template: "Here's your direct download link (expires in 24h): {{download_url}}",
        step3_link_expiry: 24,
      });
    } catch (error) {
      console.error('Error creating sequence:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create sequence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create DM Sequence</DialogTitle>
          <DialogDescription>
            Set up an automated direct message campaign for lead generation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign_id">Campaign *</Label>
              <Select
                value={formData.campaign_id}
                onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Sequence Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Lead Magnet Delivery"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this sequence..."
                rows={2}
              />
            </div>
          </div>

          {/* Step 1: Initial DM */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Step 1: Initial DM</h3>

            <div>
              <Label htmlFor="step1_template">Message Template *</Label>
              <Textarea
                id="step1_template"
                value={formData.step1_template}
                onChange={(e) => setFormData({ ...formData, step1_template: e.target.value })}
                placeholder="Hi {{name}}..."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Variables: {`{{name}}, {{trigger_word}}, {{lead_magnet_name}}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="step1_delay_min">Min Delay (minutes)</Label>
                <Input
                  id="step1_delay_min"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.step1_delay_min}
                  onChange={(e) => setFormData({ ...formData, step1_delay_min: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="step1_delay_max">Max Delay (minutes)</Label>
                <Input
                  id="step1_delay_max"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.step1_delay_max}
                  onChange={(e) => setFormData({ ...formData, step1_delay_max: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="voice_cartridge_id">Voice Cartridge (Optional)</Label>
              <Select
                value={formData.voice_cartridge_id || ''}
                onValueChange={(value) => setFormData({ ...formData, voice_cartridge_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (use original text)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {cartridges.map((cartridge) => (
                    <SelectItem key={cartridge.id} value={cartridge.id}>
                      {cartridge.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 2: Confirmation */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Step 2: Email Confirmation</h3>

            <div>
              <Label htmlFor="step2_confirmation_template">Confirmation Message</Label>
              <Textarea
                id="step2_confirmation_template"
                value={formData.step2_confirmation_template}
                onChange={(e) => setFormData({ ...formData, step2_confirmation_template: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Step 3: Backup DM */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Step 3: Backup DM</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.step3_enabled}
                  onChange={(e) => setFormData({ ...formData, step3_enabled: e.target.checked })}
                />
                <span className="text-sm">Enabled</span>
              </label>
            </div>

            {formData.step3_enabled && (
              <>
                <div>
                  <Label htmlFor="step3_template">Backup Message Template</Label>
                  <Textarea
                    id="step3_template"
                    value={formData.step3_template}
                    onChange={(e) => setFormData({ ...formData, step3_template: e.target.value })}
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables: {`{{download_url}}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="step3_delay">Delay After Step 2 (minutes)</Label>
                    <Input
                      id="step3_delay"
                      type="number"
                      min="1"
                      max="60"
                      value={formData.step3_delay}
                      onChange={(e) => setFormData({ ...formData, step3_delay: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="step3_link_expiry">Link Expiry (hours)</Label>
                    <Input
                      id="step3_link_expiry"
                      type="number"
                      min="1"
                      max="72"
                      value={formData.step3_link_expiry}
                      onChange={(e) => setFormData({ ...formData, step3_link_expiry: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Sequence'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit components/dashboard/CreateDMSequenceModal.tsx
```

Expected: No errors

**Step 3: Commit**

```bash
git add components/dashboard/CreateDMSequenceModal.tsx
git commit -m "feat(ui): add create DM sequence modal component"
```

---

## Task 8: Integrate Create Modal with DM Sequences Page

**Files:**
- Modify: `app/dashboard/dm-sequences/page.tsx`

**Step 1: Add modal state and data fetching**

```typescript
// Add at top of file
import { CreateDMSequenceModal } from '@/components/dashboard/CreateDMSequenceModal';

// Add state after existing state declarations
const [showCreateModal, setShowCreateModal] = useState(false);
const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
const [cartridges, setCartridges] = useState<Array<{ id: string; name: string }>>([]);

// Add data fetching in useEffect
useEffect(() => {
  loadSequences();
  loadCampaigns();
  loadCartridges();
}, []);

const loadCampaigns = async () => {
  try {
    const response = await fetch('/api/campaigns');
    const data = await response.json();
    setCampaigns(data.campaigns || []);
  } catch (error) {
    console.error('Error loading campaigns:', error);
  }
};

const loadCartridges = async () => {
  try {
    const response = await fetch('/api/cartridges');
    const data = await response.json();
    setCartridges(data.cartridges || []);
  } catch (error) {
    console.error('Error loading cartridges:', error);
  }
};
```

**Step 2: Update Create button to open modal**

```typescript
// Replace the Button with:
<Button onClick={() => setShowCreateModal(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Create Sequence
</Button>

// Add modal before closing </div>
<CreateDMSequenceModal
  open={showCreateModal}
  onOpenChange={setShowCreateModal}
  campaigns={campaigns}
  cartridges={cartridges}
  onSuccess={loadSequences}
/>
```

**Step 3: Test modal opens and creates sequence**

```bash
# Navigate to http://localhost:3000/dashboard/dm-sequences
# Click "Create Sequence" button
# Fill form and submit
```

Expected: Modal opens, form submits, sequence appears in list

**Step 4: Commit**

```bash
git add app/dashboard/dm-sequences/page.tsx
git commit -m "feat(ui): integrate create sequence modal with DM sequences page"
```

---

## Next Steps (Not in This Plan)

The following features need separate implementation plans:

1. **BullMQ Job Processing** - Background jobs for DM delivery
2. **Unipile Integration** - Send DMs via Unipile API
3. **Email Extraction** - Regex + GPT-4o for extracting emails from replies
4. **Lead Magnet Links** - Generate expiring download URLs
5. **Webhook Delivery** - Send lead data to client's ESP
6. **Analytics Dashboard** - Detailed metrics and charts
7. **Edit Sequence Modal** - Update existing sequences
8. **Test Mode** - Send test DMs to self

---

## Testing Checklist

### Database
- [ ] dm_sequences table created
- [ ] dm_deliveries table created
- [ ] RLS policies active
- [ ] Foreign keys working
- [ ] Indexes created

### API Endpoints
- [ ] GET /api/dm-sequences returns empty array
- [ ] POST /api/dm-sequences creates sequence
- [ ] GET /api/dm-sequences/[id] returns sequence
- [ ] PUT /api/dm-sequences/[id] updates sequence
- [ ] DELETE /api/dm-sequences/[id] deletes sequence
- [ ] 401 errors when not authenticated

### Frontend
- [ ] Page loads without errors
- [ ] "No sequences" state shows correctly
- [ ] Create button opens modal
- [ ] Form validation works
- [ ] Sequence creates successfully
- [ ] List updates after create
- [ ] Pause/activate toggle works
- [ ] Delete confirmation works
- [ ] Analytics display correctly
- [ ] TypeScript compiles without errors

### Integration
- [ ] Campaign dropdown populated
- [ ] Cartridge dropdown populated
- [ ] Voice cartridge association saved
- [ ] Sequences filtered by client_id (RLS)

---

## Rollback Plan

If issues occur, rollback in reverse order:

```bash
# Remove frontend changes
git revert HEAD~3

# Remove API routes
git revert HEAD~2

# Drop database tables
DROP TABLE IF EXISTS dm_deliveries CASCADE;
DROP TABLE IF EXISTS dm_sequences CASCADE;
```

---

## Documentation

After completion, update:
- [ ] `docs/api/dm-sequences.md` - API documentation
- [ ] `docs/guides/dm-sequences-setup.md` - Setup guide
- [ ] `README.md` - Add DM sequences to feature list

---

Plan complete and saved to `docs/plans/2025-11-11-dm-sequences-mvp.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration with quality gates

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints between phases

**Which approach?**
