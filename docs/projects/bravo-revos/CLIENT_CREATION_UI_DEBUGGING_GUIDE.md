# Client Creation UI Debugging Guide for CC1

## 🎯 Summary

**Problem**: Clients are created in the database successfully ✅, but they don't appear in the UI ❌

**Root Cause**: The RLS (Row Level Security) SELECT policy on the `clients` table is filtering out newly created clients because it's designed for the OLD architecture (client-based) instead of the NEW architecture (agency-based).

---

## 🔍 The Core Issue

### Old RLS Policy (Current - Blocking New Clients)
```sql
CREATE POLICY "Users can view their client"
  ON clients FOR SELECT
  USING (
    id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );
```

This says: **"You can only view a client if its ID matches YOUR client_id in the users table"**

### What Happens When You Create a New Client

1. ✅ Client created in DB with `agency_id`
2. ✅ Client gets an `id` (e.g., `client_123`)
3. ❌ Your `users.client_id` is still pointing to your OLD client (or NULL)
4. ❌ RLS blocks the view because `client_123` ≠ `your_client_id`
5. ❌ Page queries return empty array
6. ❌ Client doesn't appear in UI

---

## 🛠️ SOLUTION: 3 Options (Pick One)

### **Option A: Temporary Diagnostic (30 seconds) ⚡**

Test if RLS is actually the blocker:

**File**: `/app/admin/clients/page.tsx`

**Line 11 - Change this**:
```typescript
const supabase = await createClient()  // ← RLS-protected
```

**To this**:
```typescript
const supabase = await createClient({ isServiceRole: true })  // ← Bypasses RLS
```

**What to do**:
1. Make the change
2. Go to `/admin/clients` in browser
3. Create a new client
4. **If it appears → RLS is definitely the blocker**
5. **If it still doesn't appear → Different issue entirely**

**Then revert this change** before committing (don't merge with service role!)

---

### **Option B: Permanent Fix - Create New RLS Policy** ⭐ RECOMMENDED

The proper solution is to add a NEW RLS policy that allows viewing clients by agency:

**File to create**: `/supabase/migrations/020_add_agency_based_client_select_policy.sql`

```sql
-- Migration: Add agency-based SELECT policy for clients
-- Purpose: Allow users to view all clients in their agency (new architecture)

CREATE POLICY "Users can view clients in their agency"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );
```

**Steps to apply**:

1. Create the migration file with the SQL above
2. Apply to Supabase:
   - Go to: `https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new`
   - Copy/paste the SQL
   - Click "Run"
3. Test in browser:
   - Go to `/admin/clients`
   - Create a new client
   - **It should appear immediately** ✅

4. Commit the migration to git

---

### **Option C: Check Pending Migrations** 📋

Before creating a new migration, check if the fix already exists:

**These 4 migrations are untracked** (may not be applied):
- `016_add_agency_id_to_users.sql`
- `017_add_slug_to_clients.sql`
- `018_add_client_insert_rls_policy.sql`
- `019_fix_client_insert_rls_policy.sql`

**Check**:
1. Are these files in `/supabase/migrations/`?
2. Do they contain the agency-based SELECT policy?
3. Have they been applied to the Supabase database?

**If missing**: Create migration 020 (Option B)

---

## 🧪 Testing Checklist

After applying the fix, test the full flow:

### Test 1: Create Client
- [ ] Go to `/admin/clients`
- [ ] Click "Add Client" button
- [ ] Enter name (e.g., "Acme Corp")
- [ ] Click "Create"
- [ ] Check browser console for `[CLIENT_CREATION]` logs
- [ ] Verify no errors in console

### Test 2: UI Display
- [ ] New client appears in table **immediately** after creation
- [ ] If not, page needs to be refreshed manually
- [ ] Check if `router.refresh()` is being called (line 66 of modal)

### Test 3: Database Verification
- Go to Supabase: `https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp`
- Go to "SQL Editor"
- Run:
```sql
SELECT id, name, agency_id, created_at FROM clients
ORDER BY created_at DESC LIMIT 5;
```
- Verify newly created client is there with correct `agency_id`

### Test 4: RLS Test
- Run in Supabase SQL Editor:
```sql
-- As authenticated user, can you see your agency's clients?
SELECT * FROM clients
WHERE agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
LIMIT 5;
```
- Should return your client

---

## 📋 Component Flow Diagram

```
AddClientModal (component)
  ↓ (on submit)
/api/clients (POST endpoint)
  ↓ (uses service role - bypasses RLS)
clients table (INSERT)
  ↓ (success)
router.refresh()
  ↓ (reloads page)
/app/admin/clients/page.tsx
  ↓ (executes)
createClient() (RLS-protected)
  ↓ (queries)
clients table (SELECT with RLS)
  ✅ NEW RLS POLICY: Should now return newly created client
```

---

## 🔧 File Locations Reference

### Core Files
- **Client Creation Modal**: `/components/admin/add-client-modal.tsx` (line 66)
- **Client List Page**: `/app/admin/clients/page.tsx` (lines 20-24)
- **Client API**: `/app/api/clients/route.ts` (lines 85-93)

### RLS Policies
- **Old Policy** (blocking): `/supabase/migrations/009_add_rls_policies_all_tables.sql` (lines 33-41)
- **New Policy** (to create): `/supabase/migrations/020_add_agency_based_client_select_policy.sql`

### Supabase Links
- **SQL Editor**: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
- **Database**: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp

---

## 🚨 Troubleshooting

### Clients still don't appear after fix?

**Check 1: Was the migration applied?**
```sql
-- In Supabase SQL Editor, check what policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'clients';
```

**Check 2: Is your user in the correct agency?**
```sql
SELECT id, email, agency_id, client_id FROM users
WHERE id = auth.uid();
```
- Should have a valid `agency_id`

**Check 3: Does the client have the right agency_id?**
```sql
SELECT id, name, agency_id FROM clients
WHERE name = 'Your New Client Name';
```
- Should match your `users.agency_id`

**Check 4: Are you using regular client (not service role)?**
- `/app/admin/clients/page.tsx` line 11 should be:
  ```typescript
  const supabase = await createClient()  // NOT isServiceRole: true
  ```

---

## 📚 Related Tasks in Archon

- **A-00**: Project context (foundation)
- **F-01**: AgentKit (already complete)
- **Voice Cartridge**: Already fixed in `/app/api/cartridges/route.ts:130`

---

## 💬 Questions?

If clients STILL don't appear after trying these solutions:
1. Check browser console for RLS errors
2. Verify migrations are applied to Supabase
3. Check user's `agency_id` matches client's `agency_id`
4. Ask for help with specific error message from console

**Filter console logs by**: `[CLIENT_CREATION]` for creation logs
**Filter for RLS errors**: Look for "new row violates row-level security policy"
