# F-01 Testing - Setup Instructions

## ⚠️ Important: How to Run the SQL

**DO NOT copy from the markdown code blocks in the testing guide!**

The markdown formatting (the ` ```sql ` markers) will cause SQL errors.

---

## Option 1: Use the Clean SQL File (RECOMMENDED)

1. Open: `docs/projects/bravo-revos/F01_DATABASE_SETUP.sql`
2. Copy the entire contents (just the SQL, no markdown)
3. Paste into your database client (Supabase, psql, DBeaver, etc.)
4. Run the queries

**This file has NO markdown formatting - safe to copy/paste**

---

## Option 2: Manual SQL Entry

If you prefer to type it yourself, here's what to run:

### 1. Create Test Campaign

```
INSERT INTO campaigns (id, name, trigger_word, lead_magnet_id, client_id, status)
VALUES ('campaign-test-001', 'Test AI Campaign', 'SCALE', 'lead-magnet-test-001', 'client-test-001', 'active');
```

### 2. Create Test Pod

```
INSERT INTO pods (id, name, voice_cartridge_id)
VALUES ('pod-test-001', 'Test Pod', NULL);
```

### 3. Create Pod Members (3 total)

```
INSERT INTO pod_members (id, pod_id, profile_id)
VALUES ('member-1', 'pod-test-001', 'profile-123');

INSERT INTO pod_members (id, pod_id, profile_id)
VALUES ('member-2', 'pod-test-001', 'profile-456');

INSERT INTO pod_members (id, pod_id, profile_id)
VALUES ('member-3', 'pod-test-001', 'profile-789');
```

### 4. Create Test Post

```
INSERT INTO posts (id, campaign_id, linkedin_post_id, linkedin_post_url, published_at)
VALUES ('post-test-001', 'campaign-test-001', 'urn:li:activity:7234567890123456789', 'https://www.linkedin.com/feed/update/urn:li:activity:7234567890123456789/', NOW());
```

### 5. Verify Setup (Run This to Confirm)

```
SELECT 'Campaigns' as table_name, COUNT(*) as count FROM campaigns WHERE id = 'campaign-test-001'
UNION ALL
SELECT 'Pods', COUNT(*) FROM pods WHERE id = 'pod-test-001'
UNION ALL
SELECT 'Pod Members', COUNT(*) FROM pod_members WHERE pod_id = 'pod-test-001'
UNION ALL
SELECT 'Posts', COUNT(*) FROM posts WHERE id = 'post-test-001';
```

**Expected result**:
```
table_name      | count
================|=======
Campaigns       | 1
Pods            | 1
Pod Members     | 3
Posts           | 1
```

---

## Common SQL Errors & Fixes

### Error: "syntax error at or near ```"
**Cause**: You copied markdown code block markers
**Fix**: Use `F01_DATABASE_SETUP.sql` file instead (no markdown)

### Error: "duplicate key value violates unique constraint"
**Cause**: Test data already exists
**Fix**: This is OK! You can proceed with testing. Skip the INSERT statements that fail.

### Error: "relation does not exist"
**Cause**: Table doesn't exist in database
**Fix**: Contact backend team - database schema might not be migrated

### Error: "permission denied"
**Cause**: Your database user doesn't have write permissions
**Fix**: Use a user with INSERT permissions (admin or service role)

---

## Where to Run the SQL

### Option A: Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Paste the SQL
5. Click "Run"

### Option B: Command Line (psql)
```bash
psql -h your-host -U your-user -d your-database -f docs/projects/bravo-revos/F01_DATABASE_SETUP.sql
```

### Option C: Database Tool (DBeaver, DataGrip, etc.)
1. Connect to your database
2. Open new SQL editor
3. Paste the SQL
4. Execute

---

## After Setup

Once SQL runs without errors:

1. ✅ Verify the "Verify Setup" query returns the expected counts
2. ✅ You're ready for F-01 testing
3. ✅ Start with COMET_F01_TESTING_PROMPT.md

---

## Need Help?

If SQL fails:
1. Check the error message carefully
2. Try the "Verify Setup" query to see what was created
3. Ask what the exact error is and we'll debug
4. Don't proceed with testing until setup succeeds

---

**File Reference**: F01_DATABASE_SETUP.sql (clean SQL, no markdown)
**Next**: COMET_F01_TESTING_PROMPT.md (testing guide)
