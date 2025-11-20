# Onboarding Flow - Complete Testing Guide

**Date:** 2025-11-19
**Status:** Testing phase - critical path for pod management feature

## Executive Summary

The admin invitation system has a critical issue: **When admins try to invite users from the pods page, the invitation is created in the UI but never persists to the database.**

**Test Goal:** Verify the onboarding flow works correctly using the admin invitation link.

---

## Phase 1: Admin Invitation - Browser Testing (DO THIS FIRST)

### Your Admin Invitation Link
```
https://bravo-revos.vercel.app/onboard?token=da865552-3f6f-4f82-ad19-99d26eb64066
```

**Expiry:** 7 days from Nov 19, 2025

### Step 1: Click the Link
1. Open the link in a new browser tab
2. **Expected Outcome:**
   - Page loads and shows "Hi Roderic Andrews"
   - Displays your email: rodericandrews@gmail.com
   - "Create Account" button visible

### Step 2: Click "Create Account"
1. Click the "Create Account" button
2. **Expected Outcome:**
   - Account is created immediately
   - You are redirected to `/login`
   - You should be able to log in with your email

### Step 3: Verify Account Created
1. After redirect to login, check database:
   ```sql
   SELECT id, email, created_at FROM users WHERE email = 'rodericandrews@gmail.com';
   SELECT id, email, status FROM user_invitations WHERE email = 'rodericandrews@gmail.com';
   ```
2. **Expected Result:**
   - `users` table has 1 record for rodericandrews@gmail.com
   - `user_invitations` status changed from "pending" to "accepted"

### What This Tests
- ✅ Invitation token verification works (UUID matching)
- ✅ Onboarding page loads correctly
- ✅ Account creation flow works
- ✅ Database persistence works
- ✅ Session/authentication works

---

## Phase 2: Identify Silent Failure in Invite API

### The Bug
When you clicked "Invite User" from the admin pods page earlier:
1. UI showed success toast: "Invitation sent to..."
2. Database shows 0 new invitations created
3. API logs show extensive diagnostics but invitation never persisted

### Root Cause Hypothesis
The API endpoint `/api/admin/invite-user` likely encounters one of these issues:

**Hypothesis A: RLS Policy Block**
- Your session was valid on the page but invalid in the API call
- RLS policy `"Authenticated users can create invitations"` failed
- INSERT blocked silently, API returned 200 OK anyway

**Hypothesis B: Authentication Missing**
- Browser cookies not passed to API request
- `supabase.auth.getUser()` returns null in the API
- API returns 401, but frontend doesn't show error

**Hypothesis C: Database Constraint**
- INSERT succeeds but SELECT returns null
- Single() fails, invitation not returned in response

### Testing This (Next Phase)
After Phase 1 succeeds:
1. Log in as admin with your newly created account
2. Go to `/admin/pods`
3. Try to invite a test user:
   - Email: `test@example.com`
   - First Name: `Test`
   - Last Name: `User`
4. Check database immediately:
   ```sql
   SELECT * FROM user_invitations WHERE email = 'test@example.com';
   ```
5. Report results back

---

## Phase 3: Console Debugging (If Needed)

If Phase 2 shows the invitation wasn't created:

### Open Browser DevTools
1. Press `F12` or Right-click → "Inspect"
2. Go to "Network" tab
3. Filter by `invite-user`
4. Try inviting someone again
5. **Expected Request:**
   - URL: `POST /api/admin/invite-user`
   - Status: `200 OK`
   - Response body: `{ success: true, invitation: {...} }`

### Check API Logs
Run this in terminal to see server logs:
```bash
# Filter for INVITE_API logs
npm run dev 2>&1 | grep INVITE_API
```

**Expected Log Output:**
```
[INVITE_API_DIAG] Request received
[INVITE_API_DIAG] Auth check: { authenticated: true, userId: "...", userEmail: "..." }
[INVITE_API_DIAG] Request body parsed: { email: "...", podId: "..." }
[INVITE_API_DIAG] Database response: { error: null, invitationReceived: true, ... }
[INVITE_API_DIAG] URL generation: { finalUrl: "https://..." }
```

**If you see:**
```
[INVITE_API_DIAG] Auth check: { authenticated: false, userId: undefined, userEmail: undefined }
```
→ **This is the issue:** User not authenticated in API context

---

## Critical Code Files

### Verification Endpoint
`app/api/invitations/verify/route.ts:53`
- **Bug Fixed:** UUID token format normalization
- **Status:** Deployed
- **How it works:** Looks up invitation by token UUID

### Invite API
`app/api/admin/invite-user/route.ts:10-163`
- **Status:** Has diagnostic logging but failing silently
- **Issue:** Returns 200 OK even when INSERT fails
- **What to watch:** Check for auth failure or RLS policy block

### Onboarding Page
`components/onboard-content.tsx`
- **Flow:** Verify token → Show details → Create account → Redirect to login
- **Missing:** LinkedIn/Unipile connection (blocked for phase 1)

---

## Expected Results Summary

| Phase | Test | Expected | Status |
|-------|------|----------|--------|
| 1 | Click admin link | Page loads with details | NOT YET TESTED |
| 1 | Create account | Account created in users table | NOT YET TESTED |
| 1 | Check database | user_invitations status = "accepted" | NOT YET TESTED |
| 2 | Invite from admin | Invitation in database | NOT YET TESTED |
| 2 | Check logs | INVITE_API logs show success | NOT YET TESTED |

---

## Next Actions

**Immediate (You do this):**
1. Click the admin invitation link
2. Click "Create Account"
3. Report what happens

**After Phase 1 Succeeds (I do this):**
1. Log server logs and capture INVITE_API output
2. Add enhanced error handling to invite-user endpoint
3. Fix RLS policy if authentication is blocking

**After Phase 2 Succeeds (I do this):**
1. Implement LinkedIn/Unipile connection in onboarding
2. Implement email delivery for invitations
3. Test pod auto-join on invitation acceptance

---

## Debug Commands

If you need to check the database directly:

```bash
# Check invitations
supabase db shell
SELECT * FROM user_invitations WHERE email = 'rodericandrews@gmail.com';

# Check users
SELECT * FROM users WHERE email = 'rodericandrews@gmail.com';

# Check pod members
SELECT * FROM pod_members WHERE user_id = 'YOUR_USER_ID';
```

---

**Created:** 2025-11-19 12:45 PM
**Last Updated:** 2025-11-19 12:45 PM
