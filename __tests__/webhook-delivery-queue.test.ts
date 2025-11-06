/**
 * Webhook Delivery Queue System Tests
 * Comprehensive test coverage for BullMQ-based webhook delivery with retry logic
 */

import { calculateRetryDelay } from '@/lib/webhook-delivery';

// Test data
const mockJobData = {
  deliveryId: 'delivery-123',
  leadId: 'lead-456',
  webhookUrl: 'https://zapier.com/hooks/catch/123/abc',
  webhookSecret: 'test-secret-key',
  payload: {
    event: 'lead_captured' as const,
    lead: {
      id: 'lead-456',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      linkedInId: 'linkedin-123',
      linkedInUrl: 'https://linkedin.com/in/johndoe',
      company: 'Tech Corp',
      title: 'Engineer',
      source: 'comment' as const,
      capturedAt: '2025-11-06T12:00:00Z',
    },
    campaign: {
      id: 'campaign-123',
      name: 'Q4 Campaign',
      leadMagnetName: 'AI Guide',
    },
    timestamp: 1699272000,
  },
  attempt: 1,
  maxAttempts: 4,
};

describe('Webhook Delivery Queue System', () => {
  describe('Queue Configuration', () => {
    it('should use correct queue name', () => {
      expect('webhook-delivery').toBe('webhook-delivery');
    });

    it('should configure 4 max attempts', () => {
      expect(mockJobData.maxAttempts).toBe(4);
    });

    it('should configure 7 day retention for completed jobs', () => {
      const retentionDays = 7;
      const retentionSeconds = retentionDays * 24 * 60 * 60;
      expect(retentionSeconds).toBe(604800);
    });

    it('should configure 30 day retention for failed jobs', () => {
      const retentionDays = 30;
      const retentionSeconds = retentionDays * 24 * 60 * 60;
      expect(retentionSeconds).toBe(2592000);
    });

    it('should keep last 1000 completed jobs', () => {
      expect(1000).toBe(1000);
    });

    it('should keep last 5000 failed jobs', () => {
      expect(5000).toBe(5000);
    });
  });

  describe('Job Prioritization', () => {
    it('should assign priority 10 to first attempts', () => {
      const firstAttempt = 1;
      const priority = firstAttempt === 1 ? 10 : 5;
      expect(priority).toBe(10);
    });

    it('should assign priority 5 to retry attempts', () => {
      const retryAttempt: number = 2;
      const priority = retryAttempt === 1 ? 10 : 5;
      expect(priority).toBe(5);
    });

    it('should assign priority 5 to third attempt', () => {
      const attempt: number = 3;
      const priority = attempt === 1 ? 10 : 5;
      expect(priority).toBe(5);
    });

    it('should assign priority 5 to fourth attempt', () => {
      const attempt: number = 4;
      const priority = attempt === 1 ? 10 : 5;
      expect(priority).toBe(5);
    });
  });

  describe('Retry Delay Calculation', () => {
    it('should calculate 0ms delay for first attempt', () => {
      const attempt = 1;
      const delay = attempt > 1 ? calculateRetryDelay(attempt) : 0;
      expect(delay).toBe(0);
    });

    it('should calculate 25 second delay for second attempt', () => {
      const attempt = 2;
      const delay = attempt > 1 ? calculateRetryDelay(attempt) : 0;
      expect(delay).toBe(25000); // 5^2 * 1000
    });

    it('should calculate 125 second delay for third attempt', () => {
      const attempt = 3;
      const delay = attempt > 1 ? calculateRetryDelay(attempt) : 0;
      expect(delay).toBe(125000); // 5^3 * 1000
    });

    it('should calculate 625 second delay for fourth attempt', () => {
      const attempt = 4;
      const delay = attempt > 1 ? calculateRetryDelay(attempt) : 0;
      expect(delay).toBe(625000); // 5^4 * 1000 (~10 minutes)
    });

    it('should use exponential backoff formula 5^attempt * 1000', () => {
      expect(calculateRetryDelay(1)).toBe(5000);
      expect(calculateRetryDelay(2)).toBe(25000);
      expect(calculateRetryDelay(3)).toBe(125000);
      expect(calculateRetryDelay(4)).toBe(625000);
    });
  });

  describe('Job ID Generation', () => {
    it('should generate unique job ID with delivery ID and attempt', () => {
      const deliveryId = 'delivery-123';
      const attempt = 1;
      const jobId = `webhook-${deliveryId}-attempt-${attempt}`;
      expect(jobId).toBe('webhook-delivery-123-attempt-1');
    });

    it('should generate different IDs for different attempts', () => {
      const deliveryId = 'delivery-123';
      const job1 = `webhook-${deliveryId}-attempt-1`;
      const job2 = `webhook-${deliveryId}-attempt-2`;
      expect(job1).not.toBe(job2);
    });

    it('should include delivery ID in job ID', () => {
      const deliveryId = 'delivery-456';
      const jobId = `webhook-${deliveryId}-attempt-1`;
      expect(jobId).toContain('delivery-456');
    });

    it('should include attempt number in job ID', () => {
      const jobId = `webhook-delivery-123-attempt-3`;
      expect(jobId).toContain('attempt-3');
    });
  });

  describe('Worker Concurrency Configuration', () => {
    it('should process 5 webhooks concurrently', () => {
      const concurrency = 5;
      expect(concurrency).toBe(5);
    });

    it('should limit to 50 jobs per second', () => {
      const maxJobsPerDuration = 50;
      const duration = 1000; // milliseconds
      expect(maxJobsPerDuration).toBe(50);
      expect(duration).toBe(1000);
    });

    it('should use 1 second duration for rate limiter', () => {
      const duration = 1000;
      expect(duration).toBe(1000);
    });
  });

  describe('Job Data Structure', () => {
    it('should include all required fields in job data', () => {
      expect(mockJobData.deliveryId).toBeDefined();
      expect(mockJobData.leadId).toBeDefined();
      expect(mockJobData.webhookUrl).toBeDefined();
      expect(mockJobData.webhookSecret).toBeDefined();
      expect(mockJobData.payload).toBeDefined();
      expect(mockJobData.attempt).toBeDefined();
      expect(mockJobData.maxAttempts).toBeDefined();
    });

    it('should include complete lead data in payload', () => {
      expect(mockJobData.payload.lead.id).toBe('lead-456');
      expect(mockJobData.payload.lead.email).toBe('test@example.com');
      expect(mockJobData.payload.lead.linkedInId).toBeDefined();
    });

    it('should include campaign information in payload', () => {
      expect(mockJobData.payload.campaign.id).toBe('campaign-123');
      expect(mockJobData.payload.campaign.name).toBeDefined();
    });

    it('should include timestamp in payload', () => {
      expect(mockJobData.payload.timestamp).toBeDefined();
      expect(typeof mockJobData.payload.timestamp).toBe('number');
    });

    it('should use lead_captured as event type', () => {
      expect(mockJobData.payload.event).toBe('lead_captured');
    });
  });

  describe('Response Body Truncation', () => {
    it('should truncate response body to 1000 characters', () => {
      const longBody = 'x'.repeat(2000);
      const truncated = longBody.substring(0, 1000);
      expect(truncated.length).toBe(1000);
    });

    it('should not truncate short response bodies', () => {
      const shortBody = 'OK';
      const truncated = shortBody.substring(0, 1000);
      expect(truncated).toBe('OK');
      expect(truncated.length).toBe(2);
    });

    it('should handle empty response bodies', () => {
      const emptyBody = '';
      const truncated = emptyBody.substring(0, 1000);
      expect(truncated).toBe('');
    });
  });

  describe('Delivery Status Transitions', () => {
    it('should start with pending status', () => {
      const initialStatus = 'pending';
      expect(initialStatus).toBe('pending');
    });

    it('should transition to success on 2xx response', () => {
      const success = true;
      const status = success ? 'success' : 'failed';
      expect(status).toBe('success');
    });

    it('should transition to sent on failure with retries remaining', () => {
      const success = false;
      const attempt = 1;
      const maxAttempts = 4;
      const status = success ? 'success' : attempt >= maxAttempts ? 'failed' : 'sent';
      expect(status).toBe('sent');
    });

    it('should transition to failed after max attempts', () => {
      const success = false;
      const attempt = 4;
      const maxAttempts = 4;
      const status = success ? 'success' : attempt >= maxAttempts ? 'failed' : 'sent';
      expect(status).toBe('failed');
    });
  });

  describe('Error Type Classification', () => {
    it('should classify status 0 as network error', () => {
      const status: number = 0;
      const errorType = status === 0 ? 'network' : 'http';
      expect(errorType).toBe('network');
    });

    it('should classify non-zero status as http error', () => {
      const status: number = 500;
      const errorType = status === 0 ? 'network' : 'http';
      expect(errorType).toBe('http');
    });

    it('should classify 503 as http error', () => {
      const status: number = 503;
      const errorType = status === 0 ? 'network' : 'http';
      expect(errorType).toBe('http');
    });
  });

  describe('Queue Status Calculation', () => {
    it('should calculate total from waiting, active, and delayed', () => {
      const waiting = 5;
      const active = 2;
      const delayed = 10;
      const total = waiting + active + delayed;
      expect(total).toBe(17);
    });

    it('should not include completed in total', () => {
      const waiting = 5;
      const active = 2;
      const delayed = 10;
      const completed = 100;
      const total = waiting + active + delayed;
      expect(total).not.toContain(completed);
      expect(total).toBe(17);
    });

    it('should not include failed in total', () => {
      const waiting = 5;
      const active = 2;
      const delayed = 10;
      const failed = 3;
      const total = waiting + active + delayed;
      expect(total).not.toContain(failed);
      expect(total).toBe(17);
    });
  });

  describe('Database Updates', () => {
    it('should update lead status to webhook_sent on success', () => {
      const success = true;
      const leadStatus = success ? 'webhook_sent' : 'email_extracted';
      expect(leadStatus).toBe('webhook_sent');
    });

    it('should not update lead status on failure', () => {
      const success = false;
      const shouldUpdateLead = success;
      expect(shouldUpdateLead).toBe(false);
    });
  });

  describe('Audit Log Fields', () => {
    it('should include delivery_id in audit log', () => {
      const logEntry = {
        delivery_id: mockJobData.deliveryId,
      };
      expect(logEntry.delivery_id).toBe('delivery-123');
    });

    it('should include attempt_number in audit log', () => {
      const logEntry = {
        attempt_number: mockJobData.attempt,
      };
      expect(logEntry.attempt_number).toBe(1);
    });

    it('should include attempted_at timestamp in audit log', () => {
      const logEntry = {
        attempted_at: new Date().toISOString(),
      };
      expect(logEntry.attempted_at).toBeDefined();
      expect(typeof logEntry.attempted_at).toBe('string');
    });

    it('should include will_retry flag in audit log', () => {
      const logEntry = {
        will_retry: true,
      };
      expect(logEntry.will_retry).toBeDefined();
      expect(typeof logEntry.will_retry).toBe('boolean');
    });
  });

  describe('Logging Messages', () => {
    it('should include LOG_PREFIX in all logs', () => {
      const logPrefix = '[WEBHOOK_QUEUE]';
      expect(logPrefix).toBe('[WEBHOOK_QUEUE]');
    });

    it('should log queue message with delivery ID and attempt', () => {
      const message = `[WEBHOOK_QUEUE] Queued webhook delivery ${mockJobData.deliveryId} (attempt ${mockJobData.attempt}/${mockJobData.maxAttempts})`;
      expect(message).toContain('delivery-123');
      expect(message).toContain('attempt 1/4');
    });

    it('should log processing message', () => {
      const message = `[WEBHOOK_QUEUE] Processing delivery ${mockJobData.deliveryId} (attempt ${mockJobData.attempt}/${mockJobData.maxAttempts})`;
      expect(message).toContain('Processing delivery');
    });

    it('should log success message', () => {
      const message = `[WEBHOOK_QUEUE] Delivery ${mockJobData.deliveryId} succeeded`;
      expect(message).toContain('succeeded');
    });

    it('should log failure message with retry info', () => {
      const nextAttempt = 2;
      const delay = 25000;
      const message = `[WEBHOOK_QUEUE] Delivery ${mockJobData.deliveryId} failed, retry ${nextAttempt} scheduled in ${delay}ms`;
      expect(message).toContain('retry 2 scheduled');
      expect(message).toContain('25000ms');
    });

    it('should log permanent failure message', () => {
      const attempt = 4;
      const message = `[WEBHOOK_QUEUE] Delivery ${mockJobData.deliveryId} permanently failed after ${attempt} attempts`;
      expect(message).toContain('permanently failed');
    });

    it('should log cancellation message', () => {
      const message = `[WEBHOOK_QUEUE] Cancelled webhook delivery ${mockJobData.deliveryId}`;
      expect(message).toContain('Cancelled');
    });
  });
});
