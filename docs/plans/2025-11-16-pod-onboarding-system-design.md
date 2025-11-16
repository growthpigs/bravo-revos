# Pod Member Onboarding System - Design Document

**Date:** November 16, 2025
**Status:** Design Complete - Ready for Implementation
**Priority:** Critical - Blocks pod amplification feature

---

## 🚨 CRITICAL SCHEMA ISSUE DISCOVERED

### Current Problem

The existing `pod_members` table has:
```sql
unipile_account_id TEXT NOT NULL  -- ❌ Blocks onboarding flow
```

**Why this breaks the intended flow:**
- Can't create pod_member record until Unipile is connected
- Admin can't invite members upfront
- Forces manual admin entry of Unipile account IDs
- No self-service onboarding for pod members

---

## ✅ DESIGN OVERVIEW

### Core Principles

1. **Admin invites first** - Creates user account + pod_member record immediately
2. **Member onboards themselves** - Sets password + connects Unipile
3. **Admin activates** - Final approval after Unipile connection verified
4. **Single client per member** - Simplified schema (no multi-client support)
5. **Pod members are full users** - Access entire client app, not limited

### Onboarding States

```
invited → password_set → unipile_connected → active
```

Each state has specific requirements and next actions.

---

## 📊 CORRECTED DATABASE SCHEMA

### Migration Required

```sql
-- /supabase/migrations/20251116_fix_pod_members_onboarding.sql

-- 1. Make unipile_account_id nullable
ALTER TABLE pod_members
ALTER COLUMN unipile_account_id DROP NOT NULL;

-- 2. Add onboarding status field
ALTER TABLE pod_members
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'invited'
CHECK (onboarding_status IN ('invited', 'password_set', 'unipile_connected', 'active'));

-- 3. Add invite token system
ALTER TABLE pod_members
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ;

-- 4. Add constraint: can't be active without Unipile
ALTER TABLE pod_members
ADD CONSTRAINT check_active_has_unipile
CHECK (
  onboarding_status != 'active' OR
  unipile_account_id IS NOT NULL
);

-- 5. Add helpful comments
COMMENT ON COLUMN pod_members.onboarding_status IS
'Onboarding flow: invited → password_set → unipile_connected → active';

COMMENT ON COLUMN pod_members.invite_token IS
'Unique token for invite URL. Single-use, expires after acceptance.';

COMMENT ON COLUMN pod_members.unipile_account_id IS
'Unipile account ID (NULL until member connects during onboarding)';

-- 6. Create index for invite token lookups
CREATE INDEX idx_pod_members_invite_token ON pod_members(invite_token)
WHERE invite_token IS NOT NULL;

-- 7. Create index for onboarding status queries
CREATE INDEX idx_pod_members_onboarding_status ON pod_members(onboarding_status, is_active);
```

### Updated Table Structure

```sql
CREATE TABLE pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Profile Information
  name TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,

  -- Unipile Integration (nullable until connected)
  unipile_account_id TEXT, -- ✅ NULL until member connects during onboarding

  -- Onboarding System
  onboarding_status TEXT DEFAULT 'invited'
    CHECK (onboarding_status IN ('invited', 'password_set', 'unipile_connected', 'active')),
  invite_token TEXT UNIQUE,
  invite_sent_at TIMESTAMPTZ,
  invite_accepted_at TIMESTAMPTZ,

  -- Status Flags
  is_active BOOLEAN DEFAULT FALSE,
  last_activity_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_active_has_unipile CHECK (
    onboarding_status != 'active' OR unipile_account_id IS NOT NULL
  )
);
```

---

## 🔄 COMPLETE ONBOARDING FLOW

### Step 1: Admin Invites Pod Member

**Location:** `/app/admin/pods/page.tsx` → "Add Member" modal

**Process:**
1. Admin enters: Name, Email, LinkedIn URL
2. System creates user account (email NOT confirmed yet)
3. System creates pod_member record (unipile_account_id = NULL)
4. System generates unique invite token
5. System sends invite email with link

**Implementation:**

```typescript
// /app/admin/pods/actions.ts

import { createServerClient } from '@/lib/supabase/server';
import { generateSecureToken } from '@/lib/utils/crypto';
import { sendPodInviteEmail } from '@/lib/email/pod-invites';

export async function invitePodMember({
  name,
  email,
  linkedinUrl,
  clientId
}: InvitePodMemberParams) {

  const supabase = createServerClient();

  // 1. Create user account (NOT email confirmed yet)
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false, // They'll confirm via invite flow
    user_metadata: {
      name,
      role: 'pod_member'
    }
  });

  if (authError) throw authError;

  // 2. Create user record in users table
  await supabase
    .from('users')
    .insert({
      id: authUser.user.id,
      email,
      full_name: name,
      role: 'pod_member',
      client_id: clientId
    });

  // 3. Generate invite token (cryptographically secure)
  const inviteToken = generateSecureToken(); // 32-byte random token

  // 4. Create pod_member record
  const { data: podMember, error: memberError } = await supabase
    .from('pod_members')
    .insert({
      user_id: authUser.user.id,
      client_id: clientId,
      name,
      linkedin_url: linkedinUrl,
      unipile_account_id: null, // ✅ NULL until they connect
      onboarding_status: 'invited',
      invite_token: inviteToken,
      invite_sent_at: new Date().toISOString(),
      is_active: false // Can't be active until Unipile connected
    })
    .select()
    .single();

  if (memberError) throw memberError;

  // 5. Send invite email
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pod-invite/${inviteToken}`;

  await sendPodInviteEmail({
    to: email,
    name,
    inviteUrl,
    clientName: currentClient.name
  });

  return {
    success: true,
    podMember,
    inviteUrl // Admin can copy/paste on Zoom call
  };
}
```

**Email Template:**

```html
Subject: You're invited to join the {{client_name}} Pod!

Hi {{name}},

You've been invited to join the {{client_name}} LinkedIn Pod!

As a pod member, you'll help amplify our LinkedIn content through strategic
reposting. This increases visibility and engagement for all team posts.

Click here to get started:
{{invite_url}}

This link expires in 7 days.

If you have questions, reply to this email.

Thanks!
The {{client_name}} Team
```

---

### Step 2: Member Sets Password

**Location:** `/app/pod-invite/[token]/page.tsx`

**Process:**
1. Member clicks invite link from email/Zoom
2. System validates invite token
3. Member enters desired password (must meet strength requirements)
4. System updates user password + confirms email
5. System updates onboarding_status to 'password_set'
6. Redirects to Unipile connection page

**Implementation:**

```typescript
// /app/pod-invite/[token]/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function PodInvitePage({ params }: { params: { token: string } }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadInvite();
  }, []);

  async function loadInvite() {
    // Verify invite token
    const { data, error } = await supabase
      .from('pod_members')
      .select('*, users(*), clients(name)')
      .eq('invite_token', params.token)
      .single();

    if (error || !data) {
      toast.error('Invalid or expired invite link');
      router.push('/auth/login');
      return;
    }

    // Check if already accepted
    if (data.onboarding_status !== 'invited') {
      toast.info('This invite has already been accepted');
      router.push('/auth/login');
      return;
    }

    setMember(data);
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Update user password via admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        member.user_id,
        {
          password,
          email_confirm: true // Confirm email when setting password
        }
      );

      if (updateError) throw updateError;

      // Update pod_member onboarding status
      await supabase
        .from('pod_members')
        .update({
          onboarding_status: 'password_set',
          invite_accepted_at: new Date().toISOString()
        })
        .eq('id', member.id);

      // Sign in the user automatically
      await supabase.auth.signInWithPassword({
        email: member.users.email,
        password
      });

      toast.success('Password set successfully!');

      // Redirect to Unipile connection
      router.push('/onboarding/connect-unipile');

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!member) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Welcome to {member.clients.name} Pod!</h1>
          <p className="text-gray-600 mt-2">
            Hi {member.name}, set your password to continue
          </p>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>

          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Setting Password...' : 'Continue to LinkedIn Connection'}
          </Button>
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          By continuing, you agree to participate in pod amplification for {member.clients.name}.
        </p>
      </Card>
    </div>
  );
}
```

---

### Step 3: Member Connects Unipile

**Location:** `/app/onboarding/connect-unipile/page.tsx`

**Process:**
1. Member sees "Connect Your LinkedIn" page
2. Clicks "Connect via Unipile" button
3. Unipile embedded widget opens (iframe or OAuth redirect)
4. Member authenticates LinkedIn account via Unipile
5. Unipile callback returns `account_id`
6. System updates `unipile_account_id` in pod_members
7. System updates onboarding_status to 'unipile_connected'
8. Redirects to "Pending Activation" page

**Implementation:**

```typescript
// /app/onboarding/connect-unipile/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UnipileConnectWidget } from '@/components/unipile/connect-widget';

export default function ConnectUnipi lePage() {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadMember();
  }, []);

  async function loadMember() {
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('pod_members')
      .select('*, clients(name)')
      .eq('user_id', user.id)
      .single();

    setMember(data);
  }

  async function handleUnipileConnected(unipileAccountId: string) {
    setLoading(true);

    try {
      // Update pod_member with Unipile account ID
      await supabase
        .from('pod_members')
        .update({
          unipile_account_id: unipileAccountId,
          onboarding_status: 'unipile_connected'
        })
        .eq('id', member.id);

      toast.success('LinkedIn connected successfully!');

      // Redirect to pending activation page
      router.push('/onboarding/pending-activation');

    } catch (error: any) {
      toast.error('Failed to save Unipile connection');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Connect Your LinkedIn</h1>
          <p className="text-gray-600 mt-2">
            Securely connect your LinkedIn account via Unipile to enable pod automation
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Your LinkedIn session is stored securely with Unipile</li>
              <li>✓ We'll use it to automatically repost team content</li>
              <li>✓ Your password is NEVER stored or shared</li>
              <li>✓ You can disconnect anytime</li>
            </ul>
          </div>

          <UnipileConnectWidget
            onSuccess={handleUnipileConnected}
            onError={(error) => toast.error(error.message)}
          />

          <p className="text-xs text-gray-500 text-center mt-4">
            Protected by Unipile's enterprise-grade security
          </p>
        </div>
      </Card>
    </div>
  );
}
```

**Unipile Widget Component:**

```typescript
// /components/unipile/connect-widget.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface UnipileConnectWidgetProps {
  onSuccess: (accountId: string) => void;
  onError: (error: Error) => void;
}

export function UnipileConnectWidget({ onSuccess, onError }: UnipileConnectWidgetProps) {
  const [loading, setLoading] = useState(false);

  async function initiateConnection() {
    setLoading(true);

    try {
      // Call Unipile API to create account connection
      const response = await fetch('/api/unipile/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'LINKEDIN'
        })
      });

      const { account_id, connect_url } = await response.json();

      // Open Unipile OAuth flow in popup or redirect
      window.location.href = connect_url;

      // TODO: Handle OAuth callback to capture account_id
      // For now, assume callback sets it via query param

    } catch (error: any) {
      onError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={initiateConnection}
      className="w-full"
      disabled={loading}
    >
      {loading ? 'Connecting...' : 'Connect LinkedIn via Unipile'}
    </Button>
  );
}
```

---

### Step 4: Admin Activates Member

**Location:** `/app/admin/pods/page.tsx`

**Process:**
1. Admin sees pod member with status 'unipile_connected'
2. Admin verifies Unipile connection is working
3. Admin clicks "Activate Member" button
4. System updates onboarding_status to 'active'
5. System sets is_active = true
6. Member can now participate in pod amplification

**Implementation:**

```typescript
// /app/admin/pods/page.tsx (updated)

export default function PodsManagementPage() {

  async function handleActivateMember(memberId: string, memberName: string) {
    try {
      // Verify member has Unipile connected
      const { data: member } = await supabase
        .from('pod_members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (!member.unipile_account_id) {
        toast.error('Member must connect Unipile before activation');
        return;
      }

      // Activate member
      await supabase
        .from('pod_members')
        .update({
          onboarding_status: 'active',
          is_active: true
        })
        .eq('id', memberId);

      toast.success(`${memberName} is now active in the pod!`);

      // Refresh table
      fetchMembers();

    } catch (error: any) {
      toast.error('Failed to activate member');
    }
  }

  async function handleResendInvite(memberId: string, email: string) {
    try {
      const { data: member } = await supabase
        .from('pod_members')
        .select('invite_token, name, clients(name)')
        .eq('id', memberId)
        .single();

      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pod-invite/${member.invite_token}`;

      await sendPodInviteEmail({
        to: email,
        name: member.name,
        inviteUrl,
        clientName: member.clients.name
      });

      toast.success('Invite resent successfully');

    } catch (error: any) {
      toast.error('Failed to resend invite');
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pod Members</h1>
        <Button onClick={() => setShowAddModal(true)}>
          Add Member
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>LinkedIn</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Unipile</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>{member.name}</TableCell>
              <TableCell>
                <a href={member.linkedin_url} target="_blank" className="text-blue-600 hover:underline">
                  Profile
                </a>
              </TableCell>
              <TableCell>
                <Badge variant={
                  member.onboarding_status === 'active' ? 'default' :
                  member.onboarding_status === 'unipile_connected' ? 'secondary' :
                  member.onboarding_status === 'password_set' ? 'outline' :
                  'destructive'
                }>
                  {member.onboarding_status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                {member.unipile_account_id ? (
                  <span className="text-green-600">✓ Connected</span>
                ) : (
                  <span className="text-gray-400">Not connected</span>
                )}
              </TableCell>
              <TableCell>
                {member.onboarding_status === 'unipile_connected' && (
                  <Button
                    size="sm"
                    onClick={() => handleActivateMember(member.id, member.name)}
                  >
                    Activate
                  </Button>
                )}
                {member.onboarding_status === 'invited' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResendInvite(member.id, member.users.email)}
                  >
                    Resend Invite
                  </Button>
                )}
                {member.onboarding_status === 'active' && (
                  <Switch
                    checked={member.is_active}
                    onCheckedChange={(checked) => handleToggleActive(member.id, checked)}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## 🎯 POD AMPLIFICATION UPDATES

### Only Use Active Members

```typescript
// /app/api/pods/trigger-amplification/route.ts (updated)

export async function POST(req: Request) {
  const { postId } = await req.json();
  const supabase = await createClient();

  // Get post details
  const { data: post } = await supabase
    .from('posts')
    .select('*, campaigns!inner(*)')
    .eq('id', postId)
    .single();

  // Get ONLY active pod members with Unipile connected
  const { data: podMembers } = await supabase
    .from('pod_members')
    .select('*')
    .eq('client_id', post.campaigns.client_id)
    .eq('is_active', true) // ✅ Must be active
    .eq('onboarding_status', 'active') // ✅ Must be fully onboarded
    .not('unipile_account_id', 'is', null); // ✅ Must have Unipile

  if (!podMembers || podMembers.length === 0) {
    return NextResponse.json({
      error: 'No active pod members available. Ensure members complete onboarding and are activated.'
    }, { status: 400 });
  }

  // Continue with pod amplification...
}
```

---

## 📋 IMPLEMENTATION TASKS

### Database Migration
- [ ] Create migration file: `20251116_fix_pod_members_onboarding.sql`
- [ ] Make `unipile_account_id` nullable
- [ ] Add `onboarding_status` column with check constraint
- [ ] Add `invite_token`, `invite_sent_at`, `invite_accepted_at` columns
- [ ] Add constraint: `check_active_has_unipile`
- [ ] Add indexes for invite_token and onboarding_status
- [ ] Apply migration via Supabase SQL Editor

### Backend API
- [ ] `/app/admin/pods/actions.ts` - `invitePodMember()` server action
- [ ] `/app/api/unipile/create-account/route.ts` - Unipile account creation
- [ ] `/app/api/unipile/callback/route.ts` - OAuth callback handler
- [ ] `/lib/email/pod-invites.ts` - Email sending logic
- [ ] Update `/app/api/pods/trigger-amplification/route.ts` - Filter active members only

### Frontend Pages
- [ ] `/app/pod-invite/[token]/page.tsx` - Password setup page
- [ ] `/app/onboarding/connect-unipile/page.tsx` - Unipile connection page
- [ ] `/app/onboarding/pending-activation/page.tsx` - Waiting for admin activation

### Frontend Components
- [ ] `/components/unipile/connect-widget.tsx` - Unipile OAuth widget
- [ ] `/components/admin/AddPodMemberModal.tsx` - Update to show invite URL after creation
- [ ] Update `/app/admin/pods/page.tsx` - Show onboarding status, activate button, resend invite

### Email Templates
- [ ] Pod invite email template
- [ ] Activation confirmation email template
- [ ] Resend invite email template

### Testing
- [ ] Test full onboarding flow: invite → password → Unipile → activate
- [ ] Verify invite token security (can't reuse, expires)
- [ ] Test constraint: can't activate without Unipile
- [ ] Test RLS policies with pod_member role
- [ ] Test pod amplification only uses active members
- [ ] Test resend invite functionality

---

## ✅ SUCCESS CRITERIA

- [ ] Admin can invite pod member → Creates user + pod_member record
- [ ] Invite email sent with unique token URL
- [ ] Member can set password via invite link
- [ ] Member can connect Unipile account
- [ ] Admin can see onboarding status in table
- [ ] Admin can activate member after Unipile connected
- [ ] Admin can resend invite if member hasn't responded
- [ ] Pod amplification only triggers for active members with Unipile
- [ ] Constraint prevents activating member without Unipile
- [ ] RLS policies enforce client-scoped access

---

## 🚀 READY FOR IMPLEMENTATION

This design fixes the critical schema issue and provides a complete self-service onboarding flow for pod members. All implementation details are documented and ready to build.

**Next Step:** Create Archon tasks from this design document and begin implementation.
