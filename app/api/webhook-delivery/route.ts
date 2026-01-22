/**
 * POST/GET /api/webhook-delivery
 * Deliver leads to client CRM/ESP via webhooks
 *
 * POST test mode:
 *   Send { test: true, webhookUrl, webhookSecret } to test with mock lead data
 *   Useful for testing webhook delivery without real leads in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateWebhookSignature,
  maskWebhookUrl,
  WebhookPayload,
  isValidWebhookUrl,
} from '@/lib/webhook-delivery';
import { queueWebhookDelivery } from '@/lib/queues/webhook-delivery-queue';
import {
  generateLeadMagnetEmail,
  generateFallbackEmail,
} from '@/lib/email-generation/lead-magnet-email';

/**
 * Generate mock lead data for testing
 */
function generateMockLead() {
  const timestamp = new Date().toISOString();
  const leadId = `test-lead-${Date.now()}`;

  return {
    id: leadId,
    email: `lead${Math.floor(Math.random() * 10000)}@example.com`,
    first_name: 'Test',
    last_name: 'Lead',
    linkedin_id: 'mock-linkedin-id-' + Math.random().toString(36).substr(2, 9),
    linkedin_url: 'https://linkedin.com/in/testlead',
    company: 'Test Company Inc.',
    title: 'Software Engineer',
    source: 'comment' as const,
    created_at: timestamp,
    campaigns: {
      id: `campaign-${Date.now()}`,
      name: 'Test Campaign',
      lead_magnets: { name: 'Test Lead Magnet' },
    },
  };
}

/**
 * POST - Queue webhook delivery for a lead
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { test, leadId, webhookUrl, webhookSecret, campaignName, customFields } = body;

    // Validate webhook URL
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'webhookUrl is required' },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    if (!isValidWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        { error: 'Invalid webhook URL. Must be HTTPS (or HTTP for localhost only)' },
        { status: 400 }
      );
    }

    // Get or generate lead data
    let lead;
    if (test) {
      // Test mode: use mock data
      console.log('[WEBHOOK_API] Using test mode with mock lead data');
      lead = generateMockLead();
    } else {
      // Production mode: fetch from database
      if (!leadId) {
        return NextResponse.json(
          { error: 'leadId is required (or set test=true for test mode)' },
          { status: 400 }
        );
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: dbLead, error: leadError } = await supabase
        .from('lead')
        .select(
          `
          id,
          email,
          first_name,
          last_name,
          linkedin_id,
          linkedin_url,
          company,
          title,
          source,
          created_at,
          campaigns (id, name, lead_magnets (name))
        `
        )
        .eq('id', leadId)
        .single();

      if (leadError || !dbLead) {
        console.error(`[WEBHOOK_API] Lead not found: ${leadId}`);
        return NextResponse.json(
          { error: 'Lead not found. Use test=true to test with mock data.' },
          { status: 404 }
        );
      }

      lead = dbLead;
    }

    // Get campaign info
    const campaignData = Array.isArray(lead.campaigns) ? lead.campaigns[0] : (lead.campaigns as any);
    const leadMagnetName = campaignData?.lead_magnets?.[0]?.name || 'Resource';
    const computedCampaignName = campaignName || campaignData?.name || 'Campaign';

    // Generate AI email copy with fallback
    let suggestedEmail;
    try {
      console.log('[WEBHOOK_DELIVERY] Generating AI email...');
      suggestedEmail = await generateLeadMagnetEmail({
        leadMagnetName,
        originalPost: (campaignData?.post_content as string) || '',
        brandVoice: 'professional',
        recipientName: lead.first_name || 'there',
        userFirstName: 'Team',
      });
      console.log('[WEBHOOK_DELIVERY] AI email generated successfully');
    } catch (error) {
      console.error('[WEBHOOK_DELIVERY] AI email generation failed, using fallback:', error);
      suggestedEmail = generateFallbackEmail(
        leadMagnetName,
        lead.first_name || 'there',
        'Team'
      );
    }

    // Build webhook payload
    const payload: WebhookPayload = {
      event: 'lead_captured',
      lead: {
        id: lead.id,
        email: lead.email || '',
        firstName: lead.first_name,
        lastName: lead.last_name,
        linkedInId: lead.linkedin_id,
        linkedInUrl: lead.linkedin_url,
        company: lead.company,
        title: lead.title,
        source: lead.source,
        capturedAt: lead.created_at,
      },
      campaign: {
        id: campaignData?.id || '',
        name: computedCampaignName,
        leadMagnetName,
      },
      custom_fields: customFields,
      suggested_email: suggestedEmail,
      original_post: {
        excerpt: campaignData?.post_content?.slice(0, 200),
      },
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Generate signature
    const signature = generateWebhookSignature(payload, webhookSecret || '');

    // For test mode, generate a test delivery ID
    const deliveryId = test
      ? `test-delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      : undefined;

    if (!test) {
      // Production mode: Create delivery record in database
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: delivery, error: deliveryError } = await supabase
        .from('webhook_delivery')
        .insert({
          lead_id: leadId,
          webhook_url: webhookUrl,
          payload: payload,
          signature: signature,
          attempt: 1,
          max_attempts: 4,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (deliveryError || !delivery) {
        console.error(`[WEBHOOK_API] Failed to create delivery:`, deliveryError);
        return NextResponse.json(
          { error: 'Failed to create webhook delivery' },
          { status: 500 }
        );
      }

      // Queue webhook delivery job (production mode)
      await queueWebhookDelivery({
        deliveryId: delivery.id,
        leadId,
        webhookUrl,
        webhookSecret: webhookSecret || '',
        payload,
        attempt: 1,
        maxAttempts: 4,
      });

      console.log(
        `[WEBHOOK_API] Queued webhook delivery for lead ${leadId} to ${maskWebhookUrl(webhookUrl)}`
      );

      return NextResponse.json({
        status: 'success',
        delivery: {
          id: delivery.id,
          leadId: delivery.lead_id,
          webhookUrl: maskWebhookUrl(webhookUrl),
          status: delivery.status,
          attempt: delivery.attempt,
        },
      });
    } else {
      // Test mode: Queue delivery without database record
      await queueWebhookDelivery({
        deliveryId: deliveryId!,
        leadId: lead.id,
        webhookUrl,
        webhookSecret: webhookSecret || '',
        payload,
        attempt: 1,
        maxAttempts: 4,
      });

      console.log(`[WEBHOOK_API] [TEST] Queued test webhook delivery to ${maskWebhookUrl(webhookUrl)}`);

      return NextResponse.json({
        status: 'success',
        delivery: {
          id: deliveryId,
          leadId: lead.id,
          webhookUrl: maskWebhookUrl(webhookUrl),
          status: 'pending',
          attempt: 1,
          isTestDelivery: true,
        },
      });
    }
  } catch (error) {
    console.error('[WEBHOOK_API] Delivery queue error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get webhook delivery status
 * SECURITY: Requires authentication and scopes to user's data via leads → campaigns
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');

    // Use server client for auth check
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const authSupabase = await createServerClient();

    // CRITICAL: Verify authentication
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      console.warn('[WEBHOOK_API] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's client_id for tenant scoping
    const { data: userData, error: userError } = await authSupabase
      .from('user')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.client_id) {
      console.warn('[WEBHOOK_API] User has no client association:', user.id);
      return NextResponse.json({ error: 'User not associated with a client' }, { status: 403 });
    }

    const userClientId = userData.client_id;

    // Use service role for the actual query (RLS bypass needed for join)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // CRITICAL: Join through leads → campaigns to filter by client_id
    let query = supabase
      .from('webhook_delivery')
      .select(`
        *,
        leads!inner(
          campaign_id,
          campaigns!inner(client_id)
        )
      `)
      .eq('leads.campaigns.client_id', userClientId); // CRITICAL: Tenant filter

    if (deliveryId) {
      query = query.eq('id', deliveryId);
    }

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: deliveries, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('[WEBHOOK_API] Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deliveries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      deliveries: deliveries?.map((d) => ({
        id: d.id,
        leadId: d.lead_id,
        webhookUrl: maskWebhookUrl(d.webhook_url),
        status: d.status,
        attempt: d.attempt,
        maxAttempts: d.max_attempts,
        lastError: d.last_error,
        sentAt: d.sent_at,
        responseStatus: d.response_status,
      })),
      total: deliveries?.length || 0,
    });
  } catch (error) {
    console.error('[WEBHOOK_API] Fetch error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Fetch failed',
      },
      { status: 500 }
    );
  }
}
