#!/usr/bin/env python3
"""
Add the 3 detailed Bolt.new tasks from CORRECTED-TASKS-FINAL.md
"""
import requests

PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"
API = "http://localhost:8181/api/tasks"

tasks = [
    {
        "title": "T001: Generate Database Schema with Bolt.new",
        "description": """User creates the database schema in Bolt.new, then pushes to GitHub for integration.

**Bolt.new Prompt:**
Create a Supabase database schema for a LinkedIn lead magnet system with:

MULTI-TENANT STRUCTURE (CRITICAL):
- agencies table (top level)
- clients table (belongs to agencies)
- users table (belongs to clients)

CAMPAIGN TABLES:
- campaigns (name, trigger_word, lead_magnet_id, webhook_config_id, dm_templates)
- lead_magnets (file_path for Supabase Storage, name, description)
- leads (email, linkedin_id, status: comment_detected→dm_sent→email_captured→webhook_sent→backup_sent)

LINKEDIN TABLES:
- linkedin_accounts (encrypted credentials, unipile_account_id, session)
- posts (content, trigger_word, unipile_post_id, last_polled_at)
- comments (has_trigger_word boolean, dm_sent boolean)
- dm_sequences (3-step tracking: step1_sent_at, step2_sent_at, step3_sent_at, download_url)

CARTRIDGE SYSTEM:
- cartridges (4-tier: system, workspace, user, skill)
- Voice parameters: tone, style, personality, vocabulary
- Parent-child relationships for inheritance

ENGAGEMENT PODS:
- pods (name, min 9 members, auto_engage=true)
- pod_members (user_id, pod_id, linkedin_account_id)
- pod_activities (like/comment/repost tracking)

WEBHOOK DELIVERY:
- webhook_configs (url, secret, headers, esp_type: zapier|make|convertkit)
- webhook_deliveries (payload, status, retry_count)

Include TypeScript types, Supabase client setup, and RLS policies for multi-tenancy.

**Deliverables:**
1. SQL migration files
2. TypeScript type definitions
3. Supabase client configuration
4. Basic RLS policies

**Reference:** data-model.md, spec.md lines 258-304""",
        "task_order": 100
    },
    {
        "title": "T002: Generate Admin Portal UI with Bolt.new",
        "description": """User creates the admin interface in Bolt.new for agency administrators.

**Bolt.new Prompt:**
Create Next.js 14 admin portal (route: /admin) with shadcn/ui:

IMPORTANT: This is ONE app with role-based routing, NOT a separate application.

PAGES NEEDED:
/admin/dashboard - System metrics, client overview
/admin/clients - Manage all clients (CRUD)
/admin/campaigns - View all campaigns across clients
/admin/linkedin - LinkedIn account health monitoring
/admin/webhooks - Webhook delivery analytics
/admin/pods - Engagement pod management

UI COMPONENTS:
- DataTable with filtering/sorting (use tanstack-table)
- Metric cards showing KPIs
- Real-time status indicators
- Campaign performance charts (use recharts)

FEATURES:
- Multi-tenant data filtering
- Client impersonation
- System-wide analytics
- API usage monitoring

Use App Router, TypeScript, Tailwind CSS, shadcn/ui components.
Role check: user.role === 'admin' at agency level.

**Deliverables:**
1. Admin route pages (/admin/*)
2. Admin-specific components
3. Role-based middleware
4. Analytics dashboards

**Reference:** spec.md lines 223-231 (Admin Portal section)""",
        "task_order": 110
    },
    {
        "title": "T003: Generate Client Dashboard UI with Bolt.new",
        "description": """User creates the client dashboard in Bolt.new for business users.

**Bolt.new Prompt:**
Create Next.js 14 client dashboard (route: /dashboard) with shadcn/ui:

IMPORTANT: Same app as admin, just different routes with role-based access.

PAGES NEEDED:
/dashboard - Campaign metrics, lead counts, conversion funnel
/dashboard/campaigns/new - Campaign creation wizard
/dashboard/campaigns/[id] - Campaign details, lead list
/dashboard/leads - Export leads as CSV
/dashboard/settings/webhooks - Configure ESP webhooks
/dashboard/settings/voice - Voice cartridge settings

CAMPAIGN WIZARD STEPS:
1. Lead magnet upload (to Supabase Storage)
2. Content creation (AI or manual mode toggle)
3. Trigger word selection
4. Webhook configuration (ESP presets: Zapier, Make, etc)
5. DM sequence settings (delays, backup DM toggle)
6. Review and launch

KEY COMPONENTS:
- Campaign creation wizard (multi-step form)
- Lead table with export
- Webhook test tool
- Voice preview
- Real-time metrics

Use App Router, TypeScript, Tailwind CSS, shadcn/ui.
Multi-tenant isolation via RLS.

**Deliverables:**
1. Client dashboard routes (/dashboard/*)
2. Campaign wizard component
3. Lead management UI
4. Settings pages

**Reference:** spec.md lines 233-244, WEBHOOK-SETTINGS-UI.md""",
        "task_order": 120
    }
]

print("Creating 3 detailed Bolt.new tasks...")
for task in tasks:
    payload = {
        "project_id": PROJECT_ID,
        "title": task["title"],
        "description": task["description"],
        "status": "todo",
        "assignee": "User",
        "branch": "bolt-scaffold",
        "task_order": task["task_order"]
    }

    response = requests.post(API, json=payload)
    if response.status_code == 200:
        task_id = response.json()["task"]["id"]
        print(f"  ✓ {task['title']}: {task_id[:8]}...")
    else:
        print(f"  ✗ Failed: {task['title']}")
        print(f"    Error: {response.text}")

print("\n✅ Done! Verify in Archon UI.")
