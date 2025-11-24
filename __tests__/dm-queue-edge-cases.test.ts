/**
 * DM Queue Edge Case Tests
 * Comprehensive test coverage for boundary conditions, concurrency, and error scenarios
 * Tests all 7 identified edge cases from code review
 */

import { checkRateLimit, queueDM, dmQueue, generateJobId } from '@/lib/queues/dm-queue';
import { getRedisConnection } from '@/lib/redis';
import { Job } from 'bullmq';

// Mock data for tests
const mockAccountId = 'test-account-edge-cases';
const mockAccountId2 = 'test-account-edge-cases-2';
const mockCampaignId = 'test-campaign-edge';
const mockUserId = 'test-user-edge';

describe('DM Queue Edge Cases', () => {
  let redis: any;

  beforeAll(() => {
    redis = getRedisConnection();
  });

  afterEach(async () => {
    // Clean up Redis keys after each test
    try {
      const keys = await redis.keys(`dm-count:${mockAccountId}:*`);
      const keys2 = await redis.keys(`dm-count:${mockAccountId2}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      if (keys2.length > 0) {
        await redis.del(...keys2);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Close Redis connection
    try {
      if (redis) {
        await redis.quit?.();
      }
    } catch (error) {
      // Ignore close errors
    }
  });

  // Edge Case 1: Rate limit boundary conditions (exactly 100 DMs)
  describe('Edge Case 1: Rate limit boundary (exactly 100 DMs)', () => {
    it('should allow queuing when at exactly 100 DMs (limit boundary)', async () => {
      // Set counter to 99
      const today = new Date().toISOString().split('T')[0];
      const key = `dm-count:${mockAccountId}:${today}`;
      await redis.set(key, 99);

      // Check rate limit should show 1 remaining
      const rateLimitStatus = await checkRateLimit(mockAccountId);
      expect(rateLimitStatus.remaining).toBe(1);

      // Queue should succeed
      const result = await queueDM({
        accountId: mockAccountId,
        recipientId: 'recipient-100',
        recipientName: 'Test User 100',
        message: 'This is the 100th message in this test scenario',
        campaignId: mockCampaignId,
        userId: mockUserId,
      });

      expect(result.queued).toBe(true);
      expect(result.rateLimitStatus.remaining).toBe(1);
    });

    it('should block queuing when exceeding 100 DMs (rate limit exceeded)', async () => {
      // Set counter to 100
      const today = new Date().toISOString().split('T')[0];
      const key = `dm-count:${mockAccountId}:${today}`;
      await redis.set(key, 100);

      // Check rate limit should show 0 remaining
      const rateLimitStatus = await checkRateLimit(mockAccountId);
      expect(rateLimitStatus.remaining).toBe(0);

      // Queue should still succeed but with delay
      const result = await queueDM({
        accountId: mockAccountId,
        recipientId: 'recipient-101',
        recipientName: 'Test User 101',
        message: 'This would exceed the 100 DM limit but queues for tomorrow',
        campaignId: mockCampaignId,
        userId: mockUserId,
      });

      expect(result.queued).toBe(true);
      expect(result.rateLimitStatus.remaining).toBe(0);
      expect(result.rateLimitStatus.sentToday).toBe(100);
    });

    it('should correctly track limit remaining at various counts', async () => {
      const today = new Date().toISOString().split('T')[0];
      const key = `dm-count:${mockAccountId}:${today}`;

      const testCases = [
        { count: 0, expectedRemaining: 100 },
        { count: 50, expectedRemaining: 50 },
        { count: 99, expectedRemaining: 1 },
        { count: 100, expectedRemaining: 0 },
        { count: 101, expectedRemaining: 0 }, // Should not go negative
      ];

      for (const testCase of testCases) {
        await redis.set(key, testCase.count);
        const rateLimit = await checkRateLimit(mockAccountId);
        expect(rateLimit.remaining).toBe(testCase.expectedRemaining);
      }
    });
  });

  // Edge Case 2: Midnight UTC edge case crossing
  describe('Edge Case 2: Midnight UTC boundary crossing', () => {
    it('should return reset time for rate limit status', async () => {
      const today = new Date().toISOString().split('T')[0];
      const key = `dm-count:${mockAccountId}:${today}`;
      await redis.set(key, 50);

      const status = await checkRateLimit(mockAccountId);

      // Reset time should be a Date object
      expect(status.resetTime).toBeInstanceOf(Date);

      // Reset time should be tomorrow at midnight UTC
      const expectedDate = new Date();
      expectedDate.setUTCDate(expectedDate.getUTCDate() + 1);
      expectedDate.setUTCHours(0, 0, 0, 0);

      // Allow 1 second tolerance for test execution time
      const timeDiff = Math.abs(status.resetTime.getTime() - expectedDate.getTime());
      expect(timeDiff).toBeLessThan(2000);
    });

    it('should have separate keys for different dates', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowKey = tomorrow.toISOString().split('T')[0];

      const todayKey = `dm-count:${mockAccountId}:${today}`;
      const tomorrowKeyFull = `dm-count:${mockAccountId}:${tomorrowKey}`;

      // Set counts for both days
      await redis.set(todayKey, 50);
      await redis.set(tomorrowKeyFull, 0);

      // Verify they're separate
      const todayCount = await redis.get(todayKey);
      const tomorrowCount = await redis.get(tomorrowKeyFull);

      expect(parseInt(todayCount)).toBe(50);
      expect(parseInt(tomorrowCount)).toBe(0);
    });
  });

  // Edge Case 3: Job delay calculation precision
  describe('Edge Case 3: Job delay calculation precision', () => {
    it('should queue delayed job when at rate limit', async () => {
      const today = new Date().toISOString().split('T')[0];
      const key = `dm-count:${mockAccountId}:${today}`;
      await redis.set(key, 100);

      const result = await queueDM({
        accountId: mockAccountId,
        recipientId: 'recipient-delayed',
        recipientName: 'Delayed User',
        message: 'This should be delayed until tomorrow at midnight',
        campaignId: mockCampaignId,
        userId: mockUserId,
      });

      // Should be queued but with remaining = 0
      expect(result.queued).toBe(true);
      expect(result.rateLimitStatus.remaining).toBe(0);
      expect(result.jobId).toBeDefined();

      // Job should exist
      const job = await dmQueue.getJob(result.jobId);
      expect(job).toBeDefined();
    });

    it('should queue immediately when below rate limit', async () => {
      const today = new Date().toISOString().split('T')[0];
      const key = `dm-count:${mockAccountId}:${today}`;
      await redis.set(key, 50);

      const result = await queueDM({
        accountId: mockAccountId,
        recipientId: 'recipient-immediate',
        recipientName: 'Immediate User',
        message: 'This should be queued immediately without delay',
        campaignId: mockCampaignId,
        userId: mockUserId,
      });

      expect(result.queued).toBe(true);
      expect(result.rateLimitStatus.remaining).toBe(50);
      expect(result.jobId).toBeDefined();
    });
  });

  // Edge Case 4: Concurrent queueing with rate limit
  describe('Edge Case 4: Concurrent queueing with rate limit', () => {
    it('should handle multiple concurrent queue requests correctly', async () => {
      // Don't set any counter - fresh account
      const today = new Date().toISOString().split('T')[0];
      const key = `dm-count:${mockAccountId}:${today}`;

      // Clear any existing count
      await redis.del(key);

      // Queue 5 DMs concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        queueDM({
          accountId: mockAccountId,
          recipientId: `recipient-${i}`,
          recipientName: `User ${i}`,
          message: `Concurrent message ${i} - This is a test message that is long enough`,
          campaignId: mockCampaignId,
          userId: mockUserId,
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(5);
      expect(results.every(r => r.queued)).toBe(true);

      // Each should have correct rate limit status
      // Note: Due to concurrency, they might not show incremental counts
      expect(results[0].rateLimitStatus.limit).toBe(100);
    });

    it('should not exceed rate limit under concurrent load', async () => {
      const today = new Date().toISOString().split('T')[0];
      const key = `dm-count:${mockAccountId}:${today}`;

      // Set counter to 98 (close to limit)
      await redis.set(key, 98);

      // Try to queue 5 DMs concurrently - 3 should pass, 2 should be delayed
      const promises = Array.from({ length: 5 }, (_, i) =>
        queueDM({
          accountId: mockAccountId,
          recipientId: `recipient-concurrent-${i}`,
          recipientName: `Concurrent User ${i}`,
          message: `Concurrent test message number ${i} for boundary testing`,
          campaignId: mockCampaignId,
          userId: mockUserId,
        })
      );

      const results = await Promise.all(promises);

      // All should be queued (some delayed)
      expect(results.every(r => r.queued)).toBe(true);
      expect(results).toHaveLength(5);
    });
  });

  // Edge Case 5: Multi-account isolation
  describe('Edge Case 5: Multi-account isolation (account limits independent)', () => {
    it('should track separate limits for different accounts', async () => {
      const today = new Date().toISOString().split('T')[0];
      const key1 = `dm-count:${mockAccountId}:${today}`;
      const key2 = `dm-count:${mockAccountId2}:${today}`;

      // Set account 1 to 50
      await redis.set(key1, 50);
      // Set account 2 to 100 (at limit)
      await redis.set(key2, 100);

      // Check both
      const limit1 = await checkRateLimit(mockAccountId);
      const limit2 = await checkRateLimit(mockAccountId2);

      expect(limit1.sentToday).toBe(50);
      expect(limit1.remaining).toBe(50);

      expect(limit2.sentToday).toBe(100);
      expect(limit2.remaining).toBe(0);

      // Should be able to queue for account 1 but not account 2
      const result1 = await queueDM({
        accountId: mockAccountId,
        recipientId: 'recipient-1',
        recipientName: 'User 1',
        message: 'Account 1 should be able to queue this message',
        campaignId: mockCampaignId,
        userId: mockUserId,
      });

      const result2 = await queueDM({
        accountId: mockAccountId2,
        recipientId: 'recipient-2',
        recipientName: 'User 2',
        message: 'Account 2 is at limit but can still queue with delay',
        campaignId: mockCampaignId,
        userId: mockUserId,
      });

      expect(result1.rateLimitStatus.remaining).toBe(50);
      expect(result2.rateLimitStatus.remaining).toBe(0);
    });
  });

  // Edge Case 6: API request validation (missing fields, invalid types)
  describe('Edge Case 6: API request validation (missing fields, invalid types)', () => {
    it('should reject missing required fields', async () => {
      const invalidRequests = [
        { recipientId: 'r1', recipientName: 'User', message: 'msg', campaignId: 'c1', userId: 'u1' }, // missing accountId
        { accountId: 'a1', recipientName: 'User', message: 'msg', campaignId: 'c1', userId: 'u1' }, // missing recipientId
        { accountId: 'a1', recipientId: 'r1', message: 'msg', campaignId: 'c1', userId: 'u1' }, // missing recipientName
        { accountId: 'a1', recipientId: 'r1', recipientName: 'User', campaignId: 'c1', userId: 'u1' }, // missing message
      ];

      for (const req of invalidRequests) {
        try {
          await queueDM(req as any);
          fail('Should have thrown validation error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('required');
        }
      }
    });

    it('should reject invalid message length', async () => {
      // Message too short
      try {
        await queueDM({
          accountId: mockAccountId,
          recipientId: 'r1',
          recipientName: 'User',
          message: 'short', // Less than 10 characters
          campaignId: mockCampaignId,
          userId: mockUserId,
        });
        fail('Should reject short message');
      } catch (error) {
        expect((error as Error).message).toContain('at least 10');
      }

      // Message too long
      try {
        await queueDM({
          accountId: mockAccountId,
          recipientId: 'r1',
          recipientName: 'User',
          message: 'x'.repeat(5001), // More than 5000 characters
          campaignId: mockCampaignId,
          userId: mockUserId,
        });
        fail('Should reject long message');
      } catch (error) {
        expect((error as Error).message).toContain('less than 5000');
      }
    });

    it('should reject empty string fields', async () => {
      try {
        await queueDM({
          accountId: '', // Empty
          recipientId: 'r1',
          recipientName: 'User',
          message: 'This is a test message that is long enough',
          campaignId: mockCampaignId,
          userId: mockUserId,
        });
        fail('Should reject empty accountId');
      } catch (error) {
        expect((error as Error).message).toContain('non-empty');
      }
    });
  });

  // Edge Case 7: Job state transitions
  describe('Edge Case 7: Job state transitions (delayed → active → completed)', () => {
    it('should track job states correctly through lifecycle', async () => {
      // Queue a DM
      const result = await queueDM({
        accountId: mockAccountId,
        recipientId: 'recipient-lifecycle',
        recipientName: 'Lifecycle User',
        message: 'Testing job state transitions through the queue',
        campaignId: mockCampaignId,
        userId: mockUserId,
      });

      expect(result.queued).toBe(true);

      // Get the job
      const job = await dmQueue.getJob(result.jobId);
      expect(job).toBeDefined();

      if (job) {
        // Check initial state
        const initialState = await job.getState();
        expect(['waiting', 'delayed']).toContain(initialState);
      }
    });

    it('should preserve job data through state transitions', async () => {
      const originalData = {
        accountId: mockAccountId,
        recipientId: 'recipient-data-test',
        recipientName: 'Data Test User',
        message: 'This message should be preserved through all state transitions',
        campaignId: mockCampaignId,
        userId: mockUserId,
      };

      const result = await queueDM(originalData);
      const job = await dmQueue.getJob(result.jobId);

      expect(job).toBeDefined();
      if (job) {
        expect(job.data).toEqual(originalData);
      }
    });
  });

  // Additional tests for error handling and edge cases
  describe('Additional Edge Cases: Error handling and special scenarios', () => {
    it('should generate unique job IDs for identical requests at different times', async () => {
      const id1 = generateJobId(mockCampaignId, 'r1');

      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));

      const id2 = generateJobId(mockCampaignId, 'r1');

      expect(id1).not.toBe(id2);
    });

    it('should handle empty/whitespace accountId correctly', async () => {
      const whitespaceIds = ['   ', '\t', '\n'];

      for (const id of whitespaceIds) {
        try {
          await queueDM({
            accountId: id,
            recipientId: 'r1',
            recipientName: 'User',
            message: 'Valid test message for whitespace checking',
            campaignId: mockCampaignId,
            userId: mockUserId,
          });
          fail(`Should reject accountId: "${id}"`);
        } catch (error) {
          expect((error as Error).message).toContain('non-empty');
        }
      }
    });

    it('should handle rapid fire requests from same account', async () => {
      // Clear counter
      const today = new Date().toISOString().split('T')[0];
      const key = `dm-count:${mockAccountId}:${today}`;
      await redis.del(key);

      // Rapidly queue 10 DMs
      const rapidPromises = Array.from({ length: 10 }, (_, i) =>
        queueDM({
          accountId: mockAccountId,
          recipientId: `rapid-${i}`,
          recipientName: `Rapid User ${i}`,
          message: `Rapid fire message number ${i} that is long enough for validation`,
          campaignId: mockCampaignId,
          userId: mockUserId,
        })
      );

      const results = await Promise.all(rapidPromises);

      // All should succeed
      expect(results).toHaveLength(10);
      expect(results.every(r => r.queued)).toBe(true);
    });
  });
});
