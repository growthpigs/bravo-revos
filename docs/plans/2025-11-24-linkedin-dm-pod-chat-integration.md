# LinkedIn DM Pod - Chat Workflow Integration

**Date:** November 24, 2025
**Status:** Implementation Plan
**Priority:** Complete existing infrastructure

---

## Executive Summary

The LinkedIn DM Pod workflow backend is **100% complete** (comment monitoring, DM sending, email extraction, webhooks). This plan focuses on integrating the workflow into the HGC chat interface and creating a dashboard for campaign management.

---

## Current State Analysis

### ✅ Backend Infrastructure (COMPLETE)

**Workers:**
- `comment-monitor.ts` - Polls LinkedIn posts for trigger word comments
- `dm-worker.ts` - Sends automated DMs via Unipile (BullMQ)
- `reply-monitor.ts` - Extracts emails from DM replies, sends to ESP webhook

**API Endpoints:**
- `/api/cron/poll-comments` - Triggers comment polling (5min intervals)
- `/api/cron/poll-replies` - Triggers reply polling (5min intervals)

**Database Schema:**
- `pod_activities` - Extended with campaign_id, linkedin_profile_id, email
- `processed_comments` - Tracks processed comments (avoid duplicates)
- `processed_messages` - Tracks processed DM replies
- `webhook_configs` - ESP webhook configuration with HMAC signing

**Queue Infrastructure:**
- BullMQ with Redis (Upstash)
- Retry logic (3 attempts, exponential backoff)
- Rate limiting (100 DMs/day, 10 jobs/min)

**Test Suite:**
- `scripts/test-dm-flow.ts` - E2E test guide

### 🚧 Missing Pieces

1. **Console Workflow** - "pod" command trigger in HGC chat
2. **Campaign Dashboard** - View campaigns, leads, activity
3. **Campaign Creation Wizard** - Guided setup in chat

---

## Implementation Plan

### Task 1: Create Console Workflow (1 hour)

**Goal:** Add "pod" command to trigger campaign management in HGC chat

**Database Migration:**
```sql
-- supabase/migrations/20251124_create_pod_workflow.sql

INSERT INTO console_workflows (
  name,
  description,
  triggers,
  system_prompt,
  steps,
  created_at
) VALUES (
  'linkedin-dm-pod',
  'Manage LinkedIn DM Pod campaigns for automated lead generation',
  '{"commands": ["pod", "campaign", "leads"], "case_insensitive": true}',
  'You are a LinkedIn DM Pod campaign manager. Help users create and monitor campaigns that automatically convert post comments into email leads.',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'load_campaigns',
      'type', 'query',
      'description', 'Load user''s active campaigns',
      'query', 'campaigns',
      'next', 'show_menu'
    ),
    jsonb_build_object(
      'id', 'show_menu',
      'type', 'buttons',
      'description', 'Campaign management menu',
      'message', '📊 **Your LinkedIn DM Pod Campaigns**\n\nCampaigns: {{campaigns.length}}\n\nWhat would you like to do?',
      'buttons', jsonb_build_array(
        jsonb_build_object('label', 'View Campaigns', 'value', 'view:campaigns'),
        jsonb_build_object('label', 'Create Campaign', 'value', 'create:campaign'),
        jsonb_build_object('label', 'Check Leads', 'value', 'view:leads')
      )
    ),
    jsonb_build_object(
      'id', 'view_campaigns',
      'type', 'response',
      'description', 'Show campaign details',
      'message', '**Active Campaigns:**\n\n{{#each campaigns}}- {{name}}: {{status}}\n  Trigger: "{{trigger_word}}"\n  Leads: {{lead_count}}\n{{/each}}'
    )
  ),
  now()
);
```

**Success Criteria:**
- Typing "pod" in chat triggers workflow
- Loads user's campaigns from database
- Shows campaign menu with action buttons

---

### Task 2: Campaign Dashboard UI (2 hours)

**Goal:** Create `/dashboard/pods` page to view campaigns and leads

**Files to Create:**
- `/app/dashboard/pods/page.tsx` - Main dashboard
- `/components/dashboard/PodCampaignList.tsx` - Campaign cards
- `/components/dashboard/PodLeadsTable.tsx` - Leads data table

**Dashboard Features:**
1. **Campaign Overview Cards**
   - Campaign name, status, trigger word
   - Metrics: Posts monitored, DMs sent, Emails captured
   - Last activity timestamp
   - "View Leads" button per campaign

2. **Leads Table** (per campaign)
   - Columns: Name, LinkedIn, Status, Email, Captured At
   - Status badges: dm_queued, dm_sent, email_captured
   - Filter by status, date range
   - Export to CSV

3. **Activity Stream**
   - Real-time feed of pod activities
   - Auto-refresh every 30 seconds
   - Shows: comment detected → DM queued → DM sent → email captured

**Implementation:**
```typescript
// app/dashboard/pods/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PodCampaignList } from '@/components/dashboard/PodCampaignList';
import { PodLeadsTable } from '@/components/dashboard/PodLeadsTable';

export default function PodsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('campaigns')
      .select(`
        *,
        lead_magnets!lead_magnet_id (name),
        _stats:pod_activities(count)
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    setCampaigns(data || []);
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">LinkedIn DM Pod Campaigns</h1>
        <p className="text-gray-600">Automated lead generation from LinkedIn comments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm text-gray-600">Active Campaigns</h3>
          <p className="text-3xl font-bold">{campaigns.filter(c => c.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm text-gray-600">DMs Sent (24h)</h3>
          <p className="text-3xl font-bold">12</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm text-gray-600">Emails Captured (24h)</h3>
          <p className="text-3xl font-bold">8</p>
        </Card>
      </div>

      <PodCampaignList
        campaigns={campaigns}
        onSelect={setSelectedCampaign}
      />

      {selectedCampaign && (
        <PodLeadsTable campaignId={selectedCampaign.id} />
      )}
    </div>
  );
}
```

**Success Criteria:**
- Dashboard shows all user's campaigns
- Real-time metrics display correctly
- Leads table loads and updates
- Can filter/export leads

---

### Task 3: Campaign Creation in Chat (2 hours)

**Goal:** Guide user through campaign setup via chat workflow

**Workflow Steps:**
1. Campaign name
2. LinkedIn post URL (or use "write" to create)
3. Trigger word (or use defaults)
4. Lead magnet upload
5. ESP webhook configuration
6. Confirmation & activation

**Implementation:**
Update `console_workflows.steps` for `linkedin-dm-pod` workflow:

```json
{
  "id": "create_campaign_name",
  "type": "input",
  "description": "Get campaign name",
  "message": "Let's create a new LinkedIn DM Pod campaign!\n\nWhat should we call this campaign?",
  "input_type": "text",
  "validation": "min:3,max:50",
  "next": "create_post_url"
},
{
  "id": "create_post_url",
  "type": "input",
  "description": "Get LinkedIn post URL",
  "message": "Great! Now paste the LinkedIn post URL you want to monitor.\n\n(Or type 'write' to create a new post first)",
  "input_type": "text",
  "validation": "url_or_command",
  "next": "create_trigger_word"
},
{
  "id": "create_trigger_word",
  "type": "input",
  "description": "Get trigger word",
  "message": "What word/phrase should trigger a DM?\n\nDefault triggers: interested, send it, dm me, yes please\n\n(Press Enter to use defaults or type custom trigger)",
  "input_type": "text",
  "optional": true,
  "next": "create_lead_magnet"
},
{
  "id": "create_lead_magnet",
  "type": "file_upload",
  "description": "Upload lead magnet",
  "message": "Upload your lead magnet (PDF, eBook, template, etc.)",
  "accept": "application/pdf,.pdf,.doc,.docx,.zip",
  "max_size_mb": 50,
  "next": "create_webhook"
},
{
  "id": "create_webhook",
  "type": "input",
  "description": "Get ESP webhook URL",
  "message": "Enter your ESP webhook URL (optional)\n\nThis will send captured emails to your email service provider.",
  "input_type": "url",
  "optional": true,
  "next": "confirm_campaign"
},
{
  "id": "confirm_campaign",
  "type": "confirmation",
  "description": "Review and activate",
  "message": "**Campaign Ready!**\n\nName: {{campaign_name}}\nPost: {{post_url}}\nTrigger: {{trigger_word || 'default triggers'}}\nLead Magnet: {{lead_magnet_name}}\n\nActivate this campaign?",
  "buttons": [
    {"label": "Activate Campaign", "value": "activate"},
    {"label": "Cancel", "value": "cancel"}
  ]
}
```

**Success Criteria:**
- User can create campaign entirely in chat
- File upload works for lead magnet
- Campaign activates and appears in dashboard
- Cron jobs start monitoring immediately

---

### Task 4: Integration Testing (1 hour)

**Test Scenarios:**
1. **E2E Flow:**
   - Create campaign via chat
   - Post to LinkedIn
   - Comment with trigger word
   - DM sent automatically
   - Reply with email
   - Email captured and sent to ESP

2. **Dashboard:**
   - View campaigns
   - See leads populate in real-time
   - Export leads to CSV
   - Filter by status/date

3. **Error Handling:**
   - Invalid post URL
   - Rate limit hit (100 DMs/day)
   - ESP webhook failure
   - Email extraction failure (GPT fallback)

**Validation Checklist:**
- [ ] "pod" command triggers workflow
- [ ] Campaign creation wizard completes
- [ ] Lead magnet uploads to Supabase storage
- [ ] Cron jobs poll every 5 minutes
- [ ] DMs send via Unipile
- [ ] Emails extract via regex + GPT
- [ ] ESP webhook delivers with HMAC signature
- [ ] Dashboard shows real-time updates
- [ ] Leads export to CSV

---

## Deployment Checklist

### Environment Variables
- `REDIS_URL` - Upstash Redis connection
- `UNIPILE_API_KEY` - LinkedIn API access
- `OPENAI_API_KEY` - GPT-4 for email extraction
- `CRON_SECRET` - Protect cron endpoints
- `URL_SIGNING_SECRET` - Sign lead magnet URLs

### Cron Jobs (Render/Vercel/Other)
```
# Poll comments every 5 minutes
*/5 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://app.com/api/cron/poll-comments

# Poll replies every 5 minutes
*/5 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://app.com/api/cron/poll-replies
```

### Worker Process
```bash
# Start BullMQ workers (Render background worker)
npm run workers
# Or: npx tsx scripts/start-workers.ts
```

### Database Migrations
- [ ] Apply `20251124_create_pod_workflow.sql`
- [ ] Verify RLS policies on pod_activities
- [ ] Test campaign creation with real user

---

## Success Metrics

- **User Experience:**
  - Campaign creation in <3 minutes
  - Zero manual DM sending required
  - Real-time lead visibility in dashboard

- **Technical Performance:**
  - >95% DM delivery success rate
  - <30 second DM send time (from comment)
  - >90% email extraction accuracy
  - <5% manual intervention rate

- **Business Impact:**
  - 10-50 leads captured per campaign
  - 50%+ email capture rate
  - Zero LinkedIn rate limits hit

---

## Next Steps

1. **Immediate:** Create console workflow migration
2. **Phase 1:** Build dashboard UI (2 hours)
3. **Phase 2:** Implement campaign wizard in chat (2 hours)
4. **Phase 3:** E2E testing with real LinkedIn account
5. **Deploy:** Push to production, configure cron jobs

**Total Estimated Time:** 5-6 hours

---

**Status:** ✅ Ready for implementation
