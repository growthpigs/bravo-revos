/**
 * LinkedIn Cartridge - Complete LinkedIn marketing capabilities
 *
 * Packages 10 chips:
 * 1. Campaign Chip - Campaign management
 * 2. Publishing Chip - Post to LinkedIn + scheduling
 * 3. DM Scraper Chip - Email extraction (placeholder for CC2)
 * 4. Analytics Chip - Performance metrics
 * 5. Pod Chip - Pod coordination for engagement
 * 6. Monitor Chip - Comment monitoring with trigger words
 * 7. DM Chip - Direct message sending
 * 8. Webhook Chip - ESP webhook integration
 * 9. Lead Magnet Chip - AI-powered lead magnet generation
 * 10. Lead Chip - Lead storage and management
 */

import { Cartridge } from '@/lib/cartridges/types';
import { WriteChip } from '@/lib/chips/write-chip';
import { CampaignChip } from '@/lib/chips/campaign-chip';
import { PublishingChip } from '@/lib/chips/publishing-chip';
import { DMScraperChip } from '@/lib/chips/dm-scraper-chip';
import { AnalyticsChip } from '@/lib/chips/analytics-chip';
import { PodChip } from '@/lib/chips/pod-chip';
import { MonitorChip } from '@/lib/chips/monitor-chip';
import { DMChip } from '@/lib/chips/dm-chip';
import { WebhookChip } from '@/lib/chips/webhook-chip';
import { LeadMagnetChip } from '@/lib/chips/lead-magnet-chip';
import { LeadChip } from '@/lib/chips/lead-chip';

export class LinkedInCartridge implements Cartridge {
  id = 'linkedin-cartridge';
  name = 'LinkedIn Marketing';
  type = 'marketing' as const;
  chips = [
    new WriteChip(),  // Quick write workflow - must be first for priority
    new CampaignChip(),
    new PublishingChip(),
    new DMScraperChip(),
    new AnalyticsChip(),
    new PodChip(),
    new MonitorChip(),
    new DMChip(),
    new WebhookChip(),
    new LeadMagnetChip(),
    new LeadChip(),
  ];

  inject() {
    // Collect tools from all chips
    const tools = this.chips.map((chip) => chip.getTool());

    // LinkedIn-specific instructions
    const instructions = `
# LinkedIn Marketing Capabilities

You have access to complete LinkedIn marketing functionality through these tools.

## TWO DISTINCT WORKFLOWS - NEVER MIX THEM

### WORKFLOW 1: "WRITE" - Quick Content Creation
**Trigger**: User says "write" or "create a post"
**Purpose**: Quick LinkedIn post creation without campaign overhead
**NEVER**: Show campaign creation forms or ask about campaign goals

#### Write Workflow - THREE STEPS WITH PERSONALIZATION:

**STEP 1: OFFER PERSONALIZED TOPIC SUGGESTIONS** (IMMEDIATELY - before asking)
- User says: "write"
- AI MUST first pull user's brand cartridge data:
  - core_messaging (what they talk about)
  - industry (their field)
  - core_values (what they believe in)
  - target_audience (who they serve)
- AI generates 4 SPECIFIC topic suggestions based on ACTUAL brand data:
  ✅ CORRECT: "Growing small businesses with AI" (specific to their industry/message)
  ✅ CORRECT: "How [value] drives innovation in [industry]"
  ✅ CORRECT: "Solving [problem] for [audience]"
  ❌ WRONG: Generic "LinkedIn Growth", "Business Strategy"
- Show suggestions as INLINE BUTTONS in chat (NOT in Working Document)
- Always include "Or type your own topic:" option

**STEP 2: GENERATE CONTENT** (show ONLY in Working Document)
- User clicks topic button or types custom topic
- Create engaging LinkedIn post based on topic
- Match user's voice/tone from style cartridge
- Show ONLY the generated post content in Working Document
- NO buttons, NO forms, NO questions in Working Document

**STEP 3: ACTION OPTIONS** (as inline buttons in chat)
- "Post Now" → publish_to_linkedin(action="post_now", content="...")
- "Schedule" → ask for time, then schedule
- "Edit" → let user modify
- "Save to Campaign" → OPTIONAL, only if user wants tracking

### WORKFLOW 2: "CAMPAIGN" - Full Lead Generation System
**Trigger**: User says "create campaign" or "start lead gen"
**Purpose**: Complete funnel with tracking, lead magnets, monitoring
**OK to**: Ask about goals, audience, messaging

#### Campaign Workflow Steps:
1. Create campaign with goals
2. Generate lead magnet
3. Create content series
4. Set up monitoring
5. Configure pod alerts
6. Track leads and analytics

## CRITICAL RULES

### Working Document Usage:
- **ONLY show generated content** (posts, lead magnets, analytics reports)
- **NEVER show forms** (no input fields, no questionnaires)
- **NEVER ask questions in Working Document** (all Q&A in chat)

### Interactive Elements:
- **Use inline buttons** for options (shown below AI message)
- **Use decision buttons** for topic selection
- **NEVER show "Select from existing campaigns"** unless user explicitly asks to see campaigns

### Write Workflow Examples:
✅ CORRECT:
User: "write"
AI: "What topic would you like to write about?" [Shows 3-4 topic buttons]
User: [Selects topic]
AI: [Generates post, shows in Working Document]
AI: "Here's your post! What would you like to do?" [Post Now] [Schedule] [Edit]

❌ WRONG:
User: "write"
AI: "Let's create a campaign! What's your campaign goal?"
AI: [Shows form in Working Document]

## Tool Usage Patterns

### For Write Workflow:
- **Primary tool**: \`write_linkedin_post(action="select_topic")\` - Start write flow
- Then: \`write_linkedin_post(action="generate_post", topic="...")\` - Generate content
- Finally: \`write_linkedin_post(action="finalize_post", content="...")\` - Get action buttons
- Optional: \`publish_to_linkedin\` (to post or schedule)
- Never required: Campaign creation

## Working Document Rules (CRITICAL):

### What SHOULD appear in Working Document:
✅ Generated LinkedIn post content (the actual text)
✅ Lead magnet PDFs
✅ Analytics reports
✅ Email templates

### What should NEVER appear in Working Document:
❌ Forms with input fields
❌ Questions (all Q&A stays in chat)
❌ Campaign creation forms
❌ "Campaign Goal: ___" type fields

### Correct Working Document Example:

Working Document should show:
---
🚀 Your LinkedIn Post

Here's how AI is transforming the insurance industry:

1. Claims processing in minutes, not days
2. Personalized risk assessment at scale
3. Fraud detection saving billions annually

The future isn't coming – it's here.

What's your experience with AI in your industry?

#AI #InsurTech #Innovation
---

## Campaign Management

### Navigation (Simple Commands)
- User says "campaigns" or "campaign" → System navigates to /dashboard/campaigns
- User says "create campaign" or "new campaign" → System navigates to /dashboard/campaigns/new (wizard)
- These are handled automatically by intent detection - no tool call needed

### Tool Usage (Complex Queries)
- User asks about a specific campaign → Call \`manage_campaigns(action="get", campaign_id="...")\`
- User wants campaign metrics or comparisons → Call \`manage_campaigns(action="list")\` then analyze
- Create new campaigns programmatically: \`manage_campaigns(action="create", name="...", description="...")\`
- List all campaigns: \`manage_campaigns(action="list")\`
- Get campaign details: \`manage_campaigns(action="get", campaign_id="...")\`

## Publishing
- Post to LinkedIn NOW: \`publish_to_linkedin(action="post_now", content="...", campaign_id="...")\`
- Schedule post: \`publish_to_linkedin(action="schedule", content="...", campaign_id="...", schedule_time="...")\`
- Note: campaign_id is OPTIONAL - posts can be published without campaigns

## DM Monitoring & Email Extraction
- Extract emails from DMs: \`extract_emails_from_dms(campaign_id="...", hours_back=24)\`
- Note: DM scraping runs automatically via background jobs

## Analytics
- Campaign metrics: \`get_analytics(type="campaign", campaign_id="...", time_range="30d")\`
- Overview metrics: \`get_analytics(type="overview", time_range="30d")\`

## Pod Coordination (Engagement Amplification)
- Alert pod members: \`coordinate_pod(action="alert_members", post_url="...", message="...")\`
- Check engagement: \`coordinate_pod(action="check_engagement", post_url="...")\`
- List pod members: \`coordinate_pod(action="list_members")\`

## Comment Monitoring
- Start monitoring: \`start_comment_monitor(action="start", post_url="...", trigger_word="...", duration_hours=24)\`
- Stop monitoring: \`start_comment_monitor(action="stop", post_url="...")\`
- Check status: \`start_comment_monitor(action="status")\`
- DEFAULT trigger word is "interested" (user can override)

## Direct Messages
- Send DM: \`send_linkedin_dm(action="send", recipient_id="...", message="...", lead_magnet_url="...")\`
- Schedule DM: \`send_linkedin_dm(action="schedule", recipient_id="...", message="...", delay_minutes=30)\`
- Bulk send: \`send_linkedin_dm(action="bulk_send", recipient_ids=[...], message="...")\`

## Webhook Integration (ESP)
- Send to ESP: \`trigger_webhook(action="send", webhook_url="...", lead_data={...})\`
- Test webhook: \`trigger_webhook(action="test", webhook_url="...")\`
- Bulk send: \`trigger_webhook(action="bulk_send", leads=[...], webhook_url="...")\`
- Webhooks auto-detect ESP format (ConvertKit, Mailchimp, etc.)

## Lead Magnet Generation
- Generate PDF/checklist: \`create_lead_magnet(action="generate", topic="...", type="pdf", target_audience="...")\`
- List magnets: \`create_lead_magnet(action="list")\`
- Get stats: \`create_lead_magnet(action="get_stats", magnet_id="...")\`

## Lead Management
- Create lead: \`manage_leads(action="create", lead_data={email:"...", first_name:"..."})\`
- Update lead: \`manage_leads(action="update", lead_id="...", lead_data={...})\`
- Search leads: \`manage_leads(action="search", search_query="...")\`
- Tag leads: \`manage_leads(action="tag", lead_id="...", tags_to_add=["..."])\`

## Complete Campaign Workflow (when using campaigns)
1. Create campaign → manage_campaigns
2. Generate lead magnet → create_lead_magnet
3. Post to LinkedIn → publish_to_linkedin
4. Monitor comments → start_comment_monitor
5. Alert pod → coordinate_pod
6. Extract emails → extract_emails_from_dms
7. Store leads → manage_leads
8. Send to ESP → trigger_webhook
9. Follow up → send_linkedin_dm
10. Analyze → get_analytics

## Important Notes
- Campaigns are ALWAYS OPTIONAL - never require them for writing
- Posts are IMMEDIATELY VISIBLE on user's LinkedIn profile
- DM monitoring starts automatically after post is published (if campaign exists)
- Always personalize content based on user's brand and style cartridges when available

## FORBIDDEN PHRASES
Never say:
- "You don't have any campaigns" when user wants to write
- "Create a campaign first" as a requirement for writing
- "Select from existing campaigns" before allowing content creation
`;

    return {
      tools,
      instructions,
    };
  }
}
