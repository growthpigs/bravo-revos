# UniPile Multi-Channel Integration - Complete Design

**Date**: 2025-01-12
**Branch**: feat/unipile-multi-channel
**Status**: Design Complete, Ready for Implementation

---

## Executive Summary

Restore and expand UniPile integration to support **8 communication channels**:
- **Messaging**: WhatsApp, Telegram, Messenger
- **Social**: LinkedIn, Instagram, Twitter
- **Productivity**: Email, Calendar

**Scope**: Full-page connections management system at `/settings/connections` with OAuth popup flow, per-client UniPile credentials, and comprehensive error handling.

---

## Architecture Decisions

### 1. Full Page vs Modal
**Decision**: Full page at `/settings/connections`
**Reasoning**:
- 8 channels with tabs, features, and connection details need breathing room
- OAuth flow more stable with persistent parent page
- More scalable and professional for managing multiple important accounts
- Easier to add channels 9-12 in future

### 2. User Dropdown Menu
**Decision**: Show connection status in dropdown, link to full page
**Menu Items**:
- "✅ N Channels Connected" (if any connected) OR "⚠️ Connect Channels" (if none)
- "Settings" → `/settings/connections`

### 3. UniPile Credentials
**Decision**: Per-client credentials (not shared platform-wide)
**Storage**: `clients.unipile_api_key`, `clients.unipile_dsn`, `clients.unipile_enabled`

### 4. Error Handling
**Decision**: Show "Contact Admin" message when client not configured
**Reasoning**: Prevents users from requesting features their org hasn't purchased

---

## Database Schema

### New Table: `connected_accounts`

```sql
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN (
    'LINKEDIN',
    'WHATSAPP',
    'INSTAGRAM',
    'TELEGRAM',
    'MESSENGER',
    'TWITTER',
    'EMAIL',
    'CALENDAR'
  )),
  account_id TEXT NOT NULL,  -- UniPile account_id
  account_name TEXT,  -- Display name (e.g., "+1234567890", "john@example.com")
  profile_data JSONB,  -- Full profile from UniPile
  capabilities TEXT[],  -- ['MESSAGING', 'POSTING', 'GROUPS']
  is_primary BOOLEAN DEFAULT false,  -- Primary account for this provider
  status TEXT CHECK (status IN ('active', 'expired', 'error', 'disconnected')) DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider, account_id)
);

CREATE INDEX idx_connected_accounts_user_provider ON connected_accounts(user_id, provider);
CREATE INDEX idx_connected_accounts_status ON connected_accounts(status) WHERE status = 'active';
```

### Migration Strategy

1. Create `connected_accounts` table
2. Migrate existing `linkedin_accounts` data:
   ```sql
   INSERT INTO connected_accounts (
     user_id, provider, account_id, account_name, profile_data, status, created_at
   )
   SELECT
     user_id,
     'LINKEDIN' as provider,
     unipile_account_id,
     account_name,
     profile_data,
     status,
     created_at
   FROM linkedin_accounts
   WHERE unipile_account_id IS NOT NULL;
   ```
3. Keep `linkedin_accounts` table for backward compatibility (can deprecate later)

### RLS Policies

```sql
-- Users can only see their own connections
CREATE POLICY connected_accounts_select ON connected_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own connections (via service role from API)
CREATE POLICY connected_accounts_insert ON connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY connected_accounts_delete ON connected_accounts
  FOR DELETE USING (auth.uid() = user_id);
```

---

## Component Design

### 1. User Dropdown Menu (`dashboard-sidebar.tsx`)

**Location**: Lines 217-251

**Changes**:
1. Add connection status query:
   ```typescript
   const { data: connections } = await supabase
     .from('connected_accounts')
     .select('id, provider, status')
     .eq('status', 'active');

   const connectedCount = connections?.length || 0;
   ```

2. Add menu items:
   ```typescript
   <DropdownMenuContent align="end" className="w-48">
     <DropdownMenuItem asChild>
       <Link href="/settings/connections" className="cursor-pointer">
         {connectedCount > 0 ? (
           <>
             <CheckCircle className="h-4 w-4 mr-2 text-gray-600" />
             {connectedCount} Channel{connectedCount !== 1 ? 's' : ''} Connected
           </>
         ) : (
           <>
             <AlertCircle className="h-4 w-4 mr-2 text-gray-600" />
             Connect Channels
           </>
         )}
       </Link>
     </DropdownMenuItem>
     <DropdownMenuSeparator />
     <DropdownMenuItem asChild>
       <Link href="/settings" className="cursor-pointer">
         <Settings className="h-4 w-4 mr-2" />
         Settings
       </Link>
     </DropdownMenuItem>
     <DropdownMenuSeparator />
     <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
       <LogOut className="h-4 w-4 mr-2" />
       Sign Out
     </DropdownMenuItem>
   </DropdownMenuContent>
   ```

### 2. Connections Page (`/settings/connections/page.tsx`)

**Layout Structure**:

```
┌─────────────────────────────────────────────────────┐
│ Settings > Connections                              │
│                                                     │
│ Manage Channel Connections                         │
│ Connect your communication channels through UniPile │
│                                                     │
│ [Messaging] [Social] [Productivity]                 │
│                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│ │ WhatsApp     │ │ Telegram     │ │ Messenger    ││
│ │ [Icon]       │ │ [Icon]       │ │ [Icon]       ││
│ │              │ │              │ │              ││
│ │ Status: ✅   │ │ Status: ⚠️   │ │ Status: ⚠️   ││
│ │ Connected    │ │ Not Connected│ │ Not Connected││
│ │              │ │              │ │              ││
│ │ Account:     │ │ Features:    │ │ Features:    ││
│ │ +1234567890  │ │ • Messages   │ │ • Messages   ││
│ │              │ │ • Groups     │ │ • Groups     ││
│ │ [Disconnect] │ │ [Connect]    │ │ [Connect]    ││
│ └──────────────┘ └──────────────┘ └──────────────┘│
└─────────────────────────────────────────────────────┘
```

**Tab Organization**:
- **Messaging Tab**: WhatsApp, Telegram, Messenger
- **Social Tab**: LinkedIn, Instagram, Twitter
- **Productivity Tab**: Email, Calendar

**Channel Configuration**:

```typescript
const CHANNELS = {
  MESSAGING: [
    {
      provider: 'WHATSAPP',
      name: 'WhatsApp',
      description: 'Send messages and manage WhatsApp conversations',
      icon: MessageSquare,
      features: ['Messages', 'Groups', 'Media Sharing', 'Status Updates']
    },
    {
      provider: 'TELEGRAM',
      name: 'Telegram',
      description: 'Connect Telegram for messaging and bot integration',
      icon: Send,
      features: ['Messages', 'Groups', 'Channels', 'Bots']
    },
    {
      provider: 'MESSENGER',
      name: 'Messenger',
      description: 'Facebook Messenger for social messaging',
      icon: MessageCircle,
      features: ['Messages', 'Groups', 'Voice Calls', 'Video Calls']
    }
  ],
  SOCIAL: [
    {
      provider: 'LINKEDIN',
      name: 'LinkedIn',
      description: 'Professional networking and lead generation',
      icon: Linkedin,
      features: ['Messages', 'Posts', 'Engagement', 'Lead Capture']
    },
    {
      provider: 'INSTAGRAM',
      name: 'Instagram',
      description: 'Visual storytelling and DM automation',
      icon: Instagram,
      features: ['Direct Messages', 'Posts', 'Stories', 'Comments']
    },
    {
      provider: 'TWITTER',
      name: 'Twitter',
      description: 'Real-time engagement and tweet automation',
      icon: Twitter,
      features: ['Tweets', 'Direct Messages', 'Replies', 'Analytics']
    }
  ],
  PRODUCTIVITY: [
    {
      provider: 'EMAIL',
      name: 'Email',
      description: 'Connect email for outreach campaigns',
      icon: Mail,
      features: ['Send/Receive', 'Templates', 'Sequences', 'Tracking']
    },
    {
      provider: 'CALENDAR',
      name: 'Calendar',
      description: 'Schedule meetings and manage appointments',
      icon: Calendar,
      features: ['Events', 'Scheduling', 'Reminders', 'Availability']
    }
  ]
};
```

**Card States**:

1. **Connected** (bg-white, shadow-sm):
   ```typescript
   <Card className="bg-white border-gray-200 shadow-sm">
     <div className="flex items-start gap-4">
       <Icon className="w-8 h-8 text-gray-700" />
       <div className="flex-1">
         <div className="flex items-center gap-2">
           <h3 className="font-semibold text-gray-900">{channel.name}</h3>
           <CheckCircle className="w-5 h-5 text-gray-600" />
         </div>
         <p className="text-sm text-gray-600 mt-1">Connected</p>
         <p className="text-sm text-gray-700 mt-2">{connection.account_name}</p>
         <p className="text-xs text-gray-500">Last synced: {lastSync}</p>
       </div>
       <Button variant="outline" size="sm" onClick={handleDisconnect}>
         Disconnect
       </Button>
     </div>
   </Card>
   ```

2. **Not Connected** (bg-gray-50):
   ```typescript
   <Card className="bg-gray-50 border-gray-200">
     <div className="flex items-start gap-4">
       <Icon className="w-8 h-8 text-gray-600" />
       <div className="flex-1">
         <h3 className="font-semibold text-gray-900">{channel.name}</h3>
         <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
         <ul className="text-sm text-gray-700 mt-3 space-y-1">
           {channel.features.map(feature => (
             <li key={feature}>• {feature}</li>
           ))}
         </ul>
       </div>
       <Button size="sm" onClick={handleConnect}>
         Connect
       </Button>
     </div>
   </Card>
   ```

3. **Client Not Configured** (bg-gray-100):
   ```typescript
   <Card className="bg-gray-100 border-gray-200">
     <div className="flex items-start gap-4">
       <Icon className="w-8 h-8 text-gray-500" />
       <div className="flex-1">
         <div className="flex items-center gap-2">
           <h3 className="font-semibold text-gray-700">{channel.name}</h3>
           <AlertCircle className="w-5 h-5 text-gray-500" />
         </div>
         <p className="text-sm text-gray-600 mt-1">Unavailable</p>
         <p className="text-sm text-gray-700 mt-2">
           Your organization has not configured UniPile integration.
           Please contact your administrator.
         </p>
       </div>
     </div>
   </Card>
   ```

---

## API Routes

### Route 1: `/api/unipile/auth` (POST)

**Purpose**: Generate OAuth URL for a provider

**Request**:
```typescript
{
  provider: 'WHATSAPP' | 'LINKEDIN' | 'INSTAGRAM' | 'TELEGRAM' | 'MESSENGER' | 'TWITTER' | 'EMAIL' | 'CALENDAR'
}
```

**Response (Success)**:
```typescript
{
  oauth_url: 'https://api.unipile.com/v1/oauth/whatsapp?client_id=...&redirect_uri=...&state=...'
}
```

**Response (Error - Client Not Configured)**:
```typescript
{
  error: 'UNIPILE_NOT_CONFIGURED',
  message: 'Your organization has not configured UniPile integration. Please contact your administrator.'
}
```

**Implementation**:
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's client
  const { data: profile } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single();

  // Check client configuration
  const { data: client } = await supabase
    .from('clients')
    .select('unipile_enabled, unipile_api_key, unipile_dsn')
    .eq('id', profile.client_id)
    .single();

  if (!client?.unipile_enabled || !client?.unipile_api_key) {
    return NextResponse.json({
      error: 'UNIPILE_NOT_CONFIGURED',
      message: 'Your organization has not configured UniPile integration.'
    }, { status: 403 });
  }

  const { provider } = await request.json();

  // Generate state token
  const state = `${provider}_${user.id}`;

  // Build OAuth URL
  const oauth_url = `https://api.unipile.com/v1/oauth/${provider.toLowerCase()}?` +
    `client_id=${client.unipile_api_key}&` +
    `redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/unipile/callback`)}&` +
    `state=${state}`;

  return NextResponse.json({ oauth_url });
}
```

### Route 2: `/api/unipile/callback` (GET)

**Purpose**: Handle OAuth callback and store account

**Query Params**: `?code=ABC123&state=WHATSAPP_550e8400-e29b-41d4-a716-446655440000`

**Process**:
1. Validate state token (matches user ID, provider)
2. Exchange code for UniPile account credentials
3. Fetch account profile data from UniPile
4. Insert into `connected_accounts` table
5. Return success HTML page that closes popup

**Implementation**:
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return new Response('Missing parameters', { status: 400 });
  }

  // Parse state: "PROVIDER_user_id"
  const [provider, user_id] = state.split('_');

  // Exchange code for UniPile credentials
  const tokenResponse = await fetch('https://api.unipile.com/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, grant_type: 'authorization_code' })
  });

  const { account_id, access_token } = await tokenResponse.json();

  // Fetch profile data
  const profileResponse = await fetch(`https://api.unipile.com/v1/accounts/${account_id}/profile`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });

  const profile = await profileResponse.json();

  // Store in database (using service role)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase
    .from('connected_accounts')
    .insert({
      user_id,
      provider,
      account_id,
      account_name: profile.name || profile.phone || profile.email,
      profile_data: profile,
      capabilities: profile.capabilities || [],
      status: 'active'
    });

  // Return HTML that closes popup
  return new Response(`
    <html>
      <head><title>Connected</title></head>
      <body>
        <script>
          window.opener.postMessage({ type: 'UNIPILE_CONNECTED', provider: '${provider}' }, '*');
          window.close();
        </script>
        <p>Connection successful! This window will close automatically.</p>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

### Route 3: `/api/unipile/disconnect` (POST)

**Purpose**: Disconnect a connected account

**Request**:
```typescript
{
  account_id: 'uuid-of-connected-account'
}
```

**Implementation**:
```typescript
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { account_id } = await request.json();

  // Verify ownership and delete
  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('id', account_id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

---

## OAuth Flow

**Connection Sequence**:

1. **User clicks "Connect WhatsApp"**
2. **Frontend calls `/api/unipile/auth`**:
   ```typescript
   const response = await fetch('/api/unipile/auth', {
     method: 'POST',
     body: JSON.stringify({ provider: 'WHATSAPP' })
   });
   const { oauth_url } = await response.json();
   ```

3. **Open popup window**:
   ```typescript
   const popup = window.open(oauth_url, 'unipile-oauth', 'width=600,height=700');

   // Listen for completion
   window.addEventListener('message', (event) => {
     if (event.data.type === 'UNIPILE_CONNECTED') {
       // Refresh connections list
       refetchConnections();
     }
   });
   ```

4. **User authenticates in popup** (WhatsApp login)

5. **UniPile redirects to callback**: `/api/unipile/callback?code=...&state=...`

6. **Callback exchanges code**, stores account, closes popup

7. **Parent page receives postMessage**, refreshes connections

8. **WhatsApp card now shows "Connected"**

---

## Error Handling

### Scenario 1: Client Not Configured

**When**: `client.unipile_enabled = false` or `client.unipile_api_key = null`

**UI Behavior**:
- All channel cards show gray alert icon
- Display: "⚠️ Contact Admin - UniPile integration not configured for your organization"
- "Connect" button disabled
- Helper text: "Ask your administrator to configure UniPile credentials in the Admin panel"

### Scenario 2: OAuth Popup Blocked

**When**: Browser blocks popup

**UI Behavior**:
- Show toast notification: "Popup blocked! Please allow popups for this site and try again."
- Provide fallback: "Or click here to open in new tab instead"

### Scenario 3: OAuth Failure

**When**: UniPile returns error in callback (invalid code, user denied)

**UI Behavior**:
- Callback route returns error HTML
- Parent page shows toast: "Connection failed. Please try again or contact support."
- Channel card remains in "Not Connected" state

### Scenario 4: Disconnection Confirmation

**When**: User clicks "Disconnect"

**UI Behavior**:
- Show confirmation dialog: "Disconnect WhatsApp? You'll need to reconnect to send messages through this channel."
- On confirm: Call `/api/unipile/disconnect`
- On success: Card returns to "Not Connected" state
- Show toast: "WhatsApp disconnected successfully"

---

## Security Considerations

1. **State Token Validation**: CSRF protection via `state` parameter containing user ID
2. **RLS Policies**: Users can only access their own connections
3. **Service Role Usage**: Only callback route uses service role to bypass RLS during OAuth
4. **Credential Storage**: UniPile API keys stored encrypted in `clients` table
5. **OAuth Redirect**: Whitelist callback URL in UniPile dashboard

---

## Implementation Checklist

### Phase 1: Database
- [ ] Create migration for `connected_accounts` table
- [ ] Apply migration to Supabase
- [ ] Migrate existing `linkedin_accounts` data
- [ ] Test RLS policies

### Phase 2: API Routes
- [ ] Create `/api/unipile/auth` route
- [ ] Create `/api/unipile/callback` route
- [ ] Create `/api/unipile/disconnect` route
- [ ] Test OAuth flow with one provider

### Phase 3: UI Components
- [ ] Update `dashboard-sidebar.tsx` dropdown menu
- [ ] Create `/settings/connections/page.tsx`
- [ ] Implement channel cards with 3 states
- [ ] Add tab navigation (Messaging, Social, Productivity)
- [ ] Style with Kakiyo grayscale design

### Phase 4: Integration
- [ ] Add connection status query to sidebar
- [ ] Implement OAuth popup flow
- [ ] Add disconnect confirmation dialog
- [ ] Test all 8 channels
- [ ] Error handling and edge cases

### Phase 5: Testing & Validation
- [ ] Test OAuth flow for each provider
- [ ] Test "Client Not Configured" error state
- [ ] Test disconnection flow
- [ ] Test popup blocking fallback
- [ ] Verify RLS policies work correctly

---

## Future Enhancements

1. **Multi-Account Support**: Allow users to connect multiple accounts per provider (e.g., 3 LinkedIn accounts)
2. **Connection Health Monitoring**: Auto-detect expired sessions and prompt reconnection
3. **Usage Analytics**: Track messages sent per channel
4. **Bulk Actions**: Connect/disconnect multiple channels at once
5. **Channel Recommendations**: Suggest channels based on user's industry

---

## References

- **UniPile API Docs**: https://docs.unipile.com
- **Existing linkedin_accounts table**: `supabase/migrations/001_initial_schema.sql`
- **Per-client credentials**: `supabase/migrations/015_add_client_unipile_credentials.sql`
- **Kakiyo Design System**: Grayscale-only (white, gray-50/100/200/600/700/900)
