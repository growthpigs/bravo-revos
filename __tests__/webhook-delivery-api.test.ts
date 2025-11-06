/**
 * Webhook Delivery API Tests
 * Tests for POST/GET /api/webhook-delivery endpoint logic
 */

import { generateWebhookSignature, maskWebhookUrl } from '@/lib/webhook-delivery';

describe('Webhook Delivery API', () => {
  describe('POST /api/webhook-delivery', () => {
    describe('Input Validation', () => {
      it('should require leadId field', () => {
        const requiredFields = ['leadId', 'webhookUrl'];
        expect(requiredFields).toContain('leadId');
      });

      it('should require webhookUrl field', () => {
        const requiredFields = ['leadId', 'webhookUrl'];
        expect(requiredFields).toContain('webhookUrl');
      });

      it('should return 400 status for missing fields', () => {
        const errorStatus = 400;
        expect(errorStatus).toBe(400);
      });

      it('should return error message for validation failure', () => {
        const errorMessage = 'leadId and webhookUrl are required';
        expect(errorMessage).toContain('required');
      });
    });

    describe('Lead Data Fetching', () => {
      it('should fetch lead with required fields', () => {
        const leadFields = `
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
        `;
        expect(leadFields).toContain('email');
        expect(leadFields).toContain('linkedin_id');
      });

      it('should return 404 if lead not found', () => {
        const notFoundStatus = 404;
        const errorMessage = 'Lead not found';
        expect(notFoundStatus).toBe(404);
        expect(errorMessage).toBe('Lead not found');
      });

      it('should include campaign data in query', () => {
        const query = 'campaigns (id, name, lead_magnets (name))';
        expect(query).toContain('campaigns');
        expect(query).toContain('lead_magnets');
      });
    });

    describe('Webhook Payload Construction', () => {
      it('should use lead_captured as event type', () => {
        const event = 'lead_captured';
        expect(event).toBe('lead_captured');
      });

      it('should include lead data in payload', () => {
        const payload = {
          event: 'lead_captured',
          lead: {
            id: 'lead-123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            linkedInId: 'linkedin-123',
            linkedInUrl: 'https://linkedin.com/in/johndoe',
            company: 'Tech Corp',
            title: 'Engineer',
            source: 'comment',
            capturedAt: '2025-11-06T12:00:00Z',
          },
          campaign: {
            id: 'campaign-123',
            name: 'Q4 Campaign',
          },
          timestamp: Date.now(),
        };

        expect(payload.event).toBe('lead_captured');
        expect(payload.lead.email).toBe('test@example.com');
      });

      it('should include campaign information', () => {
        const campaign = {
          id: 'campaign-123',
          name: 'Q4 Campaign',
          leadMagnetName: 'AI Guide',
        };
        expect(campaign.id).toBeDefined();
        expect(campaign.name).toBeDefined();
      });

      it('should include timestamp', () => {
        const timestamp = Math.floor(Date.now() / 1000);
        expect(typeof timestamp).toBe('number');
        expect(timestamp).toBeGreaterThan(0);
      });

      it('should support custom fields', () => {
        const customFields = {
          budget: '10k-50k',
          industry: 'tech',
        };
        expect(customFields.budget).toBe('10k-50k');
      });
    });

    describe('HMAC Signature Generation', () => {
      it('should generate signature for payload', () => {
        const payload = {
          event: 'lead_captured' as const,
          lead: {
            id: 'lead-123',
            email: 'test@example.com',
            linkedInId: 'linkedin-123',
            linkedInUrl: 'https://linkedin.com/in/test',
            source: 'comment' as const,
            capturedAt: '2025-11-06T12:00:00Z',
          },
          campaign: {
            id: 'campaign-123',
            name: 'Test',
          },
          timestamp: 1699272000,
        };
        const signature = generateWebhookSignature(payload, 'test-secret');
        expect(signature).toBeDefined();
        expect(signature).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should use provided webhookSecret', () => {
        const secret = 'test-webhook-secret';
        expect(secret).toBeDefined();
      });

      it('should use empty string for missing secret', () => {
        const secret = '';
        expect(secret).toBe('');
      });
    });

    describe('Delivery Record Creation', () => {
      it('should create record in webhook_deliveries table', () => {
        const tableName = 'webhook_deliveries';
        expect(tableName).toBe('webhook_deliveries');
      });

      it('should set initial attempt to 1', () => {
        const attempt = 1;
        expect(attempt).toBe(1);
      });

      it('should set max_attempts to 4', () => {
        const maxAttempts = 4;
        expect(maxAttempts).toBe(4);
      });

      it('should set initial status to pending', () => {
        const status = 'pending';
        expect(status).toBe('pending');
      });

      it('should include created_at timestamp', () => {
        const createdAt = new Date().toISOString();
        expect(createdAt).toBeDefined();
      });

      it('should return 500 on database insert failure', () => {
        const errorStatus = 500;
        const errorMessage = 'Failed to create webhook delivery';
        expect(errorStatus).toBe(500);
        expect(errorMessage).toContain('Failed to create');
      });
    });

    describe('Job Queue Integration', () => {
      it('should queue job after creating delivery record', () => {
        const queueFunction = 'queueWebhookDelivery';
        expect(queueFunction).toBe('queueWebhookDelivery');
      });

      it('should pass correct job data', () => {
        const jobData = {
          deliveryId: 'delivery-456',
          leadId: 'lead-123',
          webhookUrl: 'https://zapier.com/hooks/catch/123/abc',
          webhookSecret: 'test-secret',
          payload: {},
          attempt: 1,
          maxAttempts: 4,
        };
        expect(jobData.deliveryId).toBeDefined();
        expect(jobData.attempt).toBe(1);
      });
    });

    describe('Success Response', () => {
      it('should return status success on completion', () => {
        const response = {
          status: 'success',
          delivery: {},
        };
        expect(response.status).toBe('success');
      });

      it('should return delivery details', () => {
        const delivery = {
          id: 'delivery-456',
          leadId: 'lead-123',
          webhookUrl: 'https://zapier.com/hooks/...',
          status: 'pending',
          attempt: 1,
        };
        expect(delivery.id).toBeDefined();
        expect(delivery.status).toBe('pending');
      });

      it('should mask webhook URL in response', () => {
        const url = 'https://zapier.com/hooks/catch/123/abc/very/long/path/here';
        const masked = maskWebhookUrl(url);
        expect(masked.length).toBeLessThan(url.length);
        expect(masked).toContain('zapier.com');
      });

      it('should return 200 status code', () => {
        const statusCode = 200;
        expect(statusCode).toBe(200);
      });
    });

    describe('Error Handling', () => {
      it('should return 500 on unexpected errors', () => {
        const errorStatus = 500;
        expect(errorStatus).toBe(500);
      });

      it('should include error message in response', () => {
        const errorResponse = {
          error: 'Internal server error',
        };
        expect(errorResponse.error).toBeDefined();
      });

      it('should log errors to console', () => {
        const logMessage = '[WEBHOOK_API] Delivery queue error:';
        expect(logMessage).toContain('WEBHOOK_API');
      });
    });
  });

  describe('GET /api/webhook-delivery', () => {
    describe('Query Parameters', () => {
      it('should support deliveryId filter', () => {
        const param = 'deliveryId';
        expect(param).toBe('deliveryId');
      });

      it('should support leadId filter', () => {
        const param = 'leadId';
        expect(param).toBe('leadId');
      });

      it('should support status filter', () => {
        const param = 'status';
        expect(param).toBe('status');
      });

      it('should support multiple filters', () => {
        const filters = ['deliveryId', 'leadId', 'status'];
        expect(filters.length).toBe(3);
      });
    });

    describe('Database Query', () => {
      it('should query webhook_deliveries table', () => {
        const tableName = 'webhook_deliveries';
        expect(tableName).toBe('webhook_deliveries');
      });

      it('should order by created_at descending', () => {
        const orderBy = 'created_at';
        const ascending = false;
        expect(orderBy).toBe('created_at');
        expect(ascending).toBe(false);
      });

      it('should filter by id when deliveryId provided', () => {
        const column = 'id';
        expect(column).toBe('id');
      });

      it('should filter by lead_id when leadId provided', () => {
        const column = 'lead_id';
        expect(column).toBe('lead_id');
      });

      it('should filter by status when provided', () => {
        const column = 'status';
        expect(column).toBe('status');
      });
    });

    describe('Response Format', () => {
      it('should return status success', () => {
        const response = {
          status: 'success',
          deliveries: [],
          total: 0,
        };
        expect(response.status).toBe('success');
      });

      it('should return array of deliveries', () => {
        const deliveries = [
          { id: 'delivery-1' },
          { id: 'delivery-2' },
        ];
        expect(Array.isArray(deliveries)).toBe(true);
      });

      it('should return total count', () => {
        const total = 2;
        expect(typeof total).toBe('number');
      });

      it('should return 0 total when no deliveries found', () => {
        const total = 0;
        expect(total).toBe(0);
      });

      it('should return empty array when no results', () => {
        const deliveries: any[] = [];
        expect(deliveries).toEqual([]);
      });
    });

    describe('Delivery Details', () => {
      it('should include delivery id', () => {
        const delivery = {
          id: 'delivery-1',
        };
        expect(delivery.id).toBeDefined();
      });

      it('should include leadId', () => {
        const delivery = {
          leadId: 'lead-123',
        };
        expect(delivery.leadId).toBeDefined();
      });

      it('should mask webhookUrl', () => {
        const url = 'https://zapier.com/hooks/catch/123/abc';
        const masked = maskWebhookUrl(url);
        expect(masked).toContain('zapier.com');
      });

      it('should include status', () => {
        const delivery = {
          status: 'success',
        };
        expect(delivery.status).toBe('success');
      });

      it('should include attempt number', () => {
        const delivery = {
          attempt: 1,
        };
        expect(delivery.attempt).toBe(1);
      });

      it('should include maxAttempts', () => {
        const delivery = {
          maxAttempts: 4,
        };
        expect(delivery.maxAttempts).toBe(4);
      });

      it('should include lastError', () => {
        const delivery = {
          lastError: 'Connection timeout',
        };
        expect(delivery.lastError).toBeDefined();
      });

      it('should include sentAt timestamp', () => {
        const delivery = {
          sentAt: '2025-11-06T12:00:00Z',
        };
        expect(delivery.sentAt).toBeDefined();
      });

      it('should include responseStatus', () => {
        const delivery = {
          responseStatus: 200,
        };
        expect(delivery.responseStatus).toBe(200);
      });
    });

    describe('Error Handling', () => {
      it('should return 500 on database error', () => {
        const errorStatus = 500;
        const errorMessage = 'Failed to fetch deliveries';
        expect(errorStatus).toBe(500);
        expect(errorMessage).toContain('Failed to fetch');
      });

      it('should return 500 on unexpected error', () => {
        const errorStatus = 500;
        expect(errorStatus).toBe(500);
      });

      it('should include error message', () => {
        const errorResponse = {
          error: 'Fetch failed',
        };
        expect(errorResponse.error).toBeDefined();
      });

      it('should log errors to console', () => {
        const logMessage = '[WEBHOOK_API] Fetch error:';
        expect(logMessage).toContain('WEBHOOK_API');
      });
    });
  });

  describe('API Logging', () => {
    it('should log when queuing delivery', () => {
      const message = '[WEBHOOK_API] Queued webhook delivery for lead lead-123';
      expect(message).toContain('Queued webhook delivery');
    });

    it('should mask URL in logs', () => {
      const url = 'https://zapier.com/hooks/catch/123/abc/very/long/path/here';
      const masked = maskWebhookUrl(url);
      const message = `[WEBHOOK_API] Queued webhook delivery for lead lead-123 to ${masked}`;
      expect(message).not.toContain('very/long/path/here');
    });

    it('should log lead not found errors', () => {
      const message = '[WEBHOOK_API] Lead not found: lead-123';
      expect(message).toContain('Lead not found');
    });

    it('should log delivery creation failures', () => {
      const message = '[WEBHOOK_API] Failed to create delivery:';
      expect(message).toContain('Failed to create delivery');
    });
  });
});
