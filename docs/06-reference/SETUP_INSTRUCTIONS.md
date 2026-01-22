# Supabase Setup Instructions - Design A (Pods as Containers)

## ⚠️ MANUAL STEPS REQUIRED

You've chosen **Design A** and I've deleted the conflicting migrations. Now you need to:

### Step 1: Authenticate with Supabase CLI

Run this command in your terminal:
```bash
supabase login
```

This will:
- Open a browser window
- Ask you to log in to your Supabase account
- Generate an access token
- Return you to the terminal

### Step 2: Link Your Supabase Project

```bash
cd /Users/rodericandrews/Obsidian/Master/_projects/bravo-revos
supabase link --project-ref trdoainmejxanrownbuz
```

You'll be asked to confirm linking the project. Answer `y` (yes).

### Step 3: Push Migrations to Your Database

```bash
supabase db push
```

This will:
- Upload all migrations from `supabase/migrations/` to your Supabase database
- Create the `pods` table (from 001_initial_schema.sql)
- Create the `pod_members` table with `pod_id` FK
- Create all indexes and RLS policies
- Show you the status of each migration

### Step 4: Verify Tables Were Created

You can verify in two ways:

**Option A: Via Supabase Dashboard**
1. Go to: [https://supabase.com/dashboard/project/trdoainmejxanrownbuz](https://supabase.com/dashboard/project/trdoainmejxanrownbuz)
2. Click "SQL Editor"
3. Run: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
4. You should see:
   - `pods` ✅
   - `pod_members` ✅
   - `pod_activities` ✅
   - `pod_members_dlq` ✅

**Option B: Via Supabase CLI**
```bash
supabase db list
```

### Step 5: Test Pod Creation

Once migrations are applied, test the API:

```bash
# Using curl
curl -X POST https://bravo-revos.vercel.app/api/admin/pods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"Test Pod Design A","max_members":50}'
```

Or in your browser:
1. Open: https://bravo-revos.vercel.app/admin/pods
2. Click "Create Pod" button
3. Fill in: Pod Name = "Test Pod Design A", Max Members = 50
4. Click "Create Pod"
5. Check browser console (F12) for logs with `[POD_CREATE]` prefix

### Expected Result

✅ Pod is created successfully
✅ Modal closes
✅ Toast notification shows: "Pod created successfully"
✅ Pod appears in the table

### If You Get an Error

If you still see "Could not find table 'public.pods'":

1. Run: `supabase migration list`
   - Check that migrations have status "applied"

2. Run: `supabase db pull`
   - This pulls the current schema from Supabase

3. Check the Supabase dashboard directly
   - Verify pods table exists
   - Verify it has the correct columns

### Files Changed

Here's what was deleted (Design B conflicts):
- ❌ `supabase/migrations/20251116_create_pod_tables.sql` - DELETED
- ❌ `supabase/migrations/20251116_recreate_pod_tables.sql` - DELETED
- ❌ `supabase/migrations/20251119_simplify_user_model.sql` - DELETED

Here's what's kept (Design A):
- ✅ `supabase/migrations/001_initial_schema.sql` - The pods table definition

### Current State

- ✅ Conflicting migrations removed
- ⏳ Supabase CLI not yet linked (YOU NEED TO RUN `supabase login`)
- ⏳ Migrations not yet pushed (YOU NEED TO RUN `supabase db push`)
- ⏳ Tables not yet created in database

### Questions?

The error messages from `supabase` command will be specific. Run the commands above, and if you hit any errors, copy the full error message and share it.

---

**Next Steps:**
1. Run: `supabase login`
2. Run: `supabase link --project-ref trdoainmejxanrownbuz`
3. Run: `supabase db push`
4. Test the API!
