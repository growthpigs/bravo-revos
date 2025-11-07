# Bravo RevOS Database Initialization Guide

## Status: ✅ Ready for Execution

**New Bravo RevOS Supabase Project**: https://trdoainmejxanrownbuz.supabase.co
**Combined Migration File**: Ready (2022 lines, 63KB, all 9 migrations)
**Local Environment**: ✅ Updated (.env.local has new credentials)

---

## Quick Start (2 minutes)

### Step 1: Copy Migration File to Clipboard
```bash
cat /tmp/bravo-revos-all-migrations.sql | pbcopy
```

✅ **DONE** - File is now in your clipboard

### Step 2: Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

### Step 3: Paste & Execute
1. Click "New Query" (if not already done)
2. Paste the migration file (Cmd+V)
3. Click the blue "Execute" button

⏱️ **Wait**: ~10-20 seconds for execution

### Step 4: Verify Success
After execution completes:
- Check the results panel for any errors
- Navigate to Tables tab in Supabase dashboard
- Should see all 17 tables created

---

## What Gets Initialized

### Migration Files (9 total)

| # | Migration | Purpose | Key Tables |
|---|-----------|---------|-----------|
| 1 | 001_initial_schema.sql | Core multi-tenant schema | agencies, clients, users |
| 2 | 002_storage_setup.sql | File storage configuration | storage buckets |
| 3 | 003_cartridge_system.sql | Template/cartridge system | cartridges |
| 4 | 004_fix_auth.sql | Auth improvements | user auth triggers |
| 5 | 005_add_campaign_id_to_posts.sql | Campaign linking | posts.campaign_id |
| 6 | 006_d01_email_extraction.sql | Email system | email_extractions |
| 7 | 007_d02_webhook_delivery.sql | Webhook system | webhook_configs, webhook_deliveries |
| 8 | 008_enable_rls_all_tables.sql | RLS enforcement | (enables RLS) |
| 9 | 009_add_rls_policies_all_tables.sql | Multi-tenant access control | (57 policies) |

### Database Schema (17 Tables)
```
agencies
├── clients
│   ├── users
│   ├── campaigns
│   │   ├── posts
│   │   │   └── comments
│   │   ├── leads
│   │   ├── dm_sequences
│   │   └── lead_magnets
│   ├── linkedin_accounts
│   ├── pods
│   │   ├── pod_members
│   │   └── pod_activities
│   ├── webhook_configs
│   │   └── webhook_deliveries
│   └── cartridges
```

### RLS Policies (57 total)
- Multi-tenant isolation: Users can only access their client's data
- Service role bypass: Backend operations can access all data
- Cross-table enforcement: Policies on all 17 tables

---

## Step-by-Step Details

### Prerequisites Check
- ✅ New Supabase project created (trdoainmejxanrownbuz)
- ✅ Bravo revOS project database is empty (ready for initialization)
- ✅ All migration files exist in repo
- ✅ Combined migration file prepared (2022 lines)
- ✅ Local .env.local updated with new credentials

### Execution Steps

#### 1. Verify Environment
```bash
# Check that .env.local has the new credentials
grep "NEXT_PUBLIC_SUPABASE_URL" .env.local
# Should show: https://trdoainmejxanrownbuz.supabase.co
```

#### 2. Open Supabase SQL Editor
```
URL: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
```

#### 3. Create New Query
- Click "New Query" button at top left
- Empty query editor opens

#### 4. Paste Migration File
```bash
# File already in clipboard from step 1, so just:
Cmd+V (Mac) or Ctrl+V (Linux/Windows)
```

#### 5. Execute Query
- Click the blue "Execute" button
- Watch the execution progress
- Should complete in 10-20 seconds

#### 6. Check Results
- ✅ No errors in the results panel
- ✅ All 2022 lines executed successfully
- ✅ Database initialization complete

---

## Verification Checklist

### In Supabase Dashboard

**Check 1: Tables Created**
1. Go to: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/editor
2. Left sidebar → "Tables"
3. Should see 17 tables:
   - [ ] agencies
   - [ ] clients
   - [ ] users
   - [ ] campaigns
   - [ ] posts
   - [ ] comments
   - [ ] leads
   - [ ] dm_sequences
   - [ ] lead_magnets
   - [ ] linkedin_accounts
   - [ ] pods
   - [ ] pod_members
   - [ ] pod_activities
   - [ ] cartridges
   - [ ] webhook_configs
   - [ ] webhook_deliveries
   - [ ] storage (system)

**Check 2: RLS Policies Deployed**
1. Click on any table (e.g., "clients")
2. Go to "Policies" tab
3. Should see policies like:
   - "Users can view their client"
   - "Users can update their client"
   - "Service role can manage all users"

**Check 3: Storage Buckets**
1. Left sidebar → "Storage"
2. Should see configured buckets

### Local Development

**Check 4: Test App Connectivity**
```bash
# Navigate to project directory
cd /Users/rodericandrews/Obsidian/Master/_projects/bravo-revos

# Dev server should already be running (npm run dev)
# If not, start it:
npm run dev

# Navigate to http://localhost:3000
# Try to login - should connect to new database
```

**Check 5: Test Authentication**
- Sign up with test email
- Verify user created in Supabase
- Check `users` table in Supabase dashboard
- Should see new user record

---

## Troubleshooting

### Issue: "ERROR: relation X already exists"
**Cause**: Some migrations include `CREATE TABLE IF NOT EXISTS` but the table already exists
**Solution**: This is normal for re-migrations. Continue - the script handles this.

### Issue: "Permission denied" errors
**Cause**: Service role key might be incorrect in .env.local
**Solution**: Check `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/.env.local`
- Should have: `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...`

### Issue: "RLS is blocking queries" in app
**Cause**: RLS policies weren't applied correctly
**Solution**:
1. Go back to SQL editor
2. Run just migration 009 again (RLS policies)
3. Verify policies on tables

### Issue: "Cannot connect to database" in app
**Cause**: .env.local not updated or app not restarted
**Solution**:
```bash
# Kill dev server
Ctrl+C

# Verify .env.local has new credentials
cat .env.local | grep SUPABASE_URL

# Restart dev server
npm run dev
```

---

## Post-Initialization Steps

### 1. Create Test Data (Optional)
```bash
# In browser console on http://localhost:3000:
# This will be handled by signup/create flows
```

### 2. Deploy to Production
After verifying locally works:

**Update Render Backend**
1. Go to: https://dashboard.render.com/
2. Find "bravo-revos-backend" service
3. Settings → Environment Variables
4. Update:
   - `NEXT_PUBLIC_SUPABASE_URL=https://trdoainmejxanrownbuz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=[from .env.local]`
   - `SUPABASE_SERVICE_ROLE_KEY=[from .env.local]`
5. Save and redeploy

**Update Netlify Frontend**
1. Go to: https://app.netlify.com/
2. Find "bravo-revos" site
3. Site settings → Build & deploy → Environment
4. Update same three variables
5. Trigger redeploy

### 3. Test Production
- Navigate to production URL
- Login and verify end-to-end flow works
- Check no console errors

### 4. Delete Old Shared Project
Once production verified as working:

1. Go to: https://supabase.com/dashboard/organizations
2. Find project: `cdoikmuoiccqllqdpoew`
3. Click Settings → Danger Zone → Delete Project
4. Confirm deletion

**⚠️ WARNING**: This cannot be undone. Old project contained both Archon and RevOS data.

---

## Summary

| Item | Status |
|------|--------|
| New Bravo RevOS project created | ✅ |
| Migrations prepared (9 files, 2022 lines) | ✅ |
| Combined migration file ready | ✅ |
| Local environment updated (.env.local) | ✅ |
| Migration file copied to clipboard | ✅ |
| Ready for SQL Editor execution | ✅ |

---

## Important Credentials

### New Bravo RevOS Project
```
Project ID: trdoainmejxanrownbuz
URL: https://trdoainmejxanrownbuz.supabase.co
SQL Editor: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

Anon Key:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTQ5MTUsImV4cCI6MjA3ODA3MDkxNX0.42jDkJvFkrSkHWitgnTTc_58Hq1H378LPdB0u8-aGfI

Service Role Key:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NDkxNSwiZXhwIjoyMDc4MDcwOTE1fQ.-_DnyCrCh_UDEuNwGddPL_LFKDYTocICU4L6Tx-G3Do
```

### Local Environment (.env.local - Already Updated)
```
NEXT_PUBLIC_SUPABASE_URL=https://trdoainmejxanrownbuz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[as above]
SUPABASE_SERVICE_ROLE_KEY=[as above]
```

---

## Next Action

**👉 Execute Migration Now**:
1. Migration file is already in your clipboard ✅
2. Open Supabase SQL Editor: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
3. Paste (Cmd+V) and click Execute
4. Wait 10-20 seconds
5. Verify tables created
6. Test locally with `npm run dev`

---

*Generated: 2025-11-07*
*Project: Bravo revOS*
*Status: Ready for Migration Execution*
