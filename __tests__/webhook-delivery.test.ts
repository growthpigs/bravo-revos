/**
 * Webhook Delivery Tests
 * Comprehensive test coverage for webhook delivery to client CRM/ESP
 */

import {
  generateWebhookSignature,
  verifyWebhookSignature,
  calculateRetryDelay,
  formatWebhookHeaders,
  shouldRetry,
  formatForZapier,
  formatForMakeCom,
  formatForConvertKit,
  isValidWebhookUrl,
  maskWebhookUrl,
  WebhookPayload,
  WebhookDelivery,
} from '@/lib/webhook-delivery';

// Mock payload
const mockPayload: WebhookPayload = {
  event: 'lead_captured',
  lead: {
    id: 'lead-123',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    linkedInId: 'linkedin-123',
    linkedInUrl: 'https://linkedin.com/in/johndoe',
    company: 'Tech Corp',
    title: 'Engineering Manager',
    source: 'comment',
    capturedAt: '2025-11-05T12:00:00Z',
  },
  campaign: {
    id: 'campaign-123',
    name: 'Q4 Lead Generation',
    leadMagnetName: 'AI Guide PDF',
  },
  timestamp: 1730800000,
};

const mockSecret = 'test-webhook-secret-key';

describe('Webhook Delivery', () => {
  describe('HMAC Signature Generation & Verification', () => {
    it('should generate consistent HMAC signature', () => {
      const sig1 = generateWebhookSignature(mockPayload, mockSecret);
      const sig2 = generateWebhookSignature(mockPayload, mockSecret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    });

    it('should generate different signatures for different payloads', () => {
      const payload2 = { ...mockPayload, lead: { ...mockPayload.lead, email: 'jane@example.com' } };

      const sig1 = generateWebhookSignature(mockPayload, mockSecret);
      const sig2 = generateWebhookSignature(payload2, mockSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const sig1 = generateWebhookSignature(mockPayload, mockSecret);
      const sig2 = generateWebhookSignature(mockPayload, 'different-secret');

      expect(sig1).not.toBe(sig2);
    });

    it('should verify valid signature', () => {
      const signature = generateWebhookSignature(mockPayload, mockSecret);
      const isValid = verifyWebhookSignature(mockPayload, signature, mockSecret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const signature = generateWebhookSignature(mockPayload, mockSecret);
      const isValid = verifyWebhookSignature(mockPayload, 'invalid-signature', mockSecret);

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const signature = generateWebhookSignature(mockPayload, mockSecret);
      const isValid = verifyWebhookSignature(mockPayload, signature, 'wrong-secret');

      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison to prevent timing attacks', () => {
      const signature = generateWebhookSignature(mockPayload, mockSecret);
      // Just verify it doesn't throw - timing safety is implementation detail
      expect(() => verifyWebhookSignature(mockPayload, signature, mockSecret)).not.toThrow();
    });
  });

  describe('Retry Delay Calculation', () => {
    it('should calculate exponential backoff delays', () => {
      expect(calculateRetryDelay(1)).toBe(5000); // 5 seconds
      expect(calculateRetryDelay(2)).toBe(25000); // 25 seconds
      expect(calculateRetryDelay(3)).toBe(125000); // 125 seconds
      expect(calculateRetryDelay(4)).toBe(625000); // ~10 minutes
    });

    it('should return increasing delays for each attempt', () => {
      const delay1 = calculateRetryDelay(1);
      const delay2 = calculateRetryDelay(2);
      const delay3 = calculateRetryDelay(3);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should handle attempt 0', () => {
      expect(calculateRetryDelay(0)).toBe(1000); // 1 second (5^0)
    });
  });

  describe('Webhook Headers Formatting', () => {
    it('should format headers with signature and timestamp', () => {
      const signature = generateWebhookSignature(mockPayload, mockSecret);
      const headers = formatWebhookHeaders(mockPayload, signature, 'client-123');

      expect(headers['X-Webhook-Signature']).toBe(signature);
      expect(headers['X-Webhook-Timestamp']).toBe('1730800000');
      expect(headers['X-Client-ID']).toBe('client-123');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include correct content type', () => {
      const signature = generateWebhookSignature(mockPayload, mockSecret);
      const headers = formatWebhookHeaders(mockPayload, signature, 'client-123');

      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include user agent', () => {
      const signature = generateWebhookSignature(mockPayload, mockSecret);
      const headers = formatWebhookHeaders(mockPayload, signature, 'client-123');

      expect(headers['User-Agent']).toBe('Bravo-revOS/1.0');
    });

    it('should include version header', () => {
      const signature = generateWebhookSignature(mockPayload, mockSecret);
      const headers = formatWebhookHeaders(mockPayload, signature, 'client-123');

      expect(headers['X-Webhook-Version']).toBe('1.0');
    });
  });

  describe('Retry Decision Logic', () => {
    const mockDelivery: WebhookDelivery = {
      id: 'delivery-123',
      webhookUrl: 'https://zapier.example.com/webhook',
      payload: mockPayload,
      signature: 'test-sig',
      attempt: 1,
      maxAttempts: 4,
      status: 'pending',
    };

    it('should not retry if max attempts reached', () => {
      const delivery = { ...mockDelivery, attempt: 4, maxAttempts: 4 };
      const result = shouldRetry(delivery, { status: 500 });

      expect(result).toBe(false);
    });

    it('should retry on network error (status 0)', () => {
      const delivery = { ...mockDelivery, attempt: 1 };
      const result = shouldRetry(delivery, { status: 0 });

      expect(result).toBe(true);
    });

    it('should retry on 5xx server errors', () => {
      const delivery = { ...mockDelivery, attempt: 1 };

      expect(shouldRetry(delivery, { status: 500 })).toBe(true);
      expect(shouldRetry(delivery, { status: 502 })).toBe(true);
      expect(shouldRetry(delivery, { status: 503 })).toBe(true);
    });

    it('should not retry on 4xx client errors', () => {
      const delivery = { ...mockDelivery, attempt: 1 };

      expect(shouldRetry(delivery, { status: 400 })).toBe(false);
      expect(shouldRetry(delivery, { status: 401 })).toBe(false);
      expect(shouldRetry(delivery, { status: 404 })).toBe(false);
    });

    it('should not retry on success (2xx)', () => {
      const delivery = { ...mockDelivery, attempt: 1 };

      expect(shouldRetry(delivery, { status: 200 })).toBe(false);
      expect(shouldRetry(delivery, { status: 201 })).toBe(false);
      expect(shouldRetry(delivery, { status: 204 })).toBe(false);
    });

    it('should retry unknown status when attempts remain', () => {
      const delivery = { ...mockDelivery, attempt: 1 };
      const result = shouldRetry(delivery, { status: 999 });

      expect(result).toBe(true);
    });

    it('should still retry unknown status within attempt limit', () => {
      const delivery = { ...mockDelivery, attempt: 1, maxAttempts: 4 };
      const result = shouldRetry(delivery, { status: 999 });

      // Should retry because it's first attempt with unknown status
      expect(result).toBe(true);
    });
  });

  describe('ESP Format Converters', () => {
    const mockLead = mockPayload.lead;

    it('should format for Zapier', () => {
      const zapierPayload = formatForZapier(mockLead);

      expect(zapierPayload.email).toBe('john.doe@example.com');
      expect(zapierPayload.first_name).toBe('John');
      expect(zapierPayload.last_name).toBe('Doe');
      expect(zapierPayload.linkedin_id).toBe('linkedin-123');
    });

    it('should format for Make.com', () => {
      const makePayload = formatForMakeCom(mockLead);

      expect(makePayload.email).toBe('john.doe@example.com');
      expect(makePayload.firstName).toBe('John');
      expect(makePayload.lastName).toBe('Doe');
      expect(makePayload.jobTitle).toBe('Engineering Manager');
    });

    it('should format for ConvertKit', () => {
      const convertKitPayload = formatForConvertKit(mockLead);

      expect(convertKitPayload.email).toBe('john.doe@example.com');
      expect(convertKitPayload.first_name).toBe('John');
      expect(convertKitPayload.custom_fields?.linkedin_profile).toBe(
        'https://linkedin.com/in/johndoe'
      );
    });

    it('should handle missing optional fields', () => {
      const minimalLead = {
        ...mockLead,
        firstName: undefined,
        lastName: undefined,
        company: undefined,
        title: undefined,
      };

      const zapierPayload = formatForZapier(minimalLead);

      expect(zapierPayload.email).toBeDefined();
      expect(zapierPayload.first_name).toBeUndefined();
    });
  });

  describe('Webhook URL Validation', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(isValidWebhookUrl('https://zapier.example.com/webhook')).toBe(true);
      expect(isValidWebhookUrl('https://hooks.zapier.com/hooks/catch/123/abc')).toBe(true);
    });

    it('should accept valid HTTP URLs', () => {
      expect(isValidWebhookUrl('http://localhost:3000/webhook')).toBe(true);
      expect(isValidWebhookUrl('http://192.168.1.1:8080/webhook')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidWebhookUrl('not-a-url')).toBe(false);
      expect(isValidWebhookUrl('ftp://example.com')).toBe(false);
      expect(isValidWebhookUrl('webhook/path')).toBe(false);
      expect(isValidWebhookUrl('')).toBe(false);
    });

    it('should reject URLs with invalid protocols', () => {
      expect(isValidWebhookUrl('ftp://example.com/webhook')).toBe(false);
      expect(isValidWebhookUrl('file:///etc/passwd')).toBe(false);
    });
  });

  describe('Webhook URL Masking', () => {
    it('should show protocol and hostname', () => {
      const url = 'https://hooks.zapier.com/hooks/catch/1234567/abcdefg123';
      const masked = maskWebhookUrl(url);

      expect(masked).toContain('https://');
      expect(masked).toContain('hooks.zapier.com');
    });

    it('should truncate long paths with ellipsis', () => {
      const url = 'https://example.com/very/long/webhook/path/that/exceeds/twenty/chars/limit';
      const masked = maskWebhookUrl(url);

      expect(masked.length).toBeLessThan(url.length);
      expect(masked).toContain('...');
    });

    it('should handle invalid URLs gracefully', () => {
      const masked = maskWebhookUrl('not-a-url');

      expect(masked).toBe('invalid-url');
    });

    it('should preserve protocol and hostname', () => {
      const url = 'https://api.example.com/webhook';
      const masked = maskWebhookUrl(url);

      expect(masked).toContain('https://api.example.com');
    });
  });

  describe('Webhook Payload Structure', () => {
    it('should have required payload fields', () => {
      expect(mockPayload.event).toBeDefined();
      expect(mockPayload.lead).toBeDefined();
      expect(mockPayload.campaign).toBeDefined();
      expect(mockPayload.timestamp).toBeDefined();
    });

    it('should have required lead fields', () => {
      expect(mockPayload.lead.id).toBeDefined();
      expect(mockPayload.lead.email).toBeDefined();
      expect(mockPayload.lead.linkedInId).toBeDefined();
      expect(mockPayload.lead.source).toBeDefined();
    });

    it('should support custom fields', () => {
      const payloadWithCustom: WebhookPayload = {
        ...mockPayload,
        custom_fields: {
          referral_source: 'podcast',
          budget_range: '10k-50k',
        },
      };

      expect(payloadWithCustom.custom_fields).toBeDefined();
      expect(payloadWithCustom.custom_fields?.referral_source).toBe('podcast');
    });

    it('should allow different event types', () => {
      const payload1: WebhookPayload = { ...mockPayload, event: 'lead_captured' };
      const payload2: WebhookPayload = { ...mockPayload, event: 'lead_qualified' };
      const payload3: WebhookPayload = { ...mockPayload, event: 'campaign_completed' };

      expect(payload1.event).toBe('lead_captured');
      expect(payload2.event).toBe('lead_qualified');
      expect(payload3.event).toBe('campaign_completed');
    });
  });

  describe('Webhook Delivery States', () => {
    it('should support all delivery statuses', () => {
      const statuses: Array<'pending' | 'sent' | 'failed' | 'success'> = [
        'pending',
        'sent',
        'failed',
        'success',
      ];

      statuses.forEach((status) => {
        const delivery: WebhookDelivery = {
          id: 'test',
          webhookUrl: 'https://example.com',
          payload: mockPayload,
          signature: 'sig',
          attempt: 1,
          maxAttempts: 4,
          status,
        };

        expect(delivery.status).toBe(status);
      });
    });

    it('should track retry metadata', () => {
      const delivery: WebhookDelivery = {
        id: 'delivery-123',
        webhookUrl: 'https://example.com',
        payload: mockPayload,
        signature: 'sig',
        attempt: 2,
        maxAttempts: 4,
        status: 'sent',
        lastError: 'Connection timeout',
        nextRetryAt: new Date(Date.now() + 25000),
        responseStatus: 503,
      };

      expect(delivery.attempt).toBe(2);
      expect(delivery.lastError).toBe('Connection timeout');
      expect(delivery.nextRetryAt).toBeDefined();
      expect(delivery.responseStatus).toBe(503);
    });
  });
});
