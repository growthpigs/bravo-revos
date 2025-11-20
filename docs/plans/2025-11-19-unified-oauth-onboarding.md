# Unified OAuth Onboarding - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement one-step user onboarding where users connect their LinkedIn account via Unipile immediately during signup (Option A flow).

**Architecture:** When users accept an invitation, instead of creating an account immediately, they're redirected to Unipile OAuth. After successful LinkedIn authentication, the Unipile webhook creates the account with LinkedIn credentials already captured. This ensures every account has valid LinkedIn data from day one.

**Tech Stack:** Next.js, Supabase, Unipile OAuth, PostgreSQL, RPC functions

**Invocation:** REQUIRED - Use superpowers:executing-plans for task-by-task execution.

---

## Phase 1: Database Schema Updates

### Task 1.1: Add Unipile Account ID to Users Table

**Files:**
- Create: `supabase/migrations/20251119_add_unipile_to_users.sql`

**Step 1: Create migration file**

```sql
-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- Add Unipile account tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS unipile_account_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS unipile_provider TEXT DEFAULT 'linkedin';

-- Create index for fast lookup by Unipile account
CREATE INDEX IF NOT EXISTS idx_users_unipile_account_id ON users(unipile_account_id);

-- Add constraint: active users must have Unipile account
ALTER TABLE users
ADD CONSTRAINT check_active_has_unipile
CHECK (is_active IS FALSE OR unipile_account_id IS NOT NULL);
```

**Step 2: Apply migration**

Run in Supabase SQL Editor: Copy and paste the migration SQL above, execute it.

Expected: Success message "ALTER TABLE completed"

**Step 3: Verify schema**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

Expected: See `unipile_account_id` and `unipile_provider` columns

---

### Task 1.2: Create Onboarding Session Table

**Purpose:** Track OAuth flow state to prevent CSRF and link tokens to Unipile accounts

**Files:**
- Create: `supabase/migrations/20251119_create_onboarding_sessions.sql`

**Step 1: Create migration**

```sql
-- Track OAuth state during onboarding
CREATE TABLE onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_token TEXT NOT NULL UNIQUE,  -- Links to invitation
  oauth_state TEXT NOT NULL UNIQUE,       -- CSRF prevention
  unipile_account_id TEXT,                -- Will be filled by webhook
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'oauth_initiated', 'success', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '1 hour',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_onboarding_sessions_token ON onboarding_sessions(invitation_token);
CREATE INDEX idx_onboarding_sessions_state ON onboarding_sessions(oauth_state);
```

**Step 2: Apply migration in Supabase**

Expected: Table created successfully

**Step 3: Grant RLS permissions**

```sql
-- Allow service role to access during OAuth flow
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to manage sessions" ON onboarding_sessions
  FOR ALL USING (true) WITH CHECK (true);
```

---

## Phase 2: API Endpoints

### Task 2.1: Create Request Unipile Link Endpoint

**Purpose:** When user clicks "Connect LinkedIn", this endpoint creates OAuth session and returns Unipile auth URL

**Files:**
- Create: `app/api/onboarding/request-unipile-link/route.ts`

**Step 1: Write the endpoint**

```typescript
/**
 * POST /api/onboarding/request-unipile-link
 * Request Unipile OAuth link during user onboarding
 *
 * Body: { token: invitation_token }
 * Response: { authUrl: "https://account.unipile.com/..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      console.log('[ONBOARDING_LINK] ❌ No token provided');
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Use service role to access invitations and create sessions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify invitation exists using RPC (handles UUID casting)
    const { data: invitations, error: invError } = await supabase.rpc(
      'get_invitation_by_token',
      { p_token: token }
    );

    const invitation = Array.isArray(invitations) && invitations.length > 0
      ? invitations[0]
      : null;

    if (invError || !invitation) {
      console.log('[ONBOARDING_LINK] ❌ Invalid invitation token');
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'pending') {
      console.log('[ONBOARDING_LINK] ❌ Invitation already processed');
      return NextResponse.json(
        { error: 'Invitation already used' },
        { status: 409 }
      );
    }

    // Generate CSRF prevention state
    const oauthState = randomBytes(32).toString('hex');

    // Create onboarding session
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .insert({
        invitation_token: token,
        oauth_state: oauthState,
        status: 'pending',
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('[ONBOARDING_LINK] ❌ Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow' },
        { status: 500 }
      );
    }

    // Request hosted auth link from Unipile
    const unipileResponse = await fetch(
      `${process.env.UNIPILE_DSN}/api/v1/hosted/accounts/link`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UNIPILE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'linkedin',
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/oauth-success?state=${oauthState}`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/unipile/notify-onboarding`,
          name: `onboarding:${token}`, // Identifier for webhook
        }),
      }
    );

    if (!unipileResponse.ok) {
      const error = await unipileResponse.text();
      console.error('[ONBOARDING_LINK] ❌ Unipile error:', error);
      return NextResponse.json(
        { error: 'Failed to create auth link' },
        { status: 500 }
      );
    }

    const { url: authUrl } = await unipileResponse.json();

    console.log('[ONBOARDING_LINK] ✅ OAuth link created:', {
      invitationEmail: invitation.email,
      sessionId: session.id,
      authUrlHost: new URL(authUrl).host,
    });

    return NextResponse.json({
      success: true,
      authUrl,
      state: oauthState, // For frontend CSRF verification
    });
  } catch (error) {
    console.error('[ONBOARDING_LINK] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test the endpoint**

Test URL: `POST http://localhost:3000/api/onboarding/request-unipile-link`

Test body:
```json
{
  "token": "da865552-3f6f-4f82-ad19-99d26eb64066"
}
```

Expected response:
```json
{
  "success": true,
  "authUrl": "https://account.unipile.com/...",
  "state": "hex_string_here"
}
```

Expected failure if token invalid:
```json
{
  "error": "Invalid invitation"
}
```

---

### Task 2.2: Create Onboarding Webhook Endpoint

**Purpose:** Unipile calls this after OAuth success, creates account with LinkedIn data

**Files:**
- Create: `app/api/unipile/notify-onboarding/route.ts`

**Step 1: Write the endpoint**

```typescript
/**
 * POST /api/unipile/notify-onboarding
 * Unipile webhook callback for onboarding OAuth completion
 *
 * Creates user account after successful LinkedIn authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function generateSecurePassword(): string {
  return Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, account_id, name } = body;

    console.log('[ONBOARDING_WEBHOOK] Received:', {
      status,
      accountId: account_id,
      identifier: name,
    });

    if (status !== 'CREATION_SUCCESS') {
      console.log('[ONBOARDING_WEBHOOK] ❌ OAuth failed:', { status });
      return NextResponse.json({ error: 'OAuth failed' }, { status: 400 });
    }

    // Parse identifier: "onboarding:invitation_token"
    if (!name || !name.startsWith('onboarding:')) {
      console.log('[ONBOARDING_WEBHOOK] ❌ Invalid identifier:', { name });
      return NextResponse.json({ error: 'Invalid identifier' }, { status: 400 });
    }

    const invitationToken = name.substring('onboarding:'.length);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get invitation and session details
    const { data: invitations, error: invError } = await supabase.rpc(
      'get_invitation_by_token',
      { p_token: invitationToken }
    );

    const invitation = Array.isArray(invitations) && invitations.length > 0
      ? invitations[0]
      : null;

    if (invError || !invitation) {
      console.log('[ONBOARDING_WEBHOOK] ❌ Invitation not found');
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Get Unipile account details
    const unipileAccountResponse = await fetch(
      `${process.env.UNIPILE_DSN}/api/v1/accounts/${account_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.UNIPILE_API_KEY}`,
        },
      }
    );

    let unipileAccount = { name: invitation.email };
    if (unipileAccountResponse.ok) {
      unipileAccount = await unipileAccountResponse.json();
    }

    // Create Supabase auth user
    const tempPassword = generateSecurePassword();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error('[ONBOARDING_WEBHOOK] ❌ Auth creation failed:', authError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create app user with Unipile account
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        unipile_account_id: account_id,
        unipile_provider: 'linkedin',
        is_active: true,
      })
      .select()
      .single();

    if (userError) {
      console.error('[ONBOARDING_WEBHOOK] ❌ User creation failed:', userError);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Add to pod if specified
    if (invitation.pod_id) {
      const { error: podError } = await supabase
        .from('pod_members')
        .insert({
          user_id: userId,
          pod_id: invitation.pod_id,
          is_active: true,
        });

      if (podError) {
        console.error('[ONBOARDING_WEBHOOK] ⚠️ Pod membership failed:', podError);
      }
    }

    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    // Update session status
    await supabase
      .from('onboarding_sessions')
      .update({
        status: 'success',
        unipile_account_id: account_id,
      })
      .eq('invitation_token', invitationToken);

    console.log('[ONBOARDING_WEBHOOK] ✅ Account created:', {
      userId,
      email: invitation.email,
      unipileAccountId: account_id,
      addedToPod: !!invitation.pod_id,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[ONBOARDING_WEBHOOK] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test webhook delivery**

Expected: Unipile posts this endpoint after OAuth success. Verify in logs:
```
[ONBOARDING_WEBHOOK] ✅ Account created
```

---

## Phase 3: Frontend Component Updates

### Task 3.1: Update Onboarding Component

**Files:**
- Modify: `components/onboard-content.tsx`

**Step 1: Replace component logic**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  podId: string | null;
  status: string;
}

export default function OnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const state = searchParams.get('state');

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Phase 1: Verify invitation on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetch(`/api/invitations/verify?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Verification error:', err);
        setError('Failed to verify invitation');
        setLoading(false);
      });
  }, [token]);

  // Phase 2: Handle OAuth success redirect
  useEffect(() => {
    // If we're coming back from Unipile OAuth with state
    if (state && !loading && !error) {
      console.log('[ONBOARD_CONTENT] OAuth success redirect detected');
      // Account should be created by webhook, redirect to dashboard
      // Wait a moment for webhook to process
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, loading, error, router]);

  const handleConnectLinkedin = async () => {
    if (!token) return;

    setConnecting(true);
    try {
      // Request Unipile OAuth link
      const response = await fetch('/api/onboarding/request-unipile-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start OAuth');
      }

      const { authUrl } = await response.json();

      // Redirect to Unipile OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error('OAuth error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect LinkedIn');
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">Loading invitation...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto border-red-300">
        <CardHeader>
          <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => router.push('/auth/login')} className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome to Bravo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-gray-600">Hi {invitation?.firstName} {invitation?.lastName}</p>
          <p className="text-sm text-gray-600">You've been invited to join</p>
          <p className="font-semibold">{invitation?.email}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Connect your LinkedIn account to get started</p>
          <Button
            onClick={handleConnectLinkedin}
            disabled={connecting}
            className="w-full gap-2"
            size="lg"
          >
            <Linkedin className="h-5 w-5" />
            {connecting ? 'Connecting...' : 'Connect LinkedIn Account'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          We use your LinkedIn account to power your sales engagement features
        </p>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Test in browser**

1. Navigate to: `https://localhost:3000/onboard?token=da865552-3f6f-4f82-ad19-99d26eb64066`
2. Should show: "Welcome to Bravo" with invitation details
3. Click: "Connect LinkedIn Account"
4. Expected: Redirects to Unipile OAuth page
5. After auth: Returns to onboarding and redirects to dashboard

---

### Task 3.2: Create OAuth Success Page

**Purpose:** Landing page after Unipile OAuth (brief confirmation before redirect)

**Files:**
- Create: `app/onboarding/oauth-success/page.tsx`

**Step 1: Create the page**

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = searchParams.get('state');

  useEffect(() => {
    // Brief pause for webhook processing, then redirect to dashboard
    console.log('[OAUTH_SUCCESS] Account creation initiated, redirecting...');
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router, state]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h2 className="text-xl font-semibold">LinkedIn Connected!</h2>
          <p className="text-gray-600">Setting up your account...</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Phase 4: Fix Remaining Bugs

### Task 4.1: Fix Accept Endpoint (Remove Auto Account Creation)

**Purpose:** Accept endpoint now handles tokens that could be invalid (UUID bug), and doesn't create accounts anymore

**Files:**
- Modify: `app/api/invitations/accept/route.ts:36`

**Step 1: Fix UUID bug**

Replace line 36:
```typescript
// OLD (broken):
.eq('invitation_token', token)

// NEW (fixed):
```

Actually, the accept endpoint should NOT be called anymore in the new flow. The webhook creates the account. But we should keep it for backward compatibility with pod members.

Update the accept endpoint to use RPC like verify does:

```typescript
// OLD code (lines 32-46):
const { data: invitation, error: invError } = await supabase
  .from('user_invitations')
  .select('*')
  .eq('invitation_token', token)
  .eq('status', 'pending')
  .single();

// NEW code:
const { data: invitations, error: invError } = await supabase.rpc(
  'get_invitation_by_token',
  { p_token: token }
);

const invitation = Array.isArray(invitations) && invitations.length > 0 && invitations[0].status === 'pending'
  ? invitations[0]
  : null;
```

---

## Phase 5: Testing & Deployment

### Task 5.1: End-to-End Flow Test

**Manual Test Steps:**

1. **Generate new test invitation:**
   ```sql
   INSERT INTO user_invitations (email, first_name, last_name, invitation_token)
   VALUES ('test@example.com', 'Test', 'User', gen_random_uuid())
   RETURNING invitation_token;
   ```

2. **Copy the token and navigate to:**
   ```
   https://localhost:3000/onboard?token=[paste_token]
   ```

3. **Expected flow:**
   - Page loads with invitation details ✅
   - Shows "Connect LinkedIn Account" button ✅
   - Click button → Redirects to Unipile ✅
   - After LinkedIn auth → Returns to success page ✅
   - Redirects to dashboard ✅

4. **Verify in database:**
   ```sql
   SELECT id, email, unipile_account_id, is_active
   FROM users WHERE email = 'test@example.com';
   ```
   Expected: User record exists with unipile_account_id populated

5. **Verify invitation marked accepted:**
   ```sql
   SELECT status FROM user_invitations WHERE email = 'test@example.com';
   ```
   Expected: `accepted`

---

### Task 5.2: Deployment Checklist

**Before pushing to production:**

- [ ] All migrations applied to Supabase
- [ ] Environment variables set (UNIPILE_DSN, UNIPILE_API_KEY)
- [ ] Verify endpoint working with RPC
- [ ] Accept endpoint fixed for UUID bug
- [ ] New endpoints created and tested
- [ ] Onboarding component updated
- [ ] OAuth success page created
- [ ] End-to-end flow tested locally
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors

**Deployment steps:**

```bash
# Commit all changes
git add -A
git commit -m "feat: implement unified OAuth onboarding (Option A)

- Add unipile_account_id to users table
- Create onboarding_sessions table for CSRF prevention
- New endpoint: /api/onboarding/request-unipile-link
- New webhook: /api/unipile/notify-onboarding for account creation
- Updated onboarding component to show LinkedIn connection flow
- Fixed UUID type bug in accept endpoint
- After OAuth success, account created with LinkedIn data ready

Testing:
- End-to-end flow tested locally
- Database migrations applied
- All API endpoints returning expected responses"

# Push to production
git push origin production

# Monitor Vercel deployment
```

---

## Rollback Plan

If deployment fails:

1. The old invite system still works (pod members use separate flow)
2. If webhook fails: Accounts won't be created, but invitations stay pending
3. To rollback: Remove onboarding component changes, revert to old accept endpoint call
4. To debug: Check `/api/unipile/notify-onboarding` logs in Vercel

---

## Success Criteria

✅ User accepts invitation
✅ User redirected to Unipile OAuth
✅ User authenticates with LinkedIn
✅ Webhook creates account with Unipile ID
✅ User redirected to dashboard
✅ User account has unipile_account_id populated
✅ No 404 errors on verify endpoint
✅ No TypeScript errors in build

