/**
 * Webhook Delivery to Client CRM/ESP
 * Delivers captured lead data with HMAC signatures and retry logic
 */

import crypto from 'crypto';

// Constants
const WEBHOOK_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Validate webhook URL format
 * Ensures URL is a valid HTTPS endpoint (or HTTP for localhost/private IPs)
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS (or HTTP for localhost/private networks)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    // Allow HTTP only for localhost, 127.0.0.1, .local domains, and private IP ranges
    if (parsed.protocol === 'http:') {
      const hostname = parsed.hostname;
      const isLocalhost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.local');

      // Check for private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
      const isPrivateIP =
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

      if (!isLocalhost && !isPrivateIP) {
        return false;
      }
    }
    // Reject common invalid hostnames
    if (!parsed.hostname || parsed.hostname === 'undefined' || parsed.hostname === 'null') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface WebhookPayload {
  event: 'lead_captured' | 'lead_qualified' | 'campaign_completed';
  lead: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    linkedInId: string;
    linkedInUrl: string;
    company?: string;
    title?: string;
    source: 'comment' | 'dm' | 'manual';
    capturedAt: string;
  };
  campaign: {
    id: string;
    name: string;
    leadMagnetName?: string;
  };
  custom_fields?: Record<string, unknown>;
  suggested_email?: {
    subject: string;
    body: string;
    preheader: string;
  };
  original_post?: {
    url?: string;
    excerpt?: string;
  };
  timestamp: number;
}

export interface WebhookDelivery {
  id: string;
  webhookUrl: string;
  payload: WebhookPayload;
  signature: string;
  attempt: number;
  maxAttempts: number;
  status: 'pending' | 'sent' | 'failed' | 'success';
  lastError?: string;
  nextRetryAt?: Date;
  sentAt?: Date;
  responseStatus?: number;
  responseBody?: string;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateWebhookSignature(
  payload: WebhookPayload,
  secret: string
): string {
  const jsonString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(jsonString)
    .digest('hex');
}

/**
 * Verify webhook signature (for client verification)
 */
export function verifyWebhookSignature(
  payload: WebhookPayload,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);

  // Must have same length to be valid
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Calculate retry delay with exponential backoff
 * Attempt 1: 5 seconds
 * Attempt 2: 25 seconds (5^2)
 * Attempt 3: 125 seconds (5^3)
 * Attempt 4: 625 seconds (~10 minutes)
 */
export function calculateRetryDelay(attempt: number): number {
  return Math.pow(5, attempt) * 1000; // Convert to milliseconds
}

/**
 * Format webhook headers
 */
export function formatWebhookHeaders(
  payload: WebhookPayload,
  signature: string,
  clientId: string
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': payload.timestamp.toString(),
    'X-Webhook-Version': '1.0',
    'X-Client-ID': clientId,
    'User-Agent': 'Bravo-revOS/1.0',
  };
}

/**
 * Send webhook with retry logic
 */
export async function sendWebhook(
  delivery: WebhookDelivery
): Promise<{
  success: boolean;
  status: number;
  body: string;
  error?: string;
}> {
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(delivery.webhookUrl, {
      method: 'POST',
      headers: formatWebhookHeaders(
        delivery.payload,
        delivery.signature,
        delivery.payload.campaign.id
      ),
      body: JSON.stringify(delivery.payload),
      signal: controller.signal,
    });

    const body = await response.text();

    // 2xx status is success
    if (response.ok) {
      clearTimeout(timeoutId);
      return {
        success: true,
        status: response.status,
        body,
      };
    }

    // 3xx is redirect (should follow, but consider failed)
    if (response.status >= 300 && response.status < 400) {
      clearTimeout(timeoutId);
      return {
        success: false,
        status: response.status,
        body,
        error: `Redirect to ${response.headers.get('location')}`,
      };
    }

    // 4xx is client error (don't retry)
    if (response.status >= 400 && response.status < 500) {
      clearTimeout(timeoutId);
      return {
        success: false,
        status: response.status,
        body,
        error: `Client error: ${response.status}`,
      };
    }

    // 5xx is server error (retry)
    clearTimeout(timeoutId);
    return {
      success: false,
      status: response.status,
      body,
      error: `Server error: ${response.status}`,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      status: 0,
      body: '',
      error: errorMsg,
    };
  }
}

/**
 * Determine if a delivery should be retried
 */
export function shouldRetry(
  delivery: WebhookDelivery,
  lastResponse: { status: number; error?: string }
): boolean {
  // Max attempts reached
  if (delivery.attempt >= delivery.maxAttempts) {
    return false;
  }

  // No response (network error) - retry
  if (lastResponse.status === 0) {
    return true;
  }

  // 5xx errors - retry
  if (lastResponse.status >= 500) {
    return true;
  }

  // 4xx errors - don't retry (client's problem)
  if (lastResponse.status >= 400 && lastResponse.status < 500) {
    return false;
  }

  // Success (2xx) - don't retry
  if (lastResponse.status >= 200 && lastResponse.status < 300) {
    return false;
  }

  // Unknown - retry once to be safe
  return delivery.attempt < 2;
}

/**
 * Build Zapier webhook payload
 */
export function formatForZapier(lead: WebhookPayload['lead']): Record<string, unknown> {
  return {
    email: lead.email,
    first_name: lead.firstName,
    last_name: lead.lastName,
    linkedin_id: lead.linkedInId,
    linkedin_url: lead.linkedInUrl,
    company: lead.company,
    title: lead.title,
    source: lead.source,
    captured_at: lead.capturedAt,
  };
}

/**
 * Build Make.com webhook payload
 */
export function formatForMakeCom(lead: WebhookPayload['lead']): Record<string, unknown> {
  return {
    email: lead.email,
    firstName: lead.firstName,
    lastName: lead.lastName,
    linkedinId: lead.linkedInId,
    linkedinUrl: lead.linkedInUrl,
    company: lead.company,
    jobTitle: lead.title,
    source: lead.source,
    capturedAt: lead.capturedAt,
  };
}

/**
 * ConvertKit webhook payload type
 */
export interface ConvertKitPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  custom_fields?: {
    linkedin_profile?: string;
    company?: string;
    job_title?: string;
    source?: string;
  };
}

/**
 * Build ConvertKit webhook payload
 */
export function formatForConvertKit(lead: WebhookPayload['lead']): ConvertKitPayload {
  return {
    email: lead.email,
    first_name: lead.firstName,
    last_name: lead.lastName,
    custom_fields: {
      linkedin_profile: lead.linkedInUrl,
      company: lead.company,
      job_title: lead.title,
      source: lead.source,
    },
  };
}

/**
 * Mask webhook URL for logging (hide sensitive parts)
 */
export function maskWebhookUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 20 ? `${parsed.pathname.substring(0, 20)}...` : parsed.pathname;
    return `${parsed.protocol}//${parsed.hostname}${path}`;
  } catch {
    return 'invalid-url';
  }
}
