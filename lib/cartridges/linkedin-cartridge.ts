/**
 * LinkedIn Cartridge - Complete LinkedIn marketing capabilities
 *
 * Packages 4 chips:
 * 1. Campaign Chip - Campaign management
 * 2. Publishing Chip - Post to LinkedIn + scheduling
 * 3. DM Scraper Chip - Email extraction (placeholder for CC2)
 * 4. Analytics Chip - Performance metrics
 */

import { Cartridge } from '@/lib/cartridges/types';
import { CampaignChip } from '@/lib/chips/campaign-chip';
import { PublishingChip } from '@/lib/chips/publishing-chip';
import { DMScraperChip } from '@/lib/chips/dm-scraper-chip';
import { AnalyticsChip } from '@/lib/chips/analytics-chip';

export class LinkedInCartridge implements Cartridge {
  id = 'linkedin-cartridge';
  name = 'LinkedIn Marketing';
  type = 'marketing' as const;
  chips = [
    new CampaignChip(),
    new PublishingChip(),
    new DMScraperChip(),
    new AnalyticsChip(),
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

## DM Monitoring
- Extract emails from DMs: \`extract_emails_from_dms(campaign_id="...", hours_back=24)\`
- Note: DM scraping runs automatically via background jobs

## Analytics
- Campaign metrics: \`get_analytics(type="campaign", campaign_id="...", time_range="30d")\`
- Overview metrics: \`get_analytics(type="overview", time_range="30d")\`

## Workflow
1. User creates campaign → manage_campaigns(action="create")
2. User writes content → publish_to_linkedin(action="post_now")
3. System monitors DMs → extract_emails_from_dms (automatic)
4. User checks performance → get_analytics

## Important Notes
- ALWAYS associate posts with a campaign using campaign_id
- DEFAULT trigger word is "interested" (user can override)
- Posts are IMMEDIATELY VISIBLE on user's LinkedIn profile
- DM monitoring starts automatically after post is published
`;

    return {
      tools,
      instructions,
    };
  }
}
