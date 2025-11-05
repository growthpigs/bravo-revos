/**
 * POST/GET /api/webhook-delivery
 * Deliver leads to client CRM/ESP via webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateWebhookSignature,
  maskWebhookUrl,
  sendWebhook,
  shouldRetry,
  calculateRetryDelay,
  WebhookPayload,
  WebhookDelivery,
} from '@/lib/webhook-delivery';

/**
 * POST - Queue webhook delivery for a lead
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, webhookUrl, webhookSecret, campaignName, customFields } = body;

    // Validate input
    if (!leadId || !webhookUrl) {
      return NextResponse.json(
        { error: 'leadId and webhookUrl are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
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

    if (leadError || !lead) {
      console.error(`[WEBHOOK_API] Lead not found: ${leadId}`);
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
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
        id: Array.isArray(lead.campaigns) ? lead.campaigns[0].id : (lead.campaigns as any).id,
        name: campaignName || (Array.isArray(lead.campaigns) ? lead.campaigns[0].name : (lead.campaigns as any).name),
        leadMagnetName: Array.isArray(lead.campaigns) ? lead.campaigns[0].lead_magnets?.[0]?.name : (lead.campaigns as any).lead_magnets?.[0]?.name,
      },
      custom_fields: customFields,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Generate signature
    const signature = generateWebhookSignature(payload, webhookSecret || '');

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('webhook_deliveries')
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
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase.from('webhook_deliveries').select('*');

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
