# Bravo revOS - Final Corrected Task List

**Total Points:** 100
**Sessions:** 7
**Status:** Ready for Implementation

## Session 1: Bolt.new UI Generation (15 points)

### T001: Generate Database Schema with Bolt.new (5 points)
**Branch:** `bolt-scaffold`
**Assignee:** User
**Type:** UI Generation

**Description:**
User creates the database schema in Bolt.new, then pushes to GitHub for integration.

**Bolt.new Prompt:**
```
Create a Supabase database schema for a LinkedIn lead magnet system with:

MULTI-TENANT STRUCTURE (CRITICAL):
- agencies table (top level)
- clients table (belongs to agencies)
- users table (belongs to clients)

CAMPAIGN TABLES:
- campaigns (name, trigger_word, lead_magnet_id, webhook_config_id, dm_templates)
- lead_magnets (file_path for Supabase Storage, name, description)
- leads (email, linkedin_id, status: comment_detected→dm_sent→email_captured→webhook_sent→backup_sent)

LINKEDIN TABLES:
- linkedin_accounts (encrypted credentials, unipile_account_id, session)
- posts (content, trigger_word, unipile_post_id, last_polled_at)
- comments (has_trigger_word boolean, dm_sent boolean)
- dm_sequences (3-step tracking: step1_sent_at, step2_sent_at, step3_sent_at, download_url)

CARTRIDGE SYSTEM:
- cartridges (4-tier: system, workspace, user, skill)
- Voice parameters: tone, style, personality, vocabulary
- Parent-child relationships for inheritance

ENGAGEMENT PODS:
- pods (name, min 9 members, auto_engage=true)
- pod_members (user_id, pod_id, linkedin_account_id)
- pod_activities (like/comment/repost tracking)

WEBHOOK DELIVERY:
- webhook_configs (url, secret, headers, esp_type: zapier|make|convertkit)
- webhook_deliveries (payload, status, retry_count)

Include TypeScript types, Supabase client setup, and RLS policies for multi-tenancy.
```

**Deliverables:**
1. SQL migration files
2. TypeScript type definitions
3. Supabase client configuration
4. Basic RLS policies

**Reference Docs:**
- data-model.md (complete schema specification)
- spec.md lines 258-304 (data model overview)

---

### T002: Generate Admin Portal UI with Bolt.new (5 points)
**Branch:** `bolt-scaffold`
**Assignee:** User
**Type:** UI Generation

**Description:**
User creates the admin interface in Bolt.new for agency administrators.

**Bolt.new Prompt:**
```
Create Next.js 14 admin portal (route: /admin) with shadcn/ui:

IMPORTANT: This is ONE app with role-based routing, NOT a separate application.

PAGES NEEDED:
/admin/dashboard - System metrics, client overview
/admin/clients - Manage all clients (CRUD)
/admin/campaigns - View all campaigns across clients
/admin/linkedin - LinkedIn account health monitoring
/admin/webhooks - Webhook delivery analytics
/admin/pods - Engagement pod management

UI COMPONENTS:
- DataTable with filtering/sorting (use tanstack-table)
- Metric cards showing KPIs
- Real-time status indicators
- Campaign performance charts (use recharts)

FEATURES:
- Multi-tenant data filtering
- Client impersonation
- System-wide analytics
- API usage monitoring

Use App Router, TypeScript, Tailwind CSS, shadcn/ui components.
Role check: user.role === 'admin' at agency level.
```

**Deliverables:**
1. Admin route pages (/admin/*)
2. Admin-specific components
3. Role-based middleware
4. Analytics dashboards

**Reference Docs:**
- spec.md lines 223-231 (Admin Portal section)

---

### T003: Generate Client Dashboard UI with Bolt.new (5 points)
**Branch:** `bolt-scaffold`
**Assignee:** User
**Type:** UI Generation

**Description:**
User creates the client dashboard in Bolt.new for business users.

**Bolt.new Prompt:**
```
Create Next.js 14 client dashboard (route: /dashboard) with shadcn/ui:

IMPORTANT: Same app as admin, just different routes with role-based access.

PAGES NEEDED:
/dashboard - Campaign metrics, lead counts, conversion funnel
/dashboard/campaigns/new - Campaign creation wizard
/dashboard/campaigns/[id] - Campaign details, lead list
/dashboard/leads - Export leads as CSV
/dashboard/settings/webhooks - Configure ESP webhooks
/dashboard/settings/voice - Voice cartridge settings

CAMPAIGN WIZARD STEPS:
1. Lead magnet upload (to Supabase Storage)
2. Content creation (AI or manual mode toggle)
3. Trigger word selection
4. Webhook configuration (ESP presets: Zapier, Make, etc)
5. DM sequence settings (delays, backup DM toggle)
6. Review and launch

KEY COMPONENTS:
- Campaign creation wizard (multi-step form)
- Lead table with export
- Webhook test tool
- Voice preview
- Real-time metrics

Use App Router, TypeScript, Tailwind CSS, shadcn/ui.
Multi-tenant isolation via RLS.
```

**Deliverables:**
1. Client dashboard routes (/dashboard/*)
2. Campaign wizard component
3. Lead management UI
4. Settings pages

**Reference Docs:**
- spec.md lines 233-244 (Client Dashboard)
- WEBHOOK-SETTINGS-UI.md (complete webhook UI spec)

---

## Session 2: Cartridge System (20 points)

### T004: Implement Cartridge Database & API (8 points)
**Branch:** `cartridge-system`
**Assignee:** AI Assistant
**Type:** Backend Development

**Description:**
Create the 4-tier cartridge system for voice and knowledge management.

**Implementation Requirements:**

```typescript
// Cartridge structure from spec.md
interface Cartridge {
  id: string;
  tier: 'system' | 'workspace' | 'user' | 'skill';
  name: string;

  voice: {
    tone: 'professional' | 'casual' | 'inspirational' | 'analytical';
    style: 'conversational' | 'authoritative' | 'storytelling';
    personality: string[];
    vocabulary: 'basic' | 'professional' | 'technical';
    sentenceStructure: 'simple' | 'complex' | 'varied';
    phrases: string[]; // User's common phrases
  };

  knowledge: {
    industry: string;
    expertise: string[];
    audience: string;
    values: string[];
  };

  parentCartridgeId?: string; // For inheritance
}
```

**Features to Implement:**
1. CRUD API endpoints for cartridges
2. 4-tier hierarchy with inheritance
3. RLS policies for tenant isolation
4. Merge logic for inherited properties
5. Load trigger mechanism

**Database Schema:**
```sql
CREATE TABLE cartridges (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  tier TEXT CHECK (tier IN ('system', 'workspace', 'user', 'skill')),
  name TEXT NOT NULL,
  voice JSONB DEFAULT '{}',
  knowledge JSONB DEFAULT '{}',
  parent_cartridge_id UUID REFERENCES cartridges(id),
  auto_generate BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true
);
```

**API Endpoints:**
- `POST /api/cartridges` - Create cartridge
- `GET /api/cartridges` - List by tier
- `PATCH /api/cartridges/:id` - Update
- `GET /api/cartridges/:id/merged` - Get with inheritance

**Reference Docs:**
- spec.md lines 90-94 (Voice Cartridge System)
- data-model.md lines 721-753 (cartridges table)

---

### T005: Voice Auto-Generation from LinkedIn (7 points)
**Branch:** `cartridge-system`
**Assignee:** AI Assistant
**Type:** AI Integration

**Description:**
Implement automatic voice generation by analyzing user's last 30 LinkedIn posts.

**Implementation:**

```typescript
async function generateVoiceFromPosts(linkedinAccountId: string): Promise<Voice> {
  // 1. Fetch last 30 posts via Unipile
  const posts = await unipile.getUserPosts({
    accountId: linkedinAccountId,
    limit: 30
  });

  // 2. Prepare for GPT-4 analysis
  const analysisPrompt = `
    Analyze these LinkedIn posts and extract:
    1. Writing tone (professional/casual/inspirational)
    2. Communication style (conversational/authoritative/storytelling)
    3. Personality traits (list 3-5)
    4. Vocabulary level (basic/professional/technical)
    5. Common phrases (5-10 recurring phrases)
    6. Average post length
    7. Emoji usage (yes/no)
    8. Hashtag patterns

    Posts: ${posts.map(p => p.content).join('\n---\n')}
  `;

  // 3. GPT-4 analysis
  const analysis = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: analysisPrompt }]
  });

  // 4. Store in cartridge
  return {
    tone: analysis.tone,
    style: analysis.style,
    personality: analysis.personality,
    vocabulary: analysis.vocabulary,
    phrases: analysis.phrases,
    averageWordCount: analysis.avgLength
  };
}
```

**Features:**
1. Unipile API integration for post fetching
2. GPT-4o analysis for pattern extraction
3. Voice parameter generation
4. Storage in user cartridge
5. Refresh capability

**Reference Docs:**
- spec.md lines 92 (Auto-Generation)
- SKILLS-AND-VOICE-INTEGRATION.md lines 96-122

---

### T006: Cartridge Management UI (5 points)
**Branch:** `cartridge-system`
**Assignee:** AI Assistant
**Type:** Frontend Development

**Description:**
Build the UI for managing cartridges with progressive disclosure.

**UI Components:**

```tsx
// Progressive disclosure component
function CartridgeManager() {
  return (
    <div className="space-y-4">
      {/* System Level (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>System Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <CartridgeList tier="system" readOnly />
        </CardContent>
      </Card>

      {/* Workspace Level */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Voices</CardTitle>
        </CardHeader>
        <CardContent>
          <CartridgeList tier="workspace" />
          <Button onClick={createWorkspaceCartridge}>
            Create Workspace Voice
          </Button>
        </CardContent>
      </Card>

      {/* User Level */}
      <Card>
        <CardHeader>
          <CardTitle>Your Personal Voice</CardTitle>
        </CardHeader>
        <CardContent>
          <VoiceEditor cartridge={userCartridge} />
          <Button onClick={autoGenerate}>
            Auto-Generate from LinkedIn
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Features:**
1. 4-tier progressive disclosure UI
2. Voice preview with sample text
3. Auto-generation trigger button
4. Inheritance visualization
5. Edit/customize interface

**Reference Docs:**
- spec.md lines 252-254 (Skills Configuration UI)

---

## Session 3: Unipile + BullMQ + DM (20 points)

### T007: Unipile Integration & Session Management (5 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Integration

**Description:**
Set up Unipile API client with session management and encryption.

**CRITICAL:** All LinkedIn operations go through Unipile API. We NEVER connect directly to LinkedIn.

**Implementation:**

```typescript
// Unipile client setup
class UnipileClient {
  private apiKey: string;
  private baseUrl = 'https://api.unipile.com';

  async authenticateLinkedIn(email: string, password: string) {
    // Username/password auth (NOT OAuth)
    const response = await fetch(`${this.baseUrl}/auth/linkedin`, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'linkedin',
        username: email,
        password: password // Will be encrypted in DB
      })
    });

    const session = await response.json();

    // Store encrypted session
    await supabase.from('linkedin_accounts').insert({
      unipile_account_id: session.account_id,
      unipile_session: encrypt(session),
      session_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    return session;
  }

  // Key operations
  async createPost(accountId: string, content: string) { }
  async getPostComments(postId: string, since?: Date) { }
  async sendMessage(recipientId: string, message: string) { }
  async getConversationMessages(conversationId: string) { }
}
```

**Pricing:** $5.50/account/month (not per API call)

**Features:**
1. Encrypted credential storage
2. Session refresh handling
3. Rate limit tracking
4. Error handling with retries
5. Account health monitoring

**Reference Docs:**
- spec.md lines 311-330 (Unipile API section)
- unipile-api-research.md (if created)

---

### T008: Comment Polling System (7 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Backend Development

**Description:**
Implement polling system for comment detection since Unipile has NO webhook for comments.

**CRITICAL:** Must poll every 15-30 minutes. No real-time webhooks available for comments.

**Implementation:**

```typescript
// Comment polling service
class CommentPollingService {
  private pollInterval = randomBetween(15, 30) * 60 * 1000; // 15-30 min

  async pollComments() {
    const campaigns = await supabase
      .from('campaigns')
      .select('*, posts(*)')
      .eq('status', 'active');

    for (const campaign of campaigns.data) {
      for (const post of campaign.posts) {
        // CRITICAL: Must track last_polled_at
        const lastPolled = post.last_polled_at || new Date(0);

        // Fetch new comments via Unipile
        const comments = await unipile.getPostComments({
          postId: post.unipile_post_id,
          since: lastPolled
        });

        for (const comment of comments) {
          // Check for trigger word (case-insensitive)
          if (comment.text.toLowerCase().includes(campaign.trigger_word.toLowerCase())) {
            // Queue DM for this commenter
            await dmQueue.add('send-initial-dm', {
              recipientId: comment.author_id,
              recipientName: comment.author_name,
              campaignId: campaign.id,
              commentId: comment.id,
              postUrl: post.post_url
            }, {
              delay: randomBetween(2, 15) * 60 * 1000 // 2-15 min delay
            });

            // Track in database
            await supabase.from('comments').insert({
              post_id: post.id,
              unipile_comment_id: comment.id,
              author_linkedin_id: comment.author_id,
              has_trigger_word: true,
              content: comment.text
            });
          }
        }

        // Update last polled timestamp
        await supabase
          .from('posts')
          .update({ last_polled_at: new Date() })
          .eq('id', post.id);
      }
    }
  }

  start() {
    // Run immediately, then schedule
    this.pollComments();

    // Randomize interval each time to avoid detection
    setInterval(() => {
      this.pollComments();
      this.pollInterval = randomBetween(15, 30) * 60 * 1000;
    }, this.pollInterval);
  }
}
```

**Features:**
1. Randomized polling intervals (15-30 min)
2. Last polled timestamp tracking
3. Trigger word detection (case-insensitive)
4. Comment deduplication
5. Queue integration for DM sending

**Reference Docs:**
- spec.md lines 118-131 (Step 3: Comment Monitoring)
- COMPREHENSIVE-LEAD-FLOW.md lines 146-186

---

### T009: BullMQ DM Automation (8 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Queue Implementation

**Description:**
Implement rate-limited DM queue with BullMQ and Upstash Redis.

**Rate Limits:**
- Max 50 DMs/day per account
- Min 2 minutes between DMs
- Random delays 2-15 minutes

**Implementation:**

```typescript
// DM Queue Worker
import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.UPSTASH_REDIS_URL);
const dmQueue = new Queue('dms', { connection: redis });

const dmWorker = new Worker('dms', async (job) => {
  const { recipientId, campaignId, step } = job.data;

  // Check daily limit
  const dailyCount = await getDailyDMCount(job.data.accountId);
  if (dailyCount >= 50) {
    // Reschedule for tomorrow
    await job.moveToDelayed(getTomorrowStart().getTime());
    return;
  }

  // Get campaign and templates
  const campaign = await getCampaign(campaignId);

  // Generate message with copywriting + voice
  const message = await generatePersonalizedDM({
    step: step, // 1, 2, or 3
    recipientName: job.data.recipientName,
    leadMagnetName: campaign.lead_magnet.name,
    template: campaign[`dm_template_step${step}`]
  });

  try {
    // Send via Unipile
    const result = await unipile.sendMessage({
      recipientId: recipientId,
      message: message
    });

    // Track in dm_sequences
    await supabase.from('dm_sequences').update({
      [`step${step}_sent_at`]: new Date(),
      [`step${step}_message`]: message,
      [`step${step}_unipile_message_id`]: result.message_id
    }).eq('lead_id', job.data.leadId);

    // Increment daily count
    await incrementDailyDMCount(job.data.accountId);

  } catch (error) {
    // Retry with exponential backoff
    throw error; // BullMQ will handle retries
  }
}, {
  connection: redis,
  concurrency: 1, // Process one at a time
  limiter: {
    max: 1,
    duration: 120000 // Min 2 minutes between DMs
  }
});

// Helper for personalized message generation
async function generatePersonalizedDM(params) {
  // Step 1: Copywriting skill
  const professionalCopy = await copywritingSkill.generate({
    type: 'dm_message',
    step: params.step,
    context: params
  });

  // Step 2: Voice cartridge
  const userCartridge = await getUserCartridge();
  const personalizedMessage = await voiceCartridge.transform(
    professionalCopy,
    userCartridge
  );

  return personalizedMessage;
}
```

**Features:**
1. Upstash Redis connection
2. Rate limiting (50/day, 2 min between)
3. Random delays for human-like behavior
4. Retry logic with exponential backoff
5. Daily limit tracking and reset
6. Integration with copywriting + voice

**Reference Docs:**
- spec.md lines 133-157 (Step 4: Initial DM)
- THREE-STEP-DM-SEQUENCE.md (complete DM flow)

---

## Session 4: Lead Capture + Webhook Delivery (20 points)

### T010: Email Extraction Pipeline (5 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** AI Integration

**Description:**
Extract emails from DM replies using regex + GPT-4 validation.

**Implementation:**

```typescript
// Email extraction from DM replies
class EmailExtractor {
  async extractFromDMReply(message: string): Promise<{
    success: boolean;
    email?: string;
    needsClarification?: boolean;
  }> {
    // Step 1: Try regex extraction
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = message.match(emailRegex);

    if (!matches || matches.length === 0) {
      // Step 2: Try GPT-4 extraction for complex cases
      const gptResult = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: 'Extract email address from this message. Return only the email or "none".'
        }, {
          role: 'user',
          content: message
        }]
      });

      const extracted = gptResult.choices[0].message.content;

      if (extracted === 'none') {
        return {
          success: false,
          needsClarification: true
        };
      }

      return {
        success: true,
        email: extracted
      };
    }

    // Multiple emails found
    if (matches.length > 1) {
      // Ask for clarification
      return {
        success: false,
        needsClarification: true
      };
    }

    // Validate email format
    const email = matches[0].toLowerCase();
    if (this.isValidEmail(email)) {
      return {
        success: true,
        email: email
      };
    }

    return {
      success: false,
      needsClarification: true
    };
  }

  private isValidEmail(email: string): boolean {
    // RFC 5322 compliant validation
    const validRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return validRegex.test(email);
  }
}

// Webhook for new DM messages (this one EXISTS in Unipile)
app.post('/api/webhooks/unipile/new-message', async (req, res) => {
  const { conversation_id, message, sender_id } = req.body;

  // Find related DM sequence
  const sequence = await supabase
    .from('dm_sequences')
    .select('*')
    .eq('unipile_conversation_id', conversation_id)
    .single();

  if (sequence.data && !sequence.data.email_extracted) {
    const extractor = new EmailExtractor();
    const result = await extractor.extractFromDMReply(message);

    if (result.success) {
      // Update lead with email
      await supabase.from('leads').update({
        email: result.email,
        status: 'email_captured'
      }).eq('id', sequence.data.lead_id);

      // Send Step 2: Confirmation DM
      await dmQueue.add('send-confirmation-dm', {
        leadId: sequence.data.lead_id,
        email: result.email
      });
    } else if (result.needsClarification) {
      // Send clarification DM
      await dmQueue.add('send-clarification-dm', {
        leadId: sequence.data.lead_id,
        reason: 'email_not_found'
      });
    }
  }
});
```

**Features:**
1. Regex email extraction
2. GPT-4 fallback for complex cases
3. Multiple email handling
4. Email validation
5. Clarification requests
6. Status updates

**Reference Docs:**
- spec.md lines 159-177 (Step 5: Confirmation DM)
- THREE-STEP-DM-SEQUENCE.md lines 329-383

---

### T011: Webhook to Client ESP (10 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Integration

**Description:**
POST lead data to client's webhook endpoint (Zapier, Make, or direct ESP).

**CRITICAL:** We do NOT send emails. We only POST data to webhooks. Client's ESP handles email delivery.

**Implementation:**

```typescript
// Webhook delivery service
class WebhookDeliveryService {
  async sendToClientWebhook(lead: Lead, campaign: Campaign) {
    const webhookConfig = await getWebhookConfig(campaign.webhook_config_id);

    // Prepare payload
    const payload = {
      // Lead data
      email: lead.email,
      first_name: lead.first_name,
      last_name: lead.last_name,
      linkedin_url: lead.linkedin_url,

      // Lead magnet info
      lead_magnet_name: campaign.lead_magnet.name,
      lead_magnet_url: await this.generateDownloadUrl(campaign.lead_magnet_id),

      // Campaign info
      campaign_id: campaign.id,
      campaign_name: campaign.name,

      // Metadata
      captured_at: new Date().toISOString(),
      source: 'linkedin_comment',
      metadata: {
        post_url: lead.source_post_url,
        trigger_word: campaign.trigger_word
      }
    };

    // Add HMAC signature if configured
    const headers: any = {
      'Content-Type': 'application/json',
      'X-RevOS-Event': 'lead.captured',
      'X-RevOS-Timestamp': Date.now().toString()
    };

    if (webhookConfig.secret) {
      headers['X-RevOS-Signature'] = this.generateHMAC(payload, webhookConfig.secret);
    }

    // Send with retry logic
    return await this.sendWithRetry(
      webhookConfig.url,
      payload,
      headers,
      webhookConfig
    );
  }

  private async sendWithRetry(
    url: string,
    payload: any,
    headers: any,
    config: WebhookConfig
  ): Promise<WebhookDelivery> {
    let lastError: Error;

    for (let attempt = 1; attempt <= config.max_retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(config.timeout_ms)
        });

        // Log delivery
        const delivery = await supabase.from('webhook_deliveries').insert({
          webhook_config_id: config.id,
          lead_id: payload.lead_id,
          payload: payload,
          status: response.ok ? 'success' : 'failed',
          status_code: response.status,
          response_body: await response.text(),
          attempt_count: attempt,
          delivered_at: new Date()
        }).select().single();

        if (response.ok) {
          return delivery.data;
        }

        // Don't retry client errors (except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`Client error: ${response.status}`);
        }

        lastError = new Error(`Server error: ${response.status}`);

      } catch (error) {
        lastError = error;

        // Log failed attempt
        await supabase.from('webhook_deliveries').insert({
          webhook_config_id: config.id,
          lead_id: payload.lead_id,
          payload: payload,
          status: 'failed',
          error_message: error.message,
          attempt_count: attempt
        });
      }

      // Wait before retry (exponential backoff)
      if (attempt < config.max_retries) {
        const delay = config.retry_delay_ms * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private generateHMAC(payload: any, secret: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return 'sha256=' + hmac.digest('hex');
  }

  private async generateDownloadUrl(leadMagnetId: string): Promise<string> {
    // Generate 24-hour signed URL from Supabase Storage
    const { data, error } = await supabase.storage
      .from('lead-magnets')
      .createSignedUrl(leadMagnetId, 86400); // 24 hours

    if (error) throw error;
    return data.signedUrl;
  }
}
```

**Features:**
1. Configurable webhook endpoints
2. HMAC signature for security
3. Retry with exponential backoff
4. Timeout handling (30s default)
5. Delivery logging and analytics
6. ESP presets (Zapier, Make, ConvertKit)

**ESP Integrations:**
- Zapier webhook catch
- Make (Integromat) webhook
- ConvertKit API
- ActiveCampaign API
- Custom endpoints

**Reference Docs:**
- spec.md lines 179-194 (Step 6: Webhook to ESP)
- WEBHOOK-SETTINGS-UI.md (complete webhook spec)

---

### T012: Backup DM with Direct Link (5 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Feature

**Description:**
Send backup DM with direct download link 5 minutes after confirmation.

**Implementation:**

```typescript
// Backup DM service
class BackupDMService {
  async scheduleBackupDM(lead: Lead, campaign: Campaign) {
    // Schedule for 5 minutes after confirmation
    await dmQueue.add('send-backup-dm', {
      leadId: lead.id,
      campaignId: campaign.id,
      step: 3
    }, {
      delay: 5 * 60 * 1000 // 5 minutes
    });
  }

  async sendBackupDM(leadId: string, campaignId: string) {
    const campaign = await getCampaign(campaignId);
    const lead = await getLead(leadId);

    // Check if backup DM is enabled
    if (!campaign.settings.dmSequence.step3Enabled) {
      return; // Skip if disabled
    }

    // Generate secure download link
    const downloadUrl = await this.generateSecureLink(
      campaign.lead_magnet_id,
      {
        expiresIn: 24 * 3600, // 24 hours
        leadId: leadId,
        campaignId: campaignId
      }
    );

    // Optional: Shorten URL
    const finalUrl = campaign.settings.useLinkShortener
      ? await this.shortenUrl(downloadUrl)
      : downloadUrl;

    // Generate message with voice filter
    const message = await this.generateBackupMessage({
      recipientName: lead.first_name,
      leadMagnetName: campaign.lead_magnet.name,
      downloadUrl: finalUrl,
      expiresIn: '24 hours'
    });

    // Send via Unipile
    const result = await unipile.sendMessage({
      recipientId: lead.linkedin_id,
      message: message
    });

    // Track in dm_sequences
    await supabase.from('dm_sequences').update({
      step3_sent_at: new Date(),
      step3_message: message,
      step3_unipile_message_id: result.message_id,
      download_url: finalUrl,
      download_url_expires_at: new Date(Date.now() + 24 * 3600 * 1000)
    }).eq('lead_id', leadId);
  }

  private async generateBackupMessage(params: any): Promise<string> {
    const templates = {
      professional: `Hi {first_name},

As promised, here's your direct access link to the {lead_magnet_name}:

{download_url}

This link expires in {expires_in}, so please download it now.

The email should also be in your inbox, but I wanted to make sure you got this either way.`,

      casual: `Hey {first_name}!

Here's that backup link I promised 🎁

{lead_magnet_name}: {download_url}

(Link expires in {expires_in} so grab it now!)

Should also be in your email, but wanted to make sure you got it 💪`
    };

    // Apply copywriting skill + voice cartridge
    const copy = await copywritingSkill.generate({
      type: 'dm_backup',
      template: templates[params.voiceStyle],
      params: params
    });

    const cartridge = await getUserCartridge();
    return await voiceCartridge.transform(copy, cartridge);
  }
}
```

**Features:**
1. 5-minute delay after confirmation
2. Secure 24-hour download links
3. Optional URL shortening
4. Toggle to enable/disable
5. Voice personalization

**Reference Docs:**
- spec.md lines 196-211 (Step 7: Backup DM)
- THREE-STEP-DM-SEQUENCE.md lines 385-468

---

## Session 5: Engagement Pods (15 points)

### T013: Pod Infrastructure (5 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Backend Development

**Description:**
Create database and API for engagement pod management.

**CRITICAL:** EVERYONE in pod engages with EVERYTHING. No rotation, no selection.

**Implementation:**

```typescript
// Pod management service
class EngagementPodService {
  async createPod(name: string, clientId: string): Promise<Pod> {
    // Minimum 9 members required
    const pod = await supabase.from('pods').insert({
      name: name,
      client_id: clientId,
      min_members: 9,
      auto_engage: true, // ALWAYS true
      engagement_window_minutes: 30, // Critical for likes
      comment_window_minutes: 180,
      status: 'active'
    }).select().single();

    return pod.data;
  }

  async addMember(podId: string, userId: string, linkedinAccountId: string) {
    // Check minimum members
    const memberCount = await supabase
      .from('pod_members')
      .select('id', { count: 'exact' })
      .eq('pod_id', podId);

    const member = await supabase.from('pod_members').insert({
      pod_id: podId,
      user_id: userId,
      linkedin_account_id: linkedinAccountId,
      role: memberCount.count === 0 ? 'owner' : 'member',
      participation_score: 1.00,
      status: 'active'
    }).select().single();

    // Alert pod if we now have minimum members
    if (memberCount.count + 1 === 9) {
      await this.notifyPod(podId, 'Pod is now active with minimum members!');
    }

    return member.data;
  }

  async validatePod(podId: string): Promise<boolean> {
    const members = await supabase
      .from('pod_members')
      .select('*')
      .eq('pod_id', podId)
      .eq('status', 'active');

    return members.data.length >= 9;
  }
}
```

**Database Schema:**
```sql
-- Pods table
CREATE TABLE pods (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  min_members INTEGER DEFAULT 9,
  auto_engage BOOLEAN DEFAULT true,
  engagement_window_minutes INTEGER DEFAULT 30,
  comment_window_minutes INTEGER DEFAULT 180,
  status TEXT DEFAULT 'active'
);

-- Pod members
CREATE TABLE pod_members (
  id UUID PRIMARY KEY,
  pod_id UUID REFERENCES pods(id),
  user_id UUID REFERENCES users(id),
  linkedin_account_id UUID REFERENCES linkedin_accounts(id),
  role TEXT DEFAULT 'member',
  participation_score DECIMAL(3,2) DEFAULT 1.00,
  total_engagements INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active'
);

-- Pod activities
CREATE TABLE pod_activities (
  id UUID PRIMARY KEY,
  pod_id UUID REFERENCES pods(id),
  post_url TEXT NOT NULL,
  post_author_id UUID REFERENCES pod_members(id),
  engagement_type TEXT, -- like, comment, repost
  member_id UUID REFERENCES pod_members(id),
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
);
```

**Features:**
1. Minimum 9 members validation
2. Participation tracking
3. Activity logging
4. Pod health monitoring
5. Member management UI

**Reference Docs:**
- spec.md lines 213-221 (Engagement Pods)
- data-model.md lines 663-719 (pod tables)

---

### T014: LinkedIn Session Capture for Pods (5 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Integration

**Description:**
Capture LinkedIn sessions for each pod member via Unipile.

**Implementation:**

```typescript
// Pod member LinkedIn authentication
class PodMemberAuth {
  async authenticateMember(
    userId: string,
    podId: string,
    linkedinEmail: string,
    linkedinPassword: string
  ): Promise<PodMember> {
    // Step 1: Authenticate with Unipile
    const unipileSession = await unipile.auth({
      provider: 'linkedin',
      username: linkedinEmail,
      password: linkedinPassword
    });

    // Step 2: Store LinkedIn account
    const linkedinAccount = await supabase.from('linkedin_accounts').insert({
      user_id: userId,
      account_name: `Pod Member - ${podId}`,
      linkedin_email: encrypt(linkedinEmail),
      linkedin_password: encrypt(linkedinPassword),
      unipile_account_id: unipileSession.account_id,
      unipile_session: encrypt(unipileSession),
      session_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'active'
    }).select().single();

    // Step 3: Add to pod
    const podMember = await supabase.from('pod_members').insert({
      pod_id: podId,
      user_id: userId,
      linkedin_account_id: linkedinAccount.data.id,
      status: 'active'
    }).select().single();

    return podMember.data;
  }

  async refreshExpiredSessions() {
    // Find expiring sessions
    const expiringSessions = await supabase
      .from('linkedin_accounts')
      .select('*')
      .lt('session_expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days

    for (const session of expiringSessions.data) {
      try {
        // Re-authenticate with stored credentials
        const newSession = await unipile.auth({
          provider: 'linkedin',
          username: decrypt(session.linkedin_email),
          password: decrypt(session.linkedin_password)
        });

        // Update session
        await supabase.from('linkedin_accounts').update({
          unipile_session: encrypt(newSession),
          session_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: 'active'
        }).eq('id', session.id);

      } catch (error) {
        // Mark as needing re-authentication
        await supabase.from('linkedin_accounts').update({
          status: 'expired'
        }).eq('id', session.id);
      }
    }
  }
}
```

**Features:**
1. Unipile hosted auth for each member
2. Encrypted credential storage
3. Session refresh before expiry
4. Multi-account management
5. Health monitoring

**Reference Docs:**
- spec.md lines 311-318 (Unipile Authentication)

---

### T015: Pod Automation Engine (5 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Automation

**Description:**
Implement automatic engagement when any pod member posts.

**CRITICAL BEHAVIOR:**
- When ANY member posts, ALL other members engage
- Like within 30 minutes (algorithm window)
- Comment within 1-3 hours
- Instant repost (NOT "repost with thoughts")
- NO selection, NO rotation - EVERYONE participates

**Implementation:**

```typescript
// Pod automation engine
class PodAutomationEngine {
  async onPodMemberPost(postUrl: string, postAuthorId: string, podId: string) {
    // Get ALL pod members except the author
    const members = await supabase
      .from('pod_members')
      .select('*, linkedin_accounts(*)')
      .eq('pod_id', podId)
      .eq('status', 'active')
      .neq('id', postAuthorId);

    // CRITICAL: EVERYONE engages with EVERYTHING
    for (const member of members.data) {
      // Schedule LIKE (within 30 minutes - critical window)
      const likeDelay = this.randomBetween(1, 30) * 60 * 1000;
      await engagementQueue.add('like-post', {
        accountId: member.linkedin_account_id,
        postUrl: postUrl,
        memberId: member.id,
        podId: podId
      }, {
        delay: likeDelay
      });

      // Schedule COMMENT (within 1-3 hours)
      const commentDelay = this.randomBetween(30, 180) * 60 * 1000;
      await engagementQueue.add('comment-post', {
        accountId: member.linkedin_account_id,
        postUrl: postUrl,
        memberId: member.id,
        podId: podId,
        generateComment: true // Use AI to generate relevant comment
      }, {
        delay: commentDelay
      });

      // Schedule INSTANT REPOST (not "repost with thoughts" - 12x less effective)
      const repostDelay = this.randomBetween(5, 60) * 60 * 1000;
      await engagementQueue.add('repost-instant', {
        accountId: member.linkedin_account_id,
        postUrl: postUrl,
        memberId: member.id,
        podId: podId,
        instantRepost: true // CRITICAL: Just repost, no commentary
      }, {
        delay: repostDelay
      });

      // Track scheduled activities
      await this.trackActivities(podId, member.id, postUrl, [
        { type: 'like', scheduledFor: new Date(Date.now() + likeDelay) },
        { type: 'comment', scheduledFor: new Date(Date.now() + commentDelay) },
        { type: 'repost', scheduledFor: new Date(Date.now() + repostDelay) }
      ]);
    }
  }

  // Worker for processing engagements
  async processEngagement(job: Job) {
    const { accountId, postUrl, type } = job.data;

    switch (type) {
      case 'like-post':
        await unipile.likePost({
          accountId: accountId,
          postUrl: postUrl
        });
        break;

      case 'comment-post':
        // Generate relevant comment with voice
        const comment = await this.generateComment(postUrl);
        await unipile.commentOnPost({
          accountId: accountId,
          postUrl: postUrl,
          comment: comment
        });
        break;

      case 'repost-instant':
        // CRITICAL: Instant repost, not "repost with thoughts"
        await unipile.repostInstant({
          accountId: accountId,
          postUrl: postUrl
        });
        break;
    }

    // Update activity status
    await supabase.from('pod_activities').update({
      executed_at: new Date(),
      status: 'completed'
    }).eq('id', job.data.activityId);

    // Update participation score
    await this.updateParticipationScore(job.data.memberId, 'completed');
  }

  private async generateComment(postUrl: string): Promise<string> {
    // Fetch post content
    const postContent = await unipile.getPost(postUrl);

    // Generate relevant comment
    const comment = await copywritingSkill.generate({
      type: 'pod_comment',
      framework: 'VALUE', // Value-first framework
      context: {
        postContent: postContent,
        instruction: 'Add value, agree with point, ask relevant question'
      }
    });

    // Apply voice cartridge
    const cartridge = await getUserCartridge();
    return await voiceCartridge.transform(comment, cartridge);
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
```

**Why This Works:**
- LinkedIn algorithm heavily weights engagement in first 30 min - 3 hours
- Pod engagement may be discounted ~30% but volume overcomes this
- Instant repost is 12x more effective than "repost with thoughts"
- Everyone engaging creates viral coefficient

**Features:**
1. 100% participation (no exceptions)
2. Critical timing windows
3. AI-generated relevant comments
4. Instant repost (not with commentary)
5. Participation tracking

**Reference Docs:**
- spec.md lines 213-221 (Critical Understanding)
- FINAL-CORRECTIONS-SUMMARY.md lines 16-24

---

## Session 6: AgentKit + Mem0 Integration (10 points)

### T016: AgentKit Campaign Orchestration (5 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** AI Integration

**Description:**
Integrate AgentKit for AI-powered campaign management.

**Implementation:**

```typescript
// AgentKit integration
import { Agent } from '@agentkit/core';

class CampaignAgent extends Agent {
  tools = [
    {
      name: 'createCampaign',
      description: 'Create a new lead generation campaign',
      parameters: {
        name: { type: 'string' },
        triggerWord: { type: 'string' },
        leadMagnetId: { type: 'string' }
      },
      handler: async (params) => {
        return await this.createCampaign(params);
      }
    },
    {
      name: 'optimizeMessage',
      description: 'Optimize DM message for conversion',
      parameters: {
        message: { type: 'string' },
        objective: { type: 'string' }
      },
      handler: async (params) => {
        return await this.optimizeDM(params);
      }
    },
    {
      name: 'analyzePerformance',
      description: 'Analyze campaign performance and suggest improvements',
      parameters: {
        campaignId: { type: 'string' }
      },
      handler: async (params) => {
        return await this.analyzeCampaign(params);
      }
    },
    {
      name: 'generatePostContent',
      description: 'Generate LinkedIn post with trigger word',
      parameters: {
        leadMagnet: { type: 'object' },
        triggerWord: { type: 'string' }
      },
      handler: async (params) => {
        // Use copywriting skill + voice
        const copy = await copywritingSkill.generate({
          type: 'linkedin_post',
          framework: 'AIDA',
          leadMagnet: params.leadMagnet,
          triggerWord: params.triggerWord
        });

        const cartridge = await getUserCartridge();
        return await voiceCartridge.transform(copy, cartridge);
      }
    }
  ];

  async executeTask(task: string, context: any) {
    // AgentKit orchestration
    const plan = await this.plan(task, context);

    for (const step of plan.steps) {
      const result = await this.executeTool(step.tool, step.params);

      // Store in memory for learning
      await mem0.add({
        type: 'task_execution',
        task: task,
        step: step,
        result: result,
        success: result.success
      });
    }

    return plan;
  }
}

// Usage in API
app.post('/api/ai/campaign-assistant', async (req, res) => {
  const { prompt, context } = req.body;

  const agent = new CampaignAgent();
  const result = await agent.executeTask(prompt, {
    userId: req.user.id,
    ...context
  });

  res.json(result);
});
```

**Features:**
1. Campaign creation wizard
2. DM optimization
3. Performance analysis
4. Content generation
5. Custom tools for campaign ops

**Reference Docs:**
- spec.md line 53 (AgentKit for orchestration)

---

### T017: Mem0 Memory System (5 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Integration

**Description:**
Implement Mem0 for persistent memory and learning.

**Implementation:**

```typescript
// Mem0 integration
import { MemoryClient } from '@mem0/client';

class MemoryService {
  private client: MemoryClient;

  constructor() {
    this.client = new MemoryClient({
      apiKey: process.env.MEM0_API_KEY,
      orgId: process.env.MEM0_ORG_ID
    });
  }

  // Store successful patterns
  async storeSuccess(userId: string, data: any) {
    // Use composite key for multi-tenancy
    const memoryKey = `${data.clientId}::${userId}`;

    await this.client.add({
      userId: memoryKey,
      messages: [{
        role: 'system',
        content: `Successful ${data.type}: ${JSON.stringify(data)}`
      }],
      metadata: {
        type: data.type,
        success_metrics: data.metrics,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Retrieve relevant memories for optimization
  async getRelevantMemories(userId: string, query: string) {
    const memoryKey = `${this.getClientId()}::${userId}`;

    const memories = await this.client.search({
      userId: memoryKey,
      query: query,
      limit: 10
    });

    return memories;
  }

  // Learn from campaign performance
  async learnFromCampaign(campaignId: string) {
    const campaign = await getCampaign(campaignId);
    const metrics = await getCampaignMetrics(campaignId);

    if (metrics.conversionRate > 0.15) { // 15% or higher
      // Store successful patterns
      await this.storeSuccess(campaign.user_id, {
        type: 'high_converting_campaign',
        clientId: campaign.client_id,
        triggerWord: campaign.trigger_word,
        postContent: campaign.posts[0]?.content,
        dmTemplates: {
          step1: campaign.dm_template_step1,
          step2: campaign.dm_template_step2
        },
        metrics: {
          conversionRate: metrics.conversionRate,
          totalLeads: metrics.totalLeads,
          engagementRate: metrics.engagementRate
        }
      });
    }
  }

  // Use memories to improve generation
  async enhanceWithMemory(
    userId: string,
    generationType: string,
    baseContent: string
  ): Promise<string> {
    // Get relevant memories
    const memories = await this.getRelevantMemories(
      userId,
      `successful ${generationType}`
    );

    if (memories.length === 0) {
      return baseContent;
    }

    // Use GPT-4 to incorporate learnings
    const enhancedContent = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: 'Improve this content using these successful patterns.'
      }, {
        role: 'user',
        content: `
          Base content: ${baseContent}

          Successful patterns:
          ${memories.map(m => m.memory).join('\n')}

          Improve the base content using these learnings.
        `
      }]
    });

    return enhancedContent.choices[0].message.content;
  }
}

// PGVector for semantic search
class VectorMemoryService {
  async storeEmbedding(content: string, metadata: any) {
    // Generate embedding
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content
    });

    // Store in database with PGVector
    await supabase.from('memories').insert({
      content: content,
      embedding: embedding.data[0].embedding,
      metadata: metadata,
      user_id: metadata.userId,
      memory_type: metadata.type
    });
  }

  async semanticSearch(query: string, userId: string, limit = 10) {
    // Generate query embedding
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    });

    // Semantic search using PGVector
    const { data } = await supabase.rpc('semantic_search', {
      query_embedding: queryEmbedding.data[0].embedding,
      user_id: userId,
      match_threshold: 0.8,
      match_count: limit
    });

    return data;
  }
}
```

**Pricing:** $20/month for Mem0 Pro

**Features:**
1. Tenant isolation with composite keys
2. Success pattern storage
3. Campaign learning
4. Memory-enhanced generation
5. Semantic search with PGVector

**Reference Docs:**
- spec.md lines 52, 361-374 (Memory System)
- data-model.md lines 776-795 (memories table)

---

## Session 7: Testing + Monitoring (5 points)

### T018: Real-time Monitoring Dashboard (3 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Frontend Development

**Description:**
Build real-time analytics dashboard with key metrics.

**Implementation:**

```tsx
// Real-time monitoring dashboard
function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<Metrics>();

  // Real-time subscriptions
  useEffect(() => {
    const subscription = supabase
      .channel('metrics')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads'
      }, (payload) => {
        updateMetrics(payload);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Key Metrics */}
      <MetricCard
        title="Active Campaigns"
        value={metrics?.activeCampaigns || 0}
        change={metrics?.campaignChange}
        icon={<CampaignIcon />}
      />

      <MetricCard
        title="Leads Today"
        value={metrics?.leadsToday || 0}
        change={metrics?.leadChange}
        icon={<UserIcon />}
      />

      <MetricCard
        title="Conversion Rate"
        value={`${metrics?.conversionRate || 0}%`}
        change={metrics?.conversionChange}
        icon={<TrendingUpIcon />}
      />

      <MetricCard
        title="DMs Remaining"
        value={`${50 - (metrics?.dmsToday || 0)}/50`}
        subtitle="Daily limit"
        icon={<MessageIcon />}
      />

      {/* Conversion Funnel */}
      <div className="col-span-2">
        <ConversionFunnel
          data={[
            { stage: 'Comments', value: metrics?.totalComments || 0 },
            { stage: 'Trigger Words', value: metrics?.triggerComments || 0 },
            { stage: 'DMs Sent', value: metrics?.dmsSent || 0 },
            { stage: 'Emails Captured', value: metrics?.emailsCaptured || 0 },
            { stage: 'Webhooks Delivered', value: metrics?.webhooksDelivered || 0 },
            { stage: 'Downloads', value: metrics?.downloads || 0 }
          ]}
        />
      </div>

      {/* Pod Activity Heatmap */}
      <div className="col-span-2">
        <PodActivityHeatmap
          data={metrics?.podActivity || []}
          title="Pod Engagement (Last 7 Days)"
        />
      </div>

      {/* Rate Limit Warnings */}
      <div className="col-span-4">
        <RateLimitStatus
          dms={{ used: metrics?.dmsToday || 0, limit: 50 }}
          posts={{ used: metrics?.postsToday || 0, limit: 25 }}
          apiCalls={{ used: metrics?.apiCallsHour || 0, limit: 1000 }}
        />
      </div>

      {/* Recent Activity Feed */}
      <div className="col-span-4">
        <ActivityFeed
          activities={metrics?.recentActivities || []}
          limit={20}
        />
      </div>
    </div>
  );
}

// Metric calculation service
class MetricsService {
  async calculateMetrics(clientId: string): Promise<Metrics> {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    // Parallel queries for performance
    const [
      campaigns,
      leadsToday,
      dmsToday,
      conversions,
      podActivity
    ] = await Promise.all([
      supabase.from('campaigns').select('*', { count: 'exact' })
        .eq('client_id', clientId).eq('status', 'active'),

      supabase.from('leads').select('*', { count: 'exact' })
        .eq('client_id', clientId).gte('created_at', todayStart),

      supabase.from('dm_sequences').select('*', { count: 'exact' })
        .gte('step1_sent_at', todayStart),

      this.calculateConversionFunnel(clientId),

      this.getPodActivity(clientId, 7)
    ]);

    return {
      activeCampaigns: campaigns.count,
      leadsToday: leadsToday.count,
      dmsToday: dmsToday.count,
      conversionRate: conversions.rate,
      podActivity: podActivity,
      // ... more metrics
    };
  }
}
```

**Features:**
1. Real-time Supabase subscriptions
2. Conversion funnel visualization
3. Pod activity heatmap
4. Rate limit monitoring
5. Activity feed

**Charts:** Using Recharts library

**Reference Docs:**
- spec.md lines 448-456 (Monitoring & Observability)

---

### T019: End-to-End Testing Suite (2 points)
**Branch:** `lead-magnet-features`
**Assignee:** AI Assistant
**Type:** Testing

**Description:**
Create comprehensive test suite for complete lead flow.

**Implementation:**

```typescript
// E2E test suite
describe('Lead Generation Flow', () => {
  let testCampaign: Campaign;
  let testLinkedInAccount: LinkedInAccount;

  beforeAll(async () => {
    // Setup test data
    testCampaign = await createTestCampaign();
    testLinkedInAccount = await createTestLinkedInAccount();
  });

  test('Complete flow: Post → Comment → DM → Email → Webhook → Backup', async () => {
    // Step 1: Create post with trigger word
    const post = await createPost({
      campaignId: testCampaign.id,
      content: 'Test leadership content. Comment TESTLEAD below for guide.',
      triggerWord: 'TESTLEAD'
    });
    expect(post.status).toBe('published');

    // Step 2: Simulate comment with trigger word
    const comment = await simulateComment({
      postId: post.id,
      authorId: 'test_linkedin_user',
      content: 'TESTLEAD - interested in this!'
    });

    // Step 3: Wait for comment detection (polling)
    await waitFor(async () => {
      const detected = await getComment(comment.id);
      expect(detected.has_trigger_word).toBe(true);
    }, { timeout: 35 * 60 * 1000 }); // Max 35 min (polling interval)

    // Step 4: Verify DM queued
    const dmJob = await getDMJob(comment.author_id);
    expect(dmJob).toBeDefined();
    expect(dmJob.data.step).toBe(1);

    // Step 5: Process DM queue
    await processDMQueue();

    // Step 6: Verify DM sent
    const dmSequence = await getDMSequence(comment.author_id);
    expect(dmSequence.step1_sent_at).toBeDefined();
    expect(dmSequence.step1_message).toContain('email');

    // Step 7: Simulate email reply
    const emailReply = await simulateDMReply({
      conversationId: dmSequence.conversation_id,
      message: 'Sure, my email is test@example.com'
    });

    // Step 8: Verify email extraction
    await waitFor(async () => {
      const lead = await getLead(dmSequence.lead_id);
      expect(lead.email).toBe('test@example.com');
      expect(lead.status).toBe('email_captured');
    });

    // Step 9: Verify confirmation DM sent
    await waitFor(async () => {
      const sequence = await getDMSequence(comment.author_id);
      expect(sequence.step2_sent_at).toBeDefined();
      expect(sequence.step2_message).toContain('Check your inbox');
    });

    // Step 10: Verify webhook sent
    const webhookDelivery = await getWebhookDelivery(dmSequence.lead_id);
    expect(webhookDelivery.status).toBe('success');
    expect(webhookDelivery.payload.email).toBe('test@example.com');

    // Step 11: Wait 5 minutes for backup DM
    await sleep(5 * 60 * 1000);

    // Step 12: Verify backup DM sent
    const finalSequence = await getDMSequence(comment.author_id);
    expect(finalSequence.step3_sent_at).toBeDefined();
    expect(finalSequence.download_url).toContain('https://');
    expect(finalSequence.step3_message).toContain('backup link');
  });

  test('Pod engagement: Everyone engages with everything', async () => {
    // Create test pod with 9 members
    const pod = await createTestPod(9);

    // Member 1 creates post
    const post = await createPost({
      authorId: pod.members[0].id,
      content: 'Pod test post'
    });

    // Trigger pod automation
    await triggerPodEngagement(post.url, pod.members[0].id, pod.id);

    // Wait for engagement window (30 min for likes)
    await sleep(35 * 60 * 1000);

    // Verify ALL other members engaged
    const activities = await getPodActivities(pod.id, post.url);

    // Should have 8 members × 3 actions = 24 activities
    expect(activities.length).toBe(24);

    // Check each member (except author) has all 3 engagements
    for (let i = 1; i < 9; i++) {
      const memberActivities = activities.filter(a => a.member_id === pod.members[i].id);
      expect(memberActivities.length).toBe(3);

      const types = memberActivities.map(a => a.engagement_type).sort();
      expect(types).toEqual(['comment', 'like', 'repost']);
    }

    // Verify timing windows
    const likes = activities.filter(a => a.engagement_type === 'like');
    likes.forEach(like => {
      const minutesElapsed = (like.executed_at - post.created_at) / 60000;
      expect(minutesElapsed).toBeLessThanOrEqual(30); // Within 30 min
    });
  });

  test('Rate limiting: Respects 50 DMs/day limit', async () => {
    // Queue 60 DMs
    for (let i = 0; i < 60; i++) {
      await dmQueue.add('send-dm', {
        recipientId: `user_${i}`,
        message: 'Test DM'
      });
    }

    // Process queue
    await processDMQueue();

    // Check only 50 were sent today
    const sentToday = await supabase
      .from('dm_sequences')
      .select('*', { count: 'exact' })
      .gte('step1_sent_at', todayStart());

    expect(sentToday.count).toBe(50);

    // Check 10 are scheduled for tomorrow
    const delayedJobs = await dmQueue.getDelayed();
    expect(delayedJobs.length).toBe(10);
  });

  test('Webhook retry: Handles failures with exponential backoff', async () => {
    // Mock webhook to fail twice then succeed
    let attempts = 0;
    mockWebhookServer.use(
      rest.post('/webhook', (req, res, ctx) => {
        attempts++;
        if (attempts < 3) {
          return res(ctx.status(500));
        }
        return res(ctx.json({ success: true }));
      })
    );

    // Trigger webhook delivery
    const delivery = await sendWebhook({
      url: 'http://localhost:3001/webhook',
      payload: { email: 'test@example.com' }
    });

    // Verify 3 attempts
    expect(attempts).toBe(3);
    expect(delivery.status).toBe('success');
    expect(delivery.attempt_count).toBe(3);
  });
});
```

**Test Coverage:**
1. Complete lead flow
2. Pod engagement (everyone engages)
3. Rate limiting enforcement
4. Webhook retry logic
5. Email extraction edge cases
6. Voice transformation

**Reference Docs:**
- spec.md lines 429-446 (Testing Strategy)
- quickstart.md lines 285-301 (Testing commands)

---

## Summary

**Total:** 19 tasks, 100 points across 7 sessions

Each task now includes:
- Rich, detailed descriptions
- Actual code implementations
- Critical warnings and notes
- Direct documentation references
- Specific features to implement

All tasks align with the corrected understanding:
- ✅ ONE app architecture
- ✅ Copywriting → Voice pipeline
- ✅ Everyone engages in pods
- ✅ Webhook-only delivery
- ✅ Comment polling (no webhooks)
- ✅ Multi-tenancy with RLS

Ready for implementation!