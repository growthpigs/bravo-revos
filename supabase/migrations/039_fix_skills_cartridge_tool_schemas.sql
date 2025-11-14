-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
-- Fix Skills Cartridge: Add proper OpenAI function schemas for AgentKit tool chaining
-- This enables the complete LinkedIn lead magnet campaign workflow

UPDATE console_prompts
SET skills_cartridge = jsonb_build_object(
  'tools', jsonb_build_array(

    -- 1. Campaign Management Tool
    jsonb_build_object(
      'name', 'manage_campaigns',
      'description', 'Create, list, or get campaign details for LinkedIn outreach. Use this to organize lead generation efforts.',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'action', jsonb_build_object(
            'type', 'string',
            'enum', jsonb_build_array('list', 'get', 'create'),
            'description', 'Action to perform: list all campaigns, get specific campaign, or create new one'
          ),
          'campaign_id', jsonb_build_object(
            'type', 'string',
            'description', 'Campaign UUID (required for get action)'
          ),
          'name', jsonb_build_object(
            'type', 'string',
            'description', 'Campaign name (required for create action)'
          ),
          'description', jsonb_build_object(
            'type', 'string',
            'description', 'Campaign description (optional for create action)'
          ),
          'voice_id', jsonb_build_object(
            'type', 'string',
            'description', 'Voice cartridge ID for consistent tone (optional for create action)'
          ),
          'lead_magnet_url', jsonb_build_object(
            'type', 'string',
            'description', 'URL to lead magnet offer (PDF, guide, template)'
          ),
          'trigger_word', jsonb_build_object(
            'type', 'string',
            'description', 'Word that triggers DM automation (e.g., "guide")',
            'default', 'guide'
          )
        ),
        'required', jsonb_build_array('action')
      )
    ),

    -- 2. LinkedIn Publishing Tool
    jsonb_build_object(
      'name', 'publish_to_linkedin',
      'description', 'Post content to LinkedIn immediately or schedule for later. Returns post URL for pod sharing.',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'action', jsonb_build_object(
            'type', 'string',
            'enum', jsonb_build_array('post_now', 'schedule'),
            'description', 'Post immediately or schedule for later'
          ),
          'content', jsonb_build_object(
            'type', 'string',
            'description', 'Post content text with lead magnet offer'
          ),
          'campaign_id', jsonb_build_object(
            'type', 'string',
            'description', 'Associated campaign ID'
          ),
          'scheduled_for', jsonb_build_object(
            'type', 'string',
            'description', 'ISO datetime for scheduled posts (required if action=schedule)'
          ),
          'include_lead_magnet_cta', jsonb_build_object(
            'type', 'boolean',
            'description', 'Add call-to-action for lead magnet in comments',
            'default', true
          )
        ),
        'required', jsonb_build_array('action', 'content', 'campaign_id')
      )
    ),

    -- 3. Pod Coordination Tool
    jsonb_build_object(
      'name', 'coordinate_pod',
      'description', 'Alert pod members to engage with posts for amplification. Sends repost links via preferred channels.',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'action', jsonb_build_object(
            'type', 'string',
            'enum', jsonb_build_array('alert_members', 'check_engagement', 'list_members'),
            'description', 'Pod coordination action'
          ),
          'post_url', jsonb_build_object(
            'type', 'string',
            'description', 'LinkedIn post URL to amplify (required for alert_members)'
          ),
          'pod_id', jsonb_build_object(
            'type', 'string',
            'description', 'Pod ID (defaults to user''s primary pod)'
          ),
          'message', jsonb_build_object(
            'type', 'string',
            'description', 'Custom message to pod members (optional)'
          )
        ),
        'required', jsonb_build_array('action')
      )
    ),

    -- 4. Comment Monitor Tool (Background Job)
    jsonb_build_object(
      'name', 'start_comment_monitor',
      'description', 'Monitor LinkedIn post comments for trigger word. Automatically DMs responders with lead magnet.',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'post_id', jsonb_build_object(
            'type', 'string',
            'description', 'LinkedIn post ID to monitor'
          ),
          'trigger_word', jsonb_build_object(
            'type', 'string',
            'description', 'Word that triggers DM automation',
            'default', 'guide'
          ),
          'duration_hours', jsonb_build_object(
            'type', 'number',
            'description', 'How long to monitor (hours)',
            'default', 24
          ),
          'lead_magnet_url', jsonb_build_object(
            'type', 'string',
            'description', 'URL to send in DM'
          ),
          'campaign_id', jsonb_build_object(
            'type', 'string',
            'description', 'Associated campaign ID'
          )
        ),
        'required', jsonb_build_array('post_id', 'lead_magnet_url', 'campaign_id')
      )
    ),

    -- 5. LinkedIn DM Tool
    jsonb_build_object(
      'name', 'send_linkedin_dm',
      'description', 'Send direct message on LinkedIn. Used for lead magnet delivery and follow-ups.',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'recipient_id', jsonb_build_object(
            'type', 'string',
            'description', 'LinkedIn user ID or profile URL'
          ),
          'message', jsonb_build_object(
            'type', 'string',
            'description', 'Message text with personalization'
          ),
          'campaign_id', jsonb_build_object(
            'type', 'string',
            'description', 'Associated campaign ID for tracking'
          ),
          'delay_minutes', jsonb_build_object(
            'type', 'number',
            'description', 'Delay before sending (0 = immediate)',
            'default', 0
          ),
          'is_followup', jsonb_build_object(
            'type', 'boolean',
            'description', 'Is this a follow-up message?',
            'default', false
          )
        ),
        'required', jsonb_build_array('recipient_id', 'message', 'campaign_id')
      )
    ),

    -- 6. Email Extraction Tool
    jsonb_build_object(
      'name', 'extract_email_from_dm',
      'description', 'Extract email addresses from LinkedIn DM conversations using AI pattern matching.',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'dm_thread_id', jsonb_build_object(
            'type', 'string',
            'description', 'DM conversation thread ID'
          ),
          'campaign_id', jsonb_build_object(
            'type', 'string',
            'description', 'Campaign ID to associate extracted emails'
          ),
          'hours_back', jsonb_build_object(
            'type', 'number',
            'description', 'How many hours back to check DMs',
            'default', 24
          ),
          'auto_webhook', jsonb_build_object(
            'type', 'boolean',
            'description', 'Automatically send to ESP webhook?',
            'default', true
          )
        ),
        'required', jsonb_build_array('campaign_id')
      )
    ),

    -- 7. Webhook Trigger Tool
    jsonb_build_object(
      'name', 'trigger_webhook',
      'description', 'Send lead data to user''s Email Service Provider (ConvertKit, Mailchimp, etc) via webhook.',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'webhook_url', jsonb_build_object(
            'type', 'string',
            'description', 'ESP webhook endpoint URL'
          ),
          'lead_data', jsonb_build_object(
            'type', 'object',
            'properties', jsonb_build_object(
              'email', jsonb_build_object('type', 'string'),
              'first_name', jsonb_build_object('type', 'string'),
              'last_name', jsonb_build_object('type', 'string'),
              'linkedin_url', jsonb_build_object('type', 'string'),
              'campaign_id', jsonb_build_object('type', 'string'),
              'lead_magnet', jsonb_build_object('type', 'string'),
              'source', jsonb_build_object('type', 'string', 'default', 'linkedin_dm')
            ),
            'required', jsonb_build_array('email', 'campaign_id')
          ),
          'retry_on_failure', jsonb_build_object(
            'type', 'boolean',
            'description', 'Retry with exponential backoff if webhook fails',
            'default', true
          )
        ),
        'required', jsonb_build_array('webhook_url', 'lead_data')
      )
    ),

    -- 8. Lead Magnet Creation Tool
    jsonb_build_object(
      'name', 'create_lead_magnet',
      'description', 'Generate lead magnet offers using AI (PDFs, templates, guides, checklists).',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'type', jsonb_build_object(
            'type', 'string',
            'enum', jsonb_build_array('pdf_guide', 'checklist', 'template', 'workbook', 'cheatsheet'),
            'description', 'Type of lead magnet to create'
          ),
          'topic', jsonb_build_object(
            'type', 'string',
            'description', 'Topic or title for the lead magnet'
          ),
          'campaign_id', jsonb_build_object(
            'type', 'string',
            'description', 'Associated campaign ID'
          ),
          'outline', jsonb_build_object(
            'type', 'array',
            'items', jsonb_build_object('type', 'string'),
            'description', 'Optional outline/sections for the magnet'
          ),
          'voice_id', jsonb_build_object(
            'type', 'string',
            'description', 'Voice cartridge for consistent tone'
          )
        ),
        'required', jsonb_build_array('type', 'topic', 'campaign_id')
      )
    ),

    -- 9. Lead Storage Tool
    jsonb_build_object(
      'name', 'create_lead',
      'description', 'Save lead information to RevOS database for nurturing and analytics.',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'email', jsonb_build_object(
            'type', 'string',
            'description', 'Lead email address'
          ),
          'linkedin_profile', jsonb_build_object(
            'type', 'string',
            'description', 'LinkedIn profile URL'
          ),
          'campaign_id', jsonb_build_object(
            'type', 'string',
            'description', 'Associated campaign ID'
          ),
          'first_name', jsonb_build_object(
            'type', 'string',
            'description', 'Lead first name'
          ),
          'last_name', jsonb_build_object(
            'type', 'string',
            'description', 'Lead last name'
          ),
          'source', jsonb_build_object(
            'type', 'string',
            'enum', jsonb_build_array('linkedin_dm', 'linkedin_comment', 'manual', 'import'),
            'description', 'Lead source',
            'default', 'linkedin_dm'
          ),
          'metadata', jsonb_build_object(
            'type', 'object',
            'description', 'Additional lead metadata'
          )
        ),
        'required', jsonb_build_array('email', 'campaign_id')
      )
    ),

    -- 10. Analytics Tracking Tool
    jsonb_build_object(
      'name', 'track_analytics',
      'description', 'Monitor campaign performance metrics: impressions, engagement, leads captured, conversion rates.',
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'campaign_id', jsonb_build_object(
            'type', 'string',
            'description', 'Campaign ID to analyze'
          ),
          'metric_type', jsonb_build_object(
            'type', 'string',
            'enum', jsonb_build_array('overview', 'leads', 'engagement', 'pod_performance', 'conversion'),
            'description', 'Type of metrics to retrieve',
            'default', 'overview'
          ),
          'date_range', jsonb_build_object(
            'type', 'object',
            'properties', jsonb_build_object(
              'start', jsonb_build_object('type', 'string', 'description', 'ISO date'),
              'end', jsonb_build_object('type', 'string', 'description', 'ISO date')
            ),
            'description', 'Date range for metrics'
          )
        ),
        'required', jsonb_build_array('campaign_id')
      )
    )
  )
)
WHERE name = 'marketing-console-v1';

-- Add comment explaining the update
COMMENT ON COLUMN console_prompts.skills_cartridge IS 'Full OpenAI function schemas for AgentKit tools - enables LinkedIn lead magnet workflow';

-- Verify the update
SELECT
  name,
  jsonb_array_length(skills_cartridge->'tools') as tool_count,
  jsonb_agg(tool->>'name' ORDER BY tool->>'name') as tool_names
FROM console_prompts
CROSS JOIN jsonb_array_elements(skills_cartridge->'tools') as tool
WHERE name = 'marketing-console-v1'
GROUP BY name, skills_cartridge;