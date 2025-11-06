# F-01 Setup Troubleshooting

## Error: "column trigger_word does not exist"

This means your database schema is different than expected.

### Quick Fix

Use this query to see what columns actually exist:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'campaigns'
ORDER BY ordinal_position;
```

This will show you all the columns in your campaigns table. Use those column names in your INSERT statement.

---

## Step 1: Check Your Database Schema

Run these queries to understand what you have:

### Check Campaigns Table Columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'campaigns'
ORDER BY ordinal_position;
```

**Expected output** (you should see something like):
```
column_name           | data_type
======================|===========
id                    | uuid
client_id             | uuid
name                  | text
description           | text
lead_magnet_id        | uuid
trigger_word          | text
post_template         | text
dm_template_step1     | text
dm_template_step2     | text
dm_template_step3     | text
settings              | jsonb
status                | text
metrics               | jsonb
starts_at             | timestamp with time zone
ends_at               | timestamp with time zone
created_at            | timestamp with time zone
updated_at            | timestamp with time zone
```

If `trigger_word` is NOT in the list, your database hasn't been migrated.

### Check Pods Table Columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pods'
ORDER BY ordinal_position;
```

### Check Pod Members Table Columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pod_members'
ORDER BY ordinal_position;
```

### Check Posts Table Columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'posts'
ORDER BY ordinal_position;
```

---

## Step 2: Run Migrations

If the columns are missing, you need to run database migrations:

### Option A: Supabase Dashboard

1. Go to Supabase dashboard
2. Select your project
3. Go to "SQL Editor"
4. Click "New Query"
5. Open and run: `supabase/migrations/001_initial_schema.sql`

### Option B: Using Supabase CLI

```bash
cd /Users/rodericandrews/Obsidian/Master/_projects/bravo-revos
supabase migration up
```

### Option C: PostgreSQL Direct

```bash
psql -h your-host -U your-user -d your-database -f supabase/migrations/001_initial_schema.sql
```

---

## Step 3: Create Test Data

Once migrations are done, choose ONE of these approaches:

### Approach A: Simple Setup (RECOMMENDED)

This only uses required columns:

```sql
-- Create campaign (most basic)
INSERT INTO campaigns (name, client_id, status)
VALUES ('Test AI Campaign', 'client-test-001', 'active')
RETURNING id;

-- Copy the ID returned above, then create pod
INSERT INTO pods (name)
VALUES ('Test Pod')
RETURNING id;

-- Copy the pod ID, then add members
INSERT INTO pod_members (pod_id, profile_id)
VALUES ('YOUR_POD_ID', 'profile-123');

-- Create post
INSERT INTO posts (campaign_id, linkedin_post_id, published_at)
VALUES ('YOUR_CAMPAIGN_ID', 'urn:li:activity:123', NOW());
```

### Approach B: Full Setup (with trigger_word)

If migrations ran and columns exist:

```sql
INSERT INTO campaigns (name, client_id, trigger_word, status)
VALUES ('Test AI Campaign', 'client-test-001', 'SCALE', 'active')
RETURNING id;
```

### Approach C: Use Simplified Script

Run: `F01_DATABASE_SETUP_SIMPLIFIED.sql`

This handles missing columns gracefully.

---

## Step 4: Verify Setup

After creating test data, verify it worked:

```sql
SELECT * FROM campaigns WHERE name = 'Test AI Campaign';
SELECT * FROM pods WHERE name = 'Test Pod';
SELECT * FROM pod_members LIMIT 3;
SELECT * FROM posts LIMIT 1;
```

You should see rows in all four tables.

---

## Common Issues & Solutions

### Issue: "relation campaigns does not exist"
**Cause**: Table doesn't exist at all
**Solution**: Run migrations first

### Issue: "column trigger_word does not exist"
**Cause**: Migration ran but didn't include this column
**Solution**: Check schema with query above, use only columns that exist

### Issue: "duplicate key value violates unique constraint"
**Cause**: Test data already exists
**Solution**: This is OK! Skip INSERT and proceed with testing

### Issue: "permission denied"
**Cause**: Your database user doesn't have INSERT permission
**Solution**: Use admin user or user with write permissions

### Issue: "Foreign key constraint violation"
**Cause**: You're referencing client_id or lead_magnet_id that don't exist
**Solution**: Either create those records first, or don't use those columns in INSERT

---

## What If I Still Can't Create Test Data?

Try this minimal insert that should work on ANY schema:

```sql
INSERT INTO campaigns (name)
VALUES ('Test Campaign');

INSERT INTO pods (name)
VALUES ('Test Pod');

INSERT INTO posts (linkedin_post_id)
VALUES ('test-post-123');
```

Then use the IDs returned to build up from there.

---

## Database Migration Summary

**Before Testing F-01**, make sure:
1. ✅ All tables exist (campaigns, pods, pod_members, posts)
2. ✅ AgentKit tables exist (agentkit_decisions, agentkit_optimizations, agentkit_analyses)
3. ✅ Test data can be inserted without errors
4. ✅ You can query the data back

**If tables don't exist**, run:
```bash
supabase migration up
```

**If AgentKit tables missing**, run:
```bash
supabase migration up
```

(All migrations should be applied together)

---

## Next Steps

1. ✅ Run the schema check queries above
2. ✅ If migrations needed, run them
3. ✅ Create test data using approach that works for your schema
4. ✅ Verify data was created
5. ✅ Start COMET_F01_TESTING_PROMPT.md testing

---

## Contact for Help

If you can't get past the setup:
1. Share the output of the schema check query
2. Share the exact error message
3. Let us know what step failed
4. We can help debug

Don't skip this - good test data setup = good testing!

---

**Files**:
- `F01_DATABASE_SETUP_SIMPLIFIED.sql` - Simplified setup script
- `F01_SETUP_TROUBLESHOOTING.md` - This file
- `COMET_F01_TESTING_PROMPT.md` - Testing guide (use after setup works)
