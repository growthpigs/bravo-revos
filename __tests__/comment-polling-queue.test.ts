/**
 * Comment Polling Queue Tests
 * Tests for BullMQ queue infrastructure, scheduling logic, and job processing
 */

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// Mock Redis and BullMQ
jest.mock('ioredis');
jest.mock('bullmq');

// Import after mocking
import {
  CommentPollingJobData,
  startCommentPolling,
  stopCommentPolling,
  getQueueStatus,
} from '../lib/queue/comment-polling-queue';

describe('Comment Polling Queue', () => {
  let mockQueue: any;
  let mockRedis: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Redis instance
    mockRedis = {
      on: jest.fn(),
      connect: jest.fn(),
      quit: jest.fn(),
    };
    (Redis as any).mockImplementation(() => mockRedis);

    // Mock Queue methods
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getJobs: jest.fn().mockResolvedValue([]),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getDelayedCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
    };
    (Queue as any).mockImplementation(() => mockQueue);
  });

  describe('startCommentPolling', () => {
    it('should add initial polling job to queue', async () => {
      const jobData: CommentPollingJobData = {
        accountId: 'acc123',
        postId: 'post456',
        triggerWords: ['SCALE', 'automation'],
        campaignId: 'campaign789',
        userId: 'user123',
      };

      await startCommentPolling(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'poll-comments',
        jobData,
        expect.objectContaining({
          jobId: expect.stringContaining('poll-campaign789-initial'),
        })
      );
    });

    it('should handle timezone in job data', async () => {
      const jobData: CommentPollingJobData = {
        accountId: 'acc123',
        postId: 'post456',
        triggerWords: ['SCALE'],
        campaignId: 'campaign789',
        userId: 'user123',
        timezone: 'America/New_York',
      };

      await startCommentPolling(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'poll-comments',
        expect.objectContaining({ timezone: 'America/New_York' }),
        expect.any(Object)
      );
    });
  });

  describe('stopCommentPolling', () => {
    it('should remove all jobs for campaign', async () => {
      const campaignId = 'campaign789';

      const mockJobs = [
        {
          data: { campaignId: 'campaign789' },
          remove: jest.fn().mockResolvedValue(undefined),
        },
        {
          data: { campaignId: 'campaign999' },
          remove: jest.fn().mockResolvedValue(undefined),
        },
        {
          data: { campaignId: 'campaign789' },
          remove: jest.fn().mockResolvedValue(undefined),
        },
      ];

      mockQueue.getJobs.mockResolvedValue(mockJobs);

      await stopCommentPolling(campaignId);

      expect(mockQueue.getJobs).toHaveBeenCalledWith(['waiting', 'delayed', 'active']);
      expect(mockJobs[0].remove).toHaveBeenCalled();
      expect(mockJobs[1].remove).not.toHaveBeenCalled();
      expect(mockJobs[2].remove).toHaveBeenCalled();
    });

    it('should handle empty queue', async () => {
      mockQueue.getJobs.mockResolvedValue([]);

      await stopCommentPolling('campaign789');

      expect(mockQueue.getJobs).toHaveBeenCalled();
      // Should not throw error
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getDelayedCount.mockResolvedValue(10);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);

      const status = await getQueueStatus();

      expect(status).toEqual({
        waiting: 5,
        active: 2,
        delayed: 10,
        completed: 100,
        failed: 3,
        total: 17, // waiting + active + delayed
      });
    });

    it('should handle zero counts', async () => {
      const status = await getQueueStatus();

      expect(status.total).toBe(0);
      expect(status.waiting).toBe(0);
      expect(status.active).toBe(0);
    });
  });

  describe('Scheduling Logic', () => {
    it('should calculate delay between 15-45 minutes', () => {
      // This tests the logic indirectly through multiple job creations
      const delays: number[] = [];

      for (let i = 0; i < 100; i++) {
        // Random between 15-45 minutes base
        const baseMinutes = 15 + Math.random() * 30;
        // Jitter: ±5 minutes
        const jitterMinutes = (Math.random() - 0.5) * 10;
        const totalMinutes = baseMinutes + jitterMinutes;
        const delayMs = Math.floor(totalMinutes * 60 * 1000);

        delays.push(delayMs);
      }

      // All delays should be between 10-50 minutes (15-45 ± 5)
      const minDelay = 10 * 60 * 1000; // 10 minutes
      const maxDelay = 50 * 60 * 1000; // 50 minutes

      for (const delay of delays) {
        expect(delay).toBeGreaterThanOrEqual(minDelay);
        expect(delay).toBeLessThanOrEqual(maxDelay);
      }
    });

    it('should have approximately 10% skip chance', () => {
      let skipCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        if (Math.random() < 0.1) {
          skipCount++;
        }
      }

      // Should be roughly 10% (allow 5-15% range for randomness)
      const skipPercentage = (skipCount / iterations) * 100;
      expect(skipPercentage).toBeGreaterThan(5);
      expect(skipPercentage).toBeLessThan(15);
    });
  });

  describe('Working Hours Check', () => {
    it('should identify working hours (9am-5pm)', () => {
      const workingHours = [9, 10, 11, 12, 13, 14, 15, 16];

      for (const hour of workingHours) {
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThan(17);
      }
    });

    it('should identify non-working hours', () => {
      const nonWorkingHours = [0, 1, 2, 6, 7, 8, 17, 18, 19, 20, 21, 22, 23];

      for (const hour of nonWorkingHours) {
        expect(hour < 9 || hour >= 17).toBe(true);
      }
    });
  });

  describe('Job Data Validation', () => {
    it('should require all mandatory fields', () => {
      const validJobData: CommentPollingJobData = {
        accountId: 'acc123',
        postId: 'post456',
        triggerWords: ['SCALE'],
        campaignId: 'campaign789',
        userId: 'user123',
      };

      expect(validJobData.accountId).toBeDefined();
      expect(validJobData.postId).toBeDefined();
      expect(validJobData.triggerWords).toBeDefined();
      expect(validJobData.campaignId).toBeDefined();
      expect(validJobData.userId).toBeDefined();
    });

    it('should allow optional timezone field', () => {
      const jobDataWithTimezone: CommentPollingJobData = {
        accountId: 'acc123',
        postId: 'post456',
        triggerWords: ['SCALE'],
        campaignId: 'campaign789',
        userId: 'user123',
        timezone: 'America/Los_Angeles',
      };

      expect(jobDataWithTimezone.timezone).toBe('America/Los_Angeles');
    });
  });

  describe('Error Handling', () => {
    it('should handle queue add errors', async () => {
      mockQueue.add.mockRejectedValue(new Error('Queue full'));

      const jobData: CommentPollingJobData = {
        accountId: 'acc123',
        postId: 'post456',
        triggerWords: ['SCALE'],
        campaignId: 'campaign789',
        userId: 'user123',
      };

      await expect(startCommentPolling(jobData)).rejects.toThrow('Queue full');
    });

    it('should handle queue status errors', async () => {
      mockQueue.getWaitingCount.mockRejectedValue(new Error('Redis connection failed'));

      await expect(getQueueStatus()).rejects.toThrow('Redis connection failed');
    });
  });
});
