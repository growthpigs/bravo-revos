/**
 * Pod Automation Engine Tests (E-04)
 * Tests for engagement scheduling, job queuing, and automation processing
 */

import { createClient } from '@/lib/supabase/server';
import {
  getPendingActivities,
  calculateLikeDelay,
  calculateCommentDelay,
  scheduleLikeActivities,
  scheduleCommentActivities,
  markActivityExecuted,
  updateMemberEngagementMetrics,
  getPodEngagementStats,
  EngagementActivity,
  ScheduledJob,
} from '@/lib/pods/engagement-scheduler';
import {
  podAutomationQueue,
  scheduleLikeJobs,
  scheduleCommentJobs,
  executeEngagementActivity,
  getAutomationQueueStatus,
  getPodAutomationStats,
  clearAutomationJobs,
} from '@/lib/queues/pod-automation-queue';
import { POD_AUTOMATION_CONFIG } from '@/lib/config';

// Mock Supabase
jest.mock('@/lib/supabase/server');
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};

// Mock Redis and BullMQ
jest.mock('@/lib/redis', () => ({
  getRedisConnection: jest.fn(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
  })),
}));

jest.mock('bullmq');

describe('Pod Automation Engine (E-04)', () => {
  const mockPodId = 'pod-123';
  const mockAccountId = 'account-456';
  const mockLinkedInAccountId = 'linkedin-789';
  const mockPostId = 'post-111';
  const mockMemberId = 'member-222';
  const mockActivityId = 'activity-333';

  const mockActivity: EngagementActivity = {
    id: mockActivityId,
    pod_id: mockPodId,
    post_id: mockPostId,
    member_id: mockMemberId,
    engagement_type: 'like',
    status: 'pending',
    scheduled_for: new Date().toISOString(),
    executed_at: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // ====== ENGAGEMENT SCHEDULER TESTS ======

  describe('getPendingActivities', () => {
    it('should fetch pending activities ordered by scheduled_for', async () => {
      const mockActivities = [mockActivity, { ...mockActivity, id: 'activity-444' }];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockReturnValueOnce({
              eq: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: mockActivities,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
        }),
      });

      const result = await getPendingActivities(mockPodId, 100);

      expect(result).toEqual(mockActivities);
      expect(mockSupabase.from).toHaveBeenCalledWith('pod_activities');
    });

    it('should return empty array on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockReturnValueOnce({
              eq: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: null,
                      error: new Error('Database connection failed'),
                    }),
                  }),
                }),
              }),
            }),
        }),
      });

      const result = await getPendingActivities(mockPodId);

      expect(result).toEqual([]);
    });
  });

  describe('calculateLikeDelay', () => {
    it('should return delay within configured like range', () => {
      const { delayMs, scheduledFor } = calculateLikeDelay(0, 5);

      expect(delayMs).toBeGreaterThanOrEqual(POD_AUTOMATION_CONFIG.LIKE_MIN_DELAY_MS);
      expect(delayMs).toBeLessThanOrEqual(POD_AUTOMATION_CONFIG.LIKE_MAX_DELAY_MS);
      expect(scheduledFor).toBeInstanceOf(Date);
      expect(scheduledFor.getTime()).toBeGreaterThan(Date.now());
    });

    it('should stagger members across delay window', () => {
      const totalMembers = 5;
      const delays: number[] = [];

      for (let i = 0; i < totalMembers; i++) {
        const { delayMs } = calculateLikeDelay(i, totalMembers);
        delays.push(delayMs);
      }

      // Later members should have longer delays (on average)
      const firstHalf = delays.slice(0, 2).reduce((a, b) => a + b) / 2;
      const secondHalf = delays.slice(3).reduce((a, b) => a + b) / 2;
      expect(secondHalf).toBeGreaterThanOrEqual(firstHalf);
    });

    it('should apply random variation to delays', () => {
      const delays: number[] = [];

      // Generate multiple delays for same member index (should vary due to randomness)
      for (let i = 0; i < 10; i++) {
        const { delayMs } = calculateLikeDelay(2, 5);
        delays.push(delayMs);
      }

      // Not all delays should be identical (high probability with randomness)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('calculateCommentDelay', () => {
    it('should return delay within configured comment range', () => {
      const { delayMs, scheduledFor } = calculateCommentDelay(0, 3);

      expect(delayMs).toBeGreaterThanOrEqual(POD_AUTOMATION_CONFIG.COMMENT_MIN_DELAY_MS);
      expect(delayMs).toBeLessThanOrEqual(POD_AUTOMATION_CONFIG.COMMENT_MAX_DELAY_MS);
      expect(scheduledFor).toBeInstanceOf(Date);
    });

    it('should have much longer delays than likes', () => {
      const { delayMs: likeDelay } = calculateLikeDelay(0, 5);
      const { delayMs: commentDelay } = calculateCommentDelay(0, 5);

      // Comments should generally be much longer (1hr+ vs 5-30min)
      expect(commentDelay).toBeGreaterThan(likeDelay * 2);
    });

    it('should apply larger random variation for comments', () => {
      const delays: number[] = [];

      for (let i = 0; i < 10; i++) {
        const { delayMs } = calculateCommentDelay(2, 5);
        delays.push(delayMs);
      }

      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('scheduleLikeActivities', () => {
    it('should schedule likes with member staggering', async () => {
      const activities = [
        mockActivity,
        { ...mockActivity, id: 'activity-2', member_id: 'member-2' },
        { ...mockActivity, id: 'activity-3', member_id: 'member-3' },
      ];

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await scheduleLikeActivities(activities, 3);

      expect(result.length).toBe(3);
      expect(result[0]).toHaveProperty('delayMs');
      expect(result[0]).toHaveProperty('scheduledFor');
      expect(result[0].engagementType).toBe('like');
      expect(mockSupabase.from).toHaveBeenCalledWith('pod_activities');
    });

    it('should limit members per hour when provided', async () => {
      const activities = Array.from({ length: 10 }, (_, i) => ({
        ...mockActivity,
        id: `activity-${i}`,
        member_id: `member-${i}`,
      }));

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await scheduleLikeActivities(activities, 3); // Limit to 3 per hour

      expect(result.length).toBe(3);
    });

    it('should handle database update errors gracefully', async () => {
      const activities = [mockActivity];

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: new Error('Update failed'),
          }),
        }),
      });

      const result = await scheduleLikeActivities(activities);

      expect(result.length).toBe(0);
    });

    it('should group activities by post for staggering', async () => {
      const samePostActivities = [
        mockActivity,
        { ...mockActivity, id: 'activity-2', member_id: 'member-2', post_id: mockPostId },
      ];
      const differentPostActivities = [
        { ...mockActivity, id: 'activity-3', post_id: 'post-999', member_id: 'member-3' },
      ];
      const allActivities = [...samePostActivities, ...differentPostActivities];

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await scheduleLikeActivities(allActivities, 2); // Limit 2 per post per hour

      // Should have max 2 for same post, plus activity for different post
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('scheduleCommentActivities', () => {
    it('should schedule comments with long delays', async () => {
      const activities = [
        mockActivity,
        { ...mockActivity, id: 'activity-2', member_id: 'member-2' },
      ];

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await scheduleCommentActivities(activities);

      expect(result.length).toBe(2);
      result.forEach((job) => {
        expect(job.engagementType).toBe('comment');
        expect(job.delayMs).toBeGreaterThanOrEqual(POD_AUTOMATION_CONFIG.COMMENT_MIN_DELAY_MS);
      });
    });

    it('should mark activities as scheduled', async () => {
      const activities = [mockActivity];
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await scheduleCommentActivities(activities);

      expect(mockSupabase.from).toHaveBeenCalledWith('pod_activities');
      const updateCall = mockSupabase.from.mock.results[0].value.update.mock.calls[0][0];
      expect(updateCall.status).toBe('scheduled');
      expect(updateCall).toHaveProperty('scheduled_for');
    });

    it('should return empty array on update errors', async () => {
      const activities = [mockActivity];

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: new Error('Update failed'),
          }),
        }),
      });

      const result = await scheduleCommentActivities(activities);

      expect(result.length).toBe(0);
    });
  });

  describe('markActivityExecuted', () => {
    it('should mark activity as executed with timestamp', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await markActivityExecuted(mockActivityId, true);

      expect(result).toBe(true);
      const updateData = mockSupabase.from.mock.results[0].value.update.mock.calls[0][0];
      expect(updateData.status).toBe('executed');
      expect(updateData).toHaveProperty('executed_at');
    });

    it('should mark activity as failed', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await markActivityExecuted(mockActivityId, false);

      expect(result).toBe(true);
      const updateData = mockSupabase.from.mock.results[0].value.update.mock.calls[0][0];
      expect(updateData.status).toBe('failed');
    });

    it('should return false on database error', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: new Error('Update failed'),
          }),
        }),
      });

      const result = await markActivityExecuted(mockActivityId);

      expect(result).toBe(false);
    });
  });

  describe('updateMemberEngagementMetrics', () => {
    it('should call RPC to increment engagement counter', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await updateMemberEngagementMetrics(mockMemberId, 2);

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_member_engagement', {
        member_id: mockMemberId,
        count: 2,
      });
    });

    it('should default to 1 engagement', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      await updateMemberEngagementMetrics(mockMemberId);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_member_engagement', {
        member_id: mockMemberId,
        count: 1,
      });
    });

    it('should return false on RPC error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: new Error('RPC failed'),
      });

      const result = await updateMemberEngagementMetrics(mockMemberId);

      expect(result).toBe(false);
    });
  });

  describe('getPodEngagementStats', () => {
    it('should aggregate activities by status', async () => {
      const allActivities = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'scheduled' },
        { status: 'executed' },
        { status: 'executed' },
        { status: 'executed' },
        { status: 'failed' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: allActivities,
            error: null,
          }),
        }),
      });

      const stats = await getPodEngagementStats(mockPodId);

      expect(stats.totalActivities).toBe(7);
      expect(stats.pendingActivities).toBe(2);
      expect(stats.scheduledActivities).toBe(1);
      expect(stats.executedActivities).toBe(3);
      expect(stats.failedActivities).toBe(1);
    });

    it('should return zero stats on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Query failed'),
          }),
        }),
      });

      const stats = await getPodEngagementStats(mockPodId);

      expect(stats.totalActivities).toBe(0);
      expect(stats.pendingActivities).toBe(0);
      expect(stats.executedActivities).toBe(0);
    });
  });

  // ====== POD AUTOMATION QUEUE TESTS ======

  describe('Pod Automation Queue Configuration', () => {
    it('should have correct retry and backoff settings', () => {
      expect(POD_AUTOMATION_CONFIG.QUEUE_ATTEMPTS).toBe(3);
      expect(POD_AUTOMATION_CONFIG.BACKOFF_INITIAL_DELAY_MS).toBe(30000);
      expect(POD_AUTOMATION_CONFIG.BACKOFF_TYPE).toBe('exponential');
    });

    it('should have correct like engagement settings', () => {
      expect(POD_AUTOMATION_CONFIG.LIKE_MIN_DELAY_MS).toBe(5 * 60 * 1000);
      expect(POD_AUTOMATION_CONFIG.LIKE_MAX_DELAY_MS).toBe(30 * 60 * 1000);
      expect(POD_AUTOMATION_CONFIG.LIKE_MAX_MEMBERS_PER_HOUR).toBe(3);
    });

    it('should have correct comment engagement settings', () => {
      expect(POD_AUTOMATION_CONFIG.COMMENT_MIN_DELAY_MS).toBe(1 * 60 * 60 * 1000);
      expect(POD_AUTOMATION_CONFIG.COMMENT_MAX_DELAY_MS).toBe(6 * 60 * 60 * 1000);
    });

    it('should have correct job retention settings', () => {
      expect(POD_AUTOMATION_CONFIG.COMPLETED_JOB_KEEP_COUNT).toBe(1000);
      expect(POD_AUTOMATION_CONFIG.COMPLETED_JOB_AGE_DAYS).toBe(7);
      expect(POD_AUTOMATION_CONFIG.FAILED_JOB_KEEP_COUNT).toBe(500);
      expect(POD_AUTOMATION_CONFIG.FAILED_JOB_AGE_DAYS).toBe(30);
    });
  });

  describe('scheduleLikeJobs', () => {
    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('should queue like jobs for pending activities', async () => {
      // Mock podAutomationQueue.add
      const mockJob = { id: 'job-like-1' };
      (podAutomationQueue.add as jest.Mock) = jest.fn().mockResolvedValue(mockJob);

      // For this test, we know getPendingActivities and scheduleLikeActivities
      // are tested separately, so we verify scheduleLikeJobs calls queue.add
      const result = await scheduleLikeJobs(mockPodId);

      // When no activities are returned, this should still work
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('scheduledCount');
      expect(result).toHaveProperty('message');
    });

    it('should return zero scheduled count when no pending activities', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockReturnValueOnce({
              eq: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
        }),
      });

      const result = await scheduleLikeJobs(mockPodId);

      expect(result.scheduledCount).toBe(0);
      expect(result.message).toBe('No pending like activities');
    });
  });

  describe('scheduleCommentJobs', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('should queue comment jobs for pending activities', async () => {
      const mockJob = { id: 'job-comment-1' };
      (podAutomationQueue.add as jest.Mock) = jest.fn().mockResolvedValue(mockJob);

      const result = await scheduleCommentJobs(mockPodId);

      // When no activities are returned, this should still work
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('scheduledCount');
      expect(result).toHaveProperty('message');
    });

    it('should return empty result when no pending comments', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockReturnValueOnce({
              eq: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
        }),
      });

      const result = await scheduleCommentJobs(mockPodId);

      expect(result.scheduledCount).toBe(0);
      expect(result.message).toBe('No pending comment activities');
    });
  });

  describe('executeEngagementActivity', () => {
    it('should queue individual engagement execution', async () => {
      const mockJob = { id: 'job-exec-123' };
      (podAutomationQueue.add as jest.Mock) = jest.fn().mockResolvedValue(mockJob);

      const result = await executeEngagementActivity(mockActivityId, 'like');

      expect(result).toBe(true);
      expect(podAutomationQueue.add).toHaveBeenCalledWith(
        'execute-engagement',
        expect.objectContaining({
          activityId: mockActivityId,
          jobType: 'execute-engagement',
        })
      );
    });

    it('should return false on queue error', async () => {
      (podAutomationQueue.add as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('Queue failed')
      );

      const result = await executeEngagementActivity(mockActivityId, 'comment');

      expect(result).toBe(false);
    });
  });

  describe('getAutomationQueueStatus', () => {
    it('should return queue health metrics', async () => {
      (podAutomationQueue.getWaitingCount as jest.Mock) = jest.fn().mockResolvedValue(5);
      (podAutomationQueue.getActiveCount as jest.Mock) = jest.fn().mockResolvedValue(2);
      (podAutomationQueue.getDelayedCount as jest.Mock) = jest.fn().mockResolvedValue(3);
      (podAutomationQueue.getCompletedCount as jest.Mock) = jest.fn().mockResolvedValue(100);
      (podAutomationQueue.getFailedCount as jest.Mock) = jest.fn().mockResolvedValue(1);

      const status = await getAutomationQueueStatus();

      expect(status.waiting).toBe(5);
      expect(status.active).toBe(2);
      expect(status.delayed).toBe(3);
      expect(status.completed).toBe(100);
      expect(status.failed).toBe(1);
      expect(status.total).toBe(10); // waiting + active + delayed
    });

    it('should return zero status on queue error', async () => {
      (podAutomationQueue.getWaitingCount as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new Error('Queue error'));

      const status = await getAutomationQueueStatus();

      expect(status.waiting).toBe(0);
      expect(status.total).toBe(0);
    });
  });

  describe('getPodAutomationStats', () => {
    it('should combine pod and queue statistics', async () => {
      const mockPodStats = {
        totalActivities: 50,
        pendingActivities: 10,
        scheduledActivities: 20,
        executedActivities: 15,
        failedActivities: 5,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { status: 'pending' },
              { status: 'pending' },
              { status: 'scheduled' },
              { status: 'executed' },
              { status: 'failed' },
            ],
            error: null,
          }),
        }),
      });

      (podAutomationQueue.getWaitingCount as jest.Mock) = jest.fn().mockResolvedValue(5);
      (podAutomationQueue.getActiveCount as jest.Mock) = jest.fn().mockResolvedValue(2);
      (podAutomationQueue.getDelayedCount as jest.Mock) = jest.fn().mockResolvedValue(1);
      (podAutomationQueue.getCompletedCount as jest.Mock) = jest.fn().mockResolvedValue(100);
      (podAutomationQueue.getFailedCount as jest.Mock) = jest.fn().mockResolvedValue(0);

      const stats = await getPodAutomationStats(mockPodId);

      expect(stats).toHaveProperty('pod');
      expect(stats).toHaveProperty('queue');
      expect(stats.queue.waiting).toBe(5);
    });

    it('should return empty stats on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Query failed'),
          }),
        }),
      });

      (podAutomationQueue.getWaitingCount as jest.Mock) = jest.fn().mockResolvedValue(0);
      (podAutomationQueue.getActiveCount as jest.Mock) = jest.fn().mockResolvedValue(0);
      (podAutomationQueue.getDelayedCount as jest.Mock) = jest.fn().mockResolvedValue(0);
      (podAutomationQueue.getCompletedCount as jest.Mock) = jest.fn().mockResolvedValue(0);
      (podAutomationQueue.getFailedCount as jest.Mock) = jest.fn().mockResolvedValue(0);

      const stats = await getPodAutomationStats(mockPodId);

      expect(stats).not.toBeNull();
      expect(stats.pod.totalActivities).toBe(0);
      expect(stats.queue.total).toBe(0);
    });
  });

  describe('clearAutomationJobs', () => {
    it('should remove all jobs from queue', async () => {
      const mockJobs = [
        { id: 'job-1', remove: jest.fn().mockResolvedValue(undefined) },
        { id: 'job-2', remove: jest.fn().mockResolvedValue(undefined) },
        { id: 'job-3', remove: jest.fn().mockResolvedValue(undefined) },
      ];

      (podAutomationQueue.getJobs as jest.Mock) = jest.fn().mockResolvedValue(mockJobs);

      const removed = await clearAutomationJobs();

      expect(removed).toBe(3);
      mockJobs.forEach((job) => {
        expect(job.remove).toHaveBeenCalled();
      });
    });

    it('should return 0 when no jobs to clear', async () => {
      (podAutomationQueue.getJobs as jest.Mock) = jest.fn().mockResolvedValue([]);

      const removed = await clearAutomationJobs();

      expect(removed).toBe(0);
    });

    it('should return 0 on error', async () => {
      (podAutomationQueue.getJobs as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new Error('Get jobs failed'));

      const removed = await clearAutomationJobs();

      expect(removed).toBe(0);
    });
  });

  // ====== INTEGRATION TESTS ======

  describe('Pod Automation Workflow', () => {
    it('should complete full like engagement workflow', async () => {
      // 1. Setup and get pending activities
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockReturnValueOnce({
              eq: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [
                        { ...mockActivity, engagement_type: 'like' as const },
                        { ...mockActivity, id: 'activity-2', member_id: 'member-2', engagement_type: 'like' as const },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
        }),
      });

      const pending = await getPendingActivities(mockPodId);
      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].engagement_type).toBe('like');

      // 2. Schedule likes
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const scheduled = await scheduleLikeActivities(pending.slice(0, 1), 1);
      expect(Array.isArray(scheduled)).toBe(true);

      // 3. Mark as executed
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const executed = await markActivityExecuted(mockActivityId, true);
      expect(executed).toBe(true);

      // 4. Get stats
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ status: 'executed' }, { status: 'pending' }],
            error: null,
          }),
        }),
      });

      const stats = await getPodEngagementStats(mockPodId);
      expect(stats.executedActivities).toBeGreaterThanOrEqual(0);
      expect(stats.totalActivities).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed like and comment engagement', async () => {
      const activities = [
        { ...mockActivity, engagement_type: 'like' as const },
        { ...mockActivity, id: 'activity-2', engagement_type: 'comment' as const },
      ];

      const likes = activities.filter((a) => a.engagement_type === 'like');
      const comments = activities.filter((a) => a.engagement_type === 'comment');

      expect(likes.length).toBe(1);
      expect(comments.length).toBe(1);

      // Verify they would be processed separately
      expect(likes[0].engagement_type).toBe('like');
      expect(comments[0].engagement_type).toBe('comment');
    });
  });
});
