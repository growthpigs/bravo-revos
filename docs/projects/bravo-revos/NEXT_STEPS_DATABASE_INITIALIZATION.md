# Next Steps: Database Initialization for Bravo RevOS

## Quick Start (TL;DR)

**Your new Bravo RevOS Supabase project is ready**: https://supabase.com/dashboard/project/trdoainmejxanrownbuz

### Step 1: Initialize Database (5 minutes)
Go to SQL editor and run ALL migrations in order (001-009):
- Copy each migration file from `supabase/migrations/`
- Paste into Supabase SQL editor: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
- Execute each in order

### Step 2: Deploy RLS Policies (2 minutes)
After schema is created, execute Migration 009:
- File: `supabase/migrations/009_add_rls_policies_all_tables.sql`
- Paste entire file into SQL editor
- Execute (creates 57 policies across 17 tables)

### Step 3: Test Application
- Dev server already using new credentials (`.env.local` updated)
- Navigate to http://localhost:3000
- Test complete flow: Login → Create account → Generate leads → etc.

### Step 4: Deploy to Production
- Update Render backend env vars
- Update Netlify frontend env vars
- Restart services
- Verify production works

### Step 5: Cleanup
- Delete old Supabase project: `cdoikmuoiccqllqdpoew`

---

## Detailed Steps

### Prerequisites
- Supabase account (already have access)
- Git repo with all migrations (already have)
- `.env.local` updated with new credentials ✅ (already done)

### Step 1: Copy Migration 001

**File**: `supabase/migrations/001_initial_schema.sql`

1. Open file locally
2. Copy entire contents
3. Open Supabase: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
4. Click "New Query"
5. Paste entire contents
6. Click "Execute"
7. Wait for completion (should see no errors)

**Expected**: All tables created (users, clients, campaigns, leads, etc.)

---

### Step 2: Copy Migration 002

**File**: `supabase/migrations/002_auth_setup.sql`

Repeat the same process:
1. Copy file contents
2. Create new query in Supabase SQL editor
3. Paste
4. Execute

**Expected**: Auth policies and user creation/update triggers configured

---

### Step 3: Copy Migration 003

**File**: `supabase/migrations/003_cartridge_system.sql`

Same process:
1. Copy
2. New query
3. Paste
4. Execute

**Expected**: Cartridges table and system cartridges created

---

### Step 4: Copy Migration 004

**File**: `supabase/migrations/004_fix_auth.sql`

Same process.

**Expected**: Auth improvements applied

---

### Step 5: Copy Migration 005

**File**: `supabase/migrations/005_orchestration_dashboard.sql`

Same process.

**Expected**: Orchestration dashboard schema created

---

### Step 6: Copy Migration 006

**File**: `supabase/migrations/006_email_system.sql`

Same process.

**Expected**: Email extraction tables created

---

### Step 7: Copy Migration 007

**File**: `supabase/migrations/007_pod_cartridges.sql`

Same process.

**Expected**: Pod cartridge relationships created

---

### Step 8: Copy Migration 008

**File**: `supabase/migrations/008_enable_rls_all_tables.sql`

Same process.

**Expected**: RLS enabled on all tables (but no policies yet, so access will be restricted)

---

### Step 9: Copy Migration 009 (RLS Policies)

**File**: `supabase/migrations/009_add_rls_policies_all_tables.sql`

This is the big one - 570+ lines, 57 policies.

1. Copy entire file contents
2. Open SQL editor
3. Paste
4. Click Execute

**Expected**: All 57 RLS policies created, application access restored

**Verify**: Check each table in Supabase Dashboard:
- Each should show "RLS is enabled" in the table details
- Each should show the policy list when you click on "Policies" tab

---

## Verification Checklist

After all migrations applied:

- [ ] Navigate to Supabase Dashboard: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/editor
- [ ] Check "Tables" section - should see 17 tables (users, clients, campaigns, leads, etc.)
- [ ] Click each table, verify "Policies" tab shows appropriate policies
- [ ] Example: `clients` table should have:
  - "Users can view their client"
  - "Users can update their client"
  - "Service role can manage all users"

---

## Application Testing

### Start Dev Server
```bash
npm run dev
```

This uses the updated `.env.local` credentials (new Bravo RevOS project).

### Test Workflow
1. **Login**: Navigate to http://localhost:3000/auth/login
2. **Create Test Account**: Sign up with test email/password
3. **Create LinkedIn Account**: Add LinkedIn connection
4. **Generate Lead**: Trigger lead capture from LinkedIn
5. **Extract Email**: Process the extracted email
6. **Webhook Test**: Send test webhook via `/admin/webhook-test`
7. **Verify RLS**:
   - Sign in as User A, see only User A's data
   - Sign in as User B, see only User B's data (can't see User A's)

### Expected Behavior
- ✅ All pages load
- ✅ User can create resources (campaigns, leads, etc.)
- ✅ User only sees own client's data
- ✅ Webhook deliveries sent successfully
- ✅ No "permission denied" errors

---

## Production Deployment

### Render Backend (API)
1. Go to Render dashboard
2. Find "bravo-revos-backend" service
3. Settings → Environment
4. Update:
   - `NEXT_PUBLIC_SUPABASE_URL=https://trdoainmejxanrownbuz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTQ5MTUsImV4cCI6MjA3ODA3MDkxNX0.42jDkJvFkrSkHWitgnTTc_58Hq1H378LPdB0u8-aGfI`
   - `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NDkxNSwiZXhwIjoyMDc4MDcwOTE1fQ.-_DnyCrCh_UDEuNwGddPL_LFKDYTocICU4L6Tx-G3Do`
5. Save and redeploy

### Netlify Frontend
1. Go to Netlify dashboard
2. Find "bravo-revos" site
3. Site settings → Build & deploy → Environment
4. Update same three variables
5. Trigger redeploy

### Verify Production
- [ ] Frontend loads at production URL
- [ ] Login works
- [ ] Can create resources
- [ ] Webhooks fire successfully
- [ ] No console errors

---

## Cleanup: Delete Old Project

**Only after production verified as working:**

1. Go to Supabase: https://supabase.com/dashboard/organizations
2. Find project `cdoikmuoiccqllqdpoew` (Archon/RevOS shared)
3. Click Settings → Danger Zone
4. Click "Delete project"
5. Confirm deletion

**⚠️ WARNING**: This cannot be undone. Make sure production is working first!

---

## File References

All migration files located in:
```
/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/supabase/migrations/
```

Files you'll need:
- `001_initial_schema.sql`
- `002_auth_setup.sql`
- `003_cartridge_system.sql`
- `004_fix_auth.sql`
- `005_orchestration_dashboard.sql`
- `006_email_system.sql`
- `007_pod_cartridges.sql`
- `008_enable_rls_all_tables.sql`
- `009_add_rls_policies_all_tables.sql` ← RLS policies (critical!)

---

## Key Credentials (Already Updated in .env.local)

**New Bravo RevOS Project**:
- URL: `https://trdoainmejxanrownbuz.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTQ5MTUsImV4cCI6MjA3ODA3MDkxNX0.42jDkJvFkrSkHWitgnTTc_58Hq1H378LPdB0u8-aGfI`
- Service Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NDkxNSwiZXhwIjoyMDc4MDcwOTE1fQ.-_DnyCrCh_UDEuNwGddPL_LFKDYTocICU4L6Tx-G3Do`

**Old Shared Project** (to be deleted):
- URL: `https://cdoikmuoiccqllqdpoew.supabase.co`
- Status: Still active - will delete after verification

---

## Timeline Estimate

| Task | Time |
|------|------|
| Run all 9 migrations | 15 minutes |
| Deploy RLS policies | 2 minutes |
| Test dev environment | 10 minutes |
| Update Render env vars | 5 minutes |
| Update Netlify env vars | 5 minutes |
| Test production | 10 minutes |
| **Total** | **~47 minutes** |

---

## Questions?

Refer to main session summary: `docs/projects/bravo-revos/SESSION_SUMMARY_2025-11-06.md`

---

*Generated: 2025-11-07*
*Project: Bravo revOS*
*New Supabase Project: trdoainmejxanrownbuz*
