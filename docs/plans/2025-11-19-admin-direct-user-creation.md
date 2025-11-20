# Admin Direct User Creation with Magic Link

**Date:** 2025-11-19
**Status:** Approved for Implementation
**Type:** New Feature

## Problem Statement

The current invitation system is too complex for our use case. We have:
- Complex invitation token system with OAuth during signup
- Multiple onboarding flows (general users vs pod members)
- Incomplete implementation (email delivery not working)
- Breaking builds (oauth-success page causing deployment failures)

**What we actually need:**
- Admin creates account manually (during calls with clients)
- User receives magic link
- User clicks → logs in → Unipile popup (blocking) → set password → dashboard
- Simple, streamlined, focused on our workflow

## Solution Design

### Overall Flow

**Admin Side:**
```
1. Admin opens /admin/users
2. Clicks "Create User" button
3. Fills in: Name, Email
4. Clicks "Create" → Spinner shows
5. Success modal appears:
   - "Account created!"
   - Magic link displayed (with copy button)
   - "Email sent to user@example.com"
6. Admin can copy/paste link OR user clicks email
```

**User Side:**
```
1. User receives email with magic link
2. Clicks link → /onboard-new?token=[otp]
3. Auto-logs in via Supabase OTP verification
4. Unipile LinkedIn Connection Modal appears (blocking, fullscreen):
   - Can't close or dismiss
   - Must click "Connect LinkedIn"
   - Redirects to Unipile OAuth
5. After LinkedIn auth, returns to /onboard-new
6. Password Creation Modal appears (blocking):
   - Can't close or dismiss
   - Must set password
   - Saves to Supabase auth
7. Redirects to /dashboard
8. Fully authenticated, ready to use app
```

### Technical Architecture

#### API Endpoint: POST /api/admin/create-user-direct

**Purpose:** Create new user account and generate magic link

**Authentication:**
- Requires authenticated super_admin user
- Uses `isUserAdmin()` check

**Process:**
1. Validate request: `{ email, firstName, lastName }`
2. Check if email already exists → return error
3. Create Supabase auth user:
   ```typescript
   auth.admin.createUser({
     email,
     email_confirm: true,  // Skip email verification
     user_metadata: { first_name, last_name }
   })
   ```
4. Generate OTP magic link:
   ```typescript
   auth.admin.generateLink({
     type: 'magiclink',
     email,
     options: {
       redirectTo: `${NEXT_PUBLIC_APP_URL}/onboard-new`
     }
   })
   ```
5. Send email via Resend (hybrid approach):
   - System auto-sends email
   - Admin also gets link in UI to copy/paste
6. Return:
   ```json
   {
     "success": true,
     "user_id": "uuid",
     "magic_link": "https://..."
   }
   ```

**Error Handling:**
- Email exists → `{ error: "User already exists", existing_user_id: "..." }`
- Auth creation fails → `{ error: "Failed to create account" }`
- Link generation fails → `{ error: "Failed to generate magic link" }`

#### Frontend Page: /app/onboard-new/page.tsx

**Purpose:** Handle magic link verification and onboarding flow

**State Machine:**
```typescript
type OnboardState =
  | 'verifying'              // Verifying OTP token
  | 'invalid'                // Invalid/expired token
  | 'connecting_linkedin'    // Show Unipile modal
  | 'setting_password'       // Show password modal
  | 'complete'               // Redirect to dashboard
```

**Flow:**
```typescript
1. On mount:
   - Extract token_hash from URL params
   - Call supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
   - If success → state = 'connecting_linkedin'
   - If error → state = 'invalid'

2. In 'connecting_linkedin' state:
   - Show <UnipileConnectionModal blocking={true} />
   - User clicks "Connect LinkedIn"
   - Redirect to /api/linkedin/auth?onboarding=true
   - After OAuth success, redirect back with unipile_account_id
   - Store unipile_account_id in users table
   - state = 'setting_password'

3. In 'setting_password' state:
   - Show <SetPasswordModal blocking={true} />
   - User enters password
   - Call supabase.auth.updateUser({ password })
   - state = 'complete' → redirect to /dashboard
```

#### Component: UnipileConnectionModal

**Purpose:** Blocking modal for LinkedIn connection

**Props:**
```typescript
interface Props {
  onSuccess: (unipileAccountId: string) => void;
  blocking: boolean;  // If true, can't close modal
}
```

**UI:**
- Fullscreen overlay (z-index: 9999)
- Can't click outside to close (if blocking)
- No X button (if blocking)
- Clear messaging: "Connect your LinkedIn to get started"
- Single CTA button: "Connect LinkedIn" → redirect to Unipile OAuth

#### Component: SetPasswordModal

**Purpose:** Blocking modal for password creation

**Props:**
```typescript
interface Props {
  onSuccess: (password: string) => void;
  blocking: boolean;
}
```

**UI:**
- Fullscreen overlay
- Password input with strength indicator
- Confirm password field
- Validation: min 8 chars, 1 number, 1 special char
- Single CTA: "Set Password"

#### LinkedIn Auth Handler Updates

**File:** `/app/api/linkedin/auth/route.ts`

**Changes:**
- Detect `?onboarding=true` query param
- After successful Unipile OAuth:
  - If onboarding flow → redirect to `/onboard-new?unipile_account_id=[id]`
  - If normal flow → redirect to `/dashboard`

#### Database Changes

**Migration:** `20251119_add_linkedin_tracking.sql`

```sql
-- Add column to track LinkedIn connection status
ALTER TABLE users
ADD COLUMN linkedin_connected BOOLEAN DEFAULT false;

-- Update column when unipile_account_id is set
CREATE OR REPLACE FUNCTION update_linkedin_connected()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unipile_account_id IS NOT NULL AND NEW.unipile_account_id != '' THEN
    NEW.linkedin_connected = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_linkedin_connected
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_linkedin_connected();
```

**Purpose:** Track if user has completed LinkedIn connection, useful for:
- Showing connection prompt on subsequent logins if not connected
- Dashboard warnings if LinkedIn not connected
- Admin UI showing connection status

### Error Handling

#### Error Scenarios

**1. User already exists with email:**
```json
Response: { "error": "User already exists", "user_id": "..." }
UI Action: Show "Resend Magic Link" button instead
```

**2. Magic link expires (24 hours):**
```
UI: "This link has expired. Contact your administrator for a new link."
Admin Action: Can regenerate from users list
```

**3. User closes Unipile modal:**
```
Modal: Blocking (can't close)
Fallback: If user somehow closes → stays on page, modal re-appears
```

**4. Unipile connection fails:**
```
UI: Show error: "Failed to connect LinkedIn. Please try again."
Actions:
  - "Try Again" button (retry OAuth)
  - "Contact Support" link if repeated failures
```

**5. Password doesn't meet requirements:**
```
UI: Inline validation with red text:
  - "Must be at least 8 characters"
  - "Must include 1 number"
  - "Must include 1 special character"
Button: Disabled until requirements met
```

**6. Network failure during password set:**
```
UI: Show error: "Failed to save password. Please try again."
Action: Retry button, password stays filled in
```

### Security Considerations

1. **OTP Token Security:**
   - One-time use (Supabase handles)
   - 24-hour expiration
   - HTTPS required in production
   - Token hash in URL, not plain token

2. **Admin Permission Checks:**
   - Every endpoint verifies `isUserAdmin()`
   - Uses service role key for user creation
   - Logs all admin actions

3. **Password Requirements:**
   - Minimum 8 characters
   - At least 1 number
   - At least 1 special character
   - Stored as hash by Supabase (never plain text)

4. **LinkedIn OAuth:**
   - Uses Unipile's secure OAuth flow
   - State parameter for CSRF prevention
   - Access tokens stored encrypted in Unipile
   - App only receives account ID, not tokens

### User Experience Goals

**Admin Experience:**
- ✅ Simple 3-field form (name, email)
- ✅ Instant magic link generation
- ✅ Copy button for easy sharing
- ✅ Email sent automatically as backup
- ✅ Clear success confirmation

**User Experience:**
- ✅ Single click to log in (magic link)
- ✅ Clear, blocking modals (can't proceed without completing)
- ✅ LinkedIn connection required upfront (not later)
- ✅ Password set once, never forgotten
- ✅ No confusing intermediate states

### Testing Checklist

**Happy Path:**
- [ ] Admin creates user successfully
- [ ] Email delivered with magic link
- [ ] Admin can copy magic link from UI
- [ ] User clicks link → auto-logs in
- [ ] Unipile modal appears, blocks navigation
- [ ] LinkedIn connection succeeds
- [ ] Password modal appears, blocks navigation
- [ ] Password set successfully
- [ ] Redirects to dashboard
- [ ] User can log in again with email+password

**Error Cases:**
- [ ] Email already exists → shows appropriate error
- [ ] Magic link expired → shows expired message
- [ ] Invalid token → shows invalid message
- [ ] Unipile connection fails → retry button works
- [ ] Weak password → validation prevents submit
- [ ] Network failure → retry works

**Edge Cases:**
- [ ] User refreshes page during onboarding → state preserved
- [ ] User tries to access dashboard before completing → blocked
- [ ] Multiple admins create same user simultaneously → handles gracefully
- [ ] Email service down → admin still gets link to copy

### Cleanup Tasks

**Deprecated Code to Remove (Optional, after new flow proven):**
- `/app/api/invitations/verify/route.ts`
- `/app/api/invitations/accept/route.ts`
- `/app/api/onboarding/request-unipile-link/route.ts`
- `/app/api/unipile/notify-onboarding/route.ts`
- `/app/onboarding/oauth-success/page.tsx` (currently breaking builds!)
- `/components/onboard-content.tsx`
- Migrations: `20251119_invitations.sql`, `20251119_create_onboarding_sessions.sql`

**Keep for Now:**
- Pod member onboarding flow (separate use case)
- `/app/onboarding/connect-unipile/page.tsx`
- `/app/onboarding/pending-activation/page.tsx`

### Implementation Timeline

**Phase 1: Backend (2-3 hours)**
- Create `/api/admin/create-user-direct` endpoint
- Update LinkedIn auth handler for onboarding detection
- Test endpoint with curl/Postman

**Phase 2: Frontend (2-3 hours)**
- Create `/app/onboard-new/page.tsx` with state machine
- Create `UnipileConnectionModal` component
- Create `SetPasswordModal` component
- Test full flow in dev environment

**Phase 3: Integration (1-2 hours)**
- Update `/app/admin/users/page.tsx` with new create flow
- Add success modal with magic link display
- Wire up email sending via Resend
- Test admin → user flow end-to-end

**Phase 4: Deployment (1 hour)**
- Apply database migration
- Deploy to staging
- Test on staging with real email
- Deploy to production
- Remove broken oauth-success page

**Total Estimate:** 6-9 hours

### Success Metrics

- [ ] Admin can create user in < 30 seconds
- [ ] User can complete onboarding in < 2 minutes
- [ ] 0% deployment failures (no more build breaks!)
- [ ] 100% of users complete LinkedIn connection during onboarding
- [ ] 100% of users set password during onboarding
- [ ] Magic link expiration edge case handled gracefully

---

**Approved:** 2025-11-19
**Next Step:** Create git worktree and begin implementation
