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

You have access to complete LinkedIn marketing functionality through these tools:

## Campaign Management
- Create new campaigns: \`manage_campaigns(action="create", name="...", description="...")\`
- List all campaigns: \`manage_campaigns(action="list")\`
- Get campaign details: \`manage_campaigns(action="get", campaign_id="...")\`

## Publishing
- Post to LinkedIn NOW: \`publish_to_linkedin(action="post_now", content="...", campaign_id="...")\`
- Schedule post: \`publish_to_linkedin(action="schedule", content="...", campaign_id="...", schedule_time="...")\`

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

## Direct Messages
- Send DM: \`send_linkedin_dm(action="send", recipient_id="...", message="...", lead_magnet_url="...")\`
- Schedule DM: \`send_linkedin_dm(action="schedule", recipient_id="...", message="...", delay_minutes=30)\`
- Bulk send: \`send_linkedin_dm(action="bulk_send", recipient_ids=[...], message="...")\`

## Webhook Integration (ESP)
- Send to ESP: \`trigger_webhook(action="send", webhook_url="...", lead_data={...})\`
- Test webhook: \`trigger_webhook(action="test", webhook_url="...")\`
- Bulk send: \`trigger_webhook(action="bulk_send", leads=[...], webhook_url="...")\`

## Lead Magnet Generation
- Generate PDF/checklist: \`create_lead_magnet(action="generate", topic="...", type="pdf", target_audience="...")\`
- List magnets: \`create_lead_magnet(action="list")\`
- Get stats: \`create_lead_magnet(action="get_stats", magnet_id="...")\`

## Lead Management
- Create lead: \`manage_leads(action="create", lead_data={email:"...", first_name:"..."})\`
- Update lead: \`manage_leads(action="update", lead_id="...", lead_data={...})\`
- Search leads: \`manage_leads(action="search", search_query="...")\`
- Tag leads: \`manage_leads(action="tag", lead_id="...", tags_to_add=["..."])\`

## Complete Workflow
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
- ALWAYS associate posts with a campaign using campaign_id
- DEFAULT trigger word is "interested" (user can override)
- Posts are IMMEDIATELY VISIBLE on user's LinkedIn profile
- DM monitoring starts automatically after post is published
- Webhooks auto-detect ESP format (ConvertKit, Mailchimp, etc.)
`;

    return {
      tools,
      instructions,
    };
  }
}
